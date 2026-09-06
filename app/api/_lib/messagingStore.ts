import { hasUserStoreConfig } from '@/app/api/_lib/userStore';

export type Conversation = {
  id: string;
  participantIds: string[];
  hiddenFor?: string[];
  createdBy: string;
  createdAt: string;
  lastActivityAt: string;
  lastMessagePreview?: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string;
};

export type Notification = {
  id: string;
  userId: string;
  conversationId: string;
  messageId: string;
  createdAt: string;
  readAt?: string;
};

type Row = { id: string; payload?: Record<string, unknown>; conversation_id?: string; user_id?: string; message_id?: string; created_at?: string; read_at?: string | null };

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
    if (value && value !== '[SENSITIVE]') return value;
  }
  return '';
}

const baseUrl = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, '');
const key = env('SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
const headers = () => ({ apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Type': 'application/json' });

export function hasMessagingStoreConfig() {
  return hasUserStoreConfig() && Boolean(baseUrl && key);
}

async function requestTable(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) }, cache: 'no-store' });
  if (!response.ok) {
    const error = new Error(`Supabase recusou a operação de mensagens (${response.status}).`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return [];
  const text = await response.text();
  if (!text.trim()) return [];
  try {
    return JSON.parse(text) as Row[];
  } catch {
    throw new Error('Supabase retornou uma resposta inválida para o mensageiro.');
  }
}

function isMissingTable(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 404);
}

async function fallbackRows(prefix: string) {
  return requestTable(`pz_news_articles?id=like.${encodeURIComponent(prefix)}*&select=id,payload,created_at,updated_at&order=updated_at.desc&limit=10000`);
}

async function fallbackUpsert(id: string, payload: Record<string, unknown>, updatedAt: string) {
  await requestTable('pz_news_articles', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id, payload: { ...payload, _type: payload._type }, deleted: false, updated_at: updatedAt }),
  });
}

function conversationFromRow(row: Row): Conversation {
  const payload = row.payload ?? {};
  return {
    id: row.id,
    participantIds: Array.isArray(payload.participantIds) ? payload.participantIds.map(String) : [],
    hiddenFor: Array.isArray(payload.hiddenFor) ? payload.hiddenFor.map(String) : [],
    createdBy: String(payload.createdBy ?? ''),
    createdAt: String(payload.createdAt ?? row.created_at ?? new Date().toISOString()),
    lastActivityAt: String(payload.lastActivityAt ?? row.created_at ?? new Date().toISOString()),
    lastMessagePreview: typeof payload.lastMessagePreview === 'string' ? payload.lastMessagePreview : undefined,
  };
}

export async function listConversations() {
  let rows: Row[];
  try {
    rows = await requestTable('rbn_message_conversations?select=id,payload,created_at&order=created_at.desc');
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    rows = await fallbackRows('__message_conversation:');
  }
  return rows.map(conversationFromRow);
}

export async function saveConversation(conversation: Conversation) {
  try {
    await requestTable('rbn_message_conversations', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: conversation.id, payload: conversation, updated_at: conversation.lastActivityAt }),
    });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    await fallbackUpsert(`__message_conversation:${conversation.id}`, { ...conversation, _type: 'message_conversation' }, conversation.lastActivityAt);
  }
  return conversation;
}

function messageFromRow(row: Row): Message {
  const payload = row.payload ?? {};
  return {
    id: row.id,
    conversationId: String(row.conversation_id ?? payload.conversationId ?? ''),
    senderId: String(payload.senderId ?? ''),
    body: String(payload.body ?? ''),
    createdAt: String(payload.createdAt ?? row.created_at ?? new Date().toISOString()),
    readAt: typeof payload.readAt === 'string' ? payload.readAt : undefined,
  };
}

export async function listMessages(conversationId: string) {
  let rows: Row[];
  try {
    rows = await requestTable(`rbn_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=id,conversation_id,payload,created_at&order=created_at.asc`);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    rows = (await fallbackRows('__message:')).filter((row) => row.payload?._type === 'message' && String(row.payload.conversationId) === conversationId);
  }
  return rows.map(messageFromRow);
}

export async function saveMessage(message: Message) {
  try {
    await requestTable('rbn_messages', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id: message.id, conversation_id: message.conversationId, payload: message, created_at: message.createdAt }),
    });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    await fallbackUpsert(`__message:${message.id}`, { ...message, _type: 'message' }, message.createdAt);
  }
  return message;
}

export async function listNotifications(userId: string) {
  let rows: Row[];
  try {
    rows = await requestTable(`rbn_message_notifications?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,conversation_id,message_id,payload,created_at,read_at&order=created_at.desc`);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    rows = (await fallbackRows('__message_notification:')).filter((row) => String(row.payload?.userId) === userId);
  }
  return rows.map((row) => ({
    id: row.id,
    userId: String(row.user_id ?? ''),
    conversationId: String(row.conversation_id ?? ''),
    messageId: String(row.message_id ?? ''),
    createdAt: String(row.created_at ?? ''),
    readAt: typeof row.read_at === 'string' ? row.read_at : undefined,
  } satisfies Notification));
}

export async function saveNotification(notification: Notification) {
  try {
    await requestTable('rbn_message_notifications', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id: notification.id, user_id: notification.userId, conversation_id: notification.conversationId, message_id: notification.messageId, payload: notification, created_at: notification.createdAt }),
    });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    await fallbackUpsert(`__message_notification:${notification.id}`, { ...notification, _type: 'message_notification' }, notification.createdAt);
  }
}

export async function markNotificationsRead(userId: string, conversationId?: string) {
  const filter = conversationId ? `&conversation_id=eq.${encodeURIComponent(conversationId)}` : '';
  try {
    await requestTable(`rbn_message_notifications?user_id=eq.${encodeURIComponent(userId)}&read_at=is.null${filter}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    const now = new Date().toISOString();
    const rows = (await fallbackRows('__message_notification:')).filter((row) => String(row.payload?.userId) === userId && !row.payload?.readAt && (!conversationId || String(row.payload?.conversationId) === conversationId));
    await Promise.all(rows.map((row) => requestTable(`pz_news_articles?id=eq.${encodeURIComponent(row.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ payload: { ...row.payload, readAt: now, _type: 'message_notification' }, updated_at: now }),
    })));
  }
}

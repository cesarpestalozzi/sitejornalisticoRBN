import { hasUserStoreConfig } from '@/app/api/_lib/userStore';

export type Conversation = {
  id: string;
  participantIds: string[];
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
  if (!response.ok) throw new Error(`Supabase recusou a operação de mensagens (${response.status}).`);
  return response.status === 204 ? [] : ((await response.json()) as Row[]);
}

function conversationFromRow(row: Row): Conversation {
  const payload = row.payload ?? {};
  return {
    id: row.id,
    participantIds: Array.isArray(payload.participantIds) ? payload.participantIds.map(String) : [],
    createdBy: String(payload.createdBy ?? ''),
    createdAt: String(payload.createdAt ?? row.created_at ?? new Date().toISOString()),
    lastActivityAt: String(payload.lastActivityAt ?? row.created_at ?? new Date().toISOString()),
    lastMessagePreview: typeof payload.lastMessagePreview === 'string' ? payload.lastMessagePreview : undefined,
  };
}

export async function listConversations() {
  const rows = await requestTable('rbn_message_conversations?select=id,payload,created_at&order=created_at.desc');
  return rows.map(conversationFromRow);
}

export async function saveConversation(conversation: Conversation) {
  await requestTable('rbn_message_conversations', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: conversation.id, payload: conversation, updated_at: conversation.lastActivityAt }),
  });
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
  const rows = await requestTable(`rbn_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=id,conversation_id,payload,created_at&order=created_at.asc`);
  return rows.map(messageFromRow);
}

export async function saveMessage(message: Message) {
  await requestTable('rbn_messages', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ id: message.id, conversation_id: message.conversationId, payload: message, created_at: message.createdAt }),
  });
  return message;
}

export async function listNotifications(userId: string) {
  const rows = await requestTable(`rbn_message_notifications?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,conversation_id,message_id,payload,created_at,read_at&order=created_at.desc`);
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
  await requestTable('rbn_message_notifications', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ id: notification.id, user_id: notification.userId, conversation_id: notification.conversationId, message_id: notification.messageId, payload: notification, created_at: notification.createdAt }),
  });
}

export async function markNotificationsRead(userId: string, conversationId?: string) {
  const filter = conversationId ? `&conversation_id=eq.${encodeURIComponent(conversationId)}` : '';
  await requestTable(`rbn_message_notifications?user_id=eq.${encodeURIComponent(userId)}&read_at=is.null${filter}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ read_at: new Date().toISOString() }),
  });
}

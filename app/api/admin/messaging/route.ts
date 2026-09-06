import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  canUseMessaging,
  getAdminDirectory,
  proxyAdminRequest,
  resolveAdminUser,
  updateStoredUserActivity,
} from '@/app/api/_lib/adminServerAuth';
import {
  deleteMessage,
  getMessage,
  hasMessagingStoreConfig,
  listConversations,
  listMessages,
  listNotifications,
  markNotificationsRead,
  saveConversation,
  saveMessage,
  saveNotification,
  type Conversation,
} from '@/app/api/_lib/messagingStore';

export const dynamic = 'force-dynamic';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function visibleConversation(conversation: Conversation, userId: string) {
  const isParticipant = conversation.participantIds.includes(userId) && conversation.participantIds.length === 2;
  const isHidden = Array.isArray(conversation.hiddenFor) && conversation.hiddenFor.includes(userId);
  return isParticipant && !isHidden;
}

function publicDirectory(rows: Array<{ id: string; payload: Record<string, unknown> }>, currentId: string) {
  const onlineWindow = Date.now() - 5 * 60 * 1000;
  return rows
    .filter((row) => row.id !== currentId && !['inativo', 'inactive', 'disabled', 'removido', 'removed', 'deleted'].includes(String(row.payload.status ?? 'ativo').toLowerCase()))
    .map((row) => ({
      id: row.id,
      name: String(row.payload.publicName ?? row.payload.name ?? 'Usuário'),
      email: String(row.payload.email ?? ''),
      avatar: typeof row.payload.avatar === 'string' ? row.payload.avatar : '',
      role: String(row.payload.role ?? ''),
      lastSeenAt: typeof row.payload.lastSeenAt === 'string' ? row.payload.lastSeenAt : null,
      isOnline: Boolean(row.payload.isOnline) && typeof row.payload.lastSeenAt === 'string' && new Date(row.payload.lastSeenAt).getTime() >= onlineWindow,
    }));
}

async function readBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!canUseMessaging(user, 'view')) return jsonError('Sessão ou permissão de mensagens inválida.', 401);
  if (!hasMessagingStoreConfig()) return proxyAdminRequest(request, '/api/admin/messaging');

  try {
    const action = request.nextUrl.searchParams.get('action') ?? 'conversations';
    if (action === 'users') {
      return NextResponse.json({ ok: true, users: publicDirectory(await getAdminDirectory(), user!.id) });
    }
    const conversations = (await listConversations()).filter((conversation) => visibleConversation(conversation, user!.id));
    if (action === 'messages') {
      const conversationId = request.nextUrl.searchParams.get('conversationId') ?? '';
      const conversation = conversations.find((item) => item.id === conversationId);
      if (!conversation) return jsonError('Conversa não encontrada.', 404);
      await markNotificationsRead(user!.id, conversationId);
      const messages = await listMessages(conversationId);
      const recipientId = conversation.participantIds.find((id) => id !== user!.id);
      let recipientUnreadMessageIds = new Set<string>();
      if (recipientId) {
        const recipientNotifications = await listNotifications(recipientId);
        recipientUnreadMessageIds = new Set(
          recipientNotifications.filter((n) => n.conversationId === conversationId && !n.readAt).map((n) => n.messageId)
        );
      }
      const messagesWithReadStatus = messages.map((msg) => ({
        ...msg,
        isRead: msg.senderId === user!.id ? !recipientUnreadMessageIds.has(msg.id) : true,
      }));
      return NextResponse.json({ ok: true, conversation, messages: messagesWithReadStatus });
    }
    const notifications = await listNotifications(user!.id);
    const unreadByConversation = notifications.filter((item) => !item.readAt).reduce<Record<string, number>>((counts, item) => {
      counts[item.conversationId] = (counts[item.conversationId] ?? 0) + 1;
      return counts;
    }, {});
    return NextResponse.json({ ok: true, conversations, unreadByConversation, unreadCount: notifications.filter((item) => !item.readAt).length });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Falha ao consultar mensagens.', 502);
  }
}

export async function POST(request: NextRequest) {
  const user = await resolveAdminUser(request);
  const body = await readBody(request);
  const action = String(body.action ?? '');
  if (!canUseMessaging(user, action === 'heartbeat' ? 'view' : 'send')) return jsonError('Sessão ou permissão de mensagens inválida.', 401);
  if (!hasMessagingStoreConfig()) return proxyAdminRequest(request, '/api/admin/messaging');
  try {
    if (action === 'heartbeat') {
      await updateStoredUserActivity(user!.id, { lastSeenAt: new Date().toISOString(), isOnline: true });
      return NextResponse.json({ ok: true });
    }
    if (action === 'conversation') {
      const targetId = String(body.participantId ?? '').trim();
      if (!targetId || targetId === user!.id) return jsonError('Selecione outro participante.');
      const directory = await getAdminDirectory();
      const target = directory.find((row) => row.id === targetId);
      if (!target || ['inativo', 'inactive', 'disabled', 'removido', 'removed', 'deleted'].includes(String(target.payload.status ?? 'ativo').toLowerCase())) {
        return jsonError('O participante não existe ou está inativo.', 404);
      }
      const participants = [user!.id, targetId].sort();
      const existing = (await listConversations()).find((conversation) => conversation.participantIds.length === 2 && conversation.participantIds.slice().sort().join('|') === participants.join('|'));
      const conversation: Conversation = existing ?? {
        id: randomUUID(),
        participantIds: participants,
        createdBy: user!.id,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
      if (existing) {
        const hiddenFor = Array.isArray(existing.hiddenFor) ? existing.hiddenFor.filter((id) => id !== user!.id) : [];
        await saveConversation({ ...existing, hiddenFor });
      } else {
        await saveConversation(conversation);
      }
      return NextResponse.json({ ok: true, conversation });
    }
    if (action === 'message') {
      const conversationId = String(body.conversationId ?? '').trim();
      const text = String(body.body ?? '').trim();
      const conversation = (await listConversations()).find((item) => item.id === conversationId);
      if (!conversation || !conversation.participantIds.includes(user!.id)) return jsonError('Conversa não encontrada.', 404);
      if (!text || text.length > 5000) return jsonError('A mensagem deve ter entre 1 e 5000 caracteres.');
      const now = new Date().toISOString();
      const message = { id: randomUUID(), conversationId, senderId: user!.id, body: text, createdAt: now };
      await saveMessage(message);

      // Unhide conversation for both participants when a new message is sent
      await saveConversation({ ...conversation, hiddenFor: [], lastActivityAt: now, lastMessagePreview: text.slice(0, 140) });
      const recipientId = conversation.participantIds.find((id) => id !== user!.id);
      if (recipientId) await saveNotification({ id: randomUUID(), userId: recipientId, conversationId, messageId: message.id, createdAt: now });
      await updateStoredUserActivity(user!.id, { lastSeenAt: now, isOnline: true });
      return NextResponse.json({ ok: true, message });
    }
    return jsonError('Ação de mensagens inválida.');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Falha ao salvar mensagem.', 502);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!canUseMessaging(user, 'send')) return jsonError('Sessão ou permissão de mensagens inválida.', 401);
  if (!hasMessagingStoreConfig()) return proxyAdminRequest(request, '/api/admin/messaging');

  const bodyData = await readBody(request);
  const messageId = request.nextUrl.searchParams.get('messageId') || bodyData.messageId;
  const conversationId = request.nextUrl.searchParams.get('conversationId') || bodyData.conversationId;

  try {
    if (messageId) {
      const msg = await getMessage(messageId);
      if (!msg) return jsonError('Mensagem não encontrada.', 404);
      if (msg.senderId !== user!.id && user!.role !== 'admin') {
        return jsonError('Você só pode apagar suas próprias mensagens.', 403);
      }
      await deleteMessage(messageId);
      return NextResponse.json({ ok: true });
    }

    if (!conversationId) return jsonError('ID da conversa ou mensagem é obrigatório.');

    const conversations = await listConversations();
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation || !conversation.participantIds.includes(user!.id)) {
      return jsonError('Conversa não encontrada.', 404);
    }

    const currentHidden = Array.isArray(conversation.hiddenFor) ? conversation.hiddenFor : [];
    const hiddenFor = Array.from(new Set([...currentHidden, user!.id]));
    await saveConversation({ ...conversation, hiddenFor });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Falha ao excluir.', 502);
  }
}

export async function PATCH(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!canUseMessaging(user, 'view')) return jsonError('Sessão ou permissão de mensagens inválida.', 401);
  if (!hasMessagingStoreConfig()) return proxyAdminRequest(request, '/api/admin/messaging');
  const body = await readBody(request);
  const action = String(body.action ?? '');

  try {
    if (action === 'edit' || body.messageId) {
      const messageId = String(body.messageId ?? '').trim();
      const text = String(body.body ?? '').trim();
      if (!messageId || !text) return jsonError('Dados inválidos para edição.');
      const msg = await getMessage(messageId);
      if (!msg) return jsonError('Mensagem não encontrada.', 404);
      if (msg.senderId !== user!.id && user!.role !== 'admin') {
        return jsonError('Você só pode editar suas próprias mensagens.', 403);
      }
      const updatedMsg = { ...msg, body: text };
      await saveMessage(updatedMsg);
      return NextResponse.json({ ok: true, message: updatedMsg });
    }

    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : undefined;
    if (conversationId) {
      const conversation = (await listConversations()).find((item) => item.id === conversationId);
      if (!conversation || !visibleConversation(conversation, user!.id)) return jsonError('Conversa não encontrada.', 404);
    }
    await markNotificationsRead(user!.id, conversationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Falha ao atualizar mensagem.', 502);
  }
}

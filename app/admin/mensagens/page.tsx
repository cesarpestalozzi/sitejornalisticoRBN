'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { getCurrentAdminUser, hasPermission } from '@/app/lib/adminPermissions';
import { MessageCircle, Plus, Send, Users } from 'lucide-react';

type DirectoryUser = { id: string; name: string; email: string; avatar?: string; role: string; lastSeenAt?: string | null; isOnline?: boolean };
type Conversation = { id: string; participantIds: string[]; lastActivityAt: string; lastMessagePreview?: string };
type Message = { id: string; senderId: string; body: string; createdAt: string };

async function api(path: string, options: RequestInit = {}) {
  const user = getCurrentAdminUser();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (user?.id) headers.set('x-admin-user-id', user.id);
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentUser = getCurrentAdminUser();

  const selectedConversation = useMemo(() => conversations.find((conversation) => conversation.id === selectedId), [conversations, selectedId]);
  const otherUser = useMemo(() => {
    const id = selectedConversation?.participantIds.find((participantId) => participantId !== currentUser?.id);
    return directory.find((user) => user.id === id);
  }, [currentUser?.id, directory, selectedConversation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [conversationData, usersData] = await Promise.all([
        api('/api/admin/messaging?action=conversations'),
        api('/api/admin/messaging?action=users'),
      ]);
      setConversations(conversationData.conversations);
      setUnreadByConversation(conversationData.unreadByConversation ?? {});
      setDirectory(usersData.users);
      setSelectedId((current) => current || conversationData.conversations[0]?.id || '');
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as mensagens.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => {
      void api('/api/admin/messaging', { method: 'POST', body: JSON.stringify({ action: 'heartbeat' }) }).catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void api(`/api/admin/messaging?action=messages&conversationId=${encodeURIComponent(selectedId)}`)
      .then((data) => {
        setMessages(data.messages);
        return api('/api/admin/messaging', { method: 'PATCH', body: JSON.stringify({ conversationId: selectedId }) });
      })
      .then(() => setUnreadByConversation((current) => ({ ...current, [selectedId]: 0 })))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a conversa.'));
  }, [selectedId]);

  const startConversation = async () => {
    if (!selectedUserId) return;
    try {
      const data = await api('/api/admin/messaging', { method: 'POST', body: JSON.stringify({ action: 'conversation', participantId: selectedUserId }) });
      setConversations((current) => current.some((item) => item.id === data.conversation.id) ? current : [data.conversation, ...current]);
      setSelectedId(data.conversation.id);
      setSelectedUserId('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar a conversa.');
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !draft.trim()) return;
    try {
      const data = await api('/api/admin/messaging', { method: 'POST', body: JSON.stringify({ action: 'message', conversationId: selectedId, body: draft }) });
      setMessages((current) => [...current, data.message]);
      setDraft('');
      setConversations((current) => current.map((conversation) => conversation.id === selectedId ? { ...conversation, lastActivityAt: data.message.createdAt, lastMessagePreview: data.message.body } : conversation));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a mensagem.');
    }
  };

  if (!currentUser || !hasPermission(currentUser, 'messages:view')) return null;

  return (
    <div className="flex min-h-screen bg-[#f5f3ef]">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#991B1B]">Comunicação interna</p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">Mensagens</h1>
              <p className="mt-1 text-sm text-gray-600">Converse com a equipe sem expor conversas privadas a terceiros.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600"><Users className="h-4 w-4" /> Participantes ativos</div>
          </div>
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:grid-cols-[300px_1fr]">
            <aside className="border-b border-gray-200 md:border-b-0 md:border-r">
              <div className="border-b border-gray-200 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Nova conversa</label>
                <div className="flex gap-2">
                  <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm">
                    <option value="">Selecionar colega</option>
                    {directory.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                  <button type="button" onClick={startConversation} disabled={!selectedUserId} className="rounded-lg bg-[#991B1B] p-2 text-white disabled:opacity-40" aria-label="Iniciar conversa"><Plus className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="max-h-[510px] overflow-y-auto">
                {loading && <p className="p-5 text-sm text-gray-500">Carregando conversas...</p>}
                {!loading && conversations.length === 0 && <p className="p-5 text-sm text-gray-500">Nenhuma conversa iniciada.</p>}
                {conversations.map((conversation) => {
                  const participantId = conversation.participantIds.find((id) => id !== currentUser.id);
                  const participant = directory.find((user) => user.id === participantId);
                  return <button type="button" key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`flex w-full items-start gap-3 border-b border-gray-100 p-4 text-left transition ${selectedId === conversation.id ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <MessageCircle className="mt-1 h-5 w-5 shrink-0 text-[#991B1B]" />
                    <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-gray-900">{participant?.name ?? 'Participante'}</strong>{Boolean(unreadByConversation[conversation.id]) && <span className="rounded-full bg-[#991B1B] px-2 py-0.5 text-[10px] font-bold text-white">{unreadByConversation[conversation.id]}</span>}</span><span className="mt-1 block truncate text-xs text-gray-500">{conversation.lastMessagePreview ?? 'Sem mensagens ainda'}</span></span>
                  </button>;
                })}
              </div>
            </aside>
            <section className="flex min-h-[620px] flex-col">
              <header className="border-b border-gray-200 p-5"><h2 className="font-semibold text-gray-900">{otherUser?.name ?? 'Selecione uma conversa'}</h2><p className="text-xs text-gray-500">{otherUser?.isOnline ? 'Online agora' : 'Conversa privada'}</p></header>
              <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-5">
                {selectedConversation && messages.length === 0 && <p className="text-center text-sm text-gray-500">Envie a primeira mensagem.</p>}
                {messages.map((message) => <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.senderId === currentUser.id ? 'ml-auto bg-[#991B1B] text-white' : 'bg-white text-gray-800 shadow-sm'}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><time className="mt-1 block text-[10px] opacity-70">{new Date(message.createdAt).toLocaleString('pt-BR')}</time></div>)}
              </div>
              <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-200 bg-white p-4">
                <input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!selectedConversation || !hasPermission(currentUser, 'messages:send')} maxLength={5000} placeholder="Escreva uma mensagem..." className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#991B1B] focus:outline-none" />
                <button type="submit" disabled={!selectedConversation || !draft.trim()} className="rounded-lg bg-[#111111] px-4 py-2 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

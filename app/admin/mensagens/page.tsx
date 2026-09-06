'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { getCurrentAdminUser, hasPermission } from '@/app/lib/adminPermissions';
import { Check, CheckCheck, MessageCircle, Plus, Search, Send, Trash2, Users } from 'lucide-react';

type DirectoryUser = { id: string; name: string; email: string; avatar?: string; role: string; lastSeenAt?: string | null; isOnline?: boolean };
type Conversation = { id: string; participantIds: string[]; lastActivityAt: string; lastMessagePreview?: string };
type Message = { id: string; senderId: string; body: string; createdAt: string; isRead?: boolean };

async function api<T extends Record<string, unknown> = Record<string, unknown>>(path: string, options: RequestInit = {}) {
  const user = getCurrentAdminUser();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (user?.id) headers.set('x-admin-user-id', user.id);
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers, cache: 'no-store' });
  const text = await response.text();
  let data: { ok?: boolean; error?: string; [key: string]: unknown } = {};
  if (text.trim()) {
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      throw new Error('O servidor retornou uma resposta inválida para as mensagens.');
    }
  }
  if (!response.ok || !data.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data as T;
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = getCurrentAdminUser();

  const selectedConversation = useMemo(() => conversations.find((conversation) => conversation.id === selectedId), [conversations, selectedId]);
  const otherUser = useMemo(() => {
    const id = selectedConversation?.participantIds.find((participantId) => participantId !== currentUser?.id);
    return directory.find((user) => user.id === id);
  }, [currentUser?.id, directory, selectedConversation]);
  const filteredDirectory = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return directory.filter((user) => !query || `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query));
  }, [directory, userSearch]);
  const filteredConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (!query) return true;
      const participantId = conversation.participantIds.find((id) => id !== currentUser?.id);
      const participant = directory.find((user) => user.id === participantId);
      return `${participant?.name ?? ''} ${conversation.lastMessagePreview ?? ''}`.toLowerCase().includes(query);
    });
  }, [conversations, conversationSearch, currentUser?.id, directory]);

  const loadConversations = useCallback(async () => {
    try {
      const [conversationData, usersData] = await Promise.all([
        api<{ ok: true; conversations: Conversation[]; unreadByConversation?: Record<string, number> }>('/api/admin/messaging?action=conversations'),
        api<{ ok: true; users: DirectoryUser[] }>('/api/admin/messaging?action=users'),
      ]);
      setConversations(conversationData.conversations);
      setUnreadByConversation(conversationData.unreadByConversation ?? {});
      setDirectory(usersData.users);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as mensagens.');
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    if (!convId) return;
    try {
      const data = await api<{ ok: true; messages: Message[] }>(`/api/admin/messaging?action=messages&conversationId=${encodeURIComponent(convId)}`);
      setMessages(data.messages);
      setUnreadByConversation((current) => ({ ...current, [convId]: 0 }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a conversa.');
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    await loadConversations();
    setLoading(false);
  }, [loadConversations]);

  useEffect(() => {
    void loadInitial();
    const interval = window.setInterval(() => {
      void api('/api/admin/messaging', { method: 'POST', body: JSON.stringify({ action: 'heartbeat' }) }).catch(() => undefined);
      void loadConversations();
    }, 4_000);
    return () => window.clearInterval(interval);
  }, [loadConversations, loadInitial]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void fetchMessages(selectedId);
    const msgInterval = window.setInterval(() => {
      void fetchMessages(selectedId);
    }, 3_000);
    return () => window.clearInterval(msgInterval);
  }, [fetchMessages, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = async () => {
    if (!selectedUserId) return;
    try {
      const data = await api<{ ok: true; conversation: Conversation }>('/api/admin/messaging', { method: 'POST', body: JSON.stringify({ action: 'conversation', participantId: selectedUserId }) });
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
    const body = draft;
    setDraft('');
    try {
      const data = await api<{ ok: true; message: Message }>('/api/admin/messaging', { method: 'POST', body: JSON.stringify({ action: 'message', conversationId: selectedId, body }) });
      setMessages((current) => [...current, data.message]);
      setConversations((current) => current.map((conversation) => conversation.id === selectedId ? { ...conversation, lastActivityAt: data.message.createdAt, lastMessagePreview: data.message.body } : conversation));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a mensagem.');
    }
  };

  const confirmDeleteConversation = async () => {
    if (!selectedId) return;
    setDeleting(true);
    try {
      await api('/api/admin/messaging', { method: 'DELETE', body: JSON.stringify({ conversationId: selectedId }) });
      setConversations((current) => current.filter((c) => c.id !== selectedId));
      setSelectedId('');
      setMessages([]);
      setShowDeleteModal(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir a conversa.');
    } finally {
      setDeleting(false);
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
              <p className="mt-1 text-sm text-gray-600">Chat interno em tempo real com status de envio, leitura e exclusão de conversas.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600"><Users className="h-4 w-4" /> Equipe RBN</div>
          </div>
          {error && <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => setError('')} className="font-bold">×</button></div>}

          <div className="grid min-h-[640px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:grid-cols-[320px_1fr]">
            {/* Sidebar with conversations */}
            <aside className="flex flex-col border-b border-gray-200 md:border-b-0 md:border-r">
              <div className="border-b border-gray-200 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Nova conversa</label>
                <div className="flex gap-2">
                  <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm">
                    <option value="">Selecionar colega</option>
                    {filteredDirectory.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.isOnline ? '🟢 Online' : 'Offline'})</option>)}
                  </select>
                  <button type="button" onClick={startConversation} disabled={!selectedUserId} className="rounded-lg bg-[#991B1B] p-2 text-white hover:bg-[#7f1616] disabled:opacity-40" aria-label="Iniciar conversa"><Plus className="h-5 w-5" /></button>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Pesquisar usuários" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#991B1B] focus:outline-none" />
                </div>
              </div>

              <div className="border-b border-gray-200 p-3">
                <input value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Pesquisar conversas" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#991B1B] focus:outline-none" />
              </div>

              <div className="flex-1 space-y-0.5 overflow-y-auto">
                {loading && <p className="p-5 text-sm text-gray-500">Carregando conversas...</p>}
                {!loading && conversations.length === 0 && <p className="p-5 text-sm text-gray-500">Nenhuma conversa ativa.</p>}
                {filteredConversations.map((conversation) => {
                  const participantId = conversation.participantIds.find((id) => id !== currentUser.id);
                  const participant = directory.find((user) => user.id === participantId);
                  const unreadCount = unreadByConversation[conversation.id] ?? 0;
                  const isSelected = selectedId === conversation.id;

                  return (
                    <button
                      type="button"
                      key={conversation.id}
                      onClick={() => { setSelectedId(conversation.id); void fetchMessages(conversation.id); }}
                      className={`flex w-full items-center gap-3 border-b border-gray-100 p-3.5 text-left transition ${isSelected ? 'bg-red-50/80 font-medium' : 'hover:bg-gray-50'}`}
                    >
                      <div className="relative shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#991B1B] text-sm font-bold text-white">
                          {(participant?.name ?? 'U').slice(0, 1).toUpperCase()}
                        </div>
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${participant?.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <strong className="truncate text-sm text-gray-900">{participant?.name ?? 'Colega de trabalho'}</strong>
                          {unreadCount > 0 && (
                            <span className="rounded-full bg-[#991B1B] px-2 py-0.5 text-[10px] font-bold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 block truncate text-xs text-gray-500">{conversation.lastMessagePreview || 'Conversa iniciada'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Main Chat Area */}
            <section className="flex min-h-[640px] flex-col bg-gray-50">
              {selectedConversation ? (
                <>
                  <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#991B1B] text-sm font-bold text-white">
                          {(otherUser?.name ?? 'U').slice(0, 1).toUpperCase()}
                        </div>
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${otherUser?.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">{otherUser?.name ?? 'Conversa'}</h2>
                        <p className="text-xs text-gray-500">
                          {otherUser?.isOnline ? <span className="font-semibold text-emerald-600">🟢 On-line</span> : 'Off-line'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" /> Excluir conversa
                    </button>
                  </header>

                  <div className="flex-1 space-y-4 overflow-y-auto p-6">
                    {messages.length === 0 && (
                      <div className="my-auto py-12 text-center text-sm text-gray-500">
                        <MessageCircle className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2">Nenhuma mensagem nesta conversa ainda. Envie um "Olá"!</p>
                      </div>
                    )}
                    {messages.map((message) => {
                      const isMine = message.senderId === currentUser.id;
                      return (
                        <div key={message.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm text-sm ${isMine ? 'bg-[#991B1B] text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                            <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isMine ? 'text-white/80' : 'text-gray-400'}`}>
                              <time>{new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                              {isMine && (
                                <span title={message.isRead ? 'Visualizada' : 'Entregue'}>
                                  {message.isRead ? (
                                    <CheckCheck className="h-3.5 w-3.5 text-sky-300" />
                                  ) : (
                                    <CheckCheck className="h-3.5 w-3.5 text-white/70" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-200 bg-white p-4">
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      disabled={!hasPermission(currentUser, 'messages:send')}
                      maxLength={5000}
                      placeholder="Escreva uma mensagem..."
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#991B1B] focus:outline-none"
                    />
                    <button type="submit" disabled={!draft.trim()} className="inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-5 py-2.5 font-semibold text-white hover:bg-[#7f1616] disabled:opacity-40">
                      <Send className="h-4 w-4" /> Enviar
                    </button>
                  </form>
                </>
              ) : (
                <div className="my-auto p-12 text-center text-gray-400">
                  <MessageCircle className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-3 text-lg font-semibold text-gray-700">Selecione uma conversa</h3>
                  <p className="mt-1 text-sm text-gray-500">Escolha um colega na lista à esquerda para iniciar o bate-papo.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Confirmation Modal for Chat Deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Excluir conversa</h3>
            <p className="mt-2 text-sm text-gray-600">
              Tem certeza que deseja excluir esta conversa com <strong>{otherUser?.name ?? 'este usuário'}</strong>? A conversa será removida da sua lista de mensagens.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={confirmDeleteConversation} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Excluindo...' : 'Sim, excluir conversa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


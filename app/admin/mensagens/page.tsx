'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { getCurrentAdminUser, hasPermission } from '@/app/lib/adminPermissions';
import {
  Archive,
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  Copy,
  CornerUpLeft,
  Download,
  FileText,
  Hand,
  Image as ImageIcon,
  Info,
  MessageCircle,
  Mic,
  MicOff,
  Monitor,
  MoreVertical,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  PhoneOff,
  Pin,
  Play,
  Plus,
  Search,
  Send,
  Smile,
  Trash2,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  lastSeenAt?: string | null;
  isOnline?: boolean;
};

type Attachment = {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  url: string;
  size?: number;
  mimeType?: string;
};

type MessageReaction = {
  emoji: string;
  userIds: string[];
};

type Conversation = {
  id: string;
  participantIds: string[];
  hiddenFor?: string[];
  createdBy: string;
  createdAt: string;
  lastActivityAt: string;
  lastMessagePreview?: string;
  isGroup?: boolean;
  name?: string;
  avatar?: string;
  description?: string;
  archivedFor?: string[];
  mutedFor?: string[];
  pinnedFor?: string[];
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  readAt?: string;
  replyToId?: string;
  replyToPreview?: { senderName?: string; text?: string };
  attachments?: Attachment[];
  reactions?: MessageReaction[];
  pinned?: boolean;
  isRead?: boolean;
};

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉'];

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

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateSeparator(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return 'Hoje';
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
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
  const [tabFilter, setTabFilter] = useState<'all' | 'unread' | 'groups' | 'archived'>('all');
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMsgId, setEditingMsgId] = useState('');
  const [editingMsgText, setEditingMsgText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals & Panels
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showVoiceCallModal, setShowVoiceCallModal] = useState(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearchInChat, setShowSearchInChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Audio Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);

  // Group creation form
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Call States (WebRTC ready)
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Mobile navigation
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Videoconferência & Toast States
  const [activeView, setActiveView] = useState<'chat' | 'videoconferencia'>('chat');
  const [meetingRoomName, setMeetingRoomName] = useState('RBN_Geral');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const copyMeetingLink = useCallback((room?: string) => {
    const roomToUse = room || meetingRoomName || (selectedId ? `RBN_Call_${selectedId}` : 'RBN_Geral');
    const url = `https://meet.jit.si/${roomToUse}`;
    navigator.clipboard.writeText(url);
    showToast('Link da Videoconferência copiado para a área de transferência!');
  }, [meetingRoomName, selectedId, showToast]);

  const sendMeetingLinkToChat = useCallback(async () => {
    const roomToUse = meetingRoomName || (selectedId ? `RBN_Call_${selectedId}` : 'RBN_Geral');
    const url = `https://meet.jit.si/${roomToUse}`;
    const text = `📹 *Videoconferência RBN (WebRTC Realtime)*\n\nLink de Acesso Direto:\n${url}`;

    if (selectedId) {
      try {
        const data = await api<{ ok: true; message: Message }>('/api/admin/messaging', {
          method: 'POST',
          body: JSON.stringify({ action: 'message', conversationId: selectedId, body: text }),
        });
        setMessages((current) => [...current, data.message]);
        showToast('Link da reunião enviado na conversa atual!');
      } catch {
        showToast('Não foi possível enviar o link na conversa.');
      }
    } else {
      navigator.clipboard.writeText(text);
      showToast('Link copiado! Escolha um colega ou grupo na barra lateral para colar e enviar.');
    }
  }, [meetingRoomName, selectedId, showToast]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentUser = getCurrentAdminUser();

  const selectedConversation = useMemo(() => conversations.find((c) => c.id === selectedId), [conversations, selectedId]);

  const otherUser = useMemo(() => {
    if (!selectedConversation || selectedConversation.isGroup) return null;
    const id = selectedConversation.participantIds.find((pId) => pId !== currentUser?.id);
    return directory.find((user) => user.id === id);
  }, [currentUser?.id, directory, selectedConversation]);

  const conversationTitle = useMemo(() => {
    if (!selectedConversation) return '';
    if (selectedConversation.isGroup) return selectedConversation.name || 'Grupo sem nome';
    return otherUser?.name || 'Colega de trabalho';
  }, [otherUser?.name, selectedConversation]);

  const filteredDirectory = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return directory.filter((user) => !query || `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query));
  }, [directory, userSearch]);

  const filteredConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    const userId = currentUser?.id || '';

    return conversations.filter((conversation) => {
      const isArchived = conversation.archivedFor?.includes(userId);
      if (tabFilter === 'archived' && !isArchived) return false;
      if (tabFilter !== 'archived' && isArchived) return false;
      if (tabFilter === 'groups' && !conversation.isGroup) return false;
      if (tabFilter === 'unread' && !(unreadByConversation[conversation.id] > 0)) return false;

      if (!query) return true;
      const participantId = conversation.participantIds.find((id) => id !== userId);
      const participant = directory.find((user) => user.id === participantId);
      const title = conversation.isGroup ? conversation.name : participant?.name;
      return `${title ?? ''} ${conversation.lastMessagePreview ?? ''}`.toLowerCase().includes(query);
    }).sort((a, b) => {
      const aPinned = a.pinnedFor?.includes(userId) ? 1 : 0;
      const bPinned = b.pinnedFor?.includes(userId) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    });
  }, [conversations, conversationSearch, currentUser?.id, directory, tabFilter, unreadByConversation]);

  const searchedMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return [];
    const q = chatSearchQuery.toLowerCase();
    return messages.filter((m) => m.body.toLowerCase().includes(q));
  }, [chatSearchQuery, messages]);

  const pinnedMessage = useMemo(() => messages.find((m) => m.pinned), [messages]);

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
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      void api('/api/admin/messaging', { method: 'POST', body: JSON.stringify({ action: 'heartbeat' }) }).catch(() => undefined);
      void loadConversations();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loadConversations, loadInitial]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void fetchMessages(selectedId);
    const msgInterval = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      void fetchMessages(selectedId);
    }, 8_000);
    return () => window.clearInterval(msgInterval);
  }, [fetchMessages, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Call Timers
  useEffect(() => {
    if (showVoiceCallModal || showVideoCallModal) {
      callIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
      setCallDuration(0);
    }
    return () => {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    };
  }, [showVoiceCallModal, showVideoCallModal]);

  // Actions
  const startConversation = async (participantId?: string) => {
    const targetId = participantId || selectedUserId;
    if (!targetId) return;
    try {
      const data = await api<{ ok: true; conversation: Conversation }>('/api/admin/messaging', {
        method: 'POST',
        body: JSON.stringify({ action: 'conversation', participantId: targetId }),
      });
      setConversations((current) => (current.some((item) => item.id === data.conversation.id) ? current : [data.conversation, ...current]));
      setSelectedId(data.conversation.id);
      setSelectedUserId('');
      setMobileView('chat');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar a conversa.');
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedGroupParticipants.length === 0) return;
    setCreatingGroup(true);
    try {
      const data = await api<{ ok: true; conversation: Conversation }>('/api/admin/messaging', {
        method: 'POST',
        body: JSON.stringify({
          action: 'group',
          name: groupName.trim(),
          description: groupDescription.trim(),
          participantIds: selectedGroupParticipants,
        }),
      });
      setConversations((current) => [data.conversation, ...current]);
      setSelectedId(data.conversation.id);
      setShowCreateGroupModal(false);
      setGroupName('');
      setGroupDescription('');
      setSelectedGroupParticipants([]);
      setMobileView('chat');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar o grupo.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const sendMessage = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!selectedId || (!draft.trim() && attachments.length === 0)) return;

    const bodyText = draft.trim();
    const sendAttachments = [...attachments];
    const replyData = replyingTo
      ? {
          replyToId: replyingTo.id,
          replyToPreview: {
            senderName: directory.find((u) => u.id === replyingTo.senderId)?.name || 'Usuário',
            text: replyingTo.body.slice(0, 80),
          },
        }
      : {};

    setDraft('');
    setAttachments([]);
    setReplyingTo(null);

    try {
      const data = await api<{ ok: true; message: Message }>('/api/admin/messaging', {
        method: 'POST',
        body: JSON.stringify({
          action: 'message',
          conversationId: selectedId,
          body: bodyText,
          attachments: sendAttachments,
          ...replyData,
        }),
      });
      setMessages((current) => [...current, data.message]);
      setConversations((current) =>
        current.map((c) =>
          c.id === selectedId
            ? { ...c, lastActivityAt: data.message.createdAt, lastMessagePreview: bodyText || 'Anexo enviado' }
            : c
        )
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a mensagem.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        let type: Attachment['type'] = 'other';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('word') || file.type.includes('excel')) type = 'document';

        const newAttachment: Attachment = {
          id: Math.random().toString(36).substring(2),
          name: file.name,
          type,
          url: reader.result as string,
          size: file.size,
          mimeType: file.type,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      const data = await api<{ ok: true; message: Message }>('/api/admin/messaging', {
        method: 'POST',
        body: JSON.stringify({ action: 'reaction', messageId, emoji }),
      });
      setMessages((current) => current.map((m) => (m.id === messageId ? data.message : m)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível reagir.');
    }
  };

  const togglePinMessage = async (messageId: string) => {
    try {
      const data = await api<{ ok: true; message: Message }>('/api/admin/messaging', {
        method: 'POST',
        body: JSON.stringify({ action: 'pinMessage', messageId }),
      });
      setMessages((current) => current.map((m) => (m.id === messageId ? data.message : m)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível fixar a mensagem.');
    }
  };

  const saveEditMessage = async (messageId: string) => {
    if (!editingMsgText.trim()) return;
    try {
      const data = await api<{ ok: true; message: Message }>('/api/admin/messaging', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'edit', messageId, body: editingMsgText.trim() }),
      });
      setMessages((current) => current.map((m) => (m.id === messageId ? { ...m, body: data.message.body } : m)));
      setEditingMsgId('');
      setEditingMsgText('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível editar a mensagem.');
    }
  };

  const deleteSingleMessage = async (messageId: string) => {
    if (!window.confirm('Deseja apagar esta mensagem?')) return;
    try {
      await api('/api/admin/messaging', { method: 'DELETE', body: JSON.stringify({ messageId }) });
      setMessages((current) => current.filter((m) => m.id !== messageId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível apagar a mensagem.');
    }
  };

  const toggleConversationArchive = async (convId: string) => {
    try {
      await api('/api/admin/messaging', { method: 'POST', body: JSON.stringify({ action: 'toggleArchive', conversationId: convId }) });
      void loadConversations();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível alterar status de arquivamento.');
    }
  };

  const toggleConversationMute = async (convId: string) => {
    try {
      await api('/api/admin/messaging', { method: 'POST', body: JSON.stringify({ action: 'toggleMute', conversationId: convId }) });
      void loadConversations();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível silenciar a conversa.');
    }
  };

  const toggleConversationPin = async (convId: string) => {
    try {
      await api('/api/admin/messaging', { method: 'POST', body: JSON.stringify({ action: 'togglePinConv', conversationId: convId }) });
      void loadConversations();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível fixar a conversa.');
    }
  };

  const confirmDeleteConversation = async () => {
    if (!selectedId) return;
    try {
      await api('/api/admin/messaging', { method: 'DELETE', body: JSON.stringify({ conversationId: selectedId }) });
      setConversations((current) => current.filter((c) => c.id !== selectedId));
      setSelectedId('');
      setMessages([]);
      setShowDeleteModal(false);
      setMobileView('list');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir a conversa.');
    }
  };

  // Audio Recording Mock
  const startRecordingAudio = () => {
    setIsRecordingAudio(true);
    setAudioTimer(0);
    audioIntervalRef.current = setInterval(() => {
      setAudioTimer((t) => t + 1);
    }, 1000);
  };

  const stopAndSendAudio = () => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    setIsRecordingAudio(false);
    const mockAudio: Attachment = {
      id: Math.random().toString(36).substring(2),
      name: `Áudio_${new Date().toLocaleTimeString('pt-BR')}.mp3`,
      type: 'audio',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      size: 450000,
    };
    setAttachments((prev) => [...prev, mockAudio]);
    setAudioTimer(0);
  };

  const cancelRecordingAudio = () => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    setIsRecordingAudio(false);
    setAudioTimer(0);
  };

  if (!currentUser || !hasPermission(currentUser, 'messages:view')) return null;

  return (
    <div className="flex min-h-screen bg-[#f5f3ef]">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-3 md:p-6">
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
            <Check className="w-4 h-4 text-white" />
            <span>{toastMessage}</span>
          </div>
        )}
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#991B1B]">Central Corporativa</p>
              <h1 className="mt-0.5 text-2xl font-bold text-gray-900 md:text-3xl">Comunicação Interna</h1>
              <p className="mt-0.5 text-xs text-gray-600 md:text-sm">Mensagens instantâneas, arquivos, áudios e conferência para a equipe RBN.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView((v) => (v === 'videoconferencia' ? 'chat' : 'videoconferencia'))}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition ${
                  activeView === 'videoconferencia'
                    ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border-[#991B1B] bg-white text-[#991B1B] hover:bg-red-50'
                }`}
              >
                <Video className="h-4 w-4" />
                {activeView === 'videoconferencia' ? '← Voltar pras Mensagens' : 'Videoconferência RBN'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#991B1B] bg-white px-3 py-2 text-xs font-semibold text-[#991B1B] shadow-sm transition hover:bg-red-50"
              >
                <Users className="h-4 w-4" /> Novo Grupo
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="font-bold">×</button>
            </div>
          )}

          {/* Main 3-Column / Responsive Chat Container */}
          <div className="grid min-h-[680px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg md:grid-cols-[320px_1fr] lg:grid-cols-[340px_1fr]">
            {/* Sidebar (Column 1) */}
            <aside
              className={`flex flex-col border-r border-gray-200 bg-white ${
                mobileView === 'chat' ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Top Controls */}
              <div className="space-y-3 border-b border-gray-200 p-4">
                {/* User selection dropdown */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Nova Conversa Direta</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#991B1B] focus:outline-none"
                    >
                      <option value="">Selecionar colega...</option>
                      {filteredDirectory.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.isOnline ? '🟢 Online' : 'Offline'})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void startConversation()}
                      disabled={!selectedUserId}
                      className="rounded-xl bg-[#991B1B] p-2 text-white shadow transition hover:bg-[#7f1616] disabled:opacity-40"
                      title="Iniciar conversa"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    value={conversationSearch}
                    onChange={(e) => setConversationSearch(e.target.value)}
                    placeholder="Pesquisar conversas ou pessoas..."
                    className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-xs focus:border-[#991B1B] focus:outline-none"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 overflow-x-auto pt-1">
                  {(['all', 'unread', 'groups', 'archived', 'videoconferencia'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        if (tab === 'videoconferencia') {
                          setActiveView('videoconferencia');
                        } else {
                          setActiveView('chat');
                          setTabFilter(tab);
                        }
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition shrink-0 ${
                        (activeView === 'videoconferencia' && tab === 'videoconferencia') || (activeView === 'chat' && tabFilter === tab)
                          ? 'bg-[#991B1B] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab === 'all' && 'Todas'}
                      {tab === 'unread' && 'Não lidas'}
                      {tab === 'groups' && 'Grupos'}
                      {tab === 'archived' && 'Arquivadas'}
                      {tab === 'videoconferencia' && '📹 Conferência'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 space-y-0.5 overflow-y-auto">
                {loading && <p className="p-6 text-center text-xs text-gray-500">Carregando conversas...</p>}
                {!loading && filteredConversations.length === 0 && (
                  <p className="p-6 text-center text-xs text-gray-500">Nenhuma conversa encontrada neste filtro.</p>
                )}
                {filteredConversations.map((conversation) => {
                  const participantId = conversation.participantIds.find((id) => id !== currentUser.id);
                  const participant = directory.find((user) => user.id === participantId);
                  const unreadCount = unreadByConversation[conversation.id] ?? 0;
                  const isSelected = selectedId === conversation.id;
                  const isPinned = conversation.pinnedFor?.includes(currentUser.id);
                  const isMuted = conversation.mutedFor?.includes(currentUser.id);

                  return (
                    <div
                      key={conversation.id}
                      className={`group relative flex items-center justify-between border-b border-gray-100 p-3 transition ${
                        isSelected ? 'bg-red-50/90 font-medium border-l-4 border-l-[#991B1B]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(conversation.id);
                          void fetchMessages(conversation.id);
                          setMobileView('chat');
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="relative shrink-0">
                          {conversation.isGroup ? (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111827] text-xs font-bold text-white shadow">
                              <Users className="h-5 w-5" />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#991B1B] text-xs font-bold text-white shadow">
                              {(participant?.name ?? 'U').slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          {!conversation.isGroup && (
                            <span
                              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                                participant?.isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                              }`}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <strong className="truncate text-xs font-semibold text-gray-900">
                              {conversation.isGroup ? conversation.name : participant?.name ?? 'Colega'}
                            </strong>
                            <span className="text-[10px] text-gray-400">
                              {new Date(conversation.lastActivityAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-1">
                            <p className="truncate text-[11px] text-gray-500">{conversation.lastMessagePreview || 'Conversa iniciada'}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              {isMuted && <VolumeX className="h-3 w-3 text-gray-400" />}
                              {isPinned && <Pin className="h-3 w-3 text-[#991B1B]" />}
                              {unreadCount > 0 && (
                                <span className="rounded-full bg-[#991B1B] px-1.5 py-0.5 text-[9px] font-bold text-white">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Quick action popup button */}
                      <div className="ml-1 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void toggleConversationPin(conversation.id)}
                          className="p-1 text-gray-400 hover:text-[#991B1B]"
                          title={isPinned ? 'Desafixar' : 'Fixar conversa'}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleConversationMute(conversation.id)}
                          className="p-1 text-gray-400 hover:text-gray-800"
                          title={isMuted ? 'Ativar som' : 'Silenciar'}
                        >
                          {isMuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Chat & Info Panel Container (Column 2) */}
            <div className={`flex min-w-0 flex-1 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
              {/* Center Chat View or Embedded Videoconferência */}
              {activeView === 'videoconferencia' ? (
                <section className="flex min-w-0 flex-1 flex-col bg-gray-950 text-white">
                  {/* Top Bar with VOLTAR Button */}
                  <header className="flex flex-wrap items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3 shadow-md md:px-6">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveView('chat')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#991B1B] px-3.5 py-2 text-xs font-bold text-white shadow transition hover:bg-red-700 active:scale-95"
                        title="Voltar para as conversas"
                      >
                        <ArrowLeft className="h-4 w-4" /> VOLTAR PARA CONVERSAS
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-white">Videoconferência RBN (WebRTC)</h2>
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">🟢 Ao Vivo</span>
                        </div>
                        <p className="text-[11px] text-gray-400">Transmissão em tempo real integrada aos usuários do sistema</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                      <button
                        type="button"
                        onClick={() => copyMeetingLink()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-gray-700"
                        title="Copiar link de acesso"
                      >
                        <Copy className="h-4 w-4 text-emerald-400" /> Copiar Link
                      </button>
                      <button
                        type="button"
                        onClick={() => void sendMeetingLinkToChat()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 shadow"
                        title="Enviar link na conversa atual"
                      >
                        <Send className="h-4 w-4" /> Enviar Link no Chat
                      </button>
                    </div>
                  </header>

                  {/* Registered Users Directory Bar */}
                  <div className="border-b border-gray-800 bg-gray-900/90 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Users className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="font-semibold text-gray-300 shrink-0">Usuários Cadastrados ({directory.length}):</span>
                      <div className="flex flex-wrap gap-1.5 overflow-x-auto max-h-12 py-0.5">
                        {directory.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              const room = `RBN_${user.name.replace(/\s+/g, '_')}`;
                              setMeetingRoomName(room);
                              copyMeetingLink(room);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-[11px] font-medium text-gray-200 hover:bg-gray-700 transition"
                            title={`Convidar / Iniciar reunião com ${user.name}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${user.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                            <span className="font-semibold">{user.name}</span>
                            <span className="text-[9px] text-gray-400">({user.role})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* WebRTC Video Room Iframe */}
                  <div className="flex-1 bg-black p-2 relative">
                    <iframe
                      src={`https://meet.jit.si/${meetingRoomName}#userInfo.displayName="${encodeURIComponent(currentUser?.name || 'Membro RBN')}"`}
                      className="w-full h-full rounded-xl border-0 shadow-2xl"
                      allow="camera; microphone; display-capture; autoplay; clipboard-write"
                      title="Sala de Videoconferência RBN"
                    />
                  </div>
                </section>
              ) : (
                <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <header className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:px-6">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setMobileView('list')}
                          className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 md:hidden"
                          title="Voltar para conversas"
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="relative">
                          {selectedConversation.isGroup ? (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111827] text-xs font-bold text-white">
                              <Users className="h-5 w-5" />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#991B1B] text-xs font-bold text-white">
                              {(otherUser?.name ?? 'U').slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          {!selectedConversation.isGroup && (
                            <span
                              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                                otherUser?.isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                              }`}
                            />
                          )}
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-gray-900 md:text-base">{conversationTitle}</h2>
                          <p className="text-[11px] text-gray-500">
                            {selectedConversation.isGroup ? (
                              `${selectedConversation.participantIds.length} participantes`
                            ) : otherUser?.isOnline ? (
                              <span className="font-semibold text-emerald-600">🟢 On-line</span>
                            ) : (
                              'Off-line'
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1 md:gap-2">
                        <button
                          type="button"
                          onClick={() => setShowVoiceCallModal(true)}
                          className="rounded-xl border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:border-[#991B1B] hover:text-[#991B1B]"
                          title="Chamada de voz"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowVideoCallModal(true)}
                          className="rounded-xl border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:border-[#991B1B] hover:text-[#991B1B]"
                          title="Videoconferência"
                        >
                          <Video className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSearchInChat((prev) => !prev)}
                          className={`rounded-xl border p-2 shadow-sm transition ${
                            showSearchInChat
                              ? 'border-[#991B1B] bg-red-50 text-[#991B1B]'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-[#991B1B]'
                          }`}
                          title="Pesquisar nesta conversa"
                        >
                          <Search className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowInfoPanel((prev) => !prev)}
                          className={`rounded-xl border p-2 shadow-sm transition ${
                            showInfoPanel
                              ? 'border-[#991B1B] bg-red-50 text-[#991B1B]'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-[#991B1B]'
                          }`}
                          title="Informações da conversa"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                    </header>

                    {/* Search inside chat banner */}
                    {showSearchInChat && (
                      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 text-xs">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                          placeholder="Pesquisar mensagem..."
                          className="flex-1 border-none text-xs focus:outline-none"
                        />
                        <span className="text-[11px] font-semibold text-gray-500">
                          {searchedMessages.length} resultado(s)
                        </span>
                        <button type="button" onClick={() => setShowSearchInChat(false)}>
                          <X className="h-4 w-4 text-gray-400 hover:text-gray-700" />
                        </button>
                      </div>
                    )}

                    {/* Pinned Message Bar */}
                    {pinnedMessage && (
                      <div className="flex items-center justify-between border-b border-red-100 bg-red-50/80 px-4 py-2 text-xs text-[#991B1B]">
                        <div className="flex items-center gap-2 min-w-0">
                          <Pin className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-semibold shrink-0">Mensagem fixada:</span>
                          <span className="truncate text-gray-800">{pinnedMessage.body}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void togglePinMessage(pinnedMessage.id)}
                          className="text-xs font-bold underline shrink-0 ml-2"
                        >
                          Desafixar
                        </button>
                      </div>
                    )}

                    {/* Messages Feed */}
                    <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
                      {messages.length === 0 && (
                        <div className="my-auto py-16 text-center text-xs text-gray-400">
                          <MessageCircle className="mx-auto h-10 w-10 text-gray-300" />
                          <p className="mt-2 text-sm font-semibold text-gray-600">Nenhuma mensagem enviada ainda.</p>
                          <p className="mt-0.5">Escreva um "Olá" ou envie um arquivo para iniciar a conversa.</p>
                        </div>
                      )}

                      {messages.map((message, index) => {
                        const isMine = message.senderId === currentUser.id;
                        const isEditing = editingMsgId === message.id;
                        const senderUser = directory.find((u) => u.id === message.senderId);

                        // Date Separator calculation
                        const currentDate = new Date(message.createdAt).toDateString();
                        const prevDate = index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
                        const showDateSeparator = currentDate !== prevDate;

                        return (
                          <div key={message.id} className="space-y-3">
                            {showDateSeparator && (
                              <div className="my-4 flex items-center justify-center">
                                <span className="rounded-full bg-gray-200/80 px-3 py-1 text-[10px] font-bold text-gray-600 shadow-xs">
                                  {formatDateSeparator(message.createdAt)}
                                </span>
                              </div>
                            )}

                            <div className={`group flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                              {/* Sender Name in Group Chat */}
                              {selectedConversation.isGroup && !isMine && (
                                <span className="mb-1 ml-1 text-[10px] font-bold text-gray-500">
                                  {senderUser?.name ?? 'Membro'}
                                </span>
                              )}

                              <div className="relative max-w-[85%] md:max-w-[75%]">
                                <div
                                  className={`rounded-2xl px-4 py-3 shadow-sm text-xs md:text-sm ${
                                    isMine
                                      ? 'bg-[#991B1B] text-white rounded-br-none'
                                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                                  }`}
                                >
                                  {/* Reply Preview */}
                                  {message.replyToPreview && (
                                    <div
                                      className={`mb-2 rounded-lg p-2 text-xs border-l-4 ${
                                        isMine ? 'bg-white/10 border-white text-white' : 'bg-gray-100 border-[#991B1B] text-gray-700'
                                      }`}
                                    >
                                      <p className="font-bold text-[10px]">{message.replyToPreview.senderName}</p>
                                      <p className="truncate text-[11px] opacity-90">{message.replyToPreview.text}</p>
                                    </div>
                                  )}

                                  {/* Editing View */}
                                  {isEditing ? (
                                    <div className="flex flex-col gap-2">
                                      <textarea
                                        value={editingMsgText}
                                        onChange={(e) => setEditingMsgText(e.target.value)}
                                        className="w-full rounded-lg border border-white/40 bg-white/10 p-2 text-xs text-white focus:outline-none"
                                        rows={2}
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setEditingMsgId('')}
                                          className="rounded bg-white/20 p-1 text-xs text-white hover:bg-white/30"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void saveEditMessage(message.id)}
                                          className="rounded bg-white px-2 py-1 text-xs font-bold text-[#991B1B]"
                                        >
                                          Salvar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Message Body */}
                                      {message.body && (
                                        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
                                      )}

                                      {/* Attachments */}
                                      {message.attachments && message.attachments.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                          {message.attachments.map((att) => (
                                            <div key={att.id} className="rounded-xl overflow-hidden border border-black/10 bg-black/5 p-2">
                                              {att.type === 'image' && (
                                                <div className="space-y-1">
                                                  <img
                                                    src={att.url}
                                                    alt={att.name}
                                                    className="max-h-60 rounded-lg object-cover cursor-pointer transition hover:opacity-95"
                                                    onClick={() => setPreviewImage(att.url)}
                                                  />
                                                  <a
                                                    href={att.url}
                                                    download={att.name}
                                                    className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                                                      isMine ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                                  >
                                                    <Download className="h-3 w-3" /> {att.name}
                                                  </a>
                                                </div>
                                              )}

                                              {att.type === 'audio' && (
                                                <div className="flex items-center gap-2 p-1">
                                                  <audio controls src={att.url} className="h-8 max-w-full" />
                                                </div>
                                              )}

                                              {att.type === 'document' && (
                                                <div className="flex items-center justify-between gap-3 p-1">
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <FileText className="h-5 w-5 shrink-0" />
                                                    <div className="min-w-0">
                                                      <p className="truncate text-xs font-bold">{att.name}</p>
                                                      <p className="text-[10px] opacity-70">{formatFileSize(att.size)}</p>
                                                    </div>
                                                  </div>
                                                  <a
                                                    href={att.url}
                                                    download={att.name}
                                                    className="rounded-lg bg-black/10 p-1.5 hover:bg-black/20"
                                                    title="Baixar arquivo"
                                                  >
                                                    <Download className="h-4 w-4" />
                                                  </a>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Timestamp & Status */}
                                      <div
                                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                                          isMine ? 'text-white/80' : 'text-gray-400'
                                        }`}
                                      >
                                        {message.isEdited && <span>(editada)</span>}
                                        <time>
                                          {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </time>
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
                                    </>
                                  )}
                                </div>

                                {/* Emoji Reactions Badge under bubble */}
                                {message.reactions && message.reactions.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {message.reactions.map((r) => (
                                      <button
                                        key={r.emoji}
                                        type="button"
                                        onClick={() => void toggleReaction(message.id, r.emoji)}
                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-xs transition ${
                                          r.userIds.includes(currentUser.id)
                                            ? 'border-[#991B1B] bg-red-50 text-[#991B1B]'
                                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                      >
                                        <span>{r.emoji}</span>
                                        <span>{r.userIds.length}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Hover Action Toolbar */}
                                {!isEditing && (
                                  <div
                                    className={`absolute top-0 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 ${
                                      isMine ? '-left-28' : '-right-28'
                                    }`}
                                  >
                                    {/* Reaction quick picker */}
                                    <div className="flex rounded-full bg-white p-1 shadow-md border border-gray-100">
                                      {EMOJI_LIST.slice(0, 4).map((emoji) => (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={() => void toggleReaction(message.id, emoji)}
                                          className="px-1 text-xs hover:scale-125 transition"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setReplyingTo(message)}
                                      className="rounded-full bg-white p-1.5 text-gray-600 shadow hover:bg-gray-100"
                                      title="Responder"
                                    >
                                      <CornerUpLeft className="h-3.5 w-3.5" />
                                    </button>
                                    {isMine && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingMsgId(message.id);
                                          setEditingMsgText(message.body);
                                        }}
                                        className="rounded-full bg-white p-1.5 text-gray-600 shadow hover:bg-gray-100"
                                        title="Editar"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {(isMine || currentUser.role === 'admin') && (
                                      <button
                                        type="button"
                                        onClick={() => void deleteSingleMessage(message.id)}
                                        className="rounded-full bg-white p-1.5 text-red-600 shadow hover:bg-red-50"
                                        title="Apagar"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Pending Reply Bar */}
                    {replyingTo && (
                      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-100 px-4 py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <CornerUpLeft className="h-4 w-4 text-[#991B1B]" />
                          <span className="font-bold text-gray-700">Respondendo a:</span>
                          <span className="truncate text-gray-600">{replyingTo.body}</span>
                        </div>
                        <button type="button" onClick={() => setReplyingTo(null)}>
                          <X className="h-4 w-4 text-gray-500 hover:text-gray-800" />
                        </button>
                      </div>
                    )}

                    {/* Pending Attachments Bar */}
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 border-t border-gray-200 bg-gray-50 p-3">
                        {attachments.map((att, idx) => (
                          <div key={att.id} className="relative flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 text-xs shadow-xs">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="max-w-[120px] truncate font-semibold">{att.name}</span>
                            <button
                              type="button"
                              onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rich Composer Footer */}
                    <footer className="border-t border-gray-200 bg-white p-3">
                      {isRecordingAudio ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 animate-ping rounded-full bg-red-600" />
                            <span className="font-bold">Gravando áudio: 00:0{audioTimer}s</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={cancelRecordingAudio}
                              className="rounded-lg border border-red-300 px-3 py-1 font-semibold text-red-700 hover:bg-red-100"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={stopAndSendAudio}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#991B1B] px-3 py-1 font-semibold text-white shadow"
                            >
                              <Send className="h-3.5 w-3.5" /> Enviar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={sendMessage} className="flex items-end gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            multiple
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition hover:border-[#991B1B] hover:text-[#991B1B]"
                            title="Anexar arquivo"
                          >
                            <Paperclip className="h-5 w-5" />
                          </button>

                          <button
                            type="button"
                            onClick={startRecordingAudio}
                            className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition hover:border-[#991B1B] hover:text-[#991B1B]"
                            title="Gravar áudio"
                          >
                            <Mic className="h-5 w-5" />
                          </button>

                          <div className="relative flex-1">
                            <textarea
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  void sendMessage();
                                }
                              }}
                              disabled={!hasPermission(currentUser, 'messages:send')}
                              maxLength={5000}
                              placeholder="Escreva uma mensagem... (Enter envia, Shift+Enter pula linha)"
                              rows={1}
                              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-xs focus:border-[#991B1B] focus:outline-none md:text-sm"
                            />
                            {showEmojiPicker && (
                              <div className="absolute bottom-12 left-0 z-20 flex gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                                {EMOJI_LIST.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      setDraft((prev) => prev + emoji);
                                      setShowEmojiPicker(false);
                                    }}
                                    className="p-1 text-lg hover:scale-125 transition"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker((p) => !p)}
                            className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition hover:border-[#991B1B] hover:text-[#991B1B]"
                            title="Emojis"
                          >
                            <Smile className="h-5 w-5" />
                          </button>

                          <button
                            type="submit"
                            disabled={!draft.trim() && attachments.length === 0}
                            className="inline-flex items-center justify-center rounded-xl bg-[#991B1B] px-4 py-2.5 font-bold text-white shadow-md transition hover:bg-[#7f1616] disabled:opacity-40"
                          >
                            <Send className="h-5 w-5" />
                          </button>
                        </form>
                      )}
                    </footer>
                  </>
                ) : (
                  <div className="my-auto p-12 text-center text-gray-400">
                    <MessageCircle className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-3 text-lg font-semibold text-gray-700">Selecione uma conversa</h3>
                    <p className="mt-1 text-xs text-gray-500 mb-6">Escolha um colega ou grupo na barra lateral para iniciar o bate-papo.</p>
                    <button
                      type="button"
                      onClick={() => setActiveView('videoconferencia')}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#991B1B] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#7f1616] active:scale-95"
                    >
                      <Video className="h-4 w-4" /> Entrar na Videoconferência RBN (WebRTC)
                    </button>
                  </div>
                )}
              </section>
            )}

              {/* Information Drawer (Column 3) */}
              {showInfoPanel && selectedConversation && (
                <aside className="w-80 border-l border-gray-200 bg-white p-4 space-y-6 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <h3 className="font-bold text-gray-900 text-sm">Informações da Conversa</h3>
                    <button type="button" onClick={() => setShowInfoPanel(false)}>
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Profile Header */}
                  <div className="text-center">
                    {selectedConversation.isGroup ? (
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#111827] text-xl font-bold text-white shadow">
                        <Users className="h-8 w-8" />
                      </div>
                    ) : (
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#991B1B] text-xl font-bold text-white shadow">
                        {(otherUser?.name ?? 'U').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <h4 className="mt-3 font-bold text-gray-900 text-base">{conversationTitle}</h4>
                    <p className="text-xs text-gray-500">{otherUser?.role || 'Grupo Corporativo RBN'}</p>
                  </div>

                  {/* Participants List */}
                  <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Participantes ({selectedConversation.participantIds.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedConversation.participantIds.map((pId) => {
                        const pUser = directory.find((u) => u.id === pId);
                        return (
                          <div key={pId} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800">{pUser?.name || 'Membro'}</span>
                            <span className="text-[10px] text-gray-400">{pUser?.role || 'Colaborador'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Settings Actions */}
                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => void toggleConversationMute(selectedConversation.id)}
                      className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <VolumeX className="h-4 w-4 text-gray-500" /> Silenciar notificações
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleConversationArchive(selectedConversation.id)}
                      className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Archive className="h-4 w-4 text-gray-500" /> Arquivar conversa
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="flex w-full items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" /> Excluir conversa
                    </button>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Group Creation Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-gray-900">Criar Novo Grupo</h3>
              <button type="button" onClick={() => setShowCreateGroupModal(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <label className="block text-xs font-semibold text-gray-800">
              Nome do Grupo *
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Equipe de Jornalismo"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#991B1B] focus:outline-none"
              />
            </label>

            <label className="block text-xs font-semibold text-gray-800">
              Descrição (opcional)
              <input
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Ex: Alinhamento de matérias e pautas"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#991B1B] focus:outline-none"
              />
            </label>

            <div>
              <legend className="text-xs font-semibold text-gray-800">Selecione os Participantes</legend>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 p-2 space-y-1">
                {directory.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 rounded-lg p-1.5 text-xs hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGroupParticipants.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedGroupParticipants((prev) => [...prev, user.id]);
                        else setSelectedGroupParticipants((prev) => prev.filter((id) => id !== user.id));
                      }}
                    />
                    <span className="font-semibold text-gray-800">{user.name}</span>
                    <span className="text-[10px] text-gray-400">({user.role})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void createGroup()}
                disabled={creatingGroup || !groupName.trim() || selectedGroupParticipants.length === 0}
                className="rounded-xl bg-[#991B1B] px-4 py-2 text-xs font-semibold text-white shadow disabled:opacity-50"
              >
                {creatingGroup ? 'Criando...' : 'Criar Grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Call Modal */}
      {showVoiceCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm text-center rounded-3xl bg-gray-900 p-8 text-white shadow-2xl space-y-6">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#991B1B] text-3xl font-bold ring-8 ring-white/10">
              {(conversationTitle || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold">{conversationTitle}</h3>
              <p className="mt-1 text-xs text-gray-400">Chamada de Voz Corporativa</p>
              <p className="mt-2 font-mono text-sm font-bold text-emerald-400">
                00:{callDuration < 10 ? `0${callDuration}` : callDuration}
              </p>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className={`rounded-full p-4 transition ${isMuted ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                title={isMuted ? 'Desmutar' : 'Mutar microfone'}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>

              <button
                type="button"
                onClick={() => setShowVoiceCallModal(false)}
                className="rounded-full bg-red-600 p-4 text-white shadow-lg transition hover:bg-red-700"
                title="Encerrar chamada"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Conference Modal (WebRTC) */}
      {showVideoCallModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 p-4 text-white">
          <header className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="font-bold text-base">{conversationTitle || 'Equipe RBN'} — Videoconferência (WebRTC)</h3>
                <p className="text-xs text-emerald-400">
                  Transmissão ao vivo via RBN Meet (0% de custo de banda)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyMeetingLink(selectedId ? `RBN_Call_${selectedId}` : 'RBN_Geral')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800 transition"
              >
                <Copy className="h-3.5 w-3.5 text-emerald-400" /> Copiar Link
              </button>
              <button
                type="button"
                onClick={() => setShowVideoCallModal(false)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-md transition"
              >
                <ArrowLeft className="h-4 w-4" /> VOLTAR / Sair da Reunião
              </button>
            </div>
          </header>

          {/* WebRTC Video Room */}
          <div className="flex-1 my-3 rounded-2xl overflow-hidden bg-black border border-gray-800 shadow-2xl">
            <iframe
              src={`https://meet.jit.si/RBN_Call_${selectedId || 'General'}#userInfo.displayName="${encodeURIComponent(currentUser?.name || 'Membro RBN')}"`}
              className="w-full h-full border-0"
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              title="Videoconferência RBN WebRTC"
            />
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl">
            <img src={previewImage} alt="Visualização" className="max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 rounded-full bg-white p-2 text-gray-900 shadow-xl"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Chat Deletion */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Excluir conversa</h3>
            <p className="text-xs text-gray-600">
              Tem certeza que deseja excluir esta conversa com <strong>{conversationTitle}</strong>? A conversa será removida da sua lista.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteConversation()}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-700"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

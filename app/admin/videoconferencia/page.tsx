'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  RefreshCw,
  Search,
  Sparkles,
  Info,
  Shield,
  Send,
  AlertCircle
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
}

interface Videoconference {
  id: string;
  title: string;
  description: string;
  roomName: string;
  meetingUrl: string;
  scheduledFor: string;
  durationMinutes: number;
  hostEmail: string;
  hostName: string;
  invitedEmails: string[];
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  rsvps: Record<string, 'ACCEPTED' | 'DECLINED' | 'PENDING'>;
  createdAt: string;
}

export default function VideoconferenciaPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Videoconference[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'schedule' | 'instant'>('upcoming');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active call state
  const [activeMeeting, setActiveMeeting] = useState<Videoconference | null>(null);
  const [inCall, setInCall] = useState(false);

  // Schedule form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selectedInvitedEmails, setSelectedInvitedEmails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current session / users
      const userRes = await fetch('/api/admin/users', { cache: 'no-store' });
      if (userRes.ok) {
        const userData = await userRes.json();
        const realUsers = (userData.rows || [])
          .map((row: { id: string; payload?: Partial<User> }) => ({
            id: row.id,
            name: String(row.payload?.name ?? '').trim(),
            email: String(row.payload?.email ?? '').trim(),
            role: String(row.payload?.role ?? ''),
            department: String(row.payload?.department ?? ''),
          }))
          .filter((u: User) => Boolean(u.name) && Boolean(u.email));
        setUsers(realUsers);

        // Find logged-in user or default to first
        const meRes = await fetch('/api/auth/me').catch(() => null);
        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) setCurrentUser(meData.user);
          else if (realUsers.length > 0) setCurrentUser(realUsers[0]);
        } else if (realUsers.length > 0) {
          setCurrentUser(realUsers[0]);
        }
      }

      // 2. Fetch meetings
      await fetchMeetings();
    } catch (err) {
      console.error('Erro ao carregar dados de videoconferência:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/admin/videoconferencia');
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error('Erro ao buscar reuniões:', err);
    }
  };

  const handleCreateInstantMeeting = async () => {
    setSubmitting(true);
    try {
      const payload = {
        title: `Reunião Instantânea de ${currentUser?.name || 'Redação RBN'}`,
        description: 'Videoconferência instantânea via RBN Meet (WebRTC)',
        scheduledFor: new Date().toISOString(),
        durationMinutes: 60,
        hostEmail: currentUser?.email || 'admin@rbnbrasil.com.br',
        hostName: currentUser?.name || 'Administrador RBN',
        invitedEmails: selectedInvitedEmails,
      };

      const res = await fetch('/api/admin/videoconferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('Reunião instantânea criada com sucesso!');
        await fetchMeetings();
        // Join immediately
        startCall(data.meeting);
      } else {
        showToast('Erro ao criar reunião instantânea.');
      }
    } catch (err) {
      console.error('Erro:', err);
      showToast('Ocorreu um erro ao criar a reunião.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) {
      showToast('Por favor, preencha o título, data e horário.');
      return;
    }

    setSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${date}T${time}`).toISOString();
      const payload = {
        title,
        description,
        scheduledFor: scheduledDateTime,
        durationMinutes: Number(durationMinutes),
        hostEmail: currentUser?.email || 'admin@rbnbrasil.com.br',
        hostName: currentUser?.name || 'Administrador RBN',
        invitedEmails: selectedInvitedEmails,
      };

      const res = await fetch('/api/admin/videoconferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Reunião agendada e convites enviados por e-mail e chat!');
        setTitle('');
        setDescription('');
        setDate('');
        setTime('');
        setSelectedInvitedEmails([]);
        setActiveTab('upcoming');
        await fetchMeetings();
      } else {
        showToast('Erro ao agendar reunião.');
      }
    } catch (err) {
      console.error('Erro ao agendar:', err);
      showToast('Erro de conexão ao agendar reunião.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRSVP = async (meetingId: string, status: 'ACCEPTED' | 'DECLINED') => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/admin/videoconferencia', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RSVP',
          meetingId,
          userEmail: currentUser.email,
          rsvpStatus: status,
        }),
      });

      if (res.ok) {
        showToast(status === 'ACCEPTED' ? 'Presença confirmada!' : 'Convite recusado.');
        await fetchMeetings();
      }
    } catch (err) {
      console.error('Erro RSVP:', err);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta reunião?')) return;
    try {
      const res = await fetch(`/api/admin/videoconferencia?id=${meetingId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Reunião cancelada com sucesso.');
        await fetchMeetings();
      }
    } catch (err) {
      console.error('Erro ao excluir reunião:', err);
    }
  };

  const startCall = (meeting: Videoconference) => {
    setActiveMeeting(meeting);
    setInCall(true);
  };

  const endCall = () => {
    setInCall(false);
    setActiveMeeting(null);
  };

  const copyMeetingLink = (meeting: Videoconference) => {
    const url = meeting.meetingUrl || `https://meet.jit.si/${meeting.roomName}`;
    navigator.clipboard.writeText(url);
    setCopiedId(meeting.id);
    showToast('Link de acesso copiado!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const toggleInvitedUser = (email: string) => {
    if (selectedInvitedEmails.includes(email)) {
      setSelectedInvitedEmails(selectedInvitedEmails.filter(e => e !== email));
    } else {
      setSelectedInvitedEmails([...selectedInvitedEmails, email]);
    }
  };

  const upcomingMeetings = meetings.filter(
    m => m.status !== 'CANCELLED' && new Date(m.scheduledFor).getTime() + (m.durationMinutes * 60000) >= Date.now()
  );

  const pastMeetings = meetings.filter(
    m => m.status === 'COMPLETED' || m.status === 'CANCELLED' || new Date(m.scheduledFor).getTime() + (m.durationMinutes * 60000) < Date.now()
  );

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50 text-slate-900">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in">
          <Check className="w-5 h-5 text-white" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
              <Video className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Videoconferência RBN</h1>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> 100% Gratuito & WebRTC
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Realize reuniões de equipe, entrevistas de colunistas e transmissões sem limite de tempo ou consumo de dados no Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMeetings}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setActiveTab('instant');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"
          >
            <Video className="w-4 h-4" />
            Nova Reunião Instantânea
          </button>
        </div>
      </div>

      {/* Active In-App Call Frame */}
      {inCall && activeMeeting && (
        <div className="mb-8 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 animate-fade-in">
          <div className="bg-slate-800/90 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="font-bold text-base">{activeMeeting.title}</h3>
                <p className="text-xs text-slate-400">Anfitrião: {activeMeeting.hostName} | Sala: {activeMeeting.roomName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => copyMeetingLink(activeMeeting)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar Link
              </button>

              <a
                href={activeMeeting.meetingUrl || `https://meet.jit.si/${activeMeeting.roomName}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir em Nova Aba
              </a>

              <button
                onClick={endCall}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
              >
                <PhoneOff className="w-4 h-4" />
                Sair da Chamada
              </button>
            </div>
          </div>

          {/* Embedded WebRTC Frame */}
          <div className="w-full h-[600px] relative bg-slate-950">
            <iframe
              src={`https://meet.jit.si/${activeMeeting.roomName}#userInfo.displayName="${encodeURIComponent(currentUser?.name || 'Membro RBN')}"`}
              className="w-full h-full border-0"
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              title="Sala de Videoconferência RBN"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'upcoming'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Próximas Reuniões ({upcomingMeetings.length})
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'schedule'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-1.5" />
          Agendar Reunião
        </button>

        <button
          onClick={() => setActiveTab('instant')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'instant'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Video className="w-4 h-4 inline mr-1.5" />
          Iniciar Agora
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'past'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Histórico ({pastMeetings.length})
        </button>
      </div>

      {/* TAB CONTENT: Upcoming Meetings */}
      {activeTab === 'upcoming' && (
        <div>
          {loading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Carregando reuniões agendadas...</p>
            </div>
          ) : upcomingMeetings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
              <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">Nenhuma reunião agendada</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Não há reuniões pendentes no momento. Você pode iniciar uma videoconferência instantânea ou agendar uma nova.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setActiveTab('instant')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  Iniciar Chamada Instantânea
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors"
                >
                  Agendar para Depois
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingMeetings.map((meeting) => {
                const meetingDate = new Date(meeting.scheduledFor);
                const isLive = Math.abs(meetingDate.getTime() - Date.now()) < 15 * 60000;
                const myRsvp = currentUser ? meeting.rsvps?.[currentUser.email] : undefined;

                return (
                  <div
                    key={meeting.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                          isLive
                            ? 'bg-rose-100 text-rose-700 animate-pulse'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {isLive ? 'AO VIVO AGORA' : 'AGENDADA'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyMeetingLink(meeting)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Copiar link"
                          >
                            {copiedId === meeting.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteMeeting(meeting.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Cancelar reunião"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-1">{meeting.title}</h3>
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{meeting.description || 'Sem descrição.'}</p>

                      <div className="space-y-2 mb-5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>
                            {meetingDate.toLocaleDateString('pt-BR', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>
                            {meetingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({meeting.durationMinutes} min)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span>Anfitrião: <strong>{meeting.hostName}</strong></span>
                        </div>

                        {meeting.invitedEmails && meeting.invitedEmails.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-slate-400 text-[11px] block mb-1">Convidados:</span>
                            <div className="flex flex-wrap gap-1">
                              {meeting.invitedEmails.map((email) => (
                                <span key={email} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full">
                                  {email.split('@')[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      {/* RSVP controls */}
                      {currentUser && (
                        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
                          <span className="text-slate-500 font-medium">Sua presença:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRSVP(meeting.id, 'ACCEPTED')}
                              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                                myRsvp === 'ACCEPTED'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
                              }`}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => handleRSVP(meeting.id, 'DECLINED')}
                              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                                myRsvp === 'DECLINED'
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200'
                              }`}
                            >
                              Recusar
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => startCall(meeting)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                      >
                        <Video className="w-4 h-4" />
                        Entrar na Reunião
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Instant Meeting */}
      {activeTab === 'instant' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-2xl mx-auto shadow-sm">
          <div className="text-center mb-6">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl w-fit mx-auto mb-3">
              <Video className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Iniciar Reunião Instantânea</h2>
            <p className="text-sm text-slate-500 mt-1">
              Crie uma sala de videoconferência segura instantaneamente e convide membros da equipe.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                Convidar Membros da Equipe (Opcional)
              </label>
              <div className="border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50">
                {users.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum outro usuário cadastrado.</p>
                ) : (
                  users.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInvitedEmails.includes(u.email)}
                        onChange={() => toggleInvitedUser(u.email)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 block">{u.name}</span>
                        <span className="text-slate-400">{u.email}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={handleCreateInstantMeeting}
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
            >
              <Video className="w-5 h-5" />
              {submitting ? 'Criando Sala...' : 'Iniciar e Entrar na Reunião Agora'}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Schedule Meeting */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-3xl mx-auto shadow-sm">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Agendar Nova Videoconferência</h2>
            <p className="text-sm text-slate-500">
              Convites automáticos serão enviados por e-mail e disponibilizados no painel interno.
            </p>
          </div>

          <form onSubmit={handleScheduleMeeting} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Título da Reunião *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reunião de Pauta Editorial - Segunda-feira"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Pauta / Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva os tópicos a serem discutidos..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Horário *
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Duração Estimada
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1 hora e 30 min</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Convidar Integrantes da Equipe
              </label>
              <div className="border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedInvitedEmails.includes(u.email)}
                      onChange={() => toggleInvitedUser(u.email)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800 block">{u.name}</span>
                      <span className="text-slate-400">{u.email}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
            >
              <Calendar className="w-5 h-5" />
              {submitting ? 'Agendando...' : 'Confirmar Agendamento e Notificar'}
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT: Past Meetings */}
      {activeTab === 'past' && (
        <div>
          {pastMeetings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">Nenhum histórico de reuniões</h3>
              <p className="text-sm text-slate-500 mt-1">
                Reuniões concluídas ou canceladas aparecerão nesta área.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Título</th>
                    <th className="py-3.5 px-6">Anfitrião</th>
                    <th className="py-3.5 px-6">Data & Hora</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastMeetings.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-900">{m.title}</td>
                      <td className="py-4 px-6 text-slate-600">{m.hostName}</td>
                      <td className="py-4 px-6 text-slate-600">
                        {new Date(m.scheduledFor).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          m.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {m.status === 'CANCELLED' ? 'Cancelada' : 'Concluída'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => copyMeetingLink(m)}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Copiar Link
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

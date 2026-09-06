'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { getCurrentAdminUser, hasPermission, useCurrentAdminUser } from '@/app/lib/adminPermissions';
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  FileX,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';

type Status = 'pending' | 'review' | 'approved' | 'rejected' | 'expired';
type TeamUser = { id: string; name: string; email: string; role: string; status: string; avatar?: string };
type Document = {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: Status;
  expires_at: string | null;
  notes: string | null;
  request_reason: string | null;
  created_at: string;
  updated_at: string;
};
type AuditEntry = { id: string; action: string; actor_id: string; from_status: Status | null; to_status: Status | null; notes: string | null; created_at: string };

const statusLabels: Record<Status, string> = {
  pending: 'Pendente',
  review: 'Em revisão',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  expired: 'Expirado',
};

const statusClasses: Record<Status, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  review: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-gray-200 text-gray-700 border-gray-300',
};

const documentTypes = [
  'RG/CNH',
  'CPF',
  'Certidão de nascimento',
  'Comprovante de endereço',
  'Título de eleitor',
  'Conta bancária',
  'Registro profissional',
  'Contrato de trabalho',
  'Termo de responsabilidade',
  'Termo de autorização de uso de imagem',
  'Diploma',
  'Certificados',
  'Outros documentos',
] as const;

function formatSize(size?: number | null) {
  if (!size) return 'Solicitado (aguardando envio)';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isTestUser(u: TeamUser) {
  const name = u.name.toLowerCase();
  const email = u.email.toLowerCase();
  const role = u.role.toLowerCase();
  if (role === 'leitor' || role === 'reader') return true;
  if (
    name.includes('teste') ||
    name.includes('test') ||
    name.startsWith('por redação') ||
    name.startsWith('usuario teste') ||
    email.includes('test') ||
    email.includes('teste') ||
    email.includes('persist-test')
  ) {
    return true;
  }
  return false;
}

async function api(path: string, options: RequestInit = {}) {
  const user = getCurrentAdminUser();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (user?.id) headers.set('x-admin-user-id', user.id);
  const response = await fetch(path, { ...options, headers, cache: 'no-store' });
  const text = await response.text().catch(() => '');
  let data: any = {};
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `Erro (${response.status}): Não foi possível concluir a operação.`);
  }
  return data;
}

export default function TeamDocumentationPage() {
  const currentUser = useCurrentAdminUser();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [selectedUserId, setSelectedUserId] = useState(() => searchParams.get('userId') ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'upload' | 'request'>('upload');
  const [form, setForm] = useState({
    userId: '',
    documentType: '',
    selectedTypes: [] as string[],
    requestReason: '',
    notes: '',
    expiresAt: '',
    file: null as File | null,
  });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [historyDocument, setHistoryDocument] = useState<Document | null>(null);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const canUpload = hasPermission(currentUser, 'documentation:upload');
  const canRequest = hasPermission(currentUser, 'documentation:request');
  const canReview = hasPermission(currentUser, 'documentation:review');
  const canDelete = hasPermission(currentUser, 'documentation:delete');

  const realUsers = useMemo(() => users.filter((u) => !isTestUser(u)), [users]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/documentacao-equipe');
      setUsers(data.users ?? []);
      setDocuments(data.documents ?? []);
      setUnlocked(true);
      setError('');
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : 'Não foi possível carregar a documentação.';
      setError(msg);
      if (msg.includes('PIN')) {
        setUnlocked(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const unlockHumanResources = async (event: React.FormEvent) => {
    event.preventDefault();
    setUnlocking(true);
    setError('');
    try {
      await api('/api/admin/documentacao-equipe/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      setPin('');
      setError('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível desbloquear Recursos Humanos.');
    } finally {
      setUnlocking(false);
    }
  };

  const userById = useMemo(() => new Map(realUsers.map((user) => [user.id, user])), [realUsers]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return realUsers.filter(
      (user) => !normalized || `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(normalized)
    );
  }, [query, realUsers]);

  const visibleDocuments = useMemo(() => {
    return documents.filter((document) => {
      const owner = userById.get(document.user_id);
      const textMatch =
        !query.trim() ||
        `${document.document_type} ${document.file_name ?? ''} ${owner?.name ?? ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
      return (
        textMatch &&
        (statusFilter === 'all' || document.status === statusFilter) &&
        (!selectedUserId || document.user_id === selectedUserId)
      );
    });
  }, [documents, query, selectedUserId, statusFilter, userById]);

  const statusCount = (status: Status) => documents.filter((document) => document.status === status).length;

  const openForm = (mode: 'upload' | 'request', userId = selectedUserId || (realUsers[0]?.id ?? currentUser?.id ?? '')) => {
    setFormMode(mode);
    setForm({
      userId: userId || (realUsers[0]?.id ?? currentUser?.id ?? ''),
      documentType: '',
      selectedTypes: [],
      requestReason: '',
      notes: '',
      expiresAt: '',
      file: null,
    });
    setShowForm(true);
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.userId || (formMode === 'upload' ? !form.documentType || !form.file : form.selectedTypes.length === 0))
      return;
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      const body = new FormData();
      body.set('action', formMode);
      body.set('userId', form.userId);
      if (formMode === 'upload') body.set('documentType', form.documentType);
      else body.set('documentTypes', JSON.stringify(form.selectedTypes));
      body.set('requestReason', form.requestReason);
      body.set('notes', form.notes);
      body.set('expiresAt', form.expiresAt);
      if (form.file) body.set('file', form.file);

      await api('/api/admin/documentacao-equipe', { method: 'POST', body });

      setShowForm(false);
      setForm({
        userId: '',
        documentType: '',
        selectedTypes: [],
        requestReason: '',
        notes: '',
        expiresAt: '',
        file: null,
      });

      const text =
        formMode === 'upload'
          ? 'O documento foi registrado com sucesso e a notificação foi enviada ao destinatário.'
          : 'A solicitação foi registrada com sucesso e os colaboradores foram notificados no sistema.';

      setSuccessMessage(text);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o documento.');
    } finally {
      setSaving(false);
    }
  };

  const updateDocument = async (document: Document, status: Status, customNote?: string) => {
    setError('');
    setSuccessMessage('');
    try {
      await api('/api/admin/documentacao-equipe', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: document.id, status, notes: customNote ?? document.notes ?? '' }),
      });
      const label = statusLabels[status] ?? status;
      setSuccessMessage(`Status do documento "${document.document_type}" atualizado para "${label}" com sucesso! Notificação enviada.`);
      if (viewingDocument?.id === document.id) {
        setViewingDocument((prev) => (prev ? { ...prev, status, notes: customNote ?? prev.notes } : null));
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o status.');
    }
  };

  const handleReviewDecision = (document: Document, status: Status) => {
    if (status === 'rejected') {
      const reason = window.prompt('Motivo da recusa / rejeição (será enviado ao colaborador):', document.notes ?? '');
      if (reason !== null) {
        void updateDocument(document, status, reason);
      }
    } else {
      const note = window.prompt(`Observação da alteração de status para ${statusLabels[status]} (opcional):`, document.notes ?? '');
      if (note !== null) {
        void updateDocument(document, status, note);
      }
    }
  };

  const showHistory = async (document: Document) => {
    try {
      const data = await api(`/api/admin/documentacao-equipe?documentId=${encodeURIComponent(document.id)}`);
      setHistory(data.audit ?? []);
      setHistoryDocument(document);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o histórico.');
    }
  };

  const download = async (document: Document) => {
    try {
      const user = getCurrentAdminUser();
      const response = await fetch(
        `/api/admin/documentacao-equipe/arquivo/${encodeURIComponent(document.id)}?download=1`,
        { headers: user?.id ? { 'x-admin-user-id': user.id } : {}, cache: 'no-store' }
      );
      if (!response.ok) throw new Error('Arquivo indisponível.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.file_name || 'documento';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível baixar o arquivo.');
    }
  };

  const remove = async (document: Document) => {
    if (!window.confirm(`Excluir "${document.document_type}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api(`/api/admin/documentacao-equipe?id=${encodeURIComponent(document.id)}`, { method: 'DELETE' });
      setSuccessMessage(`Documento "${document.document_type}" excluído com sucesso.`);
      if (viewingDocument?.id === document.id) setViewingDocument(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir o documento.');
    }
  };

  if (!currentUser || !hasPermission(currentUser, 'documentation:view')) return null;

  return (
    <div className="flex min-h-screen bg-[#f5f3ef]">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          {!unlocked ? (
            <section className="mx-auto mt-16 max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <ShieldAlert className="mx-auto h-10 w-10 text-[#991B1B]" />
              <h1 className="mt-4 text-2xl font-bold text-gray-900">Recursos Humanos</h1>
              <p className="mt-2 text-sm text-gray-600">
                Informe o PIN de segurança para acessar a central oficial de documentos da equipe.
              </p>
              <form onSubmit={unlockHumanResources} className="mt-6 space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  placeholder="PIN de acesso"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg font-bold tracking-[0.35em] focus:border-[#991B1B] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!pin.trim() || unlocking}
                  className="w-full rounded-lg bg-[#991B1B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7F1D1D] disabled:opacity-50"
                >
                  {unlocking ? 'Validando PIN...' : 'Acessar documentação'}
                </button>
              </form>
              {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
            </section>
          ) : (
            <>
              <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#991B1B]">Gestão Interna de RH</p>
                  <h1 className="mt-1 text-3xl font-bold text-gray-900">Documentação da Equipe</h1>
                  <p className="mt-2 max-w-2xl text-sm text-gray-600">
                    Central corporativa protegida para receber, revisar, aprovar e acompanhar documentos profissionais sem expor arquivos publicamente.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                  {canRequest && (
                    <button
                      type="button"
                      onClick={() => openForm('request')}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#991B1B] bg-white px-4 py-2.5 text-sm font-semibold text-[#991B1B] shadow-sm transition hover:bg-red-50"
                    >
                      <ClipboardCheck className="h-4 w-4" /> Solicitar documento
                    </button>
                  )}
                  {canUpload && (
                    <button
                      type="button"
                      onClick={() => openForm('upload')}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7F1D1D]"
                    >
                      <Upload className="h-4 w-4" /> Enviar documento
                    </button>
                  )}
                </div>
              </header>

              {/* Toast de Sucesso em Destaque */}
              {successMessage && (
                <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold tracking-wide text-emerald-950">ENVIADO COM SUCESSO!</h4>
                      <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuccessMessage('')}
                    className="rounded-lg p-1 text-emerald-700 transition hover:bg-emerald-100"
                    aria-label="Fechar mensagem de sucesso"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Toast de Erro */}
              {error && (
                <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="rounded-lg p-1 text-red-600 hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Metric Counters */}
              <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {(
                  [
                    ['all', 'Total', documents.length],
                    ['pending', 'Pendentes', statusCount('pending')],
                    ['review', 'Em revisão', statusCount('review')],
                    ['approved', 'Aprovados', statusCount('approved')],
                    ['rejected', 'Rejeitados', statusCount('rejected')],
                  ] as const
                ).map(([status, label, count]) => (
                  <button
                    type="button"
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-xl border bg-white p-4 text-left shadow-sm transition ${
                      statusFilter === status
                        ? 'border-[#991B1B] ring-2 ring-[#991B1B]/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{count}</p>
                  </button>
                ))}
              </section>

              {/* Main Directory & Document Table */}
              <section className="mb-6 grid gap-4 lg:grid-cols-[280px_1fr]">
                <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar equipe ou documento"
                      className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#991B1B] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId('')}
                    className={`mt-4 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      !selectedUserId ? 'bg-red-50 font-semibold text-[#991B1B]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span>Todos os usuários</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                      {documents.length}
                    </span>
                  </button>

                  <div className="mt-2 max-h-[430px] space-y-1 overflow-y-auto">
                    {filteredUsers.map((user) => {
                      const count = documents.filter((doc) => doc.user_id === user.id).length;
                      return (
                        <button
                          type="button"
                          key={user.id}
                          onClick={() => setSelectedUserId(user.id)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                            selectedUserId === user.id ? 'bg-red-50 ring-1 ring-[#991B1B]/30' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#991B1B] text-xs font-bold text-white shadow-sm">
                            {user.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900">{user.name}</span>
                            <span className="block text-xs text-gray-500">{count} documento(s)</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <section className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
                    <div>
                      <h2 className="font-bold text-gray-900">
                        {selectedUserId ? userById.get(selectedUserId)?.name : 'Documentos da Equipe'}
                      </h2>
                      <p className="text-xs text-gray-500">{visibleDocuments.length} registro(s) exibido(s)</p>
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as 'all' | Status)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
                    >
                      <option value="all">Todos os status</option>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center p-12 text-sm text-gray-500">
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin text-[#991B1B]" />
                      Carregando documentação...
                    </div>
                  ) : visibleDocuments.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-3 font-medium text-gray-500">Nenhum documento encontrado.</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Clique em "Solicitar documento" ou "Enviar documento" para cadastrar novos registros.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {visibleDocuments.map((document) => {
                        const owner = userById.get(document.user_id);
                        return (
                          <article key={document.id} className="p-5 transition hover:bg-gray-50/60">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-base font-bold text-gray-900">{document.document_type}</h3>
                                  <span
                                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                      statusClasses[document.status]
                                    }`}
                                  >
                                    {statusLabels[document.status]}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">
                                  <strong className="text-gray-800">{owner?.name ?? 'Usuário'}</strong> ·{' '}
                                  {document.file_name ?? 'Solicitação de documento'} · {formatSize(document.size_bytes)}
                                </p>
                                {document.request_reason && (
                                  <p className="mt-2 text-xs font-medium text-gray-500">
                                    <strong>Solicitação:</strong> {document.request_reason}
                                  </p>
                                )}
                                {document.notes && (
                                  <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">
                                    <strong>Observações:</strong> {document.notes}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {document.file_name && (
                                  <button
                                    type="button"
                                    onClick={() => setViewingDocument(document)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
                                  >
                                    <Eye className="h-4 w-4 text-blue-600" /> Visualizar
                                  </button>
                                )}
                                {document.file_name && (
                                  <button
                                    type="button"
                                    onClick={() => void download(document)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                  >
                                    <Download className="h-4 w-4 text-gray-600" /> Baixar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => void showHistory(document)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                                >
                                  Histórico
                                </button>
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => void remove(document)}
                                    className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                                    aria-label="Excluir documento"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Action Review Bar */}
                            {canReview && (
                              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                  Decisão do Revisor:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleReviewDecision(document, 'approved')}
                                  className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
                                >
                                  <Check className="h-3.5 w-3.5 text-emerald-600" /> Aprovar / Aceitar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewDecision(document, 'rejected')}
                                  className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800 shadow-sm transition hover:bg-red-100"
                                >
                                  <X className="h-3.5 w-3.5 text-red-600" /> Rejeitar / Recusar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewDecision(document, 'review')}
                                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
                                >
                                  <Clock className="h-3.5 w-3.5 text-blue-600" /> Em revisão
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewDecision(document, 'expired')}
                                  className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                                >
                                  Expirado
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </section>

              <p className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldAlert className="h-4 w-4 text-[#991B1B]" />
                Arquivos são mantidos sob custódia criptografada e entregues somente após autorização no servidor com token temporário.
              </p>
            </>
          )}
        </div>
      </main>

      {/* Visualizador de Documento Modal */}
      {viewingDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setViewingDocument(null)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-900 px-6 py-4 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{viewingDocument.document_type}</h2>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusClasses[viewingDocument.status]}`}>
                    {statusLabels[viewingDocument.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-0.5">
                  Pertencente a: <strong>{userById.get(viewingDocument.user_id)?.name ?? 'Colaborador'}</strong> · {viewingDocument.file_name} ({formatSize(viewingDocument.size_bytes)})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void download(viewingDocument)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <Download className="h-4 w-4" /> Baixar
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDocument(null)}
                  className="rounded-lg p-1 text-gray-400 transition hover:text-white"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Viewer Content Body */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-6 flex items-center justify-center min-h-[400px]">
              {viewingDocument.mime_type?.startsWith('image/') ||
              /\.(jpg|jpeg|png|webp)$/i.test(viewingDocument.file_name ?? '') ? (
                <img
                  src={`/api/admin/documentacao-equipe/arquivo/${encodeURIComponent(viewingDocument.id)}`}
                  alt={viewingDocument.document_type}
                  className="max-h-[65vh] w-auto rounded-lg shadow-lg object-contain bg-white"
                />
              ) : viewingDocument.mime_type === 'application/pdf' ||
                /\.(pdf)$/i.test(viewingDocument.file_name ?? '') ? (
                <iframe
                  src={`/api/admin/documentacao-equipe/arquivo/${encodeURIComponent(viewingDocument.id)}`}
                  className="h-[65vh] w-full rounded-xl border border-gray-300 bg-white shadow-inner"
                  title={viewingDocument.document_type}
                />
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-md max-w-md">
                  <FileText className="mx-auto h-16 w-16 text-[#991B1B]" />
                  <h3 className="mt-4 text-base font-bold text-gray-900">{viewingDocument.file_name}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Formato: {viewingDocument.mime_type || 'Documento'} · {formatSize(viewingDocument.size_bytes)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void download(viewingDocument)}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7F1D1D]"
                  >
                    <Download className="h-4 w-4" /> Baixar documento completo
                  </button>
                </div>
              )}
            </div>

            {/* Viewer Footer Review Decision Bar */}
            {canReview && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Decisão da Revisão:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReviewDecision(viewingDocument, 'approved')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <Check className="h-4 w-4" /> Aceitar / Aprovar Documento
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewDecision(viewingDocument, 'rejected')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
                  >
                    <X className="h-4 w-4" /> Recusar / Rejeitar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewDecision(viewingDocument, 'review')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
                  >
                    <Clock className="h-4 w-4" /> Colocar Em Revisão
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload / Request Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={submitForm} className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between rounded-t-2xl bg-[#991B1B] px-6 py-4 text-white">
              <div>
                <h2 className="font-bold text-lg">
                  {formMode === 'upload' ? 'Enviar documento da equipe' : 'Solicitar documentos à equipe'}
                </h2>
                <p className="text-xs text-white/80">
                  {formMode === 'upload'
                    ? 'Selecione o usuário e anexe o arquivo para envio oficial.'
                    : 'Marque apenas os documentos necessários para a solicitação.'}
                </p>
              </div>
              <button type="button" onClick={() => setShowForm(false)}>
                <XCircle className="h-6 w-6 text-white/80 transition hover:text-white" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block text-sm font-semibold text-gray-800">
                Colaborador / Usuário
                <select
                  required
                  value={form.userId}
                  onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:border-[#991B1B] focus:outline-none"
                >
                  <option value="">Selecionar usuário ({realUsers.length} cadastrados)</option>
                  {realUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email || 'Usuário'} ({user.role || 'membro'})
                    </option>
                  ))}
                </select>
              </label>

              {formMode === 'request' ? (
                <fieldset>
                  <div className="flex items-center justify-between">
                    <legend className="text-sm font-semibold text-gray-800">Documentos disponíveis</legend>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          selectedTypes: current.selectedTypes.length === documentTypes.length ? [] : [...documentTypes],
                        }))
                      }
                      className="text-xs font-semibold text-[#991B1B] hover:underline"
                    >
                      {form.selectedTypes.length === documentTypes.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-2">
                    {documentTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-normal transition hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={form.selectedTypes.includes(type)}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              selectedTypes: event.target.checked
                                ? [...current.selectedTypes, type]
                                : current.selectedTypes.filter((item) => item !== type),
                            }))
                          }
                          className="h-4 w-4 rounded border-gray-300 text-[#991B1B] focus:ring-[#991B1B]"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs font-normal text-gray-500">
                    {form.selectedTypes.length} documento(s) selecionado(s)
                  </p>
                </fieldset>
              ) : (
                <>
                  <label className="block text-sm font-semibold text-gray-800">
                    Tipo do documento
                    <select
                      required
                      value={form.documentType}
                      onChange={(event) => setForm((current) => ({ ...current, documentType: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:border-[#991B1B] focus:outline-none"
                    >
                      <option value="">Selecionar tipo</option>
                      {documentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-semibold text-gray-800">
                    Arquivo
                    <input
                      required
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx"
                      onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
                      className="mt-1 block w-full rounded-lg border border-dashed border-gray-300 p-3 text-sm font-normal focus:border-[#991B1B] focus:outline-none"
                    />
                    <span className="mt-1 block text-xs font-normal text-gray-500">
                      PDF, Imagem ou Word · máximo 10 MB
                    </span>
                  </label>
                </>
              )}

              {formMode === 'request' && (
                <label className="block text-sm font-semibold text-gray-800">
                  Motivo da solicitação
                  <textarea
                    required
                    value={form.requestReason}
                    onChange={(event) => setForm((current) => ({ ...current, requestReason: event.target.value }))}
                    rows={3}
                    placeholder="Explique o motivo do pedido..."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:border-[#991B1B] focus:outline-none"
                  />
                </label>
              )}

              <label className="block text-sm font-semibold text-gray-800">
                Validade (opcional)
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:border-[#991B1B] focus:outline-none"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-800">
                Observações
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={2}
                  placeholder="Informações adicionais..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal focus:border-[#991B1B] focus:outline-none"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || (formMode === 'request' && form.selectedTypes.length === 0)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7F1D1D] disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> {formMode === 'request' ? 'Enviar solicitações' : 'Enviar documento'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* History Audit Modal */}
      {historyDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setHistoryDocument(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-900 p-5 text-white">
              <div>
                <h2 className="font-bold text-base text-white">Histórico de Alterações</h2>
                <p className="text-xs text-gray-300">{historyDocument.document_type}</p>
              </div>
              <button type="button" onClick={() => setHistoryDocument(null)}>
                <XCircle className="h-5 w-5 text-gray-400 transition hover:text-white" />
              </button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum evento registrado.</p>
              ) : (
                history.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                    <div className="flex justify-between gap-3 font-semibold text-gray-800">
                      <span>{entry.action}</span>
                      <time className="text-xs font-normal text-gray-500">
                        {new Date(entry.created_at).toLocaleString('pt-BR')}
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Por: {entry.actor_id}
                      {entry.to_status ? ` · ${statusLabels[entry.to_status]}` : ''}
                    </p>
                    {entry.notes && <p className="mt-2 text-xs font-medium text-gray-700">{entry.notes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

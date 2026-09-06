'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { getCurrentAdminUser, hasPermission, useCurrentAdminUser } from '@/app/lib/adminPermissions';
import { ClipboardCheck, Download, FileText, Plus, Search, ShieldAlert, Trash2, Upload, XCircle } from 'lucide-react';

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
  pending: 'bg-amber-100 text-amber-800',
  review: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-200 text-gray-700',
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
  if (!size) return 'Solicitado';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function api(path: string, options: RequestInit = {}) {
  const user = getCurrentAdminUser();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (user?.id) headers.set('x-admin-user-id', user.id);
  const response = await fetch(path, { ...options, headers, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
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
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'upload' | 'request'>('upload');
  const [form, setForm] = useState({ userId: '', documentType: '', selectedTypes: [] as string[], requestReason: '', notes: '', expiresAt: '', file: null as File | null });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [historyDocument, setHistoryDocument] = useState<Document | null>(null);

  const canUpload = hasPermission(currentUser, 'documentation:upload');
  const canRequest = hasPermission(currentUser, 'documentation:request');
  const canReview = hasPermission(currentUser, 'documentation:review');
  const canDelete = hasPermission(currentUser, 'documentation:delete');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/documentacao-equipe');
      setUsers(data.users ?? []);
      setDocuments(data.documents ?? []);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a documentação.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => !normalized || `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(normalized));
  }, [query, users]);
  const visibleDocuments = useMemo(() => documents.filter((document) => {
    const owner = userById.get(document.user_id);
    const textMatch = !query.trim() || `${document.document_type} ${document.file_name ?? ''} ${owner?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase());
    return textMatch && (statusFilter === 'all' || document.status === statusFilter) && (!selectedUserId || document.user_id === selectedUserId);
  }), [documents, query, selectedUserId, statusFilter, userById]);
  const statusCount = (status: Status) => documents.filter((document) => document.status === status).length;

  const openForm = (mode: 'upload' | 'request', userId = selectedUserId || currentUser?.id || '') => {
    setFormMode(mode);
    setForm((current) => ({ ...current, userId, documentType: '', selectedTypes: [], file: null }));
    setShowForm(true);
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.userId || (formMode === 'upload' ? (!form.documentType || !form.file) : form.selectedTypes.length === 0)) return;
    setSaving(true);
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
      setForm({ userId: '', documentType: '', selectedTypes: [], requestReason: '', notes: '', expiresAt: '', file: null });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o documento.');
    } finally {
      setSaving(false);
    }
  };

  const updateDocument = async (document: Document, status: Status, notes?: string) => {
    try {
      await api('/api/admin/documentacao-equipe', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: document.id, status, notes: notes ?? document.notes ?? '' }) });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o status.');
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
      const response = await fetch(`/api/admin/documentacao-equipe/arquivo/${encodeURIComponent(document.id)}?download=1`, { headers: user?.id ? { 'x-admin-user-id': user.id } : {}, cache: 'no-store' });
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
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#991B1B]">Gestão interna</p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">Documentação da equipe</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">Central protegida para receber, revisar e acompanhar documentos profissionais sem expor arquivos publicamente.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canRequest && <button type="button" onClick={() => openForm('request')} className="inline-flex items-center gap-2 rounded-lg border border-[#991B1B] px-4 py-2 text-sm font-semibold text-[#991B1B]"><ClipboardCheck className="h-4 w-4" /> Solicitar documento</button>}
              {canUpload && <button type="button" onClick={() => openForm('upload')} className="inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-4 py-2 text-sm font-semibold text-white"><Upload className="h-4 w-4" /> Enviar documento</button>}
            </div>
          </header>
          {error && <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => setError('')}><XCircle className="h-5 w-5" /></button></div>}
          <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {([['all', 'Total', documents.length], ['pending', 'Pendentes', statusCount('pending')], ['review', 'Em revisão', statusCount('review')], ['approved', 'Aprovados', statusCount('approved')], ['rejected', 'Rejeitados', statusCount('rejected')]] as const).map(([status, label, count]) => (
              <button type="button" key={status} onClick={() => setStatusFilter(status)} className={`rounded-xl border bg-white p-4 text-left shadow-sm transition ${statusFilter === status ? 'border-[#991B1B] ring-1 ring-[#991B1B]' : 'border-gray-200'}`}><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{count}</p></button>
            ))}
          </section>
          <section className="mb-6 grid gap-4 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar equipe ou documento" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#991B1B] focus:outline-none" /></div>
              <button type="button" onClick={() => setSelectedUserId('')} className={`mt-4 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${!selectedUserId ? 'bg-red-50 font-semibold text-[#991B1B]' : 'hover:bg-gray-50'}`}><span>Todos os usuários</span><span>{documents.length}</span></button>
              <div className="mt-2 max-h-[430px] space-y-1 overflow-y-auto">
                {filteredUsers.map((user) => {
                  const count = documents.filter((document) => document.user_id === user.id).length;
                  return <button type="button" key={user.id} onClick={() => setSelectedUserId(user.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${selectedUserId === user.id ? 'bg-red-50' : 'hover:bg-gray-50'}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#991B1B] text-xs font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-900">{user.name}</span><span className="block text-xs text-gray-500">{count} documento(s)</span></span></button>;
                })}
              </div>
            </aside>
            <section className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4"><div><h2 className="font-semibold text-gray-900">{selectedUserId ? userById.get(selectedUserId)?.name : 'Documentos da equipe'}</h2><p className="text-xs text-gray-500">{visibleDocuments.length} registro(s) exibido(s)</p></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | Status)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="all">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              {loading ? <p className="p-8 text-sm text-gray-500">Carregando documentação...</p> : visibleDocuments.length === 0 ? <div className="p-12 text-center"><FileText className="mx-auto h-10 w-10 text-gray-300" /><p className="mt-3 text-sm text-gray-500">Nenhum documento encontrado.</p></div> : <div className="divide-y divide-gray-100">{visibleDocuments.map((document) => {
                const owner = userById.get(document.user_id);
                return <article key={document.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-gray-900">{document.document_type}</h3><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClasses[document.status]}`}>{statusLabels[document.status]}</span></div><p className="mt-1 text-sm text-gray-600">{owner?.name ?? 'Usuário'} · {document.file_name ?? 'Solicitação sem arquivo'} · {formatSize(document.size_bytes)}</p>{document.request_reason && <p className="mt-2 text-xs text-gray-500">Solicitação: {document.request_reason}</p>}{document.notes && <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">Observações: {document.notes}</p>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void showHistory(document)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">Histórico</button>{document.file_name && <button type="button" onClick={() => void download(document)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"><Download className="h-4 w-4" /> Baixar</button>}{canDelete && <button type="button" onClick={() => void remove(document)} className="rounded-lg border border-red-200 p-2 text-red-600" aria-label="Excluir documento"><Trash2 className="h-4 w-4" /></button>}</div></div>{canReview && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3"><span className="text-xs font-semibold text-gray-500">Atualizar status:</span>{(['review', 'approved', 'rejected', 'expired'] as Status[]).map((status) => <button type="button" key={status} onClick={() => { const note = window.prompt('Observação da revisão (opcional):', document.notes ?? ''); if (note !== null) void updateDocument(document, status, note); }} className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:border-[#991B1B] hover:text-[#991B1B]">{statusLabels[status]}</button>)}</div>}</article>;
              })}</div>}
            </section>
          </section>
          <p className="flex items-center gap-2 text-xs text-gray-500"><ShieldAlert className="h-4 w-4" /> Arquivos são entregues somente após autorização no servidor e não possuem URL pública.</p>
        </div>
      </main>
      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><form onSubmit={submitForm} className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between rounded-t-2xl bg-[#991B1B] px-6 py-4 text-white"><div><h2 className="font-bold">{formMode === 'upload' ? 'Enviar documento' : 'Solicitar documentos'}</h2><p className="text-xs text-white/75">Selecione manualmente somente os documentos necessários.</p></div><button type="button" onClick={() => setShowForm(false)}><XCircle className="h-5 w-5" /></button></div><div className="space-y-4 p-6"><label className="block text-sm font-semibold text-gray-800">Usuário<select required value={form.userId} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"><option value="">Selecionar usuário</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>{formMode === 'request' ? <fieldset><legend className="text-sm font-semibold text-gray-800">Documentos disponíveis</legend><div className="mt-2 grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-2">{documentTypes.map((type) => <label key={type} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-normal hover:bg-gray-50"><input type="checkbox" checked={form.selectedTypes.includes(type)} onChange={(event) => setForm((current) => ({ ...current, selectedTypes: event.target.checked ? [...current.selectedTypes, type] : current.selectedTypes.filter((item) => item !== type) }))} />{type}</label>)}</div><p className="mt-1 text-xs font-normal text-gray-500">{form.selectedTypes.length} documento(s) selecionado(s)</p></fieldset> : <><label className="block text-sm font-semibold text-gray-800">Tipo do documento<select required value={form.documentType} onChange={(event) => setForm((current) => ({ ...current, documentType: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"><option value="">Selecionar tipo</option>{documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label className="block text-sm font-semibold text-gray-800">Arquivo<input required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx" onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} className="mt-1 block w-full rounded-lg border border-dashed border-gray-300 p-3 text-sm font-normal" /><span className="mt-1 block text-xs font-normal text-gray-500">PDF, imagem ou Word · máximo 10 MB</span></label></>}{formMode === 'request' && <label className="block text-sm font-semibold text-gray-800">Motivo da solicitação<textarea required value={form.requestReason} onChange={(event) => setForm((current) => ({ ...current, requestReason: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" /></label>}<label className="block text-sm font-semibold text-gray-800">Validade (opcional)<input type="date" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" /></label><label className="block text-sm font-semibold text-gray-800">Observações<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancelar</button><button type="submit" disabled={saving || (formMode === 'request' && form.selectedTypes.length === 0)} className="inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Salvando...' : <><Plus className="h-4 w-4" /> {formMode === 'request' ? 'Solicitar documentos' : 'Salvar'}</>}</button></div></div></form></div>}
      {historyDocument && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setHistoryDocument(null)}><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-gray-200 p-5"><div><h2 className="font-bold text-gray-900">Histórico de alterações</h2><p className="text-xs text-gray-500">{historyDocument.document_type}</p></div><button type="button" onClick={() => setHistoryDocument(null)}><XCircle className="h-5 w-5 text-gray-500" /></button></div><div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">{history.length === 0 ? <p className="text-sm text-gray-500">Nenhum evento registrado.</p> : history.map((entry) => <div key={entry.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm"><div className="flex justify-between gap-3"><strong className="text-gray-800">{entry.action}</strong><time className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleString('pt-BR')}</time></div><p className="mt-1 text-xs text-gray-500">Por {entry.actor_id}{entry.to_status ? ` · ${statusLabels[entry.to_status]}` : ''}</p>{entry.notes && <p className="mt-2 text-xs text-gray-700">{entry.notes}</p>}</div>)}</div></div></div>}
    </div>
  );
}

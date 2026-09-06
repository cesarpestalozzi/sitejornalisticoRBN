'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { getCurrentAdminUser, useCurrentAdminUser } from '@/app/lib/adminPermissions';
import { Activity, Clock, Filter, History, RefreshCw, Search, Shield, UserCheck, UserX, Users, X } from 'lucide-react';

type UserActivity = {
  id: string;
  userId: string;
  userName: string;
  userLogin?: string;
  action: string;
  description: string;
  area: string;
  timestamp: string;
};

type UserStatusItem = {
  id: string;
  name: string;
  fullName: string;
  login: string;
  email: string;
  role: string;
  status: 'online' | 'offline';
  isOnline: boolean;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  lastActivityAt: string | null;
  lastActivity: UserActivity | null;
  activitiesCount: number;
};

function formatDate(isoString: string | null) {
  if (!isoString) return 'Nunca';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Inválido';
    const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day} às ${time}`;
  } catch {
    return 'Inválido';
  }
}

async function api(path: string) {
  const user = getCurrentAdminUser();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (user?.id) headers['x-admin-user-id'] = user.id;
  const res = await fetch(path, { headers, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Não foi possível carregar dados de monitoramento.');
  return data;
}

export default function UserMonitoringPage() {
  const currentUser = useCurrentAdminUser();
  const [users, setUsers] = useState<UserStatusItem[]>([]);
  const [allLogs, setAllLogs] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedUser, setSelectedUser] = useState<UserStatusItem | null>(null);
  const [userLogs, setUserLogs] = useState<UserActivity[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/activity');
      setUsers(data.users ?? []);
      setAllLogs(data.logs ?? []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar monitoramento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => {
      void loadData();
    }, 10000); // refresh every 10 seconds
    return () => clearInterval(interval);
  }, [loadData]);

  const loadUserHistory = async (user: UserStatusItem) => {
    setSelectedUser(user);
    setLoadingHistory(true);
    try {
      const data = await api(`/api/admin/activity?userId=${encodeURIComponent(user.id)}`);
      setUserLogs(data.logs ?? []);
    } catch {
      setUserLogs(allLogs.filter((l) => l.userId === user.id));
    } finally {
      setLoadingHistory(false);
    }
  };

  const realUsers = useMemo(() => {
    return users.filter((u) => {
      const name = u.name.toLowerCase();
      const email = u.email.toLowerCase();
      const login = u.login.toUpperCase();
      const role = u.role.toLowerCase();

      if (role === 'leitor' || role === 'reader') return false;
      if (
        name.includes('teste') ||
        name.includes('test') ||
        name.startsWith('por redação') ||
        name.startsWith('usuario teste') ||
        email.includes('test') ||
        email.includes('teste') ||
        email.includes('persist-test') ||
        login.includes('999999999') ||
        login.startsWith('RBN99999') ||
        login === '-' ||
        login === ''
      ) {
        return false;
      }
      return true;
    });
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return realUsers.filter((u) => {
      const matchesText =
        !q ||
        `${u.name} ${u.fullName} ${u.login} ${u.email} ${u.role}`.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'online' && u.isOnline) ||
        (statusFilter === 'offline' && !u.isOnline);
      return matchesText && matchesStatus;
    });
  }, [realUsers, query, statusFilter]);

  const onlineCount = useMemo(() => realUsers.filter((u) => u.isOnline).length, [realUsers]);
  const offlineCount = useMemo(() => realUsers.filter((u) => !u.isOnline).length, [realUsers]);

  if (!currentUser) return null;

  return (
    <div className="flex min-h-screen bg-[#f5f3ef]">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#991B1B]">
                Gestão & Segurança
              </p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Monitoramento de Usuários
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                Acompanhe em tempo real quem está on-line, últimos acessos e o histórico completo de ações de cada usuário no portal RBN.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </header>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Cards de Métricas */}
          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Total de Usuários
                </p>
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900">{realUsers.length}</p>
            </div>

            <button
              type="button"
              onClick={() => setStatusFilter('online')}
              className={`rounded-2xl border p-5 text-left shadow-sm transition ${
                statusFilter === 'online'
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/50'
                  : 'border-gray-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  On-line Agora
                </p>
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{onlineCount}</p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('offline')}
              className={`rounded-2xl border p-5 text-left shadow-sm transition ${
                statusFilter === 'offline'
                  ? 'border-gray-400 ring-2 ring-gray-400/20 bg-gray-100/50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Off-line
                </p>
                <UserX className="h-5 w-5 text-gray-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-700">{offlineCount}</p>
            </button>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Histórico de Ações
                </p>
                <Activity className="h-5 w-5 text-[#991B1B]" />
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900">{allLogs.length}</p>
            </div>
          </section>

          {/* Filtros e Busca */}
          <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, login, e-mail ou função..."
                className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#991B1B] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-[#991B1B] focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="online">Somente On-line 🟢</option>
                <option value="offline">Somente Off-line 🔴</option>
              </select>
            </div>
          </section>

          {/* Lista de Usuários */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Status / Usuário</th>
                    <th className="px-6 py-4">Login</th>
                    <th className="px-6 py-4">Função</th>
                    <th className="px-6 py-4">Último Acesso</th>
                    <th className="px-6 py-4">Última Atividade</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Carregando usuários e atividades...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Nenhum usuário encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const lastAct = user.lastActivity;
                      return (
                        <tr key={user.id} className="hover:bg-gray-50/80 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#991B1B] text-xs font-bold text-white uppercase">
                                  {user.name.slice(0, 1)}
                                </span>
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                                    user.isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                                  }`}
                                  title={user.isOnline ? 'On-line' : 'Off-line'}
                                />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{user.name}</p>
                                {user.fullName !== user.name && (
                                  <p className="text-xs text-gray-400">{user.fullName}</p>
                                )}
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs font-medium text-gray-700">
                            {user.login || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 uppercase">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-600 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              {formatDate(user.lastLoginAt || user.lastSeenAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {lastAct ? (
                              <div>
                                <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                  {lastAct.action}
                                </span>
                                <p className="mt-1 text-xs text-gray-600 line-clamp-1">
                                  {lastAct.description}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {formatDate(lastAct.timestamp)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Nenhuma registrada</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => void loadUserHistory(user)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                            >
                              <History className="h-3.5 w-3.5 text-[#991B1B]" />
                              Ver Histórico
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Modal / Drawer de Histórico do Usuário */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-[#991B1B] px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold text-white">
                  {selectedUser.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{selectedUser.name}</h2>
                  <p className="text-xs text-white/80">
                    Login: {selectedUser.login} · {selectedUser.role} ·{' '}
                    {selectedUser.isOnline ? '🟢 On-line' : '⚪ Off-line'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-[#991B1B]" />
                  Histórico de Atividades
                </h3>
                <span className="text-xs text-gray-500">
                  {userLogs.length} registro(s) encontrado(s)
                </span>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  Carregando histórico do usuário...
                </div>
              ) : userLogs.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  Nenhuma atividade registrada para este usuário ainda.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {userLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#991B1B]" />
                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-block rounded-md bg-[#991B1B]/10 px-2 py-0.5 text-xs font-semibold text-[#991B1B]">
                            {log.action}
                          </span>
                          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-800">{log.description}</p>
                        {log.area && (
                          <p className="mt-1 text-[11px] font-medium text-gray-400">
                            Área: {log.area}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

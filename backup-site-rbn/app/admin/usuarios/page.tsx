'use client';

import { Mail, MapPin, PencilLine, Plus, Search, ShieldCheck, ToggleLeft, Trash2, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { ToastContainer, useToast } from '@/app/components/Toast';
import { useUsers, type User, type UserRole } from '@/app/hooks/useUsers';

const roleConfig: Record<UserRole, { label: string; ribbon: string; text: string }> = {
  admin: { label: 'Administrador Principal', ribbon: 'from-purple-600 to-purple-700', text: 'text-purple-700' },
  'editor-chefe': { label: 'Editor-Chefe', ribbon: 'from-[#ADD8E6] to-[#87CEEB]', text: 'text-[#236A88]' },
  editor: { label: 'Editor', ribbon: 'from-[#ADD8E6] to-[#87CEEB]', text: 'text-[#236A88]' },
  jornalista: { label: 'Repórter/Redator', ribbon: 'from-[#991B1B] to-[#7F1D1D]', text: 'text-[#991B1B]' },
  colaborador: { label: 'Colaborador', ribbon: 'from-[#F59E0B] to-[#D97706]', text: 'text-[#92400E]' },
  estagiario: { label: 'Estagiário', ribbon: 'from-[#6B7280] to-[#4B5563]', text: 'text-[#374151]' },
};

const brazilianStates = [
  'Acre - AC',
  'Alagoas - AL',
  'Amapá - AP',
  'Amazonas - AM',
  'Bahia - BA',
  'Ceará - CE',
  'Distrito Federal - DF',
  'Espírito Santo - ES',
  'Goiás - GO',
  'Maranhão - MA',
  'Mato Grosso - MT',
  'Mato Grosso do Sul - MS',
  'Minas Gerais - MG',
  'Pará - PA',
  'Paraíba - PB',
  'Paraná - PR',
  'Pernambuco - PE',
  'Piauí - PI',
  'Rio de Janeiro - RJ',
  'Rio Grande do Norte - RN',
  'Rio Grande do Sul - RS',
  'Rondônia - RO',
  'Roraima - RR',
  'Santa Catarina - SC',
  'São Paulo - SP',
  'Sergipe - SE',
  'Tocantins - TO',
];

const initialFormData = {
  name: '',
  email: '',
  cpf: '',
  login: '',
  passwordHash: '',
  role: 'jornalista' as UserRole,
  roleLevel: 4,
  permissions: [] as string[],
  bio: '',
  avatar: '',
  status: 'ativo' as User['status'],
  articlesCount: 0,
  specialization: '',
  location: '',
};

function hashPassword(value: string) {
  return btoa(value);
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser, isLoaded } = useUsers();
  const { toasts, addToast, removeToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [passwordInput, setPasswordInput] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (!normalizedSearch) {
        return true;
      }

      return [user.name, user.email, user.role, user.specialization ?? '', user.login].join(' ').toLowerCase().includes(normalizedSearch);
    });
  }, [searchTerm, users]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setPasswordInput('');
    setAvatarPreview('');
    setErrors({});
    setShowForm(true);
  };

  const openEditModal = (user: User) => {
    setEditingId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      login: user.login,
      passwordHash: user.passwordHash,
      role: user.role,
      roleLevel: user.roleLevel,
      permissions: user.permissions,
      bio: user.bio,
      avatar: user.avatar,
      status: user.status,
      articlesCount: user.articlesCount,
      specialization: user.specialization ?? '',
      location: user.location ?? '',
    });
    setPasswordInput('');
    setAvatarPreview(user.avatar);
    setErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Informe o nome do usuário.';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Informe o e-mail.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Informe um e-mail válido.';
    }

    if (!formData.cpf.trim()) {
      nextErrors.cpf = 'Informe o CPF.';
    }

    if (!formData.login.trim()) {
      nextErrors.login = 'Informe o login.';
    }

    if (!formData.bio.trim()) {
      nextErrors.bio = 'Descreva a função ou especialidade do usuário.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const avatar = await fileToDataUrl(file);
    setAvatarPreview(avatar);
    setFormData((current) => ({ ...current, avatar }));
  };

  const handleSave = () => {
    if (!validateForm()) {
      addToast('Revise os campos obrigatórios antes de salvar.', 'error', 3000);
      return;
    }

    const nextPasswordHash = passwordInput.trim()
      ? hashPassword(passwordInput.trim())
      : editingId
        ? formData.passwordHash
        : hashPassword('12345678');

    const payload = {
      ...formData,
      avatar: avatarPreview || formData.avatar,
      passwordHash: nextPasswordHash,
    };

    try {
      if (editingId) {
        updateUser(editingId, payload);
        addToast('Usuário atualizado com sucesso.', 'success', 2500);
      } else {
        addUser(payload);
        addToast('Usuário criado com sucesso.', 'success', 2500);
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Sem permissão para salvar este usuário.', 'error', 3000);
      return;
    }

    setShowForm(false);
    setFormData(initialFormData);
    setPasswordInput('');
    setAvatarPreview('');
  };

  const handleToggleStatus = (user: User) => {
    try {
      updateUser(user.id, { status: user.status === 'ativo' ? 'inativo' : 'ativo' });
      addToast('Status do usuário atualizado.', 'success', 2000);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Sem permissão para alterar o status.', 'error', 3000);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Deseja remover este usuário?')) {
      return;
    }

    try {
      deleteUser(id);
      addToast('Usuário removido.', 'success', 2500);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Sem permissão para excluir este usuário.', 'error', 3000);
    }
  };

  if (!isLoaded) {
    return <div className="p-6 text-sm text-gray-600">Carregando usuários...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Usuários do RBN</h1>
              <p className="mt-2 text-gray-600">Gerencie perfis, avatares, status e especializações da equipe.</p>
            </div>
            <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-6 py-3 font-semibold text-white transition hover:bg-[#2a2a2a]">
              <Plus className="h-5 w-5" />
              Novo usuário
            </button>
          </div>

          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total de usuários', value: users.length },
              { label: 'Administradores', value: users.filter((user) => user.role === 'admin').length },
              { label: 'Editor-Chefe', value: users.filter((user) => user.role === 'editor-chefe').length },
              { label: 'Colaboradores', value: users.filter((user) => user.role === 'colaborador').length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-gray-900">Buscar usuários</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Pesquise por nome, e-mail, perfil ou especialização" className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-[#FF796C] focus:outline-none" />
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => (
              <article key={user.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className={`h-20 bg-gradient-to-r ${roleConfig[user.role].ribbon}`} />
                <div className="px-6 pb-6">
                  <div className="-mt-10 flex items-start justify-between gap-4">
                    <img src={user.avatar} alt={user.name} className="h-20 w-20 rounded-full border-4 border-white object-cover shadow" />
                    <span className={`mt-12 rounded-full px-3 py-1 text-xs font-semibold ${user.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{user.status}</span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                    <p className={`text-sm font-semibold ${roleConfig[user.role].text}`}>{roleConfig[user.role].label}</p>
                    <p className="min-h-12 text-sm leading-6 text-gray-600">{user.bio}</p>
                  </div>

                  <div className="mt-5 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#991B1B]" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.specialization && (
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#2F7EA1]" />
                        <span>{user.specialization}</span>
                      </div>
                    )}
                    {user.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#991B1B]" />
                        <span>{user.location}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                      <span>Artigos</span>
                      <span className="font-semibold text-gray-900">{user.articlesCount}</span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <button type="button" onClick={() => handleToggleStatus(user)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">
                      <ToggleLeft className="h-4 w-4" />
                      {user.status === 'ativo' ? 'Desativar' : 'Ativar'}
                    </button>
                    <button type="button" onClick={() => openEditModal(user)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">
                      <PencilLine className="h-4 w-4" />
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(user.id)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700">
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          {filteredUsers.length === 0 && (
            <section className="rounded-xl bg-white p-12 text-center shadow-sm">
              <UserRound className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-600">Nenhum usuário corresponde aos filtros informados.</p>
            </section>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between bg-[#991B1B] px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-bold">{editingId ? 'Editar usuário' : 'Novo usuário'}</h2>
                <p className="text-sm text-white/80">Todos os dados são salvos no navegador.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/10">Fechar</button>
            </div>

            <div className="space-y-8 p-6">
              <section className="grid gap-6 lg:grid-cols-[220px,1fr]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="h-52 w-full object-cover" /> : <div className="flex h-52 items-center justify-center text-gray-400"><UserRound className="h-16 w-16" /></div>}
                  </div>
                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:border-[#991B1B] hover:bg-[#991B1B]/5">
                    Enviar avatar
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Dados principais</h3>
                    <p className="text-sm text-gray-500">Nome, e-mail, CPF, login e status do funcionário.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Nome completo</label>
                      <input type="text" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                      {errors.name && <p className="mt-2 text-xs text-[#991B1B]">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">E-mail</label>
                      <input type="email" value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                      {errors.email && <p className="mt-2 text-xs text-[#991B1B]">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">CPF</label>
                      <input type="text" value={formData.cpf} onChange={(event) => setFormData((current) => ({ ...current, cpf: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                      {errors.cpf && <p className="mt-2 text-xs text-[#991B1B]">{errors.cpf}</p>}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Login</label>
                      <input type="text" value={formData.login} onChange={(event) => setFormData((current) => ({ ...current, login: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                      {errors.login && <p className="mt-2 text-xs text-[#991B1B]">{errors.login}</p>}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Senha inicial</label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(event) => setPasswordInput(event.target.value)}
                        placeholder={editingId ? 'Deixe em branco para manter a senha atual' : 'Informe a senha inicial'}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Status</label>
                      <select value={formData.status} onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as User['status'] }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none">
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Perfil editorial</h3>
                  <p className="text-sm text-gray-500">Estrutura de cargos, permissões e detalhes profissionais.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Perfil</label>
                    <select value={formData.role} onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value as UserRole, roleLevel: event.target.value === 'admin' ? 1 : event.target.value === 'editor-chefe' ? 2 : event.target.value === 'editor' ? 3 : event.target.value === 'jornalista' ? 4 : event.target.value === 'colaborador' ? 5 : 6 }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none">
                      <option value="admin">Administrador Principal</option>
                      <option value="editor-chefe">Editor-Chefe</option>
                      <option value="editor">Editor</option>
                      <option value="jornalista">Repórter/Redator</option>
                      <option value="colaborador">Colaborador</option>
                      <option value="estagiario">Estagiário</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Especialização</label>
                    <input type="text" value={formData.specialization ?? ''} onChange={(event) => setFormData((current) => ({ ...current, specialization: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Localidade</label>
                    <select value={formData.location ?? ''} onChange={(event) => setFormData((current) => ({ ...current, location: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none">
                      <option value="">Selecione um estado</option>
                      {brazilianStates.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Permissões</label>
                    <input type="text" value={formData.permissions?.join(', ') ?? ''} onChange={(event) => setFormData((current) => ({ ...current, permissions: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">Biografia</label>
                  <textarea value={formData.bio} onChange={(event) => setFormData((current) => ({ ...current, bio: event.target.value }))} rows={4} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none" />
                  {errors.bio && <p className="mt-2 text-xs text-[#991B1B]">{errors.bio}</p>}
                </div>
              </section>

              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-6">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-900 transition hover:bg-gray-50">Cancelar</button>
                <button type="button" onClick={handleSave} className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700">Salvar usuário</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

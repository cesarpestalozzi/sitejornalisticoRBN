'use client';

import { KeyRound, Mail, MapPin, PencilLine, Plus, Search, ShieldCheck, ToggleLeft, Trash2, UserRound, Linkedin, MessageSquare, Phone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { ToastContainer, useToast } from '@/app/components/Toast';
import { useArticles } from '@/app/hooks/useArticles';
import { generateTemporaryPassword, useUsers, type User, type UserRole } from '@/app/hooks/useUsers';
import { useCurrentAdminUser } from '@/app/lib/adminPermissions';

const MAX_PASSWORD_LENGTH = 8;

const roleConfig: Record<UserRole, { label: string; ribbon: string; text: string }> = {
  admin: { label: 'Administrador Principal', ribbon: 'from-purple-600 to-purple-700', text: 'text-purple-700' },
  'editor-chefe': { label: 'Editor-Chefe', ribbon: 'from-[#ADD8E6] to-[#87CEEB]', text: 'text-[#236A88]' },
  editor: { label: 'Editor', ribbon: 'from-[#ADD8E6] to-[#87CEEB]', text: 'text-[#236A88]' },
  jornalista: { label: 'Repórter/Redator', ribbon: 'from-[#991B1B] to-[#7F1D1D]', text: 'text-[#991B1B]' },
  colaborador: { label: 'Colaborador', ribbon: 'from-[#F59E0B] to-[#D97706]', text: 'text-[#92400E]' },
  estagiario: { label: 'Estagiário', ribbon: 'from-[#6B7280] to-[#4B5563]', text: 'text-[#374151]' },
};

function getOnboardingLabel(status?: User['onboardingStatus']) {
  switch (status) {
    case 'invite-sent':
      return 'Convite enviado';
    case 'first-access-pending':
      return 'Primeiro acesso pendente';
    case 'password-changed':
      return 'Senha alterada';
    case 'active':
    default:
      return 'Usuário ativo';
  }
}

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
  phone: '',
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
  linked: '',
  teams: '',
  passwordChangeRequired: false,
  onboardingStatus: 'active' as User['onboardingStatus'],
};

function hashPassword(value: string) {
  return btoa(value);
}

function ensureExternalUrl(value?: string) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  return `https://${normalized}`;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ChangePasswordModal({
  user,
  onClose,
  onSuccess,
}: {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Usa o email do adminUser (sessão ativa) se for o mesmo usuário, pois o users state pode ter email mock
  const effectiveEmail = (() => {
    try {
      const session = JSON.parse(localStorage.getItem('adminUser') || '{}');
      if (session?.id === user.id && session?.email) return session.email as string;
    } catch {}
    return user.email;
  })();

  const handleRequestCode = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: effectiveEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao enviar código.');
      }

      setInfo(`Código enviado para ${effectiveEmail}. Verifique sua caixa de entrada.`);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar código.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmChange = async () => {
    setError('');

    if (!code.trim()) {
      setError('Informe o código recebido por e-mail.');
      return;
    }

    if (!newPassword.trim() || newPassword.length > MAX_PASSWORD_LENGTH) {
      setError(`A nova senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: effectiveEmail, code: code.trim(), newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao confirmar nova senha.');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar nova senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#991B1B] px-6 py-4 text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <h2 className="font-bold text-lg">Trocar senha</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1 text-sm hover:bg-white/10 transition">Fechar</button>
        </div>

        <div className="p-6 space-y-4">
          {step === 'request' ? (
            <>
              <p className="text-sm text-gray-600">
                Um código de verificação será enviado para <span className="font-semibold text-gray-900">{effectiveEmail}</span>.
                Use-o para redefinir a senha.
              </p>
              {error && <p className="text-sm text-[#991B1B] bg-[#991B1B]/5 rounded-lg px-4 py-3">{error}</p>}
              <button
                type="button"
                onClick={handleRequestCode}
                disabled={loading}
                className="w-full rounded-lg bg-[#991B1B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7F1D1D] disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar código por e-mail'}
              </button>
            </>
          ) : (
            <>
              {info && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">{info}</p>}
              {error && <p className="text-sm text-[#991B1B] bg-[#991B1B]/5 rounded-lg px-4 py-3">{error}</p>}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-900">Código recebido por e-mail</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-bold tracking-widest focus:border-[#991B1B] focus:outline-none"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-900">
                  Nova senha <span className="font-normal text-gray-500">(máx. {MAX_PASSWORD_LENGTH} caracteres)</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value.slice(0, MAX_PASSWORD_LENGTH))}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none"
                  maxLength={MAX_PASSWORD_LENGTH}
                />
                <p className="mt-1 text-xs text-gray-500">{newPassword.length}/{MAX_PASSWORD_LENGTH} caracteres</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-900">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value.slice(0, MAX_PASSWORD_LENGTH))}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none"
                  maxLength={MAX_PASSWORD_LENGTH}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setStep('request'); setCode(''); setNewPassword(''); setConfirmPassword(''); setError(''); }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  onClick={handleConfirmChange}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-[#991B1B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7F1D1D] disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Confirmar senha'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser, updateCurrentUserProfile, isLoaded } = useUsers();
  const { articles } = useArticles();
  const { toasts, addToast, removeToast } = useToast();
  const currentUser = useCurrentAdminUser();
  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'editor-chefe';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<'linkedin' | 'teams' | null>(null);

  const currentUserRecord = useMemo(
    () => users.find((user) => user.id === currentUser?.id) ?? null,
    [users, currentUser?.id]
  );
  const [profileForm, setProfileForm] = useState({
    phone: '',
    extension: '',
    phonePublic: false,
    extensionPublic: false,
    linkedinProfileUrl: '',
    teamsLink: '',
  });

  useEffect(() => {
    if (!currentUserRecord) {
      return;
    }

    const nextProfileForm = {
      phone: currentUserRecord.phone ?? '',
      extension: currentUserRecord.extension ?? '',
      phonePublic: Boolean(currentUserRecord.phonePublic),
      extensionPublic: Boolean(currentUserRecord.extensionPublic),
      linkedinProfileUrl: currentUserRecord.linkedinProfileUrl || currentUserRecord.linked || '',
      teamsLink: currentUserRecord.teams || '',
    };

    queueMicrotask(() => {
      setProfileForm(nextProfileForm);
    });
  }, [currentUserRecord]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const integrationResult = url.searchParams.get('integration');
    if (!integrationResult) {
      return;
    }

    if (integrationResult === 'linkedin-connected') {
      addToast('LinkedIn conectado com sucesso.', 'success', 3000);
    } else if (integrationResult === 'teams-connected') {
      addToast('Microsoft Teams conectado com sucesso.', 'success', 3000);
    } else {
      const reason = url.searchParams.get('reason');
      addToast(reason ? decodeURIComponent(reason) : 'Não foi possível concluir a integração OAuth.', 'error', 5000);
    }

    url.searchParams.delete('integration');
    url.searchParams.delete('reason');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }, [addToast]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (!normalizedSearch) {
        return true;
      }

      return [user.name, user.email, user.role, user.specialization ?? '', user.login, user.location ?? '', user.linked ?? '', user.teams ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [searchTerm, users]);

  const userArticlesCountMap = useMemo(() => {
    const normalizeName = (value?: string) => (value ?? '').trim().toLowerCase();
    const map = new Map<string, number>();

    articles.forEach((article) => {
      const key = normalizeName(article.author);
      if (!key) {
        return;
      }
      map.set(key, (map.get(key) ?? 0) + 1);
    });

    return map;
  }, [articles]);

  const getUserArticlesCount = (user: User) => {
    const key = user.name.trim().toLowerCase();
    return userArticlesCountMap.get(key) ?? 0;
  };

  const openCreateModal = () => {
    if (!canManageUsers) {
      addToast('Somente admin e editor-chefe podem criar usuários.', 'error', 3000);
      return;
    }
    setEditingId(null);
    setFormData(initialFormData);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setAvatarPreview('');
    setErrors({});
    setShowForm(true);
  };

  const openEditModal = (user: User) => {
    if (!canManageUsers) {
      addToast('Somente admin e editor-chefe podem editar usuários.', 'error', 3000);
      return;
    }
    setEditingId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
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
      linked: user.linked ?? '',
      teams: user.teams ?? '',
      passwordChangeRequired: user.passwordChangeRequired ?? false,
      onboardingStatus: user.onboardingStatus ?? 'active',
    });
    setPasswordInput('');
    setConfirmPasswordInput('');
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

    if (editingId && passwordInput.trim() && passwordInput.trim().length > MAX_PASSWORD_LENGTH) {
      nextErrors.password = `A senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
    }

    if (editingId && confirmPasswordInput.trim() && !passwordInput.trim()) {
      nextErrors.confirmPassword = 'Informe a senha antes de confirmar.';
    }

    if (editingId && passwordInput.trim() && !confirmPasswordInput.trim()) {
      nextErrors.confirmPassword = 'Confirme a nova senha.';
    }

    if (editingId && passwordInput.trim() && confirmPasswordInput.trim() && passwordInput.trim() !== confirmPasswordInput.trim()) {
      nextErrors.confirmPassword = 'As senhas não coincidem.';
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
    if (!canManageUsers) {
      addToast('Somente admin e editor-chefe podem salvar alterações em usuários.', 'error', 3000);
      return;
    }
    if (!validateForm()) {
      addToast('Revise os campos obrigatórios antes de salvar.', 'error', 3000);
      return;
    }

    const payload = {
      ...formData,
      phone: formData.phone,
      avatar: avatarPreview || formData.avatar,
    };

    try {
      if (editingId) {
        const nextPasswordHash = passwordInput.trim() ? hashPassword(passwordInput.trim()) : formData.passwordHash;
        updateUser(editingId, {
          ...payload,
          passwordHash: nextPasswordHash,
          passwordChangeRequired: passwordInput.trim() ? false : formData.passwordChangeRequired,
          onboardingStatus: passwordInput.trim() ? 'password-changed' : formData.onboardingStatus,
        });
        addToast('Usuário atualizado com sucesso.', 'success', 2500);
      } else {
        const temporaryPassword = generateTemporaryPassword(10);
        const onboardingPayload = {
          ...payload,
          passwordHash: hashPassword(temporaryPassword),
          passwordChangeRequired: true,
          onboardingStatus: 'invite-sent' as const,
        };

        addUser(onboardingPayload);
        void fetch('/api/welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteType: 'admin-user',
            email: onboardingPayload.email,
            name: onboardingPayload.name,
            login: onboardingPayload.login,
            temporaryPassword,
            accessUrl: 'https://www.rbnbrasil.com.br/admin/login',
          }),
        }).then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.ok) {
            throw new Error(data.error || 'Não foi possível enviar o e-mail de boas-vindas.');
          }
        }).catch((error) => {
          addToast(error instanceof Error ? error.message : 'Usuário criado, mas o e-mail de boas-vindas não foi enviado.', 'warning', 4000);
        });

        addToast('Usuário criado com sucesso. O acesso foi enviado por e-mail.', 'success', 3000);
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Sem permissão para salvar este usuário.', 'error', 3000);
      return;
    }

    setShowForm(false);
    setFormData(initialFormData);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setAvatarPreview('');
  };

  const handleToggleStatus = (user: User) => {
    if (!canManageUsers) {
      addToast('Somente admin e editor-chefe podem alterar status de usuários.', 'error', 3000);
      return;
    }
    try {
      updateUser(user.id, { status: user.status === 'ativo' ? 'inativo' : 'ativo' });
      addToast('Status do usuário atualizado.', 'success', 2000);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Sem permissão para alterar o status.', 'error', 3000);
    }
  };

  const handleDelete = (id: string) => {
    if (!canManageUsers) {
      addToast('Somente admin e editor-chefe podem remover usuários.', 'error', 3000);
      return;
    }
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

  const handleSaveCurrentProfile = () => {
    if (!currentUserRecord) {
      addToast('Sessão de usuário indisponível para salvar perfil.', 'error', 3000);
      return;
    }

    setSavingProfile(true);
    try {
      updateCurrentUserProfile({
        phone: profileForm.phone,
        extension: profileForm.extension,
        phonePublic: profileForm.phonePublic,
        extensionPublic: profileForm.extensionPublic,
        linked: profileForm.linkedinProfileUrl,
        linkedinProfileUrl: profileForm.linkedinProfileUrl,
        teams: profileForm.teamsLink,
      });
      addToast('Seu perfil de contato foi atualizado.', 'success', 2500);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Não foi possível salvar seu perfil.', 'error', 3500);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStartIntegration = async (provider: 'linkedin' | 'teams') => {
    if (!currentUserRecord) {
      addToast('Sessão de usuário indisponível para integrar conta.', 'error', 3000);
      return;
    }

    setConnectingProvider(provider);
    try {
      const response = await fetch(`/api/admin/integrations/${provider}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserRecord.id, returnTo: '/admin/usuarios' }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.authorizeUrl) {
        throw new Error(data.error || `Não foi possível conectar ${provider}.`);
      }
      window.location.href = String(data.authorizeUrl);
    } catch (error) {
      addToast(error instanceof Error ? error.message : `Não foi possível conectar ${provider}.`, 'error', 3500);
      setConnectingProvider(null);
    }
  };

  const handleDisconnectIntegration = async (provider: 'linkedin' | 'teams') => {
    if (!currentUserRecord) {
      addToast('Sessão de usuário indisponível para desconectar conta.', 'error', 3000);
      return;
    }

    setConnectingProvider(provider);
    try {
      const response = await fetch('/api/admin/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserRecord.id, provider }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Não foi possível desconectar ${provider}.`);
      }

      updateCurrentUserProfile(
        provider === 'linkedin'
          ? { linkedinConnectionStatus: 'disconnected' }
          : { teamsConnectionStatus: 'disconnected' }
      );
      addToast(`${provider === 'linkedin' ? 'LinkedIn' : 'Teams'} desconectado.`, 'success', 2500);
    } catch (error) {
      addToast(error instanceof Error ? error.message : `Não foi possível desconectar ${provider}.`, 'error', 3500);
    } finally {
      setConnectingProvider(null);
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
              <p className="mt-2 text-gray-600">Equipe visível para todos. Edição liberada somente para admin e editor-chefe.</p>
            </div>
            {canManageUsers && (
              <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-6 py-3 font-semibold text-white transition hover:bg-[#2a2a2a]">
                <Plus className="h-5 w-5" />
                Novo usuário
              </button>
            )}
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

          {currentUserRecord && (
            <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">Meu perfil de comunicação</h2>
                <p className="text-sm text-gray-500">Configure contato público e conecte LinkedIn/Teams no seu perfil.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">Telefone</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none"
                  />
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={profileForm.phonePublic}
                      onChange={(event) => setProfileForm((current) => ({ ...current, phonePublic: event.target.checked }))}
                    />
                    Exibir telefone no perfil da equipe
                  </label>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">Ramal</label>
                  <input
                    type="text"
                    value={profileForm.extension}
                    onChange={(event) => setProfileForm((current) => ({ ...current, extension: event.target.value }))}
                    placeholder="1234"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none"
                  />
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={profileForm.extensionPublic}
                      onChange={(event) => setProfileForm((current) => ({ ...current, extensionPublic: event.target.checked }))}
                    />
                    Exibir ramal no perfil da equipe
                  </label>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">URL pública do LinkedIn</label>
                  <input
                    type="text"
                    value={profileForm.linkedinProfileUrl}
                    onChange={(event) => setProfileForm((current) => ({ ...current, linkedinProfileUrl: event.target.value }))}
                    placeholder="linkedin.com/in/usuario"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">Link do Teams (opcional)</label>
                  <input
                    type="text"
                    value={profileForm.teamsLink}
                    onChange={(event) => setProfileForm((current) => ({ ...current, teamsLink: event.target.value }))}
                    placeholder="teams.microsoft.com/l/chat/..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleStartIntegration('linkedin')}
                  disabled={connectingProvider !== null}
                  className="rounded-lg bg-[#0A66C2] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {currentUserRecord.linkedinConnectionStatus === 'connected' ? 'Reconectar LinkedIn' : 'Conectar LinkedIn'}
                </button>
                {currentUserRecord.linkedinConnectionStatus === 'connected' && (
                  <button
                    type="button"
                    onClick={() => void handleDisconnectIntegration('linkedin')}
                    disabled={connectingProvider !== null}
                    className="rounded-lg border border-[#0A66C2] px-4 py-2 text-sm font-semibold text-[#0A66C2] transition hover:bg-[#0A66C2]/5 disabled:opacity-50"
                  >
                    Desconectar LinkedIn
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleStartIntegration('teams')}
                  disabled={connectingProvider !== null}
                  className="rounded-lg bg-[#6264A7] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {currentUserRecord.teamsConnectionStatus === 'connected' ? 'Reconectar Teams' : 'Conectar Teams'}
                </button>
                {currentUserRecord.teamsConnectionStatus === 'connected' && (
                  <button
                    type="button"
                    onClick={() => void handleDisconnectIntegration('teams')}
                    disabled={connectingProvider !== null}
                    className="rounded-lg border border-[#6264A7] px-4 py-2 text-sm font-semibold text-[#6264A7] transition hover:bg-[#6264A7]/5 disabled:opacity-50"
                  >
                    Desconectar Teams
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveCurrentProfile}
                  disabled={savingProfile || connectingProvider !== null}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar perfil'}
                </button>
              </div>
            </section>
          )}

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user) => (
              <article key={user.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className={`h-20 bg-gradient-to-r ${roleConfig[user.role].ribbon}`} />
                <div className="px-6 pb-6">
                  <div className="-mt-10 flex items-start justify-between gap-4">
                    <img src={user.avatar} alt={user.name} className="h-20 w-20 rounded-full border-4 border-white object-cover shadow" />
                    <div className="mt-12 flex flex-col items-end gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{user.status}</span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${user.onboardingStatus === 'active' ? 'bg-[#E0F2FE] text-[#0369A1]' : 'bg-amber-100 text-amber-700'}`}>
                        {getOnboardingLabel(user.onboardingStatus)}
                      </span>
                    </div>
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
                    {user.phonePublic && user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[#2F7EA1]" />
                        <span>
                          {user.phone}
                          {user.extensionPublic && user.extension ? ` • Ramal ${user.extension}` : ''}
                        </span>
                      </div>
                    )}
                    {user.linked && (
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                        <a
                          href={ensureExternalUrl(user.linked)}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate font-medium text-[#0A66C2] underline-offset-2 hover:underline"
                        >
                          LinkedIn
                        </a>
                      </div>
                    )}
                    {user.teams && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-[#6264A7]" />
                        <a
                          href={ensureExternalUrl(user.teams)}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate font-medium text-[#6264A7] underline-offset-2 hover:underline"
                        >
                          Teams
                        </a>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                      <span>Artigos</span>
                      <span className="font-semibold text-gray-900">{getUserArticlesCount(user)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>LinkedIn</span>
                      <span>{user.linkedinConnectionStatus === 'connected' ? 'Conectado' : 'Não conectado'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Teams</span>
                      <span>{user.teamsConnectionStatus === 'connected' ? 'Conectado' : 'Não conectado'}</span>
                    </div>
                  </div>

                  {canManageUsers && (
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <button type="button" onClick={() => handleToggleStatus(user)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">
                        <ToggleLeft className="h-4 w-4" />
                        {user.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      </button>
                      <button type="button" onClick={() => openEditModal(user)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">
                        <PencilLine className="h-4 w-4" />
                        Editar
                      </button>
                      <button type="button" onClick={() => setChangingPasswordUser(user)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#991B1B] px-4 py-2 text-sm font-semibold text-[#991B1B] transition hover:bg-[#991B1B] hover:text-white">
                        <KeyRound className="h-4 w-4" />
                        Trocar senha
                      </button>
                      <button type="button" onClick={() => handleDelete(user.id)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700">
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    </div>
                  )}
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
                    {editingId ? (
                      <>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-900">
                            Nova senha <span className="font-normal text-gray-500">(máx. {MAX_PASSWORD_LENGTH} chars)</span>
                          </label>
                          <input
                            type="password"
                            value={passwordInput}
                            onChange={(event) => setPasswordInput(event.target.value.slice(0, MAX_PASSWORD_LENGTH))}
                            placeholder="Deixe em branco para manter a senha atual"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none"
                            maxLength={MAX_PASSWORD_LENGTH}
                          />
                          <p className="mt-1 text-xs text-gray-500">{passwordInput.length}/{MAX_PASSWORD_LENGTH} caracteres</p>
                          {errors.password && <p className="mt-1 text-xs text-[#991B1B]">{errors.password}</p>}
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-900">Confirmar senha</label>
                          <input
                            type="password"
                            value={confirmPasswordInput}
                            onChange={(event) => setConfirmPasswordInput(event.target.value.slice(0, MAX_PASSWORD_LENGTH))}
                            placeholder="Repita a nova senha"
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none"
                            maxLength={MAX_PASSWORD_LENGTH}
                          />
                          <p className="mt-1 text-xs text-gray-500">{confirmPasswordInput.length}/{MAX_PASSWORD_LENGTH} caracteres</p>
                          {errors.confirmPassword && <p className="mt-1 text-xs text-[#991B1B]">{errors.confirmPassword}</p>}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                        O sistema vai gerar uma senha temporária segura automaticamente e enviar para o e-mail cadastrado.
                      </div>
                    )}
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
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Linked</label>
                    <input type="text" value={formData.linked ?? ''} onChange={(event) => setFormData((current) => ({ ...current, linked: event.target.value }))} placeholder="linkedin.com/in/usuario" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Teams</label>
                    <input type="text" value={formData.teams ?? ''} onChange={(event) => setFormData((current) => ({ ...current, teams: event.target.value }))} placeholder="teams.microsoft.com/l/chat/..." className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
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

      {changingPasswordUser && (
        <ChangePasswordModal
          user={changingPasswordUser}
          onClose={() => setChangingPasswordUser(null)}
          onSuccess={() => {
            setChangingPasswordUser(null);
            addToast('Senha alterada com sucesso!', 'success', 3000);
          }}
        />
      )}
    </div>
  );
}

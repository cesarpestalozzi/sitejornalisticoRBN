import { useEffect, useState } from 'react';
import { AdminRole, ROLE_LEVELS, getCurrentAdminUser, getDefaultPermissionsForRole } from '@/app/lib/adminPermissions';

export type UserRole = AdminRole;
export type UserStatus = 'ativo' | 'inativo';

export const DEFAULT_PASSWORD = '123456';
export const ADMIN_LOGIN = 'RBN54078879837';
export const ADMIN_EMAIL = 'admin@rbn.com.br';

export function normalizeCpf(value: string) {
  return (value ?? '').replace(/\D/g, '');
}

export function formatCpf(value?: string | null) {
  const digits = normalizeCpf(value ?? '');
  if (digits.length !== 11) {
    return value ?? '';
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function maskCpf(value?: string | null) {
  const digits = normalizeCpf(value ?? '');
  if (digits.length !== 11) {
    return value ?? '';
  }

  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
}

export function buildUserLogin(cpf?: string | null) {
  const digits = normalizeCpf(cpf ?? '');
  return digits ? `RBN${digits}` : '';
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  login: string;
  passwordHash: string;
  role: UserRole;
  roleLevel: number;
  permissions: string[];
  bio: string;
  avatar: string;
  status: UserStatus;
  joinDate: string;
  articlesCount: number;
  specialization?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

const USERS_KEY = 'pz_news_users';

type SupabaseUserRow = {
  id: string;
  payload: User;
  updated_at?: string;
};

async function readRemoteUsersViaApi(): Promise<SupabaseUserRow[] | null> {
  try {
    const response = await fetch('/api/admin/users', { method: 'GET' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.ok ? (data.rows as SupabaseUserRow[]) : null;
  } catch {
    return null;
  }
}

async function upsertRemoteUserViaApi(user: User): Promise<void> {
  await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: user.id, payload: user }),
  });
}

async function deleteRemoteUserByIdViaApi(id: string): Promise<void> {
  await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

function svgToBase64DataUrl(svg: string) {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function hashPassword(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function createAvatar(name: string, background: string) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return svgToBase64DataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="120" fill="${background}" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="82" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `);
}

function getMockUsers(): User[] {
  // Usa data muito antiga para que dados reais do Supabase sempre ganhem no merge
  const epoch = '2020-01-01T00:00:00.000Z';

  return [
    {
      id: '1',
      name: 'César Pestalozzi',
      email: 'admin@rbn.com.br',
      cpf: '54078879837',
      login: ADMIN_LOGIN,
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      role: 'admin',
      roleLevel: 1,
      permissions: getDefaultPermissionsForRole('admin'),
      bio: 'Administrador principal da RBN e responsável pela operação editorial.',
      avatar: createAvatar('César Pestalozzi', '#991B1B'),
      status: 'ativo',
      joinDate: '2026-01-15',
      articlesCount: 45,
      specialization: 'Gestão editorial',
      location: 'São Paulo, SP',
      createdAt: epoch,
      updatedAt: epoch,
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria@rbn.com.br',
      cpf: '98765432100',
      login: buildUserLogin('98765432100'),
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      role: 'editor-chefe',
      roleLevel: 2,
      permissions: getDefaultPermissionsForRole('editor-chefe'),
      bio: 'Editora-chefe com foco em revisão, qualidade e operação editorial.',
      avatar: createAvatar('Maria Santos', '#5b7cfa'),
      status: 'ativo',
      joinDate: '2026-02-20',
      articlesCount: 62,
      specialization: 'Política e Economia',
      location: 'Rio de Janeiro, RJ',
      createdAt: epoch,
      updatedAt: epoch,
    },
    {
      id: '3',
      name: 'Carlos Oliveira',
      email: 'carlos@rbn.com.br',
      cpf: '11122233344',
      login: buildUserLogin('11122233344'),
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      role: 'jornalista',
      roleLevel: 4,
      permissions: getDefaultPermissionsForRole('jornalista'),
      bio: 'Jornalista especializado em tecnologia, inovação e mercado digital.',
      avatar: createAvatar('Carlos Oliveira', '#22c55e'),
      status: 'ativo',
      joinDate: '2026-03-10',
      articlesCount: 38,
      specialization: 'Tecnologia',
      location: 'Recife, PE',
      createdAt: epoch,
      updatedAt: epoch,
    },
  ];
}

function normalizeUserRecord(user: Partial<User> | null | undefined): User {
  const fallbackName = user?.name?.trim() || 'Usuário';
  const fallbackCpf = normalizeCpf(user?.cpf ?? '');
  const fallbackLogin = (user?.login || buildUserLogin(fallbackCpf) || ADMIN_LOGIN).trim().toUpperCase();
  const createdAt = user?.createdAt || new Date().toISOString();

  return {
    id: String(user?.id ?? `user-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: typeof user?.name === 'string' ? user.name.trim() : '',
    email: typeof user?.email === 'string' ? user.email.trim() : ADMIN_EMAIL,
    cpf: fallbackCpf,
    login: fallbackLogin || ADMIN_LOGIN,
    passwordHash: typeof user?.passwordHash === 'string' ? user.passwordHash : hashPassword(DEFAULT_PASSWORD),
    role: (user?.role as UserRole) || 'jornalista',
    roleLevel: typeof user?.roleLevel === 'number' ? user.roleLevel : ROLE_LEVELS[(user?.role as UserRole) || 'jornalista'],
    permissions: Array.isArray(user?.permissions) && user.permissions.length > 0
      ? user.permissions
      : getDefaultPermissionsForRole((user?.role as UserRole) || 'jornalista'),
    bio: typeof user?.bio === 'string' ? user.bio : '',
    avatar: typeof user?.avatar === 'string' && user.avatar.trim() ? user.avatar : createAvatar(fallbackName, '#991B1B'),
    status: user?.status === 'inativo' ? 'inativo' : 'ativo',
    joinDate: typeof user?.joinDate === 'string' ? user.joinDate : new Date().toISOString().split('T')[0],
    articlesCount:
      typeof user?.articlesCount === 'number' && Number.isFinite(user.articlesCount)
        ? Number(user.articlesCount)
        : 0,
    specialization: typeof user?.specialization === 'string' ? user.specialization : '',
    location: typeof user?.location === 'string' ? user.location : '',
    createdAt,
    updatedAt: typeof user?.updatedAt === 'string' ? user.updatedAt : createdAt,
  };
}

function ensureOfficialAdminUser(nextUsers: User[]) {
  const sanitized = nextUsers.map((user) => normalizeUserRecord(user));

  const adminIndex = sanitized.findIndex(
    (user) =>
      normalizeCpf(user.cpf) === '54078879837' ||
      user.login.toUpperCase() === ADMIN_LOGIN ||
      user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  if (adminIndex >= 0) {
    // Preserva dados customizados (avatar, bio, email, etc.) e garante apenas campos de segurança críticos
    sanitized[adminIndex] = {
      ...sanitized[adminIndex],
      login: ADMIN_LOGIN,
      cpf: '54078879837',
      role: 'admin',
      roleLevel: 1,
    };
    return sanitized;
  }

  const officialAdmin: User = {
    ...getMockUsers()[0],
    login: ADMIN_LOGIN,
    name: 'César Pestalozzi',
    cpf: '54078879837',
    passwordHash: hashPassword(DEFAULT_PASSWORD),
    role: 'admin',
    roleLevel: 1,
    permissions: getDefaultPermissionsForRole('admin'),
  };

  return [officialAdmin, ...sanitized];
}

function getUserIdentity(user: User) {
  const cpf = normalizeCpf(user.cpf);
  if (cpf) {
    return `cpf:${cpf}`;
  }
  const login = (user.login ?? '').trim().toUpperCase();
  if (login) {
    return `login:${login}`;
  }
  return `id:${user.id}`;
}

function mergeUsers(...groups: User[][]) {
  const map = new Map<string, User>();

  groups.flat().forEach((rawUser) => {
    const user = normalizeUserRecord(rawUser);
    const key = getUserIdentity(user);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, user);
      return;
    }

    const existingUpdatedAt = new Date(existing.updatedAt ?? existing.createdAt ?? 0).getTime();
    const nextUpdatedAt = new Date(user.updatedAt ?? user.createdAt ?? 0).getTime();
    map.set(key, nextUpdatedAt >= existingUpdatedAt ? user : existing);
  });

  return ensureOfficialAdminUser([...map.values()]).map(normalizeUserRecord);
}

function readLocalUsers() {
  const stored = localStorage.getItem(USERS_KEY);

  if (!stored) {
    return ensureOfficialAdminUser([]).map(normalizeUserRecord);
  }

  try {
    const parsed = JSON.parse(stored) as User[];
    return ensureOfficialAdminUser(Array.isArray(parsed) ? parsed : []).map(normalizeUserRecord);
  } catch (error) {
    console.error('Erro ao carregar usuarios:', error);
    return ensureOfficialAdminUser([]).map(normalizeUserRecord);
  }
}

async function readRemoteUsers() {
  const rows = await readRemoteUsersViaApi();
  if (!rows) return null;
  // Usa dados do Supabase diretamente sem aplicar mock defaults
  return rows
    .filter((row) => row && row.payload)
    .map((row) => normalizeUserRecord({ ...row.payload, id: row.id }));
}

async function upsertRemoteUser(user: User) {
  await upsertRemoteUserViaApi(user).catch((error) => {
    console.error('Erro ao salvar usuario remoto:', error);
  });
}

async function deleteRemoteUserById(id: string) {
  await deleteRemoteUserByIdViaApi(id).catch((error) => {
    console.error('Erro ao excluir usuario remoto:', error);
  });
}

function syncCurrentAdminSession(nextUser: User) {
  if (typeof window === 'undefined') {
    return;
  }

  const current = getCurrentAdminUser();
  if (!current || current.id !== nextUser.id) {
    return;
  }

  window.localStorage.setItem(
    'adminUser',
    JSON.stringify({
      ...current,
      id: nextUser.id,
      name: nextUser.name,
      email: nextUser.email,
      role: nextUser.role,
      roleLevel: nextUser.roleLevel,
      avatar: nextUser.avatar,
      login: nextUser.login,
      permissions: nextUser.permissions,
    })
  );
  window.dispatchEvent(new Event('adminUserChanged'));
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const remoteUsers = await readRemoteUsers();
        if (!isActive) return;

        if (remoteUsers && remoteUsers.length > 0) {
          // Supabase disponível — usa como fonte de verdade, sem merge com dados locais
          setUsers(remoteUsers);
          setIsLoaded(true);
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar usuários remotos:', error);
      }

      if (!isActive) return;

      // Fallback: usa localStorage
      const localUsers = readLocalUsers();
      setUsers(localUsers);
      setIsLoaded(true);
    };

    load();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== USERS_KEY && event.key !== null) {
        return;
      }

      const stored = localStorage.getItem(USERS_KEY);
      if (!stored) {
        setUsers(ensureOfficialAdminUser([]).map(normalizeUserRecord));
        return;
      }

      try {
        const parsed = JSON.parse(stored) as User[];
        setUsers(ensureOfficialAdminUser(Array.isArray(parsed) ? parsed : []).map(normalizeUserRecord));
      } catch (error) {
        console.error('Erro ao sincronizar usuarios:', error);
      }
    };

    const handleAdminUserChanged = () => {
      const stored = localStorage.getItem(USERS_KEY);
      if (!stored) {
        return;
      }

      try {
        const parsed = JSON.parse(stored) as User[];
        setUsers(ensureOfficialAdminUser(Array.isArray(parsed) ? parsed : []).map(normalizeUserRecord));
      } catch (error) {
        console.error('Erro ao sincronizar usuario logado:', error);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('adminUserChanged', handleAdminUserChanged);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('adminUserChanged', handleAdminUserChanged);
    };
  }, []);

  // Persiste no localStorage sempre que os usuários mudarem após o carregamento
  useEffect(() => {
    if (!isLoaded || users.length === 0) {
      return;
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users, isLoaded]);

  const addUser = (user: Omit<User, 'id' | 'joinDate' | 'createdAt' | 'updatedAt'> & { joinDate?: string; createdAt?: string; updatedAt?: string }) => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Sem permissão para criar usuários.');
    }

    const now = new Date().toISOString();
    const cpfDigits = normalizeCpf(user.cpf ?? '');
    if (!cpfDigits) {
      throw new Error('CPF obrigatório para cadastrar o funcionário.');
    }

    const duplicate = users.some((existing) => normalizeCpf(existing.cpf) === cpfDigits);
    if (duplicate) {
      throw new Error('Já existe um funcionário cadastrado com este CPF.');
    }

    const normalizedLogin = (user.login || buildUserLogin(cpfDigits)).trim().toUpperCase();
    const newUser: User = {
      ...user,
      cpf: cpfDigits,
      login: normalizedLogin,
      id: Date.now().toString(),
      joinDate: user.joinDate ?? new Date().toISOString().split('T')[0],
      createdAt: user.createdAt ?? now,
      updatedAt: user.updatedAt ?? now,
      passwordHash: user.passwordHash || hashPassword(DEFAULT_PASSWORD),
      roleLevel: user.roleLevel ?? 4,
      permissions: user.permissions?.length ? user.permissions : getDefaultPermissionsForRole(user.role),
    };

    setUsers((current) => [newUser, ...current]);
    void upsertRemoteUser(newUser).catch((error) => {
      console.error('Erro ao sincronizar novo usuário:', error);
    });
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Sem permissão para editar usuários.');
    }

    setUsers((current) =>
      current.map((user) => {
        if (user.id !== id) {
          return user;
        }

        const nextCpf = normalizeCpf(updates.cpf ?? user.cpf);
        const duplicate = current.some((entry) => entry.id !== id && normalizeCpf(entry.cpf) === nextCpf);
        if (duplicate) {
          throw new Error('Não é possível salvar: já existe outro funcionário com este CPF.');
        }

        const nextUser = {
          ...user,
          ...updates,
          cpf: nextCpf,
          login: (updates.login ?? user.login ?? buildUserLogin(nextCpf)).toUpperCase(),
          permissions: updates.permissions?.length ? updates.permissions : user.permissions,
          id: user.id,
          updatedAt: new Date().toISOString(),
        };

        void upsertRemoteUser(nextUser).catch((error) => {
          console.error('Erro ao sincronizar atualização do usuário:', error);
        });
        syncCurrentAdminSession(nextUser);
        return nextUser;
      })
    );
  };

  const updateCurrentUserAvatar = async (avatar: string) => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser) {
      throw new Error('Sem sessão de usuário ativa.');
    }

    const nextAvatar = avatar.trim();
    if (!nextAvatar) {
      throw new Error('Selecione uma imagem válida.');
    }

    const updatedAt = new Date().toISOString();
    const currentRecord = users.find((user) => user.id === currentUser.id) ?? null;
    const nextUser = normalizeUserRecord({
      ...(currentRecord ?? {}),
      ...currentUser,
      avatar: nextAvatar,
      updatedAt,
    });

    setUsers((current) =>
      current.map((user) => (user.id === currentUser.id ? { ...user, avatar: nextAvatar, updatedAt } : user))
    );
    void upsertRemoteUser(nextUser).catch((error) => {
      console.error('Erro ao sincronizar avatar do usuário:', error);
    });
    syncCurrentAdminSession(nextUser);
    return nextUser;
  };

  const removeCurrentUserAvatar = async () => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser) {
      throw new Error('Sem sessão de usuário ativa.');
    }

    const currentRecord = users.find((user) => user.id === currentUser.id) ?? null;
    const updatedAt = new Date().toISOString();
    const fallbackAvatar = createAvatar(currentUser.name || currentRecord?.name || 'Usuário', '#991B1B');
    const nextUser = normalizeUserRecord({
      ...(currentRecord ?? {}),
      ...currentUser,
      avatar: fallbackAvatar,
      updatedAt,
    });

    setUsers((current) =>
      current.map((user) => (user.id === currentUser.id ? { ...user, avatar: fallbackAvatar, updatedAt } : user))
    );
    void upsertRemoteUser(nextUser).catch((error) => {
      console.error('Erro ao sincronizar remoção de avatar do usuário:', error);
    });
    syncCurrentAdminSession(nextUser);
    return nextUser;
  };

  const deleteUser = (id: string) => {
    const currentUser = getCurrentAdminUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Sem permissão para excluir usuários.');
    }

    setUsers((current) => current.filter((user) => user.id !== id));
    void deleteRemoteUserById(id).catch((error) => {
      console.error('Erro ao sincronizar exclusão de usuário:', error);
    });
  };

  return {
    users,
    isLoaded,
    addUser,
    updateUser,
    updateCurrentUserAvatar,
    removeCurrentUserAvatar,
    deleteUser,
  };
}

export function getCurrentAdminProfile(users: User[]) {
  const currentUser = getCurrentAdminUser();

  if (!currentUser) {
    return null;
  }

  const currentProfile =
    users.find((user) => user.id === currentUser.id) ||
    users.find((user) => user.login?.toUpperCase() === currentUser.login?.toUpperCase()) ||
    users.find((user) => user.email.toLowerCase() === currentUser.email.toLowerCase());

  if (currentProfile) {
    return {
      ...currentProfile,
      name: currentUser.name || currentProfile.name,
      email: currentUser.email || currentProfile.email,
      role: currentUser.role,
      roleLevel: currentUser.roleLevel,
      avatar: currentUser.avatar || currentProfile.avatar,
      login: currentUser.login || currentProfile.login,
      permissions: currentUser.permissions?.length ? currentUser.permissions : currentProfile.permissions,
    };
  }

  return {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    cpf: '',
    login: currentUser.login ?? '',
    passwordHash: '',
    role: currentUser.role,
    roleLevel: currentUser.roleLevel,
    permissions: currentUser.permissions ?? [],
    bio: '',
    avatar: currentUser.avatar ?? '',
    status: 'ativo' as const,
    joinDate: '',
    articlesCount: 0,
  };
}

export type RbnAuthProvider = 'email' | 'google' | 'facebook';

export type RbnAccount = {
  id: string;
  name: string;
  email: string;
  provider: RbnAuthProvider;
  avatar?: string;
  createdAt: string;
};

const CURRENT_USER_KEY = 'rbn_current_user';
const USERS_KEY = 'rbn_users';
const RBN_AUTH_CHANGED_EVENT = 'rbnAuthChanged';

function getDisplayNameFromEmail(email: string) {
  const local = email.split('@')[0]?.trim();
  if (!local) return 'Usuário RBN';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Usuário RBN';
}

function isWindowAvailable() {
  return typeof window !== 'undefined';
}

export function readRbnUsers(): RbnAccount[] {
  if (!isWindowAvailable()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is RbnAccount => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const candidate = item as Partial<RbnAccount>;
      return Boolean(candidate.id && candidate.name && candidate.email && candidate.provider && candidate.createdAt);
    });
  } catch {
    return [];
  }
}

export function writeRbnUsers(users: RbnAccount[]) {
  if (!isWindowAvailable()) {
    return;
  }

  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function readCurrentRbnUser(): RbnAccount | null {
  if (!isWindowAvailable()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<RbnAccount>;
    if (!parsed.id || !parsed.name || !parsed.email || !parsed.provider || !parsed.createdAt) {
      return null;
    }

    return parsed as RbnAccount;
  } catch {
    return null;
  }
}

export function persistCurrentRbnUser(user: RbnAccount | null) {
  if (!isWindowAvailable()) {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(CURRENT_USER_KEY);
    window.dispatchEvent(new Event(RBN_AUTH_CHANGED_EVENT));
    return;
  }

  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(RBN_AUTH_CHANGED_EVENT));
}

export function createOrLoginRbnAccount(
  email: string,
  provider: RbnAuthProvider,
  name?: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Informe o seu e-mail para continuar.');
  }

  const users = readRbnUsers();
  const existing = users.find((user) => user.email.toLowerCase() === normalizedEmail);

  if (existing) {
    persistCurrentRbnUser(existing);
    return existing;
  }

  const newUser: RbnAccount = {
    id: `rbn-user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: (name || getDisplayNameFromEmail(normalizedEmail)).trim() || 'Usuário RBN',
    email: normalizedEmail,
    provider,
    avatar: '',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeRbnUsers(users);
  persistCurrentRbnUser(newUser);
  return newUser;
}

export function loginWithRbnEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Informe o seu e-mail para entrar na Conta RBN.');
  }

  const users = readRbnUsers();
  const user = users.find((item) => item.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return createOrLoginRbnAccount(normalizedEmail, 'email');
  }

  persistCurrentRbnUser(user);
  return user;
}

export function signOutRbnUser() {
  persistCurrentRbnUser(null);
}

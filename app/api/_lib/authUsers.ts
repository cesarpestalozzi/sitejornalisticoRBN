export type AuthAdminUser = {
  id: string;
  email: string;
  created_at: string;
  user_metadata: Record<string, unknown> | null;
};

const pythonApiBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function fetchPythonUsers() {
  try {
    const response = await fetch(`${pythonApiBase}/api/admin/users`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return { users: [] as AuthAdminUser[], error: 'Falha ao consultar usuários no backend Python.' };
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];

    return {
      users: rows.map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ''),
        email: String((row.payload as Record<string, unknown> | undefined)?.email ?? ''),
        created_at: String(row.updated_at ?? new Date().toISOString()),
        user_metadata: (row.payload as Record<string, unknown> | undefined) ?? null,
      })) as AuthAdminUser[],
      error: '',
    };
  } catch (error) {
    return {
      users: [] as AuthAdminUser[],
      error: error instanceof Error ? error.message : 'Falha ao consultar usuários no backend Python.',
    };
  }
}

export async function listAllAuthUsers() {
  return fetchPythonUsers();
}

export async function findAuthUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { user: null as AuthAdminUser | null, error: '' };
  }

  const { users, error } = await listAllAuthUsers();
  if (error) {
    return { user: null as AuthAdminUser | null, error };
  }

  const user = users.find((item) => item.email?.toLowerCase() === normalizedEmail) ?? null;
  return { user, error: '' };
}

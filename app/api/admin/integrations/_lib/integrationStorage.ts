const pythonApiBase = (process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export type IntegrationProvider = 'linkedin' | 'teams';

type UserPayload = Record<string, unknown>;

function getAdminClient() {
  return pythonApiBase;
}

export async function upsertIntegrationSecret(
  userId: string,
  provider: IntegrationProvider,
  secretPayload: Record<string, unknown>
) {
  const response = await fetch(`${getAdminClient()}/api/admin/integrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, provider, payload: secretPayload }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Falha ao salvar integração (${response.status}).`);
  }
}

export async function getUserById(userId: string) {
  const response = await fetch(`${getAdminClient()}/api/admin/users`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao ler usuários (${response.status}).`);
  }
  const data = (await response.json()) as { rows?: Array<{ id: string; payload?: UserPayload }> };
  const row = (data.rows || []).find((item) => String(item.id) === userId);
  return row ? { id: String(row.id), payload: row.payload ?? {} } : null;
}

export async function updateUserPayload(userId: string, updates: Record<string, unknown>) {
  const current = await getUserById(userId);
  if (!current) {
    throw new Error('Usuário não encontrado.');
  }

  const nextPayload = {
    ...current.payload,
    ...updates,
  };

  const response = await fetch(`${getAdminClient()}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId, payload: nextPayload }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Falha ao atualizar usuário (${response.status}).`);
  }
}

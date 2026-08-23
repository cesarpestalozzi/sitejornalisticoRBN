import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export type IntegrationProvider = 'linkedin' | 'teams';

type UserPayload = Record<string, unknown>;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function upsertIntegrationSecret(
  userId: string,
  provider: IntegrationProvider,
  secretPayload: Record<string, unknown>
) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    throw new Error('Supabase service role não configurada.');
  }

  const { error } = await adminClient.from('pz_news_user_integrations').upsert(
    [
      {
        user_id: userId,
        provider,
        payload: secretPayload,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'user_id,provider' }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUserById(userId: string) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    throw new Error('Supabase service role não configurada.');
  }

  const { data, error } = await adminClient
    .from('pz_news_users')
    .select('id,payload,updated_at')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? { id: String(data.id), payload: (data.payload ?? {}) as UserPayload } : null;
}

export async function updateUserPayload(userId: string, updates: Record<string, unknown>) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    throw new Error('Supabase service role não configurada.');
  }

  const current = await getUserById(userId);
  if (!current) {
    throw new Error('Usuário não encontrado.');
  }

  const nextPayload = {
    ...current.payload,
    ...updates,
  };

  const { error } = await adminClient.from('pz_news_users').upsert(
    [
      {
        id: userId,
        payload: nextPayload,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(error.message);
  }
}


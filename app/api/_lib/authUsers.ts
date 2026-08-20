import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export type AuthAdminUser = {
  id: string;
  email: string;
  created_at: string;
  user_metadata: Record<string, unknown> | null;
};

export function getAuthAdminClient() {
  if (typeof window !== 'undefined') {
    return null;
  }

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

export async function listAllAuthUsers() {
  const client = getAuthAdminClient();
  if (!client) {
    return {
      users: [] as AuthAdminUser[],
      error: 'Supabase service role ausente no backend; o admin mantém fallback local como proteção extra.',
    };
  }

  try {
    const users: AuthAdminUser[] = [];
    const perPage = 200;
    let page = 1;

    while (true) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage });
      if (error) {
        return { users: [] as AuthAdminUser[], error: error.message };
      }

      const rawBatch: Array<AuthAdminUser | null> = (data?.users ?? [])
        .map((user) => {
          const email = String(user.email ?? '').trim().toLowerCase();
          if (!email) {
            return null;
          }

          return {
            id: String(user.id),
            email,
            created_at: String(user.created_at ?? new Date().toISOString()),
            user_metadata: (user.user_metadata as Record<string, unknown> | null) ?? null,
          } satisfies AuthAdminUser;
        });
      const batch = rawBatch.filter((item): item is AuthAdminUser => item !== null);

      users.push(...batch);

      if (batch.length < perPage) {
        break;
      }

      page += 1;
      if (page > 50) {
        break;
      }
    }

    return { users, error: '' };
  } catch (error) {
    return {
      users: [] as AuthAdminUser[],
      error: error instanceof Error ? error.message : 'Falha ao listar usuários do Supabase.',
    };
  }
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

  const user = users.find((item) => item.email === normalizedEmail) ?? null;
  return { user, error: '' };
}

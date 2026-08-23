import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateUserPayload } from '../_lib/integrationStorage';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { userId?: string; provider?: 'linkedin' | 'teams' }
    | null;
  const userId = String(body?.userId || '').trim();
  const provider = body?.provider;

  if (!userId || (provider !== 'linkedin' && provider !== 'teams')) {
    return NextResponse.json({ ok: false, error: 'userId e provider são obrigatórios.' }, { status: 400 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { ok: false, error: 'Supabase service role não configurada.' },
      { status: 500 }
    );
  }

  const { error } = await adminClient
    .from('pz_news_user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (provider === 'linkedin') {
    await updateUserPayload(userId, { linkedinConnectionStatus: 'disconnected' });
  } else {
    await updateUserPayload(userId, { teamsConnectionStatus: 'disconnected' });
  }

  return NextResponse.json({ ok: true });
}


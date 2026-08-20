import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TABLE = 'pz_news_users';

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// GET /api/admin/users — lista todos os usuários
export async function GET() {
  const client = getAdminClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
  }

  const { data, error } = await client
    .from(TABLE)
    .select('id, payload, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [] });
}

// POST /api/admin/users — salva (upsert) um usuário
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.payload) {
    return NextResponse.json({ ok: false, error: 'id e payload são obrigatórios.' }, { status: 400 });
  }

  const client = getAdminClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
  }

  const { error } = await client
    .from(TABLE)
    .upsert([{ id: body.id, payload: body.payload, updated_at: new Date().toISOString() }], { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/users?id=<userId> — remove um usuário
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id é obrigatório.' }, { status: 400 });
  }

  const client = getAdminClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
  }

  const { error } = await client.from(TABLE).delete().eq('id', id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

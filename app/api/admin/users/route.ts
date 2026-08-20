import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TABLE = 'pz_news_users';

function getHeaders() {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

function endpoint(query = '') {
  return `${SUPABASE_URL}/rest/v1/${TABLE}${query}`;
}

function isConfigured() {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

// GET /api/admin/users — lista todos os usuários
export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
  }

  const response = await fetch(endpoint('?select=id,payload,updated_at&order=updated_at.desc'), {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ ok: false, error: text }, { status: 500 });
  }

  const rows = await response.json();
  return NextResponse.json({ ok: true, rows });
}

// POST /api/admin/users — salva (upsert) um usuário
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.payload) {
    return NextResponse.json({ ok: false, error: 'id e payload são obrigatórios.' }, { status: 400 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
  }

  const response = await fetch(endpoint('?on_conflict=id'), {
    method: 'POST',
    headers: { ...getHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ id: body.id, payload: body.payload, updated_at: new Date().toISOString() }]),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ ok: false, error: text }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/users?id=<userId> — remove um usuário
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id é obrigatório.' }, { status: 400 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
  }

  const response = await fetch(endpoint(`?id=eq.${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ ok: false, error: text }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { resolveAdminUser } from '@/app/api/_lib/adminServerAuth';

export const dynamic = 'force-dynamic';

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
    if (value && value !== '[SENSITIVE]') return value;
  }
  return '';
}

const baseUrl = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, '');
const key = env('SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
const tableUrl = baseUrl ? `${baseUrl}/rest/v1/pz_news_settings` : '';

function headers() {
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Type': 'application/json' };
}

export async function GET(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ ok: false, error: 'Apenas o administrador principal pode acessar Configurações.' }, { status: 403 });
  if (!tableUrl || !key) return NextResponse.json({ ok: false, error: 'Armazenamento de configurações não configurado.' }, { status: 503 });
  const response = await fetch(`${tableUrl}?id=eq.portal&select=payload,updated_at`, { headers: headers(), cache: 'no-store' });
  if (!response.ok) return NextResponse.json({ ok: false, error: `Falha ao consultar configurações (${response.status}).` }, { status: 502 });
  const rows = (await response.json()) as Array<{ payload?: unknown; updated_at?: string }>;
  return NextResponse.json({ ok: true, settings: rows[0]?.payload ?? null, updatedAt: rows[0]?.updated_at ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ ok: false, error: 'Apenas o administrador principal pode alterar Configurações.' }, { status: 403 });
  if (!tableUrl || !key) return NextResponse.json({ ok: false, error: 'Armazenamento de configurações não configurado.' }, { status: 503 });
  const body = await request.json().catch(() => null) as { settings?: unknown } | null;
  if (!body?.settings || typeof body.settings !== 'object') return NextResponse.json({ ok: false, error: 'Configurações inválidas.' }, { status: 400 });
  const response = await fetch(tableUrl, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ id: 'portal', payload: body.settings, updated_at: new Date().toISOString() }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = await response.text();
    const isMissingTable = /Could not find the table.*pz_news_settings/i.test(detail);
    const friendlyError = isMissingTable
      ? 'A tabela "pz_news_settings" ainda não existe no banco Supabase. Peça para um administrador executar o SQL em supabase/schema.sql (bloco pz_news_settings) no SQL Editor do Supabase.'
      : `Falha ao salvar configurações: ${detail.slice(0, 240)}`;
    return NextResponse.json({ ok: false, error: friendlyError }, { status: 502 });
  }
  return NextResponse.json({ ok: true, settings: body.settings });
}

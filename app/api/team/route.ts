import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TABLE = 'pz_news_users';

type RawUserRow = {
  id: string;
  payload: Record<string, unknown>;
};

function isConfigured() {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

function getHeaders() {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

function endpoint(query = '') {
  return `${SUPABASE_URL}/rest/v1/${TABLE}${query}`;
}

function readText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readBoolean(payload: Record<string, unknown>, key: string) {
  return payload[key] === true;
}

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

  const rows = (await response.json()) as RawUserRow[];
  const members = rows
    .map((row) => {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const status = readText(payload, 'status').toLowerCase();
      if (status && status !== 'ativo') {
        return null;
      }

      const phonePublic = readBoolean(payload, 'phonePublic');
      const extensionPublic = readBoolean(payload, 'extensionPublic');

      return {
        id: String(row.id),
        name: readText(payload, 'name'),
        avatar: readText(payload, 'avatar'),
        role: readText(payload, 'role'),
        bio: readText(payload, 'bio'),
        location: readText(payload, 'location'),
        specialization: readText(payload, 'specialization'),
        linked:
          readText(payload, 'linkedinProfileUrl') || readText(payload, 'linked'),
        teams: readText(payload, 'teams'),
        phone: phonePublic ? readText(payload, 'phone') : '',
        extension: extensionPublic ? readText(payload, 'extension') : '',
        linkedinConnectionStatus:
          readText(payload, 'linkedinConnectionStatus') === 'connected'
            ? 'connected'
            : 'disconnected',
        teamsConnectionStatus:
          readText(payload, 'teamsConnectionStatus') === 'connected'
            ? 'connected'
            : 'disconnected',
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return NextResponse.json({ ok: true, members });
}


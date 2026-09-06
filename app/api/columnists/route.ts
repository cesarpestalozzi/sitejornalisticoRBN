import { NextRequest, NextResponse } from 'next/server';
import { listStoredUsers } from '@/app/api/_lib/userStore';

export const dynamic = 'force-dynamic';

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function publicUser(row: { id: string; payload: Record<string, unknown> }) {
  const user = row.payload;
  const configuredName = String(user.publicName ?? '').trim();
  const fallbackName = String(user.name ?? row.id).trim();
  const configuredSlug = String(user.columnistSlug ?? '').trim();
  return {
    id: row.id,
    name: configuredName || fallbackName,
    avatar: String(user.avatar ?? ''),
    bio: String(user.bio ?? ''),
    professionalInfo: String(user.professionalInfo ?? user.specialization ?? ''),
    publicRole: String(user.publicRole ?? ''),
    expertise: String(user.expertise ?? user.specialization ?? ''),
    location: String(user.location ?? ''),
    publicEmail: user.publicEmail && user.publicEmailAuthorized === true ? String(user.publicEmail) : '',
    website: String(user.website ?? ''),
    profileVisible: user.profileVisible !== false,
    columnistSlug: configuredSlug || slugify(configuredName || fallbackName),
    socialLinks: Array.isArray(user.socialLinks) ? user.socialLinks : [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const query = new URL(request.url).searchParams;
    const requested = (query.get('id') || query.get('slug') || '').trim().toLowerCase();
    const users = (await listStoredUsers())
      .filter((row) => String(row.payload.status ?? 'ativo').trim().toLowerCase() === 'ativo' && row.payload.isColumnist === true && row.payload.profileVisible !== false)
      .map(publicUser);
    const result = requested
      ? users.filter((user) => user.id.toLowerCase() === requested || user.columnistSlug.toLowerCase() === requested)
      : users;
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao consultar colunistas.' }, { status: 502 });
  }
}

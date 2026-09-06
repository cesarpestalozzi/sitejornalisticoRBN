import { NextRequest, NextResponse } from 'next/server';
import { listStoredUsers } from '@/app/api/_lib/userStore';

export const dynamic = 'force-dynamic';

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function publicUser(row: { id: string; payload: Record<string, unknown> }) {
  const user = row.payload;
  return {
    id: row.id,
    name: String(user.name ?? ''),
    avatar: String(user.avatar ?? ''),
    bio: String(user.bio ?? ''),
    professionalInfo: String(user.professionalInfo ?? user.specialization ?? ''),
    columnistSlug: String(user.columnistSlug ?? slugify(String(user.name ?? row.id))),
    socialLinks: Array.isArray(user.socialLinks) ? user.socialLinks : [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const query = new URL(request.url).searchParams;
    const requested = (query.get('id') || query.get('slug') || '').trim().toLowerCase();
    const users = (await listStoredUsers())
      .filter((row) => row.payload.status === 'ativo' && row.payload.isColumnist === true)
      .map(publicUser);
    const result = requested
      ? users.filter((user) => user.id.toLowerCase() === requested || user.columnistSlug.toLowerCase() === requested)
      : users;
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao consultar colunistas.' }, { status: 502 });
  }
}

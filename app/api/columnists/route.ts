import { NextRequest, NextResponse } from 'next/server';
import { listStoredUsers } from '@/app/api/_lib/userStore';
import { listStoredArticles } from '@/app/api/_lib/articleStore';

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
    columnistSlug: configuredSlug && !/^\d+$/.test(configuredSlug) ? configuredSlug : slugify(configuredName || fallbackName),
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
    if (query.get('includeArticles') === 'true') {
      const rows = await listStoredArticles(undefined, { publishedOnly: true, lite: true });
      const enriched = result.map((user) => {
        const name = user.name.toLowerCase();
        const articles = rows
          .filter((row) => {
            const payload = row.payload;
            const ids = Array.isArray(payload.authorUserIds) ? payload.authorUserIds.map(String) : [];
            const authors = String(payload.author ?? '').split(/\s+e\s+|,\s*/i).map((value) => value.trim().replace(/^por\s+/i, '').toLowerCase());
            return ids.includes(user.id) || String(payload.columnistUserId ?? '') === user.id || authors.includes(name);
          })
          .filter((row) => !row.deleted)
          .map((row) => ({ ...row.payload, id: row.id, updatedAt: row.payload.updatedAt ?? row.updated_at }));
        return { ...user, articles };
      });
      return NextResponse.json(enriched, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao consultar colunistas.' }, { status: 502 });
  }
}

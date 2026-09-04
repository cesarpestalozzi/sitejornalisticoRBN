import { NextResponse } from 'next/server';
import { listAllAuthUsers } from '@/app/api/_lib/authUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AudienceUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  status?: string;
};

function getDisplayName(email: string, metadata: Record<string, unknown> | null) {
  const rawName = typeof metadata?.name === 'string'
    ? metadata.name
    : typeof metadata?.full_name === 'string'
      ? metadata.full_name
      : '';
  if (rawName.trim()) {
    return rawName.trim();
  }

  const localPart = email.split('@')[0]?.trim() || 'Usuário RBN';
  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function GET() {
  const { users: authUsers, error } = await listAllAuthUsers();

  if (error) {
    return NextResponse.json(
      {
        ok: true,
        users: [],
        warning: error,
        source: 'fallback-local',
      },
      { status: 200 }
    );
  }

  const users: AudienceUser[] = authUsers
    .map((row) => {
      return {
        id: row.id,
        email: row.email,
        name: getDisplayName(row.email, row.user_metadata ?? null),
        createdAt: String(row.created_at ?? new Date().toISOString()),
        status: typeof row.user_metadata?.status === 'string' ? row.user_metadata.status : 'ativo',
      } satisfies AudienceUser;
    })
    .filter((user) => user.email && !['inativo', 'inactive', 'disabled', 'desativado'].includes(user.status?.toLowerCase() ?? ''))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ ok: true, users, source: 'supabase-service-role' }, { status: 200 });
}

import { NextResponse } from 'next/server';
import { listAllAuthUsers } from '@/app/api/_lib/authUsers';

type AudienceUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

function getDisplayName(email: string, metadata: Record<string, unknown> | null) {
  const rawName = typeof metadata?.full_name === 'string' ? metadata.full_name : '';
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
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  const users: AudienceUser[] = authUsers
    .map((row) => {
      return {
        id: row.id,
        email: row.email,
        name: getDisplayName(row.email, row.user_metadata ?? null),
        createdAt: String(row.created_at ?? new Date().toISOString()),
      } satisfies AudienceUser;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ ok: true, users }, { status: 200 });
}

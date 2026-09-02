import { NextRequest, NextResponse } from 'next/server';
import { updateUserPayload } from '../_lib/integrationStorage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { userId?: string; provider?: 'linkedin' | 'teams' }
    | null;
  const userId = String(body?.userId || '').trim();
  const provider = body?.provider;

  if (!userId || (provider !== 'linkedin' && provider !== 'teams')) {
    return NextResponse.json({ ok: false, error: 'userId e provider são obrigatórios.' }, { status: 400 });
  }

  if (provider === 'linkedin') {
    await updateUserPayload(userId, { linkedinConnectionStatus: 'disconnected' });
  } else {
    await updateUserPayload(userId, { teamsConnectionStatus: 'disconnected' });
  }

  return NextResponse.json({ ok: true });
}

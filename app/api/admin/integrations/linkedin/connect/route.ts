import { NextRequest, NextResponse } from 'next/server';
import { buildOAuthState } from '../../_lib/oauthState';
import { getUserById } from '../../_lib/integrationStorage';

export const dynamic = 'force-dynamic';

const linkedInClientId = process.env.LINKEDIN_CLIENT_ID || '';

function getSiteUrl(request: NextRequest) {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '';
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const origin = request.nextUrl.origin;
  return origin.replace(/\/+$/, '');
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { userId?: string; returnTo?: string }
    | null;

  const userId = String(body?.userId || '').trim();
  const returnTo = String(body?.returnTo || '/admin/usuarios').trim() || '/admin/usuarios';

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'userId é obrigatório.' }, { status: 400 });
  }

  if (!linkedInClientId) {
    return NextResponse.json(
      { ok: false, error: 'LINKEDIN_CLIENT_ID não configurado.' },
      { status: 500 }
    );
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Usuário não encontrado.' }, { status: 404 });
  }

  const siteUrl = getSiteUrl(request);
  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI ||
    `${siteUrl}/api/admin/integrations/linkedin/callback`;

  const state = buildOAuthState({
    userId,
    provider: 'linkedin',
    returnTo,
    createdAt: Date.now(),
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: linkedInClientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
  });

  return NextResponse.json({
    ok: true,
    authorizeUrl: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
  });
}


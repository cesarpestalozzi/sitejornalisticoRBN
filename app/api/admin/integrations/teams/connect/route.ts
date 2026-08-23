import { NextRequest, NextResponse } from 'next/server';
import { buildOAuthState } from '../../_lib/oauthState';
import { getUserById } from '../../_lib/integrationStorage';

export const dynamic = 'force-dynamic';

const microsoftClientId = process.env.MICROSOFT_CLIENT_ID || '';
const microsoftTenantId = process.env.MICROSOFT_TENANT_ID || 'common';

function getSiteUrl(request: NextRequest) {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '';
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  return request.nextUrl.origin.replace(/\/+$/, '');
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

  if (!microsoftClientId) {
    return NextResponse.json(
      { ok: false, error: 'MICROSOFT_CLIENT_ID não configurado.' },
      { status: 500 }
    );
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Usuário não encontrado.' }, { status: 404 });
  }

  const siteUrl = getSiteUrl(request);
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI ||
    `${siteUrl}/api/admin/integrations/teams/callback`;

  const state = buildOAuthState({
    userId,
    provider: 'teams',
    returnTo,
    createdAt: Date.now(),
  });

  const params = new URLSearchParams({
    client_id: microsoftClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email User.Read',
    state,
  });

  return NextResponse.json({
    ok: true,
    authorizeUrl: `https://login.microsoftonline.com/${encodeURIComponent(microsoftTenantId)}/oauth2/v2.0/authorize?${params.toString()}`,
  });
}


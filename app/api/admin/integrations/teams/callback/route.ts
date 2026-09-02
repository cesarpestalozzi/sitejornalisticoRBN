import { NextRequest, NextResponse } from 'next/server';
import { parseOAuthState } from '../../_lib/oauthState';
import { updateUserPayload, upsertIntegrationSecret } from '../../_lib/integrationStorage';

export const dynamic = 'force-dynamic';

const microsoftClientId = process.env.MICROSOFT_CLIENT_ID || '';
const microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
const microsoftTenantId = process.env.MICROSOFT_TENANT_ID || 'common';

function buildRedirectTarget(request: NextRequest, path: string) {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '';
  const siteBase = explicit ? explicit.replace(/\/+$/, '') : request.nextUrl.origin;
  return `${siteBase}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = parseOAuthState(url.searchParams.get('state'));
  const providerError = url.searchParams.get('error');
  const providerErrorDescription = url.searchParams.get('error_description');

  const fallbackTarget = buildRedirectTarget(request, '/admin/usuarios?integration=teams-error');
  if (!state || state.provider !== 'teams') {
    return NextResponse.redirect(fallbackTarget);
  }

  const returnToBase = state.returnTo.includes('?') ? `${state.returnTo}&` : `${state.returnTo}?`;
  if (providerError) {
    return NextResponse.redirect(
      buildRedirectTarget(
        request,
        `${returnToBase}integration=teams-error&reason=${encodeURIComponent(providerErrorDescription || providerError)}`
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      buildRedirectTarget(request, `${returnToBase}integration=teams-error&reason=code-missing`)
    );
  }

  if (!microsoftClientId || !microsoftClientSecret) {
    return NextResponse.redirect(
      buildRedirectTarget(request, `${returnToBase}integration=teams-error&reason=env-missing`)
    );
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || request.nextUrl.origin).replace(
    /\/+$/,
    ''
  );
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI ||
    `${siteUrl}/api/admin/integrations/teams/callback`;

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(microsoftTenantId)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: microsoftClientId,
        client_secret: microsoftClientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        scope: 'openid profile email User.Read',
      }),
    }
  );

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    return NextResponse.redirect(
      buildRedirectTarget(
        request,
        `${returnToBase}integration=teams-error&reason=${encodeURIComponent(text || 'token-failed')}`
      )
    );
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      buildRedirectTarget(request, `${returnToBase}integration=teams-error&reason=token-missing`)
    );
  }

  const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    const text = await profileResponse.text();
    return NextResponse.redirect(
      buildRedirectTarget(
        request,
        `${returnToBase}integration=teams-error&reason=${encodeURIComponent(text || 'profile-failed')}`
      )
    );
  }

  const profile = (await profileResponse.json()) as Record<string, unknown>;

  try {
    await upsertIntegrationSecret(state.userId, 'teams', {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresIn: tokenData.expires_in ?? null,
      scope: tokenData.scope ?? null,
      msId: typeof profile.id === 'string' ? profile.id : null,
      displayName: typeof profile.displayName === 'string' ? profile.displayName : null,
      userPrincipalName:
        typeof profile.userPrincipalName === 'string' ? profile.userPrincipalName : null,
      connectedAt: new Date().toISOString(),
    });

    await updateUserPayload(state.userId, {
      teamsConnectionStatus: 'connected',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'persist-failed';
    return NextResponse.redirect(
      buildRedirectTarget(
        request,
        `${returnToBase}integration=teams-error&reason=${encodeURIComponent(message)}`
      )
    );
  }

  return NextResponse.redirect(buildRedirectTarget(request, `${returnToBase}integration=teams-connected`));
}

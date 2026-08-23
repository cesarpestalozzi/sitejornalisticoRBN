import { NextRequest, NextResponse } from 'next/server';
import { parseOAuthState } from '../../_lib/oauthState';
import { updateUserPayload, upsertIntegrationSecret } from '../../_lib/integrationStorage';

export const dynamic = 'force-dynamic';

const linkedInClientId = process.env.LINKEDIN_CLIENT_ID || '';
const linkedInClientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';

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

  const fallbackTarget = buildRedirectTarget(request, '/admin/usuarios?integration=linkedin-error');
  if (!state || state.provider !== 'linkedin') {
    return NextResponse.redirect(fallbackTarget);
  }

  const returnToBase = state.returnTo.includes('?') ? `${state.returnTo}&` : `${state.returnTo}?`;
  if (providerError) {
    return NextResponse.redirect(
      buildRedirectTarget(
        request,
        `${returnToBase}integration=linkedin-error&reason=${encodeURIComponent(providerErrorDescription || providerError)}`
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      buildRedirectTarget(request, `${returnToBase}integration=linkedin-error&reason=code-missing`)
    );
  }

  if (!linkedInClientId || !linkedInClientSecret) {
    return NextResponse.redirect(
      buildRedirectTarget(request, `${returnToBase}integration=linkedin-error&reason=env-missing`)
    );
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || request.nextUrl.origin).replace(
    /\/+$/,
    ''
  );
  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI ||
    `${siteUrl}/api/admin/integrations/linkedin/callback`;

  const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: linkedInClientId,
      client_secret: linkedInClientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    return NextResponse.redirect(
      buildRedirectTarget(
        request,
        `${returnToBase}integration=linkedin-error&reason=${encodeURIComponent(text || 'token-failed')}`
      )
    );
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      buildRedirectTarget(request, `${returnToBase}integration=linkedin-error&reason=token-missing`)
    );
  }

  const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
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
        `${returnToBase}integration=linkedin-error&reason=${encodeURIComponent(text || 'profile-failed')}`
      )
    );
  }

  const profile = (await profileResponse.json()) as Record<string, unknown>;

  try {
    await upsertIntegrationSecret(state.userId, 'linkedin', {
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in ?? null,
      scope: tokenData.scope ?? null,
      linkedInSub: typeof profile.sub === 'string' ? profile.sub : null,
      linkedInEmail: typeof profile.email === 'string' ? profile.email : null,
      linkedInName: typeof profile.name === 'string' ? profile.name : null,
      connectedAt: new Date().toISOString(),
    });

    await updateUserPayload(state.userId, {
      linkedinConnectionStatus: 'connected',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'persist-failed';
    return NextResponse.redirect(
      buildRedirectTarget(
        request,
        `${returnToBase}integration=linkedin-error&reason=${encodeURIComponent(message)}`
      )
    );
  }

  return NextResponse.redirect(
    buildRedirectTarget(request, `${returnToBase}integration=linkedin-connected`)
  );
}

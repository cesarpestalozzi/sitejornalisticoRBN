import { createHmac } from 'crypto';

const stateSecret = process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

type OAuthStatePayload = {
  userId: string;
  provider: 'linkedin' | 'teams';
  returnTo: string;
  createdAt: number;
};

function sign(value: string) {
  return createHmac('sha256', stateSecret).update(value).digest('hex');
}

export function buildOAuthState(payload: OAuthStatePayload) {
  if (!stateSecret) {
    throw new Error('OAUTH_STATE_SECRET não configurada.');
  }

  const rawPayload = JSON.stringify(payload);
  const encoded = Buffer.from(rawPayload, 'utf8').toString('base64url');
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function parseOAuthState(rawState: string | null | undefined): OAuthStatePayload | null {
  if (!rawState || !stateSecret) {
    return null;
  }

  const [encoded, signature] = rawState.split('.');
  if (!encoded || !signature) {
    return null;
  }

  if (sign(encoded) !== signature) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<OAuthStatePayload>;
    if (!parsed.userId || !parsed.provider || !parsed.createdAt || !parsed.returnTo) {
      return null;
    }
    if (Date.now() - Number(parsed.createdAt) > 10 * 60 * 1000) {
      return null;
    }
    if (parsed.provider !== 'linkedin' && parsed.provider !== 'teams') {
      return null;
    }
    return {
      userId: String(parsed.userId),
      provider: parsed.provider,
      returnTo: String(parsed.returnTo),
      createdAt: Number(parsed.createdAt),
    };
  } catch {
    return null;
  }
}


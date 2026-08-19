import { createHash, createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { findAuthUserByEmail } from '@/app/api/_lib/authUsers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resetSecret = process.env.PASSWORD_RESET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RESET_COOKIE_NAME = 'rbn_reset_token';

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function hashCode(email: string, code: string) {
  return createHash('sha256')
    .update(`${email.toLowerCase().trim()}::${code}::${resetSecret}`)
    .digest('hex');
}

function signPayload(payload: string) {
  return createHmac('sha256', resetSecret).update(payload).digest('hex');
}

type ResetCookiePayload = {
  email: string;
  codeHash: string;
  expiresAt: number;
};

function readCookiePayload(rawCookie: string | undefined): ResetCookiePayload | null {
  if (!rawCookie) {
    return null;
  }

  const parts = rawCookie.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  if (signPayload(payload) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as Partial<ResetCookiePayload>;
    if (!parsed.email || !parsed.codeHash || !parsed.expiresAt) {
      return null;
    }
    return parsed as ResetCookiePayload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const clearResponse = NextResponse.json({ ok: false, error: 'Código inválido ou expirado.' }, { status: 400 });
  clearResponse.cookies.set(RESET_COOKIE_NAME, '', { path: '/', maxAge: 0 });

  try {
    if (!resetSecret) {
      return NextResponse.json({ ok: false, error: 'Configuração de recuperação indisponível.' }, { status: 500 });
    }

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const code = String(body?.code || '').trim();
    const newPassword = String(body?.newPassword || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'E-mail inválido.' }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ ok: false, error: 'Código inválido.' }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: 'A nova senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
    }

    const cookieHeader = request.headers.get('cookie') || '';
    const resetCookie = cookieHeader
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${RESET_COOKIE_NAME}=`))
      ?.slice(RESET_COOKIE_NAME.length + 1);

    const payload = readCookiePayload(resetCookie);
    if (!payload) {
      return clearResponse;
    }

    if (payload.expiresAt < Date.now()) {
      return clearResponse;
    }

    if (payload.email !== email) {
      return clearResponse;
    }

    if (payload.codeHash !== hashCode(email, code)) {
      return clearResponse;
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: false, error: 'Serviço de autenticação indisponível.' }, { status: 500 });
    }

    const { user, error: userLookupError } = await findAuthUserByEmail(email);
    if (userLookupError) {
      return NextResponse.json({ ok: false, error: userLookupError }, { status: 500 });
    }

    if (!user?.id) {
      return NextResponse.json({ ok: false, error: 'Usuário não encontrado para redefinição.' }, { status: 404 });
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
    });
    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true, message: 'Senha redefinida com sucesso.' }, { status: 200 });
    response.cookies.set(RESET_COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao redefinir senha.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

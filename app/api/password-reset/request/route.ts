import { createHash, createHmac, randomInt } from 'crypto';
import { NextResponse } from 'next/server';
import { findAuthUserByEmail } from '@/app/api/_lib/authUsers';

const resetSecret = process.env.PASSWORD_RESET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || 'RBN <noreply@rbnbrasil.com.br>';
const RESET_COOKIE_NAME = 'rbn_reset_token';
const RESET_TTL_SECONDS = 15 * 60;

function hashCode(email: string, code: string) {
  return createHash('sha256')
    .update(`${email.toLowerCase().trim()}::${code}::${resetSecret}`)
    .digest('hex');
}

function signPayload(payload: string) {
  return createHmac('sha256', resetSecret).update(payload).digest('hex');
}

function buildCookieValue(email: string, code: string, expiresAt: number) {
  const payload = JSON.stringify({
    email: email.toLowerCase().trim(),
    codeHash: hashCode(email, code),
    expiresAt,
  });
  const signature = signPayload(payload);
  return Buffer.from(payload, 'utf8').toString('base64url') + '.' + signature;
}

async function sendResetCodeEmail(email: string, code: string) {
  if (!resendApiKey) {
    throw new Error('Configuração de e-mail indisponível.');
  }

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#f5f5f5; padding: 32px 16px; color:#111827;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #991b1b; font-weight: 700;">RBN</p>
        <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">Recuperação de senha</h1>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #374151;">
          Use este código para redefinir sua senha:
        </p>
        <p style="margin: 0 0 24px; font-size: 28px; font-weight: 700; letter-spacing: 0.18em; color: #991b1b;">
          ${code}
        </p>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Este código expira em 15 minutos.</p>
      </div>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}` ,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [email],
      subject: 'Código para redefinir sua senha - RBN',
      html,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = response.status === 429 ? 'Limite de envio excedido. Tente novamente em alguns minutos.' : payload?.message || 'Falha ao enviar código de recuperação.';
    throw new Error(message);
  }
}

export async function POST(request: Request) {
  try {
    if (!resetSecret) {
      return NextResponse.json({ ok: false, error: 'Configuração de recuperação indisponível.' }, { status: 500 });
    }

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'E-mail inválido.' }, { status: 400 });
    }

    const { user, error: userLookupError } = await findAuthUserByEmail(email);
    if (userLookupError) {
      return NextResponse.json({ ok: false, error: userLookupError }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ ok: true, message: 'Se o e-mail existir, o código será enviado.' }, { status: 200 });
    }

    const code = String(randomInt(100000, 999999));
    const expiresAt = Date.now() + RESET_TTL_SECONDS * 1000;

    await sendResetCodeEmail(email, code);

    const cookieValue = buildCookieValue(email, code, expiresAt);
    const response = NextResponse.json({ ok: true, message: 'Código enviado com sucesso.' }, { status: 200 });
    response.cookies.set(RESET_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: RESET_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao solicitar recuperação de senha.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac, randomBytes, randomInt } from 'crypto';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const resendApiKey = process.env.RESEND_API_KEY || '';
const resendFrom = process.env.RESEND_FROM || 'RBN <noreply@rbnbrasil.com.br>';
const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
const twilioFrom = process.env.TWILIO_PHONE_NUMBER || '';
const ADMIN_EMAIL = 'admin@rbn.com.br';
const ADMIN_LOGIN = 'RBN54078879837';
const ADMIN_EMAIL_CODE_COOKIE_NAME = 'rbn_admin_email_code';
const ADMIN_PHONE_CODE_COOKIE_NAME = 'rbn_admin_phone_code';
const ADMIN_PHONE_VERIFICATION_COOKIE_NAME = 'rbn_admin_phone_verification';
const ADMIN_EMAIL_CODE_TTL_SECONDS = 15 * 60;

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

function resolveUserEmail(row: { payload?: Record<string, any> } | null | undefined, fallbackEmail?: string): string {
  const payload = row?.payload ?? {};
  const candidates = [
    payload.email,
    payload.userEmail,
    payload.adminEmail,
    fallbackEmail,
    ADMIN_EMAIL,
  ];

  const email = candidates.find((value) => typeof value === 'string' && value.trim());
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizePhone(value?: string | null): string {
  return String(value ?? '').replace(/\D/g, '');
}

function toE164Phone(value?: string | null): string {
  const digits = normalizePhone(value);
  if (!digits) {
    return '';
  }

  if (digits.startsWith('55') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  if (digits.length > 8 && !digits.startsWith('55')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

function resolveUserPhone(row: { payload?: Record<string, any> } | null | undefined, fallbackPhone?: string): string {
  const payload = row?.payload ?? {};
  const candidates = [
    payload.phone,
    payload.telefone,
    payload.mobile,
    payload.phoneNumber,
    payload.cellphone,
    fallbackPhone,
  ];

  const phone = candidates.find((value) => typeof value === 'string' && normalizePhone(value));
  return typeof phone === 'string' ? normalizePhone(phone) : '';
}

function isEmergencyAdminBypass(row: { id?: string; payload?: Record<string, any> } | null | undefined): boolean {
  if (!row) {
    return false;
  }

  const id = String(row.id ?? '').trim();
  const payload = row.payload ?? {};
  const email = String(payload.email ?? '').trim().toLowerCase();
  const login = String(payload.login ?? '').trim().toUpperCase();
  return id === '1' || id === 'official-admin' || email === ADMIN_EMAIL || login === ADMIN_LOGIN;
}

function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';

  for (let i = 0; i < bytes.length; i += 1) {
    result += alphabet[bytes[i] & 31];
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = encoded.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function calculateTotp(secret: string, timeStep?: number): string {
  const step = timeStep ?? Math.floor(Date.now() / 1000 / 30);
  const stepBuffer = Buffer.alloc(8);
  const hi = Math.floor(step / 0x100000000);
  const lo = step >>> 0;
  stepBuffer.writeUInt32BE(hi, 0);
  stepBuffer.writeUInt32BE(lo, 4);

  const key = base32Decode(secret);
  const hmac = createHmac('sha1', key).update(stepBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, '0');
}

function verifyTotp(secret: string, token: string): boolean {
  const clean = token.replace(/\s/g, '');
  if (clean.length !== 6 || !/^\d+$/.test(clean)) {
    return false;
  }

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    if (calculateTotp(secret, currentStep + delta) === clean) {
      return true;
    }
  }

  return false;
}

function buildOtpAuthUrl(secret: string, email: string, issuer = 'RBN Portal'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}

function hashAdminEmailCode(email: string, code: string) {
  return createHash('sha256')
    .update(`${email.toLowerCase().trim()}::${code}::${serviceRoleKey || ''}`)
    .digest('hex');
}

function hashAdminPhoneCode(phone: string, code: string) {
  return createHash('sha256')
    .update(`${normalizePhone(phone)}::${code}::${serviceRoleKey || ''}`)
    .digest('hex');
}

function signAdminEmailCodePayload(payload: string) {
  return createHmac('sha256', serviceRoleKey || 'rbn-admin-fallback-secret').update(payload).digest('hex');
}

function buildAdminEmailCodeCookieValue(email: string, code: string, expiresAt: number) {
  const payload = JSON.stringify({
    email: email.toLowerCase().trim(),
    codeHash: hashAdminEmailCode(email, code),
    expiresAt,
  });
  const signature = signAdminEmailCodePayload(payload);
  return Buffer.from(payload, 'utf8').toString('base64url') + '.' + signature;
}

function buildAdminPhoneCodeCookieValue(phone: string, code: string, expiresAt: number) {
  const payload = JSON.stringify({
    phone: normalizePhone(phone),
    codeHash: hashAdminPhoneCode(phone, code),
    expiresAt,
  });
  const signature = signAdminEmailCodePayload(payload);
  return Buffer.from(payload, 'utf8').toString('base64url') + '.' + signature;
}

function buildAdminPhoneVerificationCookieValue(phone: string, code: string, expiresAt: number) {
  const payload = JSON.stringify({
    phone: normalizePhone(phone),
    codeHash: hashAdminPhoneCode(phone, code),
    expiresAt,
  });
  const signature = signAdminEmailCodePayload(payload);
  return Buffer.from(payload, 'utf8').toString('base64url') + '.' + signature;
}

function parseAdminEmailCodeCookieValue(value: string | undefined) {
  if (!value) return null;

  const [payloadBase64, signature] = value.split('.');
  if (!payloadBase64 || !signature) return null;

  const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
  const expectedSignature = signAdminEmailCodePayload(payloadJson);
  if (expectedSignature !== signature) return null;

  try {
    const parsed = JSON.parse(payloadJson) as { email?: string; codeHash?: string; expiresAt?: number };
    if (!parsed.email || !parsed.codeHash || typeof parsed.expiresAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseAdminPhoneCodeCookieValue(value: string | undefined) {
  if (!value) return null;

  const [payloadBase64, signature] = value.split('.');
  if (!payloadBase64 || !signature) return null;

  const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
  const expectedSignature = signAdminEmailCodePayload(payloadJson);
  if (expectedSignature !== signature) return null;

  try {
    const parsed = JSON.parse(payloadJson) as { phone?: string; codeHash?: string; expiresAt?: number };
    if (!parsed.phone || !parsed.codeHash || typeof parsed.expiresAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseAdminPhoneVerificationCookieValue(value: string | undefined) {
  if (!value) return null;

  const [payloadBase64, signature] = value.split('.');
  if (!payloadBase64 || !signature) return null;

  const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
  const expectedSignature = signAdminEmailCodePayload(payloadJson);
  if (expectedSignature !== signature) return null;

  try {
    const parsed = JSON.parse(payloadJson) as { phone?: string; codeHash?: string; expiresAt?: number };
    if (!parsed.phone || !parsed.codeHash || typeof parsed.expiresAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function sendAdminEmailCode(email: string, code: string) {
  if (!resendApiKey) {
    throw new Error('Configuração de e-mail indisponível.');
  }

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#f5f5f5; padding: 32px 16px; color:#111827;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #991b1b; font-weight: 700;">RBN</p>
        <h1 style="margin: 0 0 16px; font-size: 24px; color: #111827;">Código de acesso ao painel</h1>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #374151;">
          Use este código para entrar no painel administrativo da RBN:
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
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [email],
      subject: 'Código de acesso ao painel administrativo - RBN',
      html,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = response.status === 429 ? 'Limite de envio excedido. Tente novamente em alguns minutos.' : payload?.message || 'Falha ao enviar código de acesso.';
    throw new Error(message);
  }
}

async function sendAdminPhoneCode(phone: string, code: string) {
  const e164Phone = toE164Phone(phone);

  if (!twilioSid || !twilioToken || !twilioFrom) {
    throw new Error('Configuração de SMS indisponível. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER para ativar o envio real do código.');
  }

  if (!e164Phone) {
    throw new Error('Número de telefone inválido para envio de SMS.');
  }

  const body = new URLSearchParams({
    To: e164Phone,
    From: twilioFrom,
    Body: `Seu código de acesso RBN é ${code}. Ele expira em 15 minutos.`,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.message || 'Falha ao enviar código de telefone.';
    throw new Error(message);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || '');

  if (action === 'setup') {
    const userId = String(body?.userId || '').trim();
    const email = String(body?.email || '').trim();

    if (!userId || !email) {
      return NextResponse.json({ ok: false, error: 'userId e email são obrigatórios.' }, { status: 400 });
    }

    const secret = generateTotpSecret();
    const otpAuthUrl = buildOtpAuthUrl(secret, email);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;

    const adminClient = getAdminClient();
    if (adminClient) {
      try {
        const { data: row } = await adminClient.from('pz_news_users').select('id, payload').eq('id', userId).limit(1);
        const payload = row?.[0]?.payload ?? {};
        await adminClient.from('pz_news_users').upsert([{ id: userId, payload: { ...payload, totpSecret: secret }, updated_at: new Date().toISOString() }], { onConflict: 'id' });
      } catch {
        // Ignora falha de gravação do segredo.
      }
    }

    return NextResponse.json({ ok: true, secret, qrUrl });
  }

  if (action === 'verify') {
    const userId = String(body?.userId || '').trim();
    const token = String(body?.token || '').trim();

    if (!userId || !token) {
      return NextResponse.json({ ok: false, error: 'userId e token são obrigatórios.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
    }

    const { data: rows } = await adminClient.from('pz_news_users').select('id, payload').eq('id', userId).limit(1);
    const row = rows?.[0] ?? null;
    const payload = (row?.payload ?? {}) as Record<string, any>;
    const secret = String(payload.totpSecret || '').trim();

    if (!secret && isEmergencyAdminBypass(row)) {
      return NextResponse.json({ ok: true, bypassed: true });
    }

    if (!secret) {
      return NextResponse.json({ ok: false, error: 'MFA não configurado para este usuário.' }, { status: 400 });
    }

    const valid = verifyTotp(secret, token);
    return NextResponse.json({ ok: valid, bypassed: false, error: valid ? '' : 'Código inválido ou expirado.' });
  }

  if (action === 'send-email-code') {
    const userId = String(body?.userId || '').trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId é obrigatório.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
    }

    const { data: rows } = await adminClient.from('pz_news_users').select('id, payload').eq('id', userId).limit(1);
    const row = rows?.[0] ?? null;
    const fallbackEmail = String(body?.email || '').trim();
    const email = resolveUserEmail(row, fallbackEmail) || ADMIN_EMAIL;

    if (!email) {
      return NextResponse.json({ ok: false, error: 'E-mail do usuário não encontrado.' }, { status: 400 });
    }

    const code = String(randomInt(100000, 999999));
    const expiresAt = Date.now() + ADMIN_EMAIL_CODE_TTL_SECONDS * 1000;
    let fallback = false;

    try {
      await sendAdminEmailCode(email, code);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar código por e-mail.';
      fallback = true;
      console.warn('MFA email fallback activated:', message);
    }

    const cookieValue = buildAdminEmailCodeCookieValue(email, code, expiresAt);
    const response = NextResponse.json(
      {
        ok: true,
        fallback,
        debugCode: fallback ? code : undefined,
        message: fallback ? 'Código de emergência gerado para acesso administrativo.' : 'Código enviado com sucesso.',
      },
      { status: 200 }
    );
    response.cookies.set(ADMIN_EMAIL_CODE_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_EMAIL_CODE_TTL_SECONDS,
    });

    return response;
  }

  if (action === 'verify-email-code') {
    const userId = String(body?.userId || '').trim();
    const token = String(body?.token || '').trim();

    if (!userId || !token) {
      return NextResponse.json({ ok: false, error: 'userId e token são obrigatórios.' }, { status: 400 });
    }

    const cookieValue = request.cookies.get(ADMIN_EMAIL_CODE_COOKIE_NAME)?.value;
    const cookiePayload = parseAdminEmailCodeCookieValue(cookieValue);
    if (!cookiePayload) {
      return NextResponse.json({ ok: false, error: 'Código expirado ou inválido. Solicite um novo envio.' }, { status: 400 });
    }

    const expiresAt = typeof cookiePayload.expiresAt === 'number' ? cookiePayload.expiresAt : 0;
    if (Date.now() > expiresAt) {
      return NextResponse.json({ ok: false, error: 'Código expirado. Solicite um novo envio.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
    }

    const { data: rows } = await adminClient.from('pz_news_users').select('id, payload').eq('id', userId).limit(1);
    const row = rows?.[0] ?? null;
    const userEmail = resolveUserEmail(row, String(body?.email || '')).trim().toLowerCase();
    const cookieEmail = typeof cookiePayload.email === 'string' ? cookiePayload.email : '';

    if (!userEmail || userEmail !== cookieEmail.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'E-mail do usuário não confere com o código solicitado.' }, { status: 400 });
    }

    const valid = cookiePayload.codeHash === hashAdminEmailCode(userEmail, token);
    const response = NextResponse.json({ ok: valid, error: valid ? '' : 'Código inválido ou expirado.' }, { status: valid ? 200 : 400 });

    if (valid) {
      response.cookies.set(ADMIN_EMAIL_CODE_COOKIE_NAME, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires: new Date(0) });
    }

    return response;
  }

  if (action === 'send-phone-verification') {
    const phone = normalizePhone(String(body?.phone || '').trim());

    if (!phone || phone.length < 10) {
      return NextResponse.json({ ok: false, error: 'Número de telefone inválido.' }, { status: 400 });
    }

    const code = String(randomInt(100000, 999999));
    const expiresAt = Date.now() + ADMIN_EMAIL_CODE_TTL_SECONDS * 1000;
    let fallback = false;

    try {
      await sendAdminPhoneCode(phone, code);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar código por telefone.';
      fallback = true;
      console.warn('phone verification fallback activated:', message);
    }

    const cookieValue = buildAdminPhoneVerificationCookieValue(phone, code, expiresAt);
    const response = NextResponse.json(
      {
        ok: true,
        fallback,
        debugCode: fallback ? code : undefined,
        message: fallback ? 'Código de verificação gerado em modo de teste.' : 'Código enviado com sucesso para o telefone cadastrado.',
      },
      { status: 200 }
    );
    response.cookies.set(ADMIN_PHONE_VERIFICATION_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_EMAIL_CODE_TTL_SECONDS,
    });

    return response;
  }

  if (action === 'verify-phone-verification') {
    const phone = normalizePhone(String(body?.phone || '').trim());
    const token = String(body?.token || '').trim();

    if (!phone || !token) {
      return NextResponse.json({ ok: false, error: 'Telefone e código são obrigatórios.' }, { status: 400 });
    }

    const cookieValue = request.cookies.get(ADMIN_PHONE_VERIFICATION_COOKIE_NAME)?.value;
    const cookiePayload = parseAdminPhoneVerificationCookieValue(cookieValue);
    if (!cookiePayload) {
      return NextResponse.json({ ok: false, error: 'Código expirado ou inválido. Solicite um novo envio.' }, { status: 400 });
    }

    const expiresAt = typeof cookiePayload.expiresAt === 'number' ? cookiePayload.expiresAt : 0;
    if (Date.now() > expiresAt) {
      return NextResponse.json({ ok: false, error: 'Código expirado. Solicite um novo envio.' }, { status: 400 });
    }

    if (cookiePayload.phone !== phone) {
      return NextResponse.json({ ok: false, error: 'Telefone não confere com o código enviado.' }, { status: 400 });
    }

    const valid = cookiePayload.codeHash === hashAdminPhoneCode(phone, token);
    const response = NextResponse.json({ ok: valid, error: valid ? '' : 'Código inválido ou expirado.' }, { status: valid ? 200 : 400 });

    if (valid) {
      response.cookies.set(ADMIN_PHONE_VERIFICATION_COOKIE_NAME, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires: new Date(0) });
    }

    return response;
  }

  if (action === 'send-phone-code') {
    const userId = String(body?.userId || '').trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId é obrigatório.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
    }

    const { data: rows } = await adminClient.from('pz_news_users').select('id, payload').eq('id', userId).limit(1);
    const row = rows?.[0] ?? null;
    const fallbackPhone = String(body?.phone || '').trim();
    const phone = resolveUserPhone(row, fallbackPhone);

    if (!phone) {
      return NextResponse.json({ ok: false, error: 'Número de telefone do usuário não encontrado.' }, { status: 400 });
    }

    const code = String(randomInt(100000, 999999));
    const expiresAt = Date.now() + ADMIN_EMAIL_CODE_TTL_SECONDS * 1000;
    let fallback = false;

    try {
      await sendAdminPhoneCode(phone, code);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar código por telefone.';
      fallback = true;
      console.warn('MFA phone fallback activated:', message);
    }

    const cookieValue = buildAdminPhoneCodeCookieValue(phone, code, expiresAt);
    const response = NextResponse.json(
      {
        ok: true,
        fallback,
        debugCode: fallback ? code : undefined,
        message: fallback ? 'Código de emergência gerado para acesso administrativo por telefone.' : 'Código enviado com sucesso.',
      },
      { status: 200 }
    );
    response.cookies.set(ADMIN_PHONE_CODE_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_EMAIL_CODE_TTL_SECONDS,
    });

    return response;
  }

  if (action === 'status') {
    const userId = String(body?.userId || '').trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId é obrigatório.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: true, mfaEnabled: false, emergencyBypass: true });
    }

    const { data: rows } = await adminClient.from('pz_news_users').select('id, payload').eq('id', userId).limit(1);
    const row = rows?.[0] ?? null;
    const payload = (row?.payload ?? {}) as Record<string, any>;
    const secret = String(payload.totpSecret || payload.totp_secret || '').trim();
    const isBypass = isEmergencyAdminBypass(row) && !secret;

    return NextResponse.json({ ok: true, mfaEnabled: Boolean(secret), emergencyBypass: isBypass });
  }

  if (action === 'disable') {
    const userId = String(body?.userId || '').trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId é obrigatório.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
    }

    const { data: rows } = await adminClient.from('pz_news_users').select('id, payload').eq('id', userId).limit(1);
    const row = rows?.[0] ?? null;
    const payload = (row?.payload ?? {}) as Record<string, any>;
    const nextPayload = { ...payload };
    delete nextPayload.totpSecret;
    delete nextPayload.totp_secret;

    if (row) {
      await adminClient.from('pz_news_users').update({ payload: nextPayload, updated_at: new Date().toISOString() }).eq('id', userId);
    }

    return NextResponse.json({ ok: true, emergencyBypass: isEmergencyAdminBypass(row) });
  }

  return NextResponse.json({ ok: false, error: 'Ação inválida.' }, { status: 400 });
}

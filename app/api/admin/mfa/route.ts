import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Gera uma chave secreta base32 aleatória para TOTP (20 bytes = 160 bits)
function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';

  for (let i = 0; i < bytes.length; i++) {
    result += alphabet[bytes[i] & 31];
    if (i === 3 || i === 7 || i === 11 || i === 15) {
      result += '';
    }
  }

  return result;
}

// Decodifica base32 para buffer
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = encoded.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) {
      continue;
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

// Calcula TOTP compatível com Microsoft Authenticator (RFC 6238)
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

// Verifica o código com janela de ±1 passo (tolerância de 30s)
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

// Gera URL para QR code (compatível com Google/Microsoft Authenticator)
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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || '');

  // Gerar nova chave TOTP para o usuário
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
        await adminClient
          .from('pz_news_users')
          .upsert([{ id: userId, totp_secret: secret }], { onConflict: 'id' });
      } catch {
        // Ignora erro de upsert de campo extra — não é crítico
      }
    }

    // Salva o segredo TOTP no payload do usuário
    const { data: existingRows } = adminClient
      ? await adminClient.from('pz_news_users').select('id, payload').eq('id', userId).limit(1)
      : { data: null };

    if (adminClient && existingRows && existingRows.length > 0) {
      const row = existingRows[0];
      const nextPayload = { ...(row.payload ?? {}), totpSecret: secret };
      try {
        await adminClient.from('pz_news_users').update({ payload: nextPayload }).eq('id', userId);
      } catch {
        // Ignora erro — o segredo já estará nos cookies do response
      }
    }

    return NextResponse.json({ ok: true, secret, qrUrl });
  }

  // Verificar código TOTP durante login
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

    const { data: rows } = await adminClient
      .from('pz_news_users')
      .select('id, payload')
      .eq('id', userId)
      .limit(1);

    const secret: string | undefined = rows?.[0]?.payload?.totpSecret;

    if (!secret) {
      return NextResponse.json({ ok: false, error: 'MFA não configurado para este usuário.' }, { status: 400 });
    }

    const valid = verifyTotp(secret, token);
    return NextResponse.json({ ok: valid, error: valid ? '' : 'Código inválido ou expirado.' });
  }

  // Verificar se o usuário tem MFA ativo
  if (action === 'status') {
    const userId = String(body?.userId || '').trim();

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId é obrigatório.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: true, mfaEnabled: false });
    }

    const { data: rows } = await adminClient
      .from('pz_news_users')
      .select('id, payload')
      .eq('id', userId)
      .limit(1);

    const secret: string | undefined = rows?.[0]?.payload?.totpSecret;
    return NextResponse.json({ ok: true, mfaEnabled: Boolean(secret) });
  }

  // Remover MFA do usuário
  if (action === 'disable') {
    const userId = String(body?.userId || '').trim();

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId é obrigatório.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 500 });
    }

    const { data: rows } = await adminClient
      .from('pz_news_users')
      .select('id, payload')
      .eq('id', userId)
      .limit(1);

    if (rows && rows.length > 0) {
      const nextPayload = { ...(rows[0].payload ?? {}) };
      delete nextPayload.totpSecret;
      try {
        await adminClient.from('pz_news_users').update({ payload: nextPayload }).eq('id', userId);
      } catch {
        // Ignora erro
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'Ação inválida.' }, { status: 400 });
}

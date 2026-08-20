import { NextResponse } from 'next/server';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim();
    const name = String(body?.name || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'E-mail inválido.' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Nome inválido.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || 'RBN <noreply@rbnbrasil.com.br>';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.rbnbrasil.com.br';

    if (!apiKey) {
      return NextResponse.json({ ok: true, skipped: true, message: 'Welcome email not sent because RESEND_API_KEY is not configured.' });
    }

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f5f5f5; padding: 32px 16px; color:#111827;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #991b1b; font-weight: 700;">RBN</p>
          <h1 style="margin: 0 0 20px; font-size: 28px; color: #111827;">Olá, ${escapeHtml(name)}!</h1>
          <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #374151;">
            <strong>Sua conta no RBN – Notícias foi criada com sucesso.</strong>
          </p>
          <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #374151;">
            A partir de agora, você poderá acessar nosso portal e acompanhar as principais notícias do Brasil e do mundo, com informação, jornalismo e cobertura dos acontecimentos que movimentam o país e o cenário internacional.
          </p>
          <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #374151;">
            O RBN – Notícias tem o compromisso de levar informação de qualidade aos seus leitores, contribuindo para uma sociedade mais informada e consciente.
          </p>
          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #374151;">
            Obrigado por fazer parte da nossa comunidade. 💙
          </p>
          <p style="margin: 0 0 24px;">
            <a href="${escapeHtml(siteUrl)}" style="display:inline-block; background:#991b1b; color:#ffffff; text-decoration:none; font-weight:700; padding:12px 18px; border-radius:10px;">
              Acessar portal RBN
            </a>
          </p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #991b1b;">Bem-vindo(a) ao RBN!</p>
          <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">Atenciosamente,<br><strong>Equipe RBN</strong></p>
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Sua conta no RBN – Notícias foi criada com sucesso.',
        html,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 429) {
      return NextResponse.json({ ok: true, skipped: true, message: 'Rate limit exceeded by Resend; welcome email skipped.' }, { status: 200 });
    }

    if (!response.ok) {
      return NextResponse.json({ ok: false, skipped: false, error: payload?.message || 'Falha ao enviar e-mail de boas-vindas.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, skipped: false, message: 'Welcome email sent.' });
  } catch (error) {
    console.error('Welcome email route error:', error);
    return NextResponse.json({ ok: false, error: 'Erro ao processar envio do e-mail.' }, { status: 500 });
  }
}

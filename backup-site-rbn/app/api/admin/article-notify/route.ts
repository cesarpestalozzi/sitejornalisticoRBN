import { NextResponse } from 'next/server';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || 'RBN <noreply@rbnbrasil.com.br>';
const defaultSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.rbnbrasil.com.br';

type ArticleRecipient = {
  email: string;
  name: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toAbsoluteUrl(siteUrl: string, path: string) {
  const normalized = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalized}${normalizedPath}`;
}

function getArticleLink(siteUrl: string, articleId: string) {
  return toAbsoluteUrl(siteUrl, `/artigo/${encodeURIComponent(articleId)}`);
}

async function sendNewsEmail(recipient: ArticleRecipient, title: string, excerpt: string, articleLink: string) {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY não configurada.');
  }

  const safeName = recipient.name.trim() || 'Leitor';
  const safeExcerpt = excerpt.trim() || 'Uma nova notícia foi publicada no portal RBN.';

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#f5f5f5; padding: 32px 16px; color:#111827;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #991b1b; font-weight: 700;">RBN - Notícias</p>
        <h1 style="margin: 0 0 12px; font-size: 24px; color: #111827;">Olá, ${escapeHtml(safeName)}!</h1>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #374151;">
          Publicamos uma nova notícia para você:
        </p>
        <h2 style="margin: 0 0 12px; font-size: 22px; color: #111827;">${escapeHtml(title)}</h2>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7; color: #4b5563;">${escapeHtml(safeExcerpt)}</p>
        <a href="${escapeHtml(articleLink)}" style="display:inline-block; background:#991b1b; color:#ffffff; text-decoration:none; font-weight:700; padding:12px 18px; border-radius:10px;">Ler notícia no portal</a>
        <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.6; color: #6b7280;">
          Link da matéria: <a href="${escapeHtml(articleLink)}" style="color:#991b1b; word-break:break-all;">${escapeHtml(articleLink)}</a>
        </p>
        <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280;">Atenciosamente,<br><strong>Equipe RBN</strong></p>
      </div>
    </div>
  `;

  const text = [
    `Olá, ${safeName}!`,
    '',
    'Publicamos uma nova notícia para você:',
    title,
    '',
    safeExcerpt,
    '',
    `Leia aqui: ${articleLink}`,
    '',
    'Equipe RBN',
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [recipient.email],
      subject: `Nova notícia no RBN: ${title}`,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.message || `Falha ao enviar para ${recipient.email}`;
    throw new Error(message);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const articleId = String(body?.articleId || '').trim();
    const title = String(body?.title || '').trim();
    const excerpt = String(body?.excerpt || '').trim();
    const recipientsRaw = Array.isArray(body?.recipients) ? body.recipients : [];
    const siteUrlRaw = String(body?.siteUrl || '').trim();
    const articleUrlRaw = String(body?.articleUrl || '').trim();
    const siteUrl = siteUrlRaw || defaultSiteUrl;

    if (!articleId || !title) {
      return NextResponse.json({ ok: false, error: 'Dados da notícia inválidos para disparo.' }, { status: 400 });
    }

    if (recipientsRaw.length === 0) {
      return NextResponse.json({ ok: false, error: 'Nenhum destinatário selecionado.' }, { status: 400 });
    }

    const recipients: ArticleRecipient[] = recipientsRaw
      .map((item: unknown) => {
        const candidate = (item ?? {}) as { email?: unknown; name?: unknown };
        const rawEmail = typeof candidate.email === 'string' ? candidate.email : '';
        const rawName = typeof candidate.name === 'string' ? candidate.name : '';
        const email = rawEmail.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return null;
        }
        return {
          email,
          name: rawName.trim() || 'Leitor',
        } satisfies ArticleRecipient;
      })
      .filter((item: ArticleRecipient | null): item is ArticleRecipient => Boolean(item));

    if (recipients.length === 0) {
      return NextResponse.json({ ok: false, error: 'Os destinatários selecionados estão inválidos.' }, { status: 400 });
    }

    const articleLink = articleUrlRaw || getArticleLink(siteUrl, articleId);
    const failures: { email: string; error: string }[] = [];
    let sentCount = 0;

    for (const recipient of recipients) {
      try {
        await sendNewsEmail(recipient, title, excerpt, articleLink);
        sentCount += 1;
      } catch (error) {
        failures.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Falha desconhecida.',
        });
      }
    }

    if (sentCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Nenhum e-mail foi enviado.',
          failures,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        sentCount,
        failureCount: failures.length,
        failures,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao disparar e-mails da notícia.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

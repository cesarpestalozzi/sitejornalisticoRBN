function getNotificationRecipients(payload: unknown) {
  const recipients = Array.isArray((payload as { notificationRecipients?: unknown[] })?.notificationRecipients)
    ? ((payload as { notificationRecipients?: unknown[] }).notificationRecipients as unknown[])
    : [];

  return recipients
    .map((recipient: unknown) => {
      const candidate = (recipient ?? {}) as { email?: unknown; name?: unknown };
      const email = typeof candidate.email === 'string' ? candidate.email.trim() : '';
      const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      if (!email) {
        return null;
      }
      return {
        email,
        name: name || 'Leitor',
      };
    })
    .filter((recipient): recipient is { email: string; name: string } => Boolean(recipient));
}

export async function notifyArticleRecipients(requestUrl: string, article: unknown, publishedAtIso: string) {
  const payload = article as {
    id?: unknown;
    title?: unknown;
    excerpt?: unknown;
    notificationEnabled?: unknown;
  };

  if (!payload?.notificationEnabled) {
    return;
  }

  const recipients = getNotificationRecipients(article);
  if (recipients.length === 0) {
    return;
  }

  const articleId = String(payload.id ?? '').trim();
  const title = String(payload.title ?? '').trim();
  const excerpt = String(payload.excerpt ?? '').trim();
  if (!articleId || !title) {
    return;
  }

  const requestOrigin = new URL(requestUrl).origin;
  const articleUrl = new URL(`/artigo/${encodeURIComponent(articleId)}`, requestOrigin).toString();
  const response = await fetch(new URL('/api/admin/article-notify', requestOrigin).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      articleId,
      articleUrl,
      title,
      excerpt,
      recipients,
      siteUrl: requestOrigin,
      publishedAt: publishedAtIso,
    }),
  });

  if (!response.ok) {
    const payloadResponse = await response.json().catch(() => ({}));
    console.error('Erro ao notificar publicação agendada:', payloadResponse?.error || response.statusText);
  }
}

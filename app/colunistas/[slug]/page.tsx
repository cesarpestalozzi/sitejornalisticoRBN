'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useArticles } from '@/app/hooks/useArticles';
import { formatDate } from '@/app/utils/dateUtils';
import { normalizeArticleStatus } from '@/app/lib/articleStatus';

type Columnist = { id: string; name: string; avatar: string; bio: string; professionalInfo: string; publicRole: string; expertise: string; location: string; publicEmail: string; website: string; columnistSlug: string; socialLinks: Array<{ label: string; url: string }> };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ColumnistProfilePage() {
  const params = useParams<{ slug: string }>();
  const { articles } = useArticles();
  const [columnist, setColumnist] = useState<Columnist | null>(null);
  useEffect(() => { fetch(`/api/columnists?slug=${encodeURIComponent(params.slug)}`, { cache: 'no-store' }).then((response) => response.json()).then((data: Columnist[]) => setColumnist(data[0] ?? null)).catch(() => setColumnist(null)); }, [params.slug]);
  const authored = columnist
    ? articles
        .filter((article) => {
          const articleStatus = normalizeArticleStatus(article.status, article.publishedAt ? 'publicado' : undefined);
          const authorNames = String(article.author ?? '')
            .split(/\s+e\s+|,\s*/i)
            .map((name) => name.trim().replace(/^por\s+/i, '').toLowerCase())
            .filter(Boolean);
          const columnistName = columnist.name.trim().replace(/^por\s+/i, '').toLowerCase();
          return (
            articleStatus === 'publicado' &&
            ((article.authorUserIds ?? []).map(String).includes(String(columnist.id)) ||
              String(article.columnistUserId ?? '') === String(columnist.id) ||
              authorNames.includes(columnistName))
          );
        })
        .sort((left, right) => {
          const leftDate = new Date(left.publishedAt || left.updatedAt || left.createdAt).getTime();
          const rightDate = new Date(right.publishedAt || right.updatedAt || right.createdAt).getTime();
          return rightDate - leftDate;
        })
    : [];
  if (!columnist) return <main className="mx-auto max-w-5xl p-8"><p>Colunista não encontrado.</p></main>;
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <section className="rounded-xl border border-gray-200 bg-[#f7f7f7] p-5 shadow-sm sm:p-8 md:flex md:items-center md:gap-8">
        <div className="mx-auto shrink-0 md:mx-0">
          {columnist.avatar ? (
            <img src={columnist.avatar} alt={columnist.name} className="h-32 w-32 rounded-full object-cover sm:h-36 sm:w-36" />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#E11A1A] text-3xl font-bold text-white sm:h-36 sm:w-36">
              {initials(columnist.name)}
            </div>
          )}
        </div>
        <div className="mt-6 min-w-0 md:mt-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">Colunista RBN</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#E11A1A] sm:text-4xl">{columnist.name}</h1>
          {columnist.publicRole && <p className="mt-2 text-sm font-medium text-gray-600">{columnist.publicRole}</p>}
          {columnist.bio && <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">{columnist.bio}</p>}
          {columnist.professionalInfo && <p className="mt-2 text-sm leading-6 text-gray-600">{columnist.professionalInfo}</p>}
          <p className="mt-2 text-sm text-gray-500">{[columnist.expertise, columnist.location].filter(Boolean).join(' • ')}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {columnist.website && <a href={columnist.website} target="_blank" rel="noreferrer" className="font-medium text-[#E11A1A] underline">Site pessoal</a>}
            {columnist.publicEmail && <a href={`mailto:${columnist.publicEmail}`} className="font-medium text-[#E11A1A] underline">E-mail</a>}
            {columnist.socialLinks.map((social) => <a key={`${social.label}-${social.url}`} href={social.url} target="_blank" rel="noreferrer" className="font-medium text-[#E11A1A] underline">{social.label}</a>)}
          </div>
        </div>
      </section>
      <h2 className="mt-10 text-2xl font-bold text-gray-900">Últimas do colunista</h2>
      <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {authored.map((article) => {
          const image = article.image || article.images?.find((item) => item.isPrimary)?.url || article.images?.[0]?.url || '/logo-oficial.png';
          const date = article.publishedAt || article.updatedAt || article.createdAt;
          return (
            <Link key={article.id} href={`/artigo/${article.id}`} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#E11A1A] hover:shadow-md">
              <div className="aspect-[16/10] overflow-hidden bg-gray-100">
                <img src={image} alt={article.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500">{formatDate(new Date(date))}</p>
                <h3 className="mt-2 line-clamp-3 font-bold leading-snug text-gray-900 group-hover:text-[#E11A1A]">{article.title}</h3>
                {article.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{article.excerpt}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

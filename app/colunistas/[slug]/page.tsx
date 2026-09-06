'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useArticles } from '@/app/hooks/useArticles';

type Columnist = { id: string; name: string; avatar: string; bio: string; professionalInfo: string; publicRole: string; expertise: string; location: string; publicEmail: string; website: string; columnistSlug: string; socialLinks: Array<{ label: string; url: string }> };

export default function ColumnistProfilePage() {
  const params = useParams<{ slug: string }>();
  const { articles } = useArticles();
  const [columnist, setColumnist] = useState<Columnist | null>(null);
  useEffect(() => { fetch(`/api/columnists?slug=${encodeURIComponent(params.slug)}`, { cache: 'no-store' }).then((response) => response.json()).then((data: Columnist[]) => setColumnist(data[0] ?? null)).catch(() => setColumnist(null)); }, [params.slug]);
  const authored = columnist ? articles.filter((article) => article.status === 'publicado' && (article.authorUserIds ?? []).includes(columnist.id)) : [];
  if (!columnist) return <main className="mx-auto max-w-5xl p-8"><p>Colunista não encontrado.</p></main>;
  return <main className="mx-auto max-w-5xl px-4 py-12"><section className="rounded-2xl bg-gray-900 p-8 text-white md:flex md:items-center md:gap-8"><img src={columnist.avatar || '/logo-oficial.png'} alt={columnist.name} className="h-32 w-32 rounded-full object-cover" /><div><p className="text-sm font-semibold uppercase tracking-widest text-red-300">Colunista RBN</p><h1 className="mt-2 text-4xl font-bold">{columnist.name}</h1>{columnist.publicRole && <p className="mt-2 text-red-200">{columnist.publicRole}</p>}<p className="mt-3 max-w-2xl text-gray-200">{columnist.bio}</p><p className="mt-2 text-sm text-gray-300">{columnist.professionalInfo}</p><p className="mt-2 text-sm text-gray-400">{[columnist.expertise, columnist.location].filter(Boolean).join(' • ')}</p><div className="mt-3 flex flex-wrap gap-3 text-sm">{columnist.website && <a href={columnist.website} target="_blank" rel="noreferrer" className="text-red-200 underline">Site pessoal</a>}{columnist.publicEmail && <a href={`mailto:${columnist.publicEmail}`} className="text-red-200 underline">E-mail</a>}{columnist.socialLinks.map((social) => <a key={`${social.label}-${social.url}`} href={social.url} target="_blank" rel="noreferrer" className="text-red-200 underline">{social.label}</a>)}</div></div></section><h2 className="mt-10 text-2xl font-bold">Matérias de {columnist.name}</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{authored.map((article) => <Link key={article.id} href={`/artigo/${article.id}`} className="rounded-xl border bg-white p-5 shadow-sm hover:border-red-300"><h3 className="font-bold">{article.title}</h3><p className="mt-2 text-sm text-gray-500">{article.excerpt}</p></Link>)}</div></main>;
}

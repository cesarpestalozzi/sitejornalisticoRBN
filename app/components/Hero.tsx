'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Article, NewsCard } from '@/app/types';
import { getCategoryDisplayName, normalizeCategorySlug } from '@/app/lib/categoryLabels';
import { formatDate } from '@/app/utils/dateUtils';
import { useSettingsContext } from '@/app/contexts/SettingsContext';
import { defaultSettings } from '@/app/lib/settings';

interface HeroProps {
  article: Article | null;
  secondaryArticles?: NewsCard[];
}

const heroTopics = ['POLÍTICA', 'BRASIL', 'MUNDO', 'ECONOMIA', 'ESPORTES', 'CULTURA', 'FAMOSOS', 'TECNOLOGIA'];

export default function Hero({ article, secondaryArticles = [] }: HeroProps) {
  const { settings } = useSettingsContext();
  const effectiveSettings = settings ?? defaultSettings;
  const topics = effectiveSettings.basic.homeTopics && effectiveSettings.basic.homeTopics.length > 0
    ? effectiveSettings.basic.homeTopics
    : heroTopics;

  const categoryPillClassName =
    'inline-flex items-center justify-center rounded-full border border-[#991B1B] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#991B1B] shadow-sm transition duration-200 hover:bg-[#991B1B] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#991B1B]/20 sm:text-[11px]';

  if (!article) {
    return (
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
         <div className="pb-2 pt-1">
           <div className="-mt-1 flex flex-wrap gap-2">
             {topics.map((topic) => {
               const slug = normalizeCategorySlug(topic);
               const label = getCategoryDisplayName(topic);
               return (
                 <Link key={topic} href={slug ? `/categoria/${slug}` : '/'} className={categoryPillClassName}>
                   {label}
                 </Link>
               );
             })}
           </div>
         </div>

         <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">
           <h2 className="text-2xl font-semibold text-gray-900">Acompanhe o portal em tempo real</h2>
           <p className="mt-3">Publique sua primeira matéria no painel administrativo para que ela apareça aqui automaticamente.</p>
         </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="pb-2 pt-1">
         <div className="-mt-1 flex flex-wrap gap-2">
           {topics.map((topic) => {
             const slug = normalizeCategorySlug(topic);
             const label = getCategoryDisplayName(topic);
             return (
               <Link key={topic} href={slug ? `/categoria/${slug}` : '/'} className={categoryPillClassName}>
                 {label}
               </Link>
             );
           })}
         </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:gap-8 lg:grid-cols-3">
         <div className="lg:col-span-2">
           <Link href={`/artigo/${article.id}`}>
             <div className="group cursor-pointer overflow-hidden rounded-xl">
               <Image 
                 src={article.image} 
                 alt={article.title} 
                 width={1200}
                 height={400}
                 className="block h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
                 priority
                 loading="eager"
               />
             </div>
           </Link>

           <div className="mt-4 space-y-4 sm:mt-6">
             <div className="flex flex-wrap items-center gap-2 sm:gap-3">
               <span className="inline-block rounded-full bg-[#991B1B]/10 px-2.5 py-1 text-[10px] font-semibold text-[#991B1B] sm:text-xs">
                 {getCategoryDisplayName(article.category)}
               </span>
               <span className="text-[10px] text-gray-500 sm:text-xs">{formatDate(article.date)}</span>
             </div>

             <Link href={`/artigo/${article.id}`}>
               <h1 className="font-editorial cursor-pointer text-2xl font-bold leading-[1.02] text-gray-900 transition group-hover:text-[#991B1B] sm:text-3xl md:text-5xl">
                 {article.title}
               </h1>
             </Link>

             {article.subtitle && <p className="text-base leading-relaxed text-gray-600 sm:text-xl">{article.subtitle}</p>}

             <div className="flex flex-col gap-3 border-t border-gray-200 pt-3 sm:flex-row sm:items-center sm:justify-between sm:pt-4">
               <div className="flex items-center gap-3">
                 {article.authorImage && <img src={article.authorImage} alt={article.author} className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10" />}
                 <div>
                   <p className="text-sm font-semibold text-gray-900 sm:text-base">{article.author}</p>
                   <p className="text-[11px] text-gray-500 sm:text-xs">{article.readingTime} min de leitura</p>
                 </div>
               </div>

               <Link href={`/artigo/${article.id}`} className="inline-flex items-center justify-center rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#111111] hover:text-white focus:text-white sm:px-6">
                 Ler mais
               </Link>
             </div>
           </div>
         </div>

         <div className="space-y-4 sm:space-y-6">
           <h3 className="text-base font-bold text-gray-900 sm:text-lg">Destaques</h3>
           <div className="space-y-4 sm:space-y-6">
             {secondaryArticles.map((secondaryArticle) => (
               <Link key={secondaryArticle.id} href={`/artigo/${secondaryArticle.id}`} className="group block border-b border-gray-200 pb-4 last:border-0 sm:pb-6">
                 <div className="flex gap-3">
                   <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-gray-200 sm:h-20 sm:w-28">
                     <Image 
                       src={secondaryArticle.image} 
                       alt={secondaryArticle.title} 
                       width={112}
                       height={80}
                       className="block h-full w-full object-cover object-center"
                       loading="lazy"
                     />
                   </div>
                   <div className="min-w-0 flex-1">
                     <span className="text-[10px] font-semibold uppercase text-[#991B1B] sm:text-xs">{getCategoryDisplayName(secondaryArticle.category)}</span>
                     <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-gray-900 transition group-hover:text-[#991B1B] sm:text-[15px]">
                       {secondaryArticle.title}
                     </h4>
                     <p className="mt-1.5 text-[11px] text-gray-500 sm:text-xs">{formatDate(secondaryArticle.date)}</p>
                   </div>
                 </div>
               </Link>
             ))}
           </div>
         </div>
        </div>
      </div>
    </section>
  );
}

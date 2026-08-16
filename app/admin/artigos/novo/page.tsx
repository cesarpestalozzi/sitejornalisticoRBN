'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Save, Send, CalendarClock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import ArticleMediaManager, { type ArticleImage, type ArticleVideo } from '@/app/components/ArticleMediaManager';
import ArticlePreviewPanel from '@/app/components/ArticlePreviewPanel';
import HtmlEditor from '@/app/components/HtmlEditor';
import { categories } from '@/app/data/mockData';
import { useArticles } from '@/app/hooks/useArticles';
import { useUsers } from '@/app/hooks/useUsers';
import {
  canCreateArticle,
  canPublishArticle,
  canViewAllArticles,
  useCurrentAdminUser,
} from '@/app/lib/adminPermissions';

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function NewArticlePage() {
  const router = useRouter();
  const { addArticle, isLoaded } = useArticles();
  const { users } = useUsers();
  const currentUser = useCurrentAdminUser();
  const brazilianLocations = [
    'Acre',
    'Alagoas',
    'Amapá',
    'Amazonas',
    'Bahia',
    'Ceará',
    'Distrito Federal',
    'Espírito Santo',
    'Goiás',
    'Maranhão',
    'Mato Grosso',
    'Mato Grosso do Sul',
    'Minas Gerais',
    'Pará',
    'Paraíba',
    'Paraná',
    'Pernambuco',
    'Piauí',
    'Rio de Janeiro',
    'Rio Grande do Norte',
    'Rio Grande do Sul',
    'Rondônia',
    'Roraima',
    'Santa Catarina',
    'São Paulo',
    'Sergipe',
    'Tocantins',
  ];
  const defaultAuthor =
    currentUser && !canViewAllArticles(currentUser)
      ? currentUser.name
      : users.find((user) => user.status === 'ativo')?.name ?? 'Marina Silva';
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    category: categories[0]?.slug ?? 'economia',
    excerpt: '',
    content: '',
    author: defaultAuthor,
    location: 'São Paulo',
    featured: false,
  });

  useEffect(() => {
    if (defaultAuthor && !formData.author) {
      setFormData((current) => ({ ...current, author: defaultAuthor }));
    }
  }, [defaultAuthor, formData.author]);

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showScheduleFields, setShowScheduleFields] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [mediaState, setMediaState] = useState<{ images: ArticleImage[]; videos: ArticleVideo[]; primaryImage: string }>({
    images: [],
    videos: [],
    primaryImage: '',
  });

  const plainContent = useMemo(() => stripHtml(formData.content), [formData.content]);
  const wordCount = plainContent.length > 0 ? plainContent.split(' ').length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = type === 'checkbox' ? (event.target as HTMLInputElement).checked : undefined;

    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleMediaChange = (images: ArticleImage[], videos: ArticleVideo[], primaryImage: string) => {
    setMediaState({ images, videos, primaryImage });
  };

  const handlePublish = (publishStatus: 'rascunho' | 'agendado' | 'publicado') => {
    if (!currentUser || !canCreateArticle(currentUser)) {
      window.alert('Sem permissão para criar matérias.');
      return;
    }

    if (!formData.title.trim()) {
      window.alert('Preencha o título da notícia.');
      return;
    }

    if (!plainContent.trim()) {
      window.alert('Preencha o conteúdo da notícia.');
      return;
    }

    if (publishStatus === 'agendado' && (!scheduledDate || !scheduledTime)) {
      window.alert('Defina a data e o horário do agendamento.');
      return;
    }

    if ((publishStatus === 'publicado' || publishStatus === 'agendado') && !canPublishArticle(currentUser, formData.author)) {
      window.alert('Seu perfil não pode publicar esta matéria.');
      return;
    }

    try {
      addArticle({
        title: formData.title,
        subtitle: formData.subtitle,
        category: formData.category,
        excerpt: formData.excerpt || plainContent.slice(0, 180),
        content: formData.content,
        author: formData.author,
        image: mediaState.primaryImage,
        images: mediaState.images,
        videos: mediaState.videos,
        featured: formData.featured,
        location: formData.location,
        status: publishStatus,
        scheduledDate: publishStatus === 'agendado' ? scheduledDate : undefined,
        scheduledTime: publishStatus === 'agendado' ? scheduledTime : undefined,
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Sem permissão para publicar esta matéria.');
      return;
    }

    const messages = {
      rascunho: 'Rascunho salvo com sucesso.',
      agendado: `Publicação agendada para ${scheduledDate} às ${scheduledTime}.`,
      publicado: 'Notícia publicada com sucesso no AO PONTO BR.',
    };

    setFeedbackMessage(messages[publishStatus]);

    window.setTimeout(() => {
      router.push('/admin/artigos');
    }, 1200);
  };

  if (!isLoaded || !currentUser) {
    return <div className="p-6 text-sm text-gray-600">Carregando editor...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/artigos" className="rounded-lg p-2 transition hover:bg-gray-100">
                <ArrowLeft className="h-6 w-6 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Novo artigo</h1>
                <p className="text-sm text-gray-600">Crie uma notícia completa para o AO PONTO BR.</p>
              </div>
            </div>
          </div>
          {feedbackMessage && (
            <div className="flex items-center gap-2 bg-green-100 px-8 py-3 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              {feedbackMessage}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr),360px]">
            <div className="space-y-6">
              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Informações principais</h2>
                    <p className="text-sm text-gray-500">Defina título, autoria, categoria e resumo.</p>
                  </div>
                  <div className="rounded-full bg-[#FF796C]/10 px-4 py-2 text-sm font-semibold text-[#FF796C]">{wordCount} palavras</div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Título</label>
                    <input type="text" name="title" value={formData.title} onChange={handleFieldChange} placeholder="Digite o título da notícia" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Linha fina</label>
                    <input type="text" name="subtitle" value={formData.subtitle} onChange={handleFieldChange} placeholder="Resumo complementar da manchete" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Categoria</label>
                      <select name="category" value={formData.category} onChange={handleFieldChange} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none">
                        {categories.map((category) => (
                          <option key={category.id} value={category.slug}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Autor</label>
                      <select
                        name="author"
                        value={formData.author}
                        onChange={handleFieldChange}
                        disabled={!canViewAllArticles(currentUser)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                      >
                        {canViewAllArticles(currentUser) ? (
                          users.filter((user) => user.status === 'ativo').map((user) => (
                            <option key={user.id} value={user.name}>{user.name}</option>
                          ))
                        ) : (
                          <option value={currentUser.name}>{currentUser.name}</option>
                        )}
                        {canViewAllArticles(currentUser) && (!users.some((user) => user.status === 'ativo') || !users.some((user) => user.name === formData.author)) && (
                          <option value={formData.author || defaultAuthor}>{formData.author || defaultAuthor}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Resumo</label>
                    <textarea name="excerpt" value={formData.excerpt} onChange={handleFieldChange} rows={4} placeholder="Escreva um resumo para listagens e cards" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Local de publicação</label>
                    <select name="location" value={formData.location} onChange={handleFieldChange} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none">
                      {brazilianLocations.map((location) => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Conteúdo da notícia</h2>
                    <p className="text-sm text-gray-500">Use a barra para títulos, negrito, listas, citações e links.</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{wordCount} palavras</p>
                    <p>{readingTime} min de leitura</p>
                  </div>
                </div>

                <HtmlEditor value={formData.content} onChange={(content) => setFormData((current) => ({ ...current, content }))} minHeight={360} />
              </section>

              <ArticlePreviewPanel
                title={formData.title}
                subtitle={formData.subtitle}
                category={categories.find((category) => category.slug === formData.category)?.name ?? formData.category}
                author={formData.author}
                content={formData.content}
                images={mediaState.images}
                videos={mediaState.videos}
                location={formData.location}
                publishedAt={new Date().toISOString()}
                lastUpdatedAt={new Date().toISOString()}
              />
            </div>

            <aside className="space-y-6">
              <section className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Mídia da matéria</h2>
                  <p className="mt-1 text-sm text-gray-500">Adicione várias imagens e vídeos, escolha a imagem principal e edite antes de publicar.</p>
                </div>
                <ArticleMediaManager
                  initialImages={mediaState.images}
                  initialVideos={mediaState.videos}
                  initialPrimaryImage={mediaState.primaryImage}
                  title={formData.title || 'A notícia'}
                  onChange={handleMediaChange}
                />
              </section>

              <section className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Configurações de destaque</h2>
                <label className="mt-4 flex items-start gap-3">
                  <input type="checkbox" name="featured" checked={formData.featured} onChange={handleFieldChange} className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF796C]" />
                  <span>
                    <span className="block font-semibold text-gray-900">Exibir no hero da home</span>
                    <span className="text-sm text-gray-500">Artigos marcados como destaque aparecem no topo da página inicial.</span>
                  </span>
                </label>
              </section>

              <section className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Publicação</h2>
                <div className="mt-4 space-y-3">
                {canPublishArticle(currentUser, formData.author) ? (
                  <button type="button" onClick={() => handlePublish('publicado')} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2a2a2a]">
                    <Send className="h-4 w-4" />
                    Publicar notícia
                  </button>
                ) : null}
                <button type="button" onClick={() => handlePublish('rascunho')} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  <Save className="h-4 w-4" />
                  Salvar rascunho
                </button>
                {canPublishArticle(currentUser, formData.author) ? (
                  <button type="button" onClick={() => setShowScheduleFields((current) => !current)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">
                    <CalendarClock className="h-4 w-4" />
                    Agendar publicação
                  </button>
                ) : null}
              </div>
                {showScheduleFields && (
                  <div className="mt-4 grid gap-3">
                    <input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                    <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                    <button type="button" onClick={() => handlePublish('agendado')} className="rounded-lg bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">
                      Confirmar agendamento
                    </button>
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

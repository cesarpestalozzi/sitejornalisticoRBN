'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Save, Send, CalendarClock, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import ArticleMediaManager, { type ArticleImage, type ArticleVideo } from '@/app/components/ArticleMediaManager';
import ArticlePreviewPanel from '@/app/components/ArticlePreviewPanel';
import HtmlEditor from '@/app/components/HtmlEditor';
import { useArticles } from '@/app/hooks/useArticles';
import { useUsers } from '@/app/hooks/useUsers';
import { RADAR_EDITOR_DRAFT_STORAGE_KEY, type RadarEditorDraft } from '@/app/lib/radarEditorDraft';
import {
  canCreateArticle,
  canPublishArticle,
  canViewAllArticles,
  useCurrentAdminUser,
} from '@/app/lib/adminPermissions';
import { defaultManagedCategories, readManagedCategories, type ManagedCategory } from '@/app/lib/managedCategories';

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function normalizeCategorySlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapRadarCategoryToManagedCategory(category: string, categories: ManagedCategory[]) {
  const target = normalizeCategorySlug(category);
  const match = categories.find((item) => normalizeCategorySlug(item.slug || item.name) === target);
  return match?.slug ?? categories[0]?.slug ?? 'geral';
}

type AudienceRecipient = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type EditorialChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export default function NewArticlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const defaultAuthor = currentUser?.name ?? users.find((user) => user.status === 'ativo')?.name ?? 'César Pestalozzi';
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    category: defaultManagedCategories[0]?.slug ?? 'economia',
    excerpt: '',
    content: '',
    author: defaultAuthor,
    location: 'São Paulo',
    featured: false,
  });
  const [availableCategories, setAvailableCategories] = useState<ManagedCategory[]>(defaultManagedCategories);

  useEffect(() => {
    const syncCategories = () => {
      const managed = readManagedCategories();
      setAvailableCategories(managed);
      setFormData((current) => {
        if (managed.some((category) => category.slug === current.category)) {
          return current;
        }
        return {
          ...current,
          category: managed[0]?.slug ?? current.category,
        };
      });
    };

    syncCategories();
    window.addEventListener('categoriesChanged', syncCategories);
    window.addEventListener('storage', syncCategories);

    return () => {
      window.removeEventListener('categoriesChanged', syncCategories);
      window.removeEventListener('storage', syncCategories);
    };
  }, []);

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showScheduleFields, setShowScheduleFields] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<{
    message: string;
    status: 'rascunho' | 'agendado' | 'publicado';
    articleId: string;
  } | null>(null);
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [audienceRecipients, setAudienceRecipients] = useState<AudienceRecipient[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [isLoadingAudience, setIsLoadingAudience] = useState(true);
  const [audienceError, setAudienceError] = useState('');
  const [mediaState, setMediaState] = useState<{ images: ArticleImage[]; videos: ArticleVideo[]; primaryImage: string }>({
    images: [],
    videos: [],
    primaryImage: '',
  });
  const [radarDraft, setRadarDraft] = useState<RadarEditorDraft | null>(null);
  const [selectedTitleOption, setSelectedTitleOption] = useState('');
  const [journalistReviewDone, setJournalistReviewDone] = useState(false);
  const [editorialWarning, setEditorialWarning] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [slugSuggestion, setSlugSuggestion] = useState('');
  const [keywordTags, setKeywordTags] = useState<string[]>([]);

  const plainContent = useMemo(() => stripHtml(formData.content), [formData.content]);
  const wordCount = plainContent.length > 0 ? plainContent.split(' ').length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const selectedRecipients = useMemo(
    () => audienceRecipients.filter((recipient) => selectedRecipientIds.includes(recipient.id)),
    [audienceRecipients, selectedRecipientIds]
  );
  const editorialChecklist = useMemo<EditorialChecklistItem[]>(() => {
    const hasCredit = mediaState.images.some((image) => image.caption.includes('Crédito:') || image.caption.includes('crédito'));
    const hasSeo = seoDescription.trim().length >= 70 || formData.excerpt.trim().length >= 70;
    const hasSources = (radarDraft?.sources.length ?? 0) > 0;
    const hasPendingFacts = (radarDraft?.facts.filter((fact) => fact.status !== 'confirmada').length ?? 0) > 0;

    return [
      { id: 'titulo', label: 'Título', ok: formData.title.trim().length >= 15, detail: 'Use um título claro e informativo.' },
      { id: 'linha-fina', label: 'Linha fina', ok: formData.subtitle.trim().length >= 20, detail: 'A linha fina deve contextualizar o lead.' },
      { id: 'texto', label: 'Texto', ok: wordCount >= 120, detail: 'Corpo da matéria com contexto e apuração mínima.' },
      { id: 'fontes', label: 'Fontes', ok: hasSources, detail: 'Liste fontes verificáveis com links originais.' },
      { id: 'imagem', label: 'Imagem', ok: mediaState.images.length > 0, detail: 'Selecione imagem principal ou faça upload próprio.' },
      { id: 'credito', label: 'Crédito', ok: hasCredit, detail: 'Inclua crédito e origem da imagem.' },
      { id: 'seo', label: 'SEO', ok: hasSeo, detail: 'Resumo/descrição com pelo menos 70 caracteres.' },
      { id: 'confirmacao', label: 'Confirmação', ok: !hasPendingFacts, detail: 'Pendências precisam ser verificadas pela redação.' },
    ];
  }, [formData.excerpt, formData.subtitle, formData.title, mediaState.images, radarDraft, seoDescription, wordCount]);
  const pendingChecklistItems = editorialChecklist.filter((item) => !item.ok);
  const effectiveAuthor = formData.author || defaultAuthor;

  useEffect(() => {
    const source = searchParams.get('source');
    if (source !== 'radar') {
      return;
    }

    const stored = window.localStorage.getItem(RADAR_EDITOR_DRAFT_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as RadarEditorDraft;
      const mappedCategory = mapRadarCategoryToManagedCategory(parsed.category, availableCategories);
      const suggestedImages: ArticleImage[] = parsed.imageSuggestions.map((image, index) => ({
        id: image.id,
        url: image.url,
        alt: parsed.suggestedTitle,
        caption: `${image.caption} (${image.credit})`,
        isPrimary: index === 0,
        name: image.origin,
        placement: 'gallery',
      }));

      const timeoutId = window.setTimeout(() => {
        setRadarDraft(parsed);
        setSelectedTitleOption(parsed.suggestedTitle);
        setJournalistReviewDone(false);
        setEditorialWarning('');
        setSeoDescription(parsed.seoDescription);
        setSlugSuggestion(parsed.slugSuggestion);
        setKeywordTags(parsed.keywords);
        setFormData((current) => ({
          ...current,
          title: parsed.suggestedTitle,
          subtitle: parsed.subtitle,
          excerpt: parsed.excerpt,
          content: parsed.contentHtml,
          category: mappedCategory,
          location: parsed.location || current.location,
          author: current.author || defaultAuthor,
        }));
        setMediaState((current) => ({
          images: suggestedImages.length > 0 ? suggestedImages : current.images,
          videos: current.videos,
          primaryImage: suggestedImages[0]?.url ?? current.primaryImage,
        }));
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error('Falha ao carregar rascunho do Radar no editor:', error);
    }
  }, [availableCategories, defaultAuthor, searchParams]);

  useEffect(() => {
    let isActive = true;

    const loadAudience = async () => {
      setIsLoadingAudience(true);
      setAudienceError('');

      try {
        const response = await fetch('/api/admin/audience', { method: 'GET', headers: { Accept: 'application/json' } });
        const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; users?: AudienceRecipient[]; error?: string };
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Não foi possível carregar os usuários cadastrados.');
        }

        if (!isActive) {
          return;
        }

        const users = Array.isArray(payload.users) ? payload.users : [];
        setAudienceRecipients(users);
        setSelectedRecipientIds(users.map((user) => user.id));
      } catch (error) {
        if (!isActive) {
          return;
        }
        setAudienceError(error instanceof Error ? error.message : 'Erro ao carregar público.');
      } finally {
        if (isActive) {
          setIsLoadingAudience(false);
        }
      }
    };

    loadAudience();

    return () => {
      isActive = false;
    };
  }, []);

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = type === 'checkbox' ? (event.target as HTMLInputElement).checked : undefined;

    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const applyTitleOption = (title: string) => {
    setSelectedTitleOption(title);
    setFormData((current) => ({ ...current, title }));
  };

  const runAiAssistAction = (action: 'melhorar-titulo' | 'criar-linha-fina' | 'criar-resumo' | 'expandir-contexto' | 'gerar-nova-versao') => {
    if (!radarDraft) {
      return;
    }

    if (action === 'melhorar-titulo') {
      const currentIndex = radarDraft.titleOptions.findIndex((option) => option === (selectedTitleOption || formData.title));
      const nextTitle = radarDraft.titleOptions[(currentIndex + 1) % radarDraft.titleOptions.length] ?? radarDraft.suggestedTitle;
      applyTitleOption(nextTitle);
      return;
    }

    if (action === 'criar-linha-fina') {
      setFormData((current) => ({ ...current, subtitle: radarDraft.subtitle }));
      return;
    }

    if (action === 'criar-resumo') {
      setFormData((current) => ({ ...current, excerpt: radarDraft.excerpt }));
      return;
    }

    if (action === 'gerar-nova-versao') {
      const versionTimestamp = new Date().toLocaleString('pt-BR');
      const sourceLines = radarDraft.sources
        .slice(0, 5)
        .map((source) => `<li><a href="${source.url}" target="_blank" rel="noreferrer">${source.name}</a> — ${source.articleTitle}</li>`)
        .join('');
      setFormData((current) => ({
        ...current,
        content: [
          `<p><strong>Nova versão editorial (${versionTimestamp}):</strong> ${radarDraft.excerpt}</p>`,
          '<p>Esta versão reorganiza o texto mantendo os fatos e as fontes previamente identificadas no Radar de Notícias.</p>',
          '<h2>Fatos principais</h2>',
          `<p>${radarDraft.subtitle}</p>`,
          '<h2>Fontes utilizadas</h2>',
          `<ul>${sourceLines}</ul>`,
          '<h2>Pontos para checagem antes de publicar</h2>',
          '<ul><li>Conferir números e datas.</li><li>Confirmar contrapontos.</li><li>Validar direitos de imagem e créditos.</li></ul>',
        ].join(''),
      }));
      return;
    }

    setFormData((current) => ({
      ...current,
      content: `${current.content}<h2>Contexto adicional</h2><p>Este trecho foi adicionado pelo assistente para ampliar contexto, mantendo os fatos já identificados no Radar e exigindo validação final da redação.</p>`,
    }));
  };

  const handleMediaChange = (images: ArticleImage[], videos: ArticleVideo[], primaryImage: string) => {
    setMediaState({ images, videos, primaryImage });
  };

  const handleEditorMediaRegister = async (kind: 'image' | 'video', file: File, caption: string) => {
    const dataUrl = await fileToDataUrl(file);
    const mediaId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (kind === 'image') {
      const nextImage: ArticleImage = {
        id: mediaId,
        url: dataUrl,
        alt: caption.trim() || formData.title || file.name,
        caption: caption.trim(),
        isPrimary: false,
        name: file.name,
        placement: 'inline',
      };

      setMediaState((current) => ({
        images: [...current.images, nextImage],
        videos: current.videos,
        primaryImage: current.primaryImage,
      }));

      return { id: nextImage.id, url: nextImage.url };
    }

    const nextVideo: ArticleVideo = {
      id: mediaId,
      url: dataUrl,
      title: file.name,
      caption: caption.trim(),
      name: file.name,
      type: 'upload',
      placement: 'inline',
    };

    setMediaState((current) => ({
      ...current,
      videos: [...current.videos, nextVideo],
    }));

    return { id: nextVideo.id, url: nextVideo.url };
  };

  const handlePublish = async (
    publishStatus: 'rascunho' | 'agendado' | 'publicado',
    options?: { reviewRequested?: boolean }
  ) => {
    if (!currentUser || !canCreateArticle(currentUser)) {
      window.alert('Sem permissão para criar matérias.');
      return;
    }

    if ((publishStatus === 'publicado' || publishStatus === 'agendado') && !journalistReviewDone) {
      setEditorialWarning('Atenção: conclua a revisão jornalística antes de publicar ou agendar.');
      window.alert('Antes de publicar/agendar, marque a revisão jornalística no checklist editorial.');
      return;
    }
    setEditorialWarning('');

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

    if ((publishStatus === 'publicado' || publishStatus === 'agendado') && !canPublishArticle(currentUser, effectiveAuthor)) {
      window.alert('Seu perfil não pode publicar esta matéria.');
      return;
    }

    let createdArticleId = '';
    try {
      const createdArticle = addArticle({
        title: formData.title,
        subtitle: formData.subtitle,
        category: formData.category,
        excerpt: formData.excerpt || plainContent.slice(0, 180),
        content: formData.content,
        author: effectiveAuthor,
        image: mediaState.primaryImage,
        images: mediaState.images,
        videos: mediaState.videos,
        featured: formData.featured,
        location: formData.location,
        notificationEnabled: notifyByEmail,
        notificationRecipients: notifyByEmail ? selectedRecipients : [],
        status: publishStatus,
        scheduledDate: publishStatus === 'agendado' ? scheduledDate : undefined,
        scheduledTime: publishStatus === 'agendado' ? scheduledTime : undefined,
      });
      createdArticleId = createdArticle.id;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Sem permissão para publicar esta matéria.');
      return;
    }

    if (publishStatus === 'publicado' && notifyByEmail && selectedRecipients.length > 0) {
      try {
        const response = await fetch('/api/admin/article-notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            articleId: createdArticleId,
            articleUrl: `${window.location.origin}/artigo/${encodeURIComponent(createdArticleId)}`,
            title: formData.title,
            excerpt: formData.excerpt || plainContent.slice(0, 180),
            recipients: selectedRecipients,
            siteUrl: window.location.origin,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          sentCount?: number;
          failureCount?: number;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Falha ao enviar notificações por e-mail.');
        }

        const sentCount = Number(payload.sentCount ?? 0);
        const failureCount = Number(payload.failureCount ?? 0);
        if (failureCount > 0) {
          window.alert(`Notificações enviadas para ${sentCount} pessoa(s). ${failureCount} envio(s) falharam.`);
        }
      } catch (error) {
        window.alert(error instanceof Error ? error.message : 'Não foi possível disparar os e-mails da notícia.');
      }
    }

    const messages = {
      rascunho: 'Rascunho salvo com sucesso.',
      agendado: `Matéria agendada com sucesso para ${scheduledDate} às ${scheduledTime}.`,
      publicado: 'Matéria publicada com sucesso.',
    };
    if (options?.reviewRequested) {
      messages.rascunho = 'Matéria enviada para revisão editorial com sucesso.';
    }

    setPublishFeedback({
      message: messages[publishStatus],
      status: publishStatus,
      articleId: createdArticleId,
    });
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
               <p className="text-sm text-gray-600">Crie uma notícia completa para o RBN.</p>
              </div>
            </div>
          </div>
          {publishFeedback && (
            <div className="flex flex-col gap-3 bg-green-100 px-8 py-3 text-sm font-semibold text-green-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                {publishFeedback.message}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {publishFeedback.status === 'publicado' && (
                  <>
                    <Link
                      href={`/artigo/${encodeURIComponent(publishFeedback.articleId)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-[#236A88] transition hover:bg-gray-50"
                    >
                      Ver matéria publicada
                    </Link>
                    <Link
                      href="/"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-[#236A88] transition hover:bg-gray-50"
                    >
                      Ir para página inicial
                    </Link>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => router.push('/admin/artigos')}
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-[#236A88] transition hover:bg-gray-50"
                >
                  Voltar para artigos
                </button>
              </div>
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
                        {availableCategories.map((category) => (
                          <option key={category.id} value={category.slug}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Autor</label>
                      <select
                        name="author"
                        value={effectiveAuthor}
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
                        {canViewAllArticles(currentUser) && (!users.some((user) => user.status === 'ativo') || !users.some((user) => user.name === effectiveAuthor)) && (
                          <option value={effectiveAuthor}>{effectiveAuthor}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Resumo</label>
                    <textarea name="excerpt" value={formData.excerpt} onChange={handleFieldChange} rows={4} placeholder="Escreva um resumo para listagens e cards" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Sugestão de URL (slug)</label>
                    <input
                      type="text"
                      value={slugSuggestion}
                      onChange={(event) => setSlugSuggestion(event.target.value)}
                      placeholder="exemplo-de-slug-jornalistico"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Descrição para SEO</label>
                    <textarea
                      value={seoDescription}
                      onChange={(event) => setSeoDescription(event.target.value)}
                      rows={3}
                      placeholder="Descrição curta para mecanismos de busca"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#FF796C] focus:outline-none"
                    />
                  </div>
                  {keywordTags.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Palavras-chave sugeridas</label>
                      <div className="flex flex-wrap gap-2">
                        {keywordTags.map((keyword) => (
                          <span key={keyword} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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

                <HtmlEditor
                  value={formData.content}
                  onChange={(content) => setFormData((current) => ({ ...current, content }))}
                  minHeight={360}
                  libraryImages={mediaState.images}
                  libraryVideos={mediaState.videos}
                  onRegisterMedia={handleEditorMediaRegister}
                />
              </section>

              <ArticlePreviewPanel
                title={formData.title}
                subtitle={formData.subtitle}
                category={availableCategories.find((category) => category.slug === formData.category)?.name ?? formData.category}
                author={effectiveAuthor}
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
                  <p className="mt-1 text-sm text-gray-500">Adicione várias imagens e vídeos, escolha a imagem principal, adicione legenda e edite antes de publicar.</p>
                </div>
                <ArticleMediaManager
                  initialImages={mediaState.images}
                  initialVideos={mediaState.videos}
                  initialPrimaryImage={mediaState.primaryImage}
                  title={formData.title || 'A notícia'}
                  onChange={handleMediaChange}
                />
              </section>

              {radarDraft && (
                <section className="rounded-xl bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900">Editor inteligente do Radar</h2>
                  <p className="mt-1 text-sm text-gray-500">Primeira versão gerada a partir das fontes do Radar. Revise tudo antes da publicação.</p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">Opções de título (3-5)</p>
                      <div className="mt-2 space-y-2">
                        {radarDraft.titleOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => applyTitleOption(option)}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                              (selectedTitleOption || formData.title) === option
                                ? 'border-[#FF796C] bg-[#fff6f4] text-[#9A3412]'
                                : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => runAiAssistAction('melhorar-titulo')} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Melhorar título
                      </button>
                      <button type="button" onClick={() => runAiAssistAction('criar-linha-fina')} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Criar linha fina
                      </button>
                      <button type="button" onClick={() => runAiAssistAction('criar-resumo')} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Criar resumo
                      </button>
                      <button type="button" onClick={() => runAiAssistAction('expandir-contexto')} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Expandir contexto
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => runAiAssistAction('gerar-nova-versao')}
                      className="w-full rounded-lg bg-[#111111] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#2a2a2a]"
                    >
                      🤖 Gerar nova versão
                    </button>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">Fontes utilizadas</p>
                      <ul className="mt-2 space-y-2">
                        {radarDraft.sources.map((source) => (
                          <li key={`${source.url}-${source.name}`} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                            <p className="font-semibold text-gray-900">{source.name}</p>
                            <a href={source.url} target="_blank" rel="noreferrer" className="text-[#236A88] underline">
                              {source.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">Confiabilidade das informações</p>
                      <ul className="mt-2 space-y-2">
                        {radarDraft.facts.map((fact) => (
                          <li key={fact.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                            <span className="mr-2">
                              {fact.status === 'confirmada' ? '🟢' : fact.status === 'requer-confirmacao' ? '🟡' : '🔴'}
                            </span>
                            {fact.text}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-600">Imagens sugeridas</p>
                      {radarDraft.imageSuggestions.length === 0 ? (
                        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          Imagem não encontrada com licença adequada. Faça upload manual na seção de mídia.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-3">
                          {radarDraft.imageSuggestions.map((image) => (
                            <div key={image.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                              <p className="text-xs font-semibold text-gray-900">{image.origin}</p>
                              <p className="mt-1 text-xs text-gray-600">{image.license} • {image.rights}</p>
                              <p className="mt-1 text-xs text-gray-600">{image.credit}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Checklist editorial</h2>
                <p className="mt-1 text-sm text-gray-500">Validação automática antes da publicação final.</p>
                <div className="mt-4 space-y-2">
                  {editorialChecklist.map((item) => (
                    <div key={item.id} className={`rounded-lg border px-3 py-2 text-sm ${item.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                      <p className="font-semibold">{item.ok ? '🟢' : '🟡'} {item.label}</p>
                      {!item.ok && <p className="mt-1 text-xs">{item.detail}</p>}
                    </div>
                  ))}
                </div>
                {pendingChecklistItems.length > 0 && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    🔴 Atenção: esta matéria possui informações que precisam ser verificadas antes da publicação.
                  </p>
                )}
                <label className="mt-4 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={journalistReviewDone}
                    onChange={(event) => {
                      setJournalistReviewDone(event.target.checked);
                      if (event.target.checked) {
                        setEditorialWarning('');
                      }
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF796C]"
                  />
                  <span className="text-sm text-gray-800">
                    <span className="block font-semibold">Revisado pelo jornalista responsável</span>
                    <span className="text-xs text-gray-600">Obrigatório para publicar/agendar no RBN.</span>
                  </span>
                </label>
                {editorialWarning && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{editorialWarning}</p>
                )}
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
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Disparo rápido por e-mail</h2>
                    <p className="text-sm text-gray-500">Escolha para quem enviar a notícia quando publicar.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    <Users className="h-3.5 w-3.5" />
                    {audienceRecipients.length} cadastrados
                  </div>
                </div>

                <label className="mb-3 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={notifyByEmail}
                    onChange={(event) => setNotifyByEmail(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF796C]"
                  />
                  <span>
                    <span className="block font-semibold text-gray-900">Enviar notícia por e-mail ao publicar</span>
                    <span className="text-sm text-gray-500">Você pode ativar/desativar esse disparo em cada matéria.</span>
                  </span>
                </label>

                {notifyByEmail && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">Destinatários selecionados: {selectedRecipientIds.length}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRecipientIds(audienceRecipients.map((recipient) => recipient.id))}
                          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Selecionar todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRecipientIds([])}
                          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>

                    {isLoadingAudience ? (
                      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">Carregando usuários cadastrados...</p>
                    ) : audienceError ? (
                      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">{audienceError}</p>
                    ) : audienceRecipients.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm text-gray-600">Nenhum usuário cadastrado encontrado.</p>
                    ) : (
                      <div className="max-h-64 space-y-2 overflow-auto pr-1">
                        {audienceRecipients.map((recipient) => {
                          const checked = selectedRecipientIds.includes(recipient.id);
                          return (
                            <label key={recipient.id} className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    setSelectedRecipientIds((current) => (current.includes(recipient.id) ? current : [...current, recipient.id]));
                                    return;
                                  }
                                  setSelectedRecipientIds((current) => current.filter((id) => id !== recipient.id));
                                }}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#FF796C]"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-gray-900">{recipient.name}</span>
                                <span className="block truncate text-xs text-gray-600">{recipient.email}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Publicação</h2>
                <p className="mt-1 text-sm text-gray-500">Confira a prévia da matéria ao lado antes de publicar.</p>
                <div className="mt-4 space-y-3">
                {canPublishArticle(currentUser, effectiveAuthor) ? (
                  <button type="button" onClick={() => handlePublish('publicado')} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2a2a2a]">
                    <Send className="h-4 w-4" />
                    Publicar no RBN
                  </button>
                ) : null}
                <button type="button" onClick={() => handlePublish('rascunho')} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                  <Save className="h-4 w-4" />
                  Salvar rascunho
                </button>
                <button type="button" onClick={() => handlePublish('rascunho', { reviewRequested: true })} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50">
                  Enviar para revisão
                </button>
                {canPublishArticle(currentUser, effectiveAuthor) ? (
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

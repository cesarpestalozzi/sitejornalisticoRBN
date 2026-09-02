import { normalizeCategorySlug } from '@/app/lib/categoryLabels';

export const CATEGORIES_STORAGE_KEY = 'rbn_categories';

export interface ManagedCategory {
  id: number;
  name: string;
  slug: string;
  color: string;
  articles: number;
}

export const defaultManagedCategories: ManagedCategory[] = [
  { id: 1, name: 'Política', slug: 'politica', color: '#3B82F6', articles: 0 },
  { id: 2, name: 'Brasil', slug: 'brasil', color: '#6366F1', articles: 0 },
  { id: 3, name: 'Últimas notícias', slug: 'ultimas-noticias', color: '#1D4ED8', articles: 0 },
  { id: 4, name: 'Mundo', slug: 'mundo', color: '#F59E0B', articles: 0 },
  { id: 5, name: 'Economia', slug: 'economia', color: '#14B8A6', articles: 0 },
  { id: 6, name: 'Esportes', slug: 'esportes', color: '#8B5CF6', articles: 0 },
  { id: 7, name: 'Cultura', slug: 'cultura', color: '#EC4899', articles: 0 },
  { id: 8, name: 'Cinema', slug: 'cinema', color: '#A855F7', articles: 0 },
  { id: 9, name: 'Entretenimento', slug: 'entretenimento', color: '#F97316', articles: 0 },
  { id: 10, name: 'Tecnologia', slug: 'tecnologia', color: '#0EA5E9', articles: 0 },
  { id: 11, name: 'Saúde', slug: 'saude', color: '#EF4444', articles: 0 },
  { id: 12, name: 'Educação', slug: 'educacao', color: '#0D9488', articles: 0 },
  { id: 13, name: 'Meio Ambiente', slug: 'meio-ambiente', color: '#22C55E', articles: 0 },
  { id: 14, name: 'Ciência', slug: 'ciencia', color: '#4F46E5', articles: 0 },
  { id: 15, name: 'Segurança', slug: 'seguranca', color: '#DC2626', articles: 0 },
  { id: 16, name: 'Cidades', slug: 'cidades', color: '#64748B', articles: 0 },
  { id: 17, name: 'Geral', slug: 'geral', color: '#6B7280', articles: 0 },
  { id: 18, name: 'Opinião', slug: 'opiniao', color: '#BE185D', articles: 0 },
  { id: 19, name: 'Colunas', slug: 'colunas', color: '#0891B2', articles: 0 },
  { id: 20, name: 'Famosos', slug: 'famosos', color: '#DB2777', articles: 0 },
  { id: 21, name: 'Turismo', slug: 'turismo', color: '#0F766E', articles: 0 },
  { id: 22, name: 'Gastronomia', slug: 'gastronomia', color: '#B45309', articles: 0 },
  { id: 23, name: 'Clima e Tempo', slug: 'clima-e-tempo', color: '#16A34A', articles: 0 },
];

function normalizeManagedCategory(raw: unknown, index: number): ManagedCategory | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Partial<ManagedCategory>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  if (!name) {
    return null;
  }

  const normalizedSlug = normalizeCategorySlug(
    typeof candidate.slug === 'string' && candidate.slug.trim() ? candidate.slug : name
  );

  return {
    id: typeof candidate.id === 'number' && Number.isFinite(candidate.id) ? candidate.id : index + 1,
    name,
    slug: normalizedSlug,
    color: typeof candidate.color === 'string' && candidate.color.trim() ? candidate.color : '#3B82F6',
    articles: typeof candidate.articles === 'number' && Number.isFinite(candidate.articles) ? candidate.articles : 0,
  };
}

export function ensureRequiredManagedCategories(categories: ManagedCategory[]): ManagedCategory[] {
  const bySlug = new Map<string, ManagedCategory>();

  defaultManagedCategories.forEach((category) => {
    const slug = normalizeCategorySlug(category.slug || category.name);
    bySlug.set(slug, { ...category, slug });
  });

  categories.forEach((category) => {
    const slug = normalizeCategorySlug(category.slug || category.name);
    if (slug === 'minas-gerais') {
      return;
    }
    if (!bySlug.has(slug)) {
      bySlug.set(slug, { ...category, slug });
    }
  });

  return Array.from(bySlug.values()).map((category, index) => ({
    ...category,
    id: index + 1,
  }));
}

export function readManagedCategories(): ManagedCategory[] {
  if (typeof window === 'undefined') {
    return defaultManagedCategories;
  }

  const stored = window.localStorage.getItem(CATEGORIES_STORAGE_KEY);
  if (!stored) {
    return defaultManagedCategories;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return defaultManagedCategories;
    }

    const normalized = parsed
      .map((item, index) => normalizeManagedCategory(item, index))
      .filter((item): item is ManagedCategory => item !== null)
      .filter((item) => normalizeCategorySlug(item.slug || item.name) !== 'minas-gerais');

    if (normalized.length === 0) {
      return defaultManagedCategories;
    }

    return ensureRequiredManagedCategories(normalized);
  } catch (error) {
    console.error('Erro ao ler categorias salvas:', error);
    return defaultManagedCategories;
  }
}

import ArticleBodyContent from '@/app/components/ArticleBodyContent';
import { formatDate, formatDateTime } from '@/app/utils/dateUtils';

interface ArticlePreviewPanelProps {
  title: string;
  subtitle?: string;
  category: string;
  author: string;
  content: string;
  images?: Array<{ url: string; alt?: string }>;
  videos?: Array<{ url: string }>;
  location?: string;
  publishedAt?: string;
  lastUpdatedAt?: string;
}

export default function ArticlePreviewPanel({
  title,
  subtitle,
  category,
  author,
  content,
  images = [],
  videos = [],
  location,
  publishedAt,
  lastUpdatedAt,
}: ArticlePreviewPanelProps) {
  const heroImage = images[0]?.url;
  const publicationDate = publishedAt ? new Date(publishedAt) : new Date();
  const updateDate = lastUpdatedAt ? new Date(lastUpdatedAt) : publicationDate;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#C40000]">Pré-visualização</p>
          <h3 className="text-lg font-bold text-gray-900">Como a matéria ficará publicada</h3>
        </div>
        <span className="rounded-full bg-[#C40000]/10 px-3 py-1 text-xs font-semibold text-[#C40000]">Preview</span>
      </div>

      <article className="space-y-6">
        <div className="space-y-3">
          <span className="inline-flex rounded-full bg-[#C40000]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#C40000]">
            {category}
          </span>
          <h4 className="text-3xl font-bold leading-tight text-gray-900">{title || 'Título da matéria'}</h4>
          {subtitle && <p className="text-lg leading-relaxed text-gray-600">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap gap-4 border-y border-gray-200 py-4 text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{author || 'Autor'}</span>
          <span>Publicado em {formatDateTime(publicationDate)}</span>
          {location && <span>— {location}</span>}
        </div>

        {heroImage && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#f8f8f8]">
            <img src={heroImage} alt={title || 'Imagem da matéria'} className="h-[420px] w-full bg-white object-cover" />
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-[#FAFAFA] p-4 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">Atualização editorial</p>
          <p className="mt-1">Última atualização em {formatDateTime(updateDate)}.</p>
        </div>

        {videos.length > 0 && (
          <div className="space-y-3">
            {videos.map((video, index) => (
              <div key={`${video.url}-${index}`} className="overflow-hidden rounded-2xl bg-black">
                <video controls className="w-full">
                  <source src={video.url} />
                </video>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <ArticleBodyContent content={content || '<p>Seu texto será exibido aqui com parágrafos, destaque e elementos multimídia.</p>'} />
        </div>

        {images.length > 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            {images.slice(1).map((image, index) => (
              <div key={`${image.url}-${index}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-[#f8f8f8]">
                <img src={image.url} alt={image.alt || title} className="h-56 w-full bg-white object-cover" />
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

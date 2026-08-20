interface ArticleBodyContentProps {
  content: string;
  className?: string;
  images?: Array<{ id?: string; url: string }>;
  videos?: Array<{ id?: string; url: string }>;
}

export function resolveInlineMediaContent(
  content: string,
  images: Array<{ id?: string; url: string }>,
  videos: Array<{ id?: string; url: string }>
) {
  let resolvedContent = content;

  resolvedContent = resolvedContent.replace(/\(IMAGEM:(media:\/\/image\/[^)|]+)(?:\|([^)]*))?\)/gi, (_match, sourceToken: string, caption?: string) => {
    const resolvedImage = images.find((image) => image.id && sourceToken.endsWith(image.id));
    if (!resolvedImage) {
      return '';
    }

    const normalizedCaption = typeof caption === 'string' ? caption.trim() : '';
    const captionHtml = normalizedCaption ? `<figcaption>${normalizedCaption}</figcaption>` : '';
    return `<figure class="article-media article-media--compact"><img src="${resolvedImage.url}" alt="${normalizedCaption || 'Imagem da matéria'}" />${captionHtml}</figure>`;
  });

  resolvedContent = resolvedContent.replace(/\(VIDEO:(media:\/\/video\/[^)|]+)(?:\|([^)]*))?\)/gi, (_match, sourceToken: string, caption?: string) => {
    const resolvedVideo = videos.find((video) => video.id && sourceToken.endsWith(video.id));
    if (!resolvedVideo) {
      return '';
    }

    const normalizedCaption = typeof caption === 'string' ? caption.trim() : '';
    const captionHtml = normalizedCaption ? `<figcaption>${normalizedCaption}</figcaption>` : '';
    return `<figure class="article-media article-media--compact"><video controls><source src="${resolvedVideo.url}" /></video>${captionHtml}</figure>`;
  });

  images.forEach((image) => {
    if (!image.id) {
      return;
    }

    resolvedContent = resolvedContent.split(`media://image/${image.id}`).join(image.url);
  });

  videos.forEach((video) => {
    if (!video.id) {
      return;
    }

    resolvedContent = resolvedContent.split(`media://video/${video.id}`).join(video.url);
  });

  return resolvedContent;
}

export default function ArticleBodyContent({
  content,
  className = '',
  images = [],
  videos = [],
}: ArticleBodyContentProps) {
  const resolvedContent = resolveInlineMediaContent(content || '<p>Texto em construção.</p>', images, videos);

  return (
    <>
      <div className={`article-rich-content ${className}`.trim()} dangerouslySetInnerHTML={{ __html: resolvedContent }} />
      <style jsx global>{`
        .article-rich-content {
          color: #111827;
          font-size: 1.05rem;
          line-height: 1.9;
          letter-spacing: -0.01em;
        }

        .article-rich-content p,
        .article-rich-content div,
        .article-rich-content ul,
        .article-rich-content ol,
        .article-rich-content blockquote,
        .article-rich-content h2,
        .article-rich-content h3,
        .article-rich-content h4 {
          margin: 0 0 1.15rem;
        }

        .article-rich-content h2,
        .article-rich-content h3,
        .article-rich-content h4 {
          font-weight: 700;
          line-height: 1.25;
          color: #111111;
          margin-top: 2rem;
        }

        .article-rich-content h2 {
          font-size: 1.5rem;
        }

        .article-rich-content h3 {
          font-size: 1.25rem;
        }

        .article-rich-content h4 {
          font-size: 1.1rem;
        }

        .article-rich-content strong {
          font-weight: 700;
        }

        .article-rich-content em {
          font-style: italic;
        }

        .article-rich-content u {
          text-decoration: underline;
        }

        .article-rich-content a {
          color: #C40000;
          text-decoration: underline;
          font-weight: 600;
        }

        .article-rich-content ul,
        .article-rich-content ol {
          padding-left: 1.25rem;
        }

        .article-rich-content li + li {
          margin-top: 0.45rem;
        }

        .article-rich-content blockquote {
          border-left: 4px solid #C40000;
          padding: 0.75rem 1rem;
          background: #F9FAFB;
          color: #374151;
          font-style: italic;
          border-radius: 0.35rem;
        }

        .article-rich-content img {
          display: block;
          width: 100%;
          max-width: 100%;
          height: auto;
          border-radius: 1rem;
          margin: 1.5rem auto;
          object-fit: contain;
          box-shadow: 0 10px 30px rgba(17, 17, 17, 0.08);
        }

        .article-rich-content video,
        .article-rich-content iframe {
          display: block;
          width: 100%;
          max-width: 100%;
          border-radius: 1rem;
          margin: 1.5rem 0;
          object-fit: cover;
          box-shadow: 0 10px 30px rgba(17, 17, 17, 0.08);
        }

        .article-rich-content figure {
          margin: 1.5rem 0;
        }

        .article-rich-content .article-media--compact {
          max-width: 760px;
          margin: 1.5rem auto;
        }

        .article-rich-content .article-media--compact img {
          max-height: none;
          object-fit: contain;
        }

        .article-rich-content .article-media--compact video,
        .article-rich-content .article-media--compact iframe {
          max-height: 420px;
          object-fit: cover;
        }

        .article-rich-content figcaption {
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: #6B7280;
          text-align: center;
        }

        .article-rich-content figcaption:empty {
          display: none;
        }
      `}</style>
    </>
  );
}

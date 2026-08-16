interface ArticleBodyContentProps {
  content: string;
  className?: string;
}

export default function ArticleBodyContent({ content, className = '' }: ArticleBodyContentProps) {
  return (
    <>
      <div className={`article-rich-content ${className}`.trim()} dangerouslySetInnerHTML={{ __html: content || '<p>Texto em construção.</p>' }} />
      <style jsx global>{`
        .article-rich-content {
          color: #111827;
          font-size: 1.05rem;
          line-height: 1.9;
          letter-spacing: -0.01em;
        }

        .article-rich-content p,
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

        .article-rich-content img,
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

        .article-rich-content .article-media--compact img,
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

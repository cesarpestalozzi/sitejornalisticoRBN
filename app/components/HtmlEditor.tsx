'use client';

import {
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Underline,
  Video,
} from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import ArticleBodyContent from '@/app/components/ArticleBodyContent';

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function HtmlEditor({
  value,
  onChange,
  placeholder = 'Escreva a noticia...',
  minHeight = 320,
}: HtmlEditorProps) {
  const editorId = useId();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mediaModal, setMediaModal] = useState<{ open: boolean; kind: 'image' | 'video' | null; caption: string; sourceUrl: string; dataUrl: string; fileName: string }>({
    open: false,
    kind: null,
    caption: '',
    sourceUrl: '',
    dataUrl: '',
    fileName: '',
  });
  const previewContent = useMemo(() => value.trim() || '<p>Nenhum conteudo adicionado ainda.</p>', [value]);

  const updateValue = (nextValue: string, selectionStart?: number, selectionEnd?: number) => {
    onChange(nextValue);

    window.requestAnimationFrame(() => {
      if (!textAreaRef.current || selectionStart === undefined || selectionEnd === undefined) {
        return;
      }

      textAreaRef.current.focus();
      textAreaRef.current.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const wrapSelection = (before: string, after: string, fallback = 'texto') => {
    const textarea = textAreaRef.current;

    if (!textarea) {
      onChange(`${value}${before}${fallback}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end) || fallback;
    const nextValue = `${value.slice(0, start)}${before}${selectedText}${after}${value.slice(end)}`;
    const nextStart = start + before.length;
    const nextEnd = nextStart + selectedText.length;

    updateValue(nextValue, nextStart, nextEnd);
  };

  const insertBlock = (tag: 'p' | 'h2' | 'h3' | 'blockquote') => {
    wrapSelection(`<${tag}>`, `</${tag}>`, tag === 'blockquote' ? 'Citação' : 'Texto');
  };

  const insertList = (tag: 'ul' | 'ol') => {
    const textarea = textAreaRef.current;

    if (!textarea) {
      onChange(`${value}\n<${tag}><li>Item</li></${tag}>`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end).trim();
    const items = (selectedText || 'Item').split('\n').map((item) => item.trim()).filter(Boolean);
    const listHtml = `<${tag}>${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`;
    const nextValue = `${value.slice(0, start)}${listHtml}${value.slice(end)}`;

    updateValue(nextValue, start, start + listHtml.length);
  };

  const insertLink = () => {
    const url = window.prompt('Informe a URL do link', 'https://');

    if (!url) {
      return;
    }

    wrapSelection(`<a href="${url}" target="_blank" rel="noreferrer">`, '</a>', 'texto do link');
  };

  const clearFormatting = () => {
    onChange(stripHtml(value));
  };

  const insertMediaBlock = (kind: 'image' | 'video', src: string, caption: string) => {
    const textarea = textAreaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const normalizedCaption = caption.trim();
    const captionHtml = normalizedCaption ? `<figcaption>${normalizedCaption}</figcaption>` : '';
    const normalizedSrc = src.trim();
    const microsoftStreamEmbed = kind === 'video' && normalizedSrc
      ? (() => {
          const normalizedUrl = normalizedSrc.toLowerCase();
          if (normalizedUrl.includes('microsoftstream.com') || normalizedUrl.includes('stream.microsoft.com')) {
            const match = normalizedSrc.match(/\/video\/([^/?#]+)/i);
            if (match?.[1]) {
              return `<iframe src="https://web.microsoftstream.com/embed/video/${match[1]}" title="Vídeo Microsoft Stream" allow="autoplay; fullscreen" allowFullScreen></iframe>`;
            }
          }
          return null;
        })()
      : null;
    const mediaHtml = kind === 'image'
      ? `<figure class="article-media article-media--compact"><img src="${normalizedSrc}" alt="${normalizedCaption || 'Imagem da matéria'}" />${captionHtml}</figure>`
      : `<figure class="article-media article-media--compact">${microsoftStreamEmbed ?? `<video controls><source src="${normalizedSrc}" /></video>`}${captionHtml}</figure>`;
    const nextValue = `${value.slice(0, start)}\n\n${mediaHtml}\n\n${value.slice(end)}`;
    const nextCursor = start + mediaHtml.length + 4;

    onChange(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleMediaFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMediaModal((current) => ({ ...current, dataUrl: reader.result as string, fileName: file.name }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleInsertMedia = () => {
    const src = mediaModal.dataUrl || mediaModal.sourceUrl;
    if (!src) {
      return;
    }

    insertMediaBlock(mediaModal.kind ?? 'image', src, mediaModal.caption);
    setMediaModal({ open: false, kind: null, caption: '', sourceUrl: '', dataUrl: '', fileName: '' });
  };

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const insertion = '<br>\n';
    const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
    const nextCursor = start + insertion.length;

    onChange(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50 p-3">
        <ToolbarButton icon={Heading1} label="Titulo" onClick={() => insertBlock('h2')} />
        <ToolbarButton icon={Heading2} label="Subtitulo" onClick={() => insertBlock('h3')} />
        <ToolbarButton icon={Pilcrow} label="Paragrafo" onClick={() => insertBlock('p')} />
        <ToolbarButton icon={Bold} label="Negrito" onClick={() => wrapSelection('<strong>', '</strong>')} />
        <ToolbarButton icon={Italic} label="Italico" onClick={() => wrapSelection('<em>', '</em>')} />
        <ToolbarButton icon={Underline} label="Sublinhado" onClick={() => wrapSelection('<u>', '</u>')} />
        <ToolbarButton icon={List} label="Lista" onClick={() => insertList('ul')} />
        <ToolbarButton icon={ListOrdered} label="Lista numerada" onClick={() => insertList('ol')} />
        <ToolbarButton icon={Quote} label="Citacao" onClick={() => insertBlock('blockquote')} />
        <ToolbarButton icon={Image} label="Imagem" onClick={() => setMediaModal({ open: true, kind: 'image', caption: '', sourceUrl: '', dataUrl: '', fileName: '' })} />
        <ToolbarButton icon={Video} label="Video" onClick={() => setMediaModal({ open: true, kind: 'video', caption: '', sourceUrl: '', dataUrl: '', fileName: '' })} />
        <ToolbarButton icon={Link2} label="Link" onClick={insertLink} />
        <ToolbarButton icon={Eraser} label="Limpar" onClick={clearFormatting} />
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-gray-200 lg:border-b-0 lg:border-r">
          <label htmlFor={editorId} className="block border-b border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            HTML da noticia
          </label>
          <textarea
            id={editorId}
            ref={textAreaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder={placeholder}
            className="w-full resize-none px-4 py-4 font-mono text-sm text-gray-900 outline-none"
            style={{ minHeight }}
          />
        </div>

        <div>
          <div className="border-b border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Pré-visualização
          </div>
          <div className="px-4 py-4 text-gray-900" style={{ minHeight }}>
            <ArticleBodyContent content={previewContent} className="px-0 py-0" />
          </div>
        </div>
      </div>

      {mediaModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Inserir {mediaModal.kind === 'video' ? 'vídeo' : 'imagem'} na matéria</h3>
                <p className="text-sm text-gray-500">Adicione o conteúdo diretamente no corpo da notícia com descrição opcional.</p>
              </div>
              <button type="button" onClick={() => setMediaModal({ open: false, kind: null, caption: '', sourceUrl: '', dataUrl: '', fileName: '' })} className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900">
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Arquivo local</label>
                <input ref={fileInputRef} type="file" accept={mediaModal.kind === 'video' ? 'video/*' : 'image/*'} onChange={handleMediaFileSelection} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                {mediaModal.fileName && <p className="mt-2 text-xs text-gray-500">Arquivo selecionado: {mediaModal.fileName}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Ou informe uma URL</label>
                <input
                  type="url"
                  value={mediaModal.sourceUrl}
                  onChange={(event) => setMediaModal((current) => ({ ...current, sourceUrl: event.target.value }))}
                  placeholder={mediaModal.kind === 'video' ? 'https://exemplo.com/video.mp4' : 'https://exemplo.com/imagem.jpg'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#FF796C] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Descrição</label>
                <textarea
                  value={mediaModal.caption}
                  onChange={(event) => setMediaModal((current) => ({ ...current, caption: event.target.value }))}
                  rows={3}
                  placeholder="Descreva a imagem ou vídeo para o leitor"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#FF796C] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setMediaModal({ open: false, kind: null, caption: '', sourceUrl: '', dataUrl: '', fileName: '' })} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleInsertMedia} className="rounded-lg bg-[#FF796C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#f35f50]">
                Inserir no texto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ToolbarButtonProps {
  icon: typeof Bold;
  label: string;
  onClick: () => void;
}

function ToolbarButton({ icon: Icon, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-[#87CEEB] hover:bg-[#EAF8FD] hover:text-[#256B84]"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}


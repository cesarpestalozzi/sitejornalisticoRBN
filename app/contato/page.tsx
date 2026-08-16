'use client';

import { ArrowRight, Instagram, Mail, MessageCircle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '@/app/lib/settings';

function normalizeWhatsappNumber(value: string) {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function normalizeInstagramLink(value: string) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '#';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) { return trimmed; }
  const username = trimmed.replace(/^@/, '').replace(/\/+$/, '');
  return `https://instagram.com/${username}`;
}

export default function Contato() {
  const { getSettings } = useSettings();
  const [commercial, setCommercial] = useState({
    email: 'comercial@pznews.com.br',
    whatsapp: '5511999999999',
    instagram: '@pznews',
  });

  useEffect(() => {
    const syncCommercial = () => {
      const settings = getSettings();
      setCommercial({
        email: settings.commercial?.email || 'comercial@pznews.com.br',
        whatsapp: settings.commercial?.whatsapp || '5511999999999',
        instagram: settings.commercial?.instagram || '@pznews',
      });
    };

    syncCommercial();
    window.addEventListener('settingsChanged', syncCommercial);

    return () => window.removeEventListener('settingsChanged', syncCommercial);
  }, [getSettings]);

  const whatsappLink = useMemo(() => {
    const cleaned = normalizeWhatsappNumber(commercial.whatsapp);
    return cleaned ? `https://wa.me/${cleaned}` : '#';
  }, [commercial.whatsapp]);

  const instagramLink = useMemo(() => normalizeInstagramLink(commercial.instagram), [commercial.instagram]);
  const emailLink = useMemo(() => `mailto:${commercial.email}`, [commercial.email]);

  return (
    <main className="min-h-screen bg-[#f4f3f1] px-4 py-8 text-[#111111] sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[32px] border border-[#e9e4e1] bg-white shadow-[0_24px_75px_rgba(17,17,17,0.04)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#C40000] via-[#a80f17] to-[#e7b1b1]" />

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.3fr_0.7fr] lg:p-12">
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C40000]">AO PONTO BR</p>
              <h1 className="max-w-xl text-4xl font-light tracking-[-0.08em] text-[#111111] sm:text-5xl lg:text-7xl">
                Anuncie Conosco
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#4b4b4b] sm:text-lg">
                Conecte sua marca ao AO PONTO BR e alcance leitores que valorizam informação, contexto e credibilidade.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2d2d2d]">
                  Mídia editorial
                </span>
                <span className="rounded-full border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2d2d2d]">
                  Parcerias estratégicas
                </span>
                <span className="rounded-full border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2d2d2d]">
                  Campanhas digitais
                </span>
              </div>
            </div>

            <div className="flex items-end justify-end">
              <div className="flex w-full max-w-sm flex-col gap-4 rounded-[24px] border border-[#f0ece9] bg-[#faf7f4] p-5 shadow-[0_16px_45px_rgba(17,17,17,0.03)]">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#C40000]/10 text-[#C40000]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b6b6b]">Publicidade</p>
                  <h2 className="mt-2 text-2xl font-light tracking-[-0.05em] text-[#111111]">Conecte sua marca</h2>
                </div>
                <p className="text-sm leading-7 text-[#5b5b5b]">
                  Oferecemos espaço para marcas, produtos, campanhas institucionais e ações de impacto editorial.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[30px] border border-[#eceae8] bg-white p-6 shadow-[0_18px_55px_rgba(17,17,17,0.03)] sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C40000]">Publicidade</p>
            <h2 className="mt-3 text-3xl font-light tracking-[-0.06em] text-[#111111] sm:text-4xl">
              Conecte sua marca ao AO PONTO BR
            </h2>
            <p className="mt-4 text-base leading-8 text-[#4f4f4f] sm:text-lg">
              Quer divulgar sua empresa, produto, serviço, evento ou campanha no AO PONTO BR?
            </p>
            <p className="mt-2 text-base leading-8 text-[#4f4f4f]">
              Entre em contato com nossa equipe comercial para conhecer as possibilidades de publicidade e parcerias disponíveis.
            </p>
            <p className="mt-5 text-base leading-8 text-[#4f4f4f]">
              Estamos disponíveis pelos seguintes canais:
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <article className="rounded-[28px] border border-[#eae5e2] bg-white p-6 shadow-[0_18px_50px_rgba(17,17,17,0.025)] transition-transform duration-200 hover:-translate-y-1">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#C40000]/10 text-[#C40000]">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="mb-3 text-2xl font-light tracking-[-0.05em] text-[#111111]">E-mail</h3>
            <p className="mb-4 text-lg font-medium text-[#111111]">{commercial.email}</p>
            <p className="mb-6 text-sm leading-7 text-[#5d5d5d]">
              Fale diretamente com nossa equipe comercial para apresentar sua campanha, parceria ou proposta de anúncio.
            </p>
            <a
              href={emailLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#C40000] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#9d0000]"
            >
              Entrar em contato por e-mail
              <ArrowRight className="h-4 w-4" />
            </a>
          </article>

          <article className="rounded-[28px] border border-[#eae5e2] bg-white p-6 shadow-[0_18px_50px_rgba(17,17,17,0.025)] transition-transform duration-200 hover:-translate-y-1">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#12a55b]/10 text-[#12a55b]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="mb-3 text-2xl font-light tracking-[-0.05em] text-[#111111]">WhatsApp</h3>
            <p className="mb-4 text-lg font-medium text-[#111111]">{commercial.whatsapp}</p>
            <p className="mb-6 text-sm leading-7 text-[#5d5d5d]">
              Atendimento rápido para negociar campanhas, ações de marca e oportunidades de parceria editorial.
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#12a55b] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#0e8d4b]"
            >
              Falar pelo WhatsApp
              <ArrowRight className="h-4 w-4" />
            </a>
          </article>

          <article className="rounded-[28px] border border-[#eae5e2] bg-white p-6 shadow-[0_18px_50px_rgba(17,17,17,0.025)] transition-transform duration-200 hover:-translate-y-1">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#d12b76]/10 text-[#d12b76]">
              <Instagram className="h-5 w-5" />
            </div>
            <h3 className="mb-3 text-2xl font-light tracking-[-0.05em] text-[#111111]">Instagram</h3>
            <p className="mb-4 text-lg font-medium text-[#111111]">{commercial.instagram}</p>
            <p className="mb-6 text-sm leading-7 text-[#5d5d5d]">
              Converse direto com a equipe comercial pelo Instagram e saiba mais sobre campanhas e ações digitais.
            </p>
            <a
              href={instagramLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#d12b76] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#b71e60]"
            >
              Falar pelo Instagram
              <ArrowRight className="h-4 w-4" />
            </a>
          </article>
        </div>
      </div>
    </main>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSettings } from '@/app/lib/settings';

export default function Footer() {
  const { getSettings } = useSettings();
  const [settings, setSettings] = useState(getSettings());

  useEffect(() => {
    const syncSettings = () => setSettings(getSettings());
    syncSettings();
    window.addEventListener('settingsChanged', syncSettings);
    return () => window.removeEventListener('settingsChanged', syncSettings);
  }, [getSettings]);

  const logoSrc = settings.basic.footerLogo || settings.basic.logo || '/logo-oficial.png';
  const footerBackground = settings.visual.footerBackgroundColor || '#111111';
  const footerText = settings.visual.footerTextColor || '#FFFFFF';

  return (
    <footer id="top" className="text-gray-100" style={{ backgroundColor: footerBackground, color: footerText }}>
      <div className="text-white" style={{ backgroundColor: footerBackground, color: footerText }}>
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-5 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="flex items-center justify-center" aria-label="AO PONTO BR - Página inicial">
              <Image
                src={logoSrc}
                alt="AO PONTO BR"
                width={48}
                height={48}
                className="h-10 w-10 rounded-full border border-white/20 bg-white/5 object-cover shadow-sm sm:h-11 sm:w-11"
              />
            </Link>
          </div>

          <a
            href="/"
            className="pb-1 text-lg font-medium transition hover:opacity-90 sm:text-2xl lg:text-[28px] lg:leading-none"
            style={{ color: footerText }}
          >
            AO PONTO BR
          </a>
        </div>

        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10" style={{ color: footerText }}>
          <p className="text-base font-medium" style={{ color: footerText }}>
            © Copyright 2000-2026 AO PONTO BR. Todos os direitos reservados.
          </p>

          <nav aria-label="Rodapé institucional" className="flex flex-wrap items-center gap-3 text-base font-medium" style={{ color: footerText }}>
            <Link href="/quem-somos" className="transition hover:opacity-90" style={{ color: footerText }}>
              quem somos
            </Link>
            <span style={{ color: footerText, opacity: 0.7 }}>|</span>
            <Link href="/politica-editorial" className="transition hover:opacity-90" style={{ color: footerText }}>
              princípios editoriais
            </Link>
            <span style={{ color: footerText, opacity: 0.7 }}>|</span>
            <Link href="/privacidade" className="transition hover:opacity-90" style={{ color: footerText }}>
              política de privacidade
            </Link>
            <span style={{ color: footerText, opacity: 0.7 }}>|</span>
            <Link href="/termos" className="transition hover:opacity-90" style={{ color: footerText }}>
              termos de uso
            </Link>
            <span style={{ color: footerText, opacity: 0.7 }}>|</span>
            <Link href="/contato" className="transition hover:opacity-90" style={{ color: footerText }}>
              anúncio
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
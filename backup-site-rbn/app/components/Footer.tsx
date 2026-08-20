'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSettings } from '@/app/lib/settings';
import { useSettingsContext } from '@/app/contexts/SettingsContext';

export default function Footer() {
  const { getSettings } = useSettings();
  const { settings: contextSettings } = useSettingsContext();
  const [settings, setSettings] = useState(getSettings());

  useEffect(() => {
    const syncSettings = () => setSettings(getSettings());
    syncSettings();
    window.addEventListener('settingsChanged', syncSettings);
    return () => window.removeEventListener('settingsChanged', syncSettings);
  }, [getSettings]);

  const mergedSettings = contextSettings ?? settings;
  const logoSrc = mergedSettings.basic.footerLogo || mergedSettings.basic.logo || '/logo-oficial.png';
  const siteName = mergedSettings.basic.siteName || 'RBN';
  const footerBackground = mergedSettings.visual.footerBackgroundColor || '#111111';
  const footerText = mergedSettings.visual.footerTextColor || '#FFFFFF';
  const footerLinks = mergedSettings.basic.footerLinks && mergedSettings.basic.footerLinks.length > 0
    ? mergedSettings.basic.footerLinks
    : [
        { label: 'quem somos', href: '/quem-somos' },
        { label: 'princípios editoriais', href: '/politica-editorial' },
        { label: 'política de privacidade', href: '/privacidade' },
        { label: 'termos de uso', href: '/termos' },
        { label: 'anúncio', href: '/contato' },
      ];

  const quickLinks = [
    { label: 'Últimas notícias', href: '/' },
    { label: 'Política', href: '/categoria/politica' },
    { label: 'Brasil', href: '/categoria/brasil' },
    { label: 'Mundo', href: '/categoria/mundo' },
    { label: 'Economia', href: '/categoria/economia' },
    { label: 'Esportes', href: '/categoria/esportes' },
    { label: 'Cultura', href: '/categoria/cultura' },
    { label: 'Famosos', href: '/categoria/famosos' },
  ];

  const institutionalLinks = [
    { label: 'Quem Somos', href: '/quem-somos' },
    { label: 'Princípios Editoriais', href: '/politica-editorial' },
    { label: 'Expediente', href: '/quem-somos#expediente' },
    { label: 'Política de Privacidade', href: '/privacidade' },
    { label: 'Termos de Uso', href: '/termos' },
  ];

  const contactLinks = mergedSettings.basic.footerContactLinks && mergedSettings.basic.footerContactLinks.length > 0
    ? mergedSettings.basic.footerContactLinks
    : [
        { label: 'Redação', href: '/contato' },
        { label: 'Publicidade', href: '/contato' },
        { label: 'Assessoria de imprensa', href: '/contato' },
        { label: 'Denúncias / Sugestões', href: '/contato' },
      ];

  return (
    <footer id="top" className="text-gray-100" style={{ backgroundColor: footerBackground, color: footerText }}>
      <div className="text-white" style={{ backgroundColor: footerBackground, color: footerText }}>
        <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-3" aria-label={`${siteName} - Página inicial`}>
                <Image
                  src={logoSrc}
                  alt={siteName}
                  width={52}
                  height={52}
                  className="h-12 w-12 rounded-full border border-white/20 bg-white/5 object-cover shadow-sm"
                />
                <div>
                  <p className="text-xl font-semibold tracking-[-0.04em]" style={{ color: footerText }}>{siteName}</p>
                  <p className="text-sm uppercase tracking-[0.18em] text-white/70">Jornalismo • Informação • Entretenimento</p>
                </div>
              </Link>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Navegação</p>
              <ul className="mt-4 space-y-2 text-sm text-white/85">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Institucional</p>
              <ul className="mt-4 space-y-2 text-sm text-white/85">
                {institutionalLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Contato</p>
              <ul className="mt-4 space-y-2 text-sm text-white/85">
                {contactLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/15 pt-6 text-sm text-white/80">
            <p>© 2026 RBN — Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
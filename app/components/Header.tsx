'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Search, Bell } from 'lucide-react';
import { getCategoryDisplayName, normalizeCategorySlug } from '@/app/lib/categoryLabels';
import { useSettings } from '@/app/lib/settings';

const categories: string[] = [];

export default function Header() {
  const router = useRouter();
  const { getSettings } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState(getSettings());

  useEffect(() => {
    const syncSettings = () => setSettings(getSettings());
    syncSettings();
    window.addEventListener('settingsChanged', syncSettings);
    return () => window.removeEventListener('settingsChanged', syncSettings);
  }, [getSettings]);

  const primaryColor = settings.visual.primaryColor || '#991B1B';
  const secondaryColor = settings.visual.secondaryColor || '#111111';
  const logoSrc = settings.basic.logo || '/logo-oficial.png';
  const siteTagline = settings.basic.siteTagline || 'Jornalismo • Informação • Entretenimento';

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const query = searchQuery.trim();

    if (!query) {
      router.push('/pesquisa');
      return;
    }

    router.push(`/pesquisa?q=${encodeURIComponent(query)}`);
  };

  return (
    <>
      {/* Top Bar */}
      <div className="border-b border-gray-800 bg-[#111111]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1 text-[11px] text-gray-200 sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="transition hover:text-white">Facebook</a>
            <a href="#" className="transition hover:text-white">Twitter</a>
            <a href="#" className="transition hover:text-white">Instagram</a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-[0_1px_0_rgba(17,17,17,0.04)]">
        <div className="mx-auto max-w-7xl px-3 py-1 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="flex shrink-0 items-center justify-center" aria-label="RBN - Página inicial">
              <Image
                src={logoSrc}
                alt="RBN"
                width={160}
                height={56}
                priority
                className="h-7 w-auto max-w-[120px] object-contain sm:h-8 sm:max-w-[130px] lg:h-9"
              />
            </Link>

            <form onSubmit={handleSearch} className="mx-2 hidden flex-1 md:flex">
              <div className="relative w-full">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Pesquisar..."
                  aria-label="Pesquisar notícias"
                  className="w-full rounded-full border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 shadow-sm transition focus:border-[#991B1B] focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Buscar notícias"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white transition"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Abrir pesquisa"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="rounded-full p-1.5 hover:bg-gray-100 md:hidden"
              >
                <Search className="h-4 w-4" />
              </button>
              <button className="hidden rounded-full p-1.5 hover:bg-gray-100 md:inline-flex" aria-label="Notificações">
                <Bell className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-full p-1.5 hover:bg-gray-100 md:hidden"
              >
                {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pb-1 pt-1 md:pb-0">
            <div className="flex items-center justify-center md:ml-[148px] md:justify-start">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-600 sm:text-[10px] md:-mt-2 md:text-[11px]">
                {siteTagline}
              </p>
            </div>
          </div>

          {isSearchOpen && (
            <form onSubmit={handleSearch} className="mb-4 md:hidden">
              <div className="relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Pesquisar notícias..."
                  aria-label="Pesquisar notícias"
                  className="w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-[#991B1B] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Buscar notícias"
                  className="absolute right-2 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-white transition"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {categories.length > 0 && (
            <div className="overflow-x-auto pb-0.5">
              <div className="flex min-w-max gap-1">
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={`/categoria/${normalizeCategorySlug(category)}`}
                    className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-[#991B1B]/5 hover:text-[#991B1B]"
                    style={{ color: secondaryColor }}
                  >
                    {getCategoryDisplayName(category)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && categories.length > 0 && (
        <div className="md:hidden bg-white border-b border-gray-200 p-4 space-y-2 max-h-96 overflow-y-auto">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/categoria/${normalizeCategorySlug(category)}`}
              className="block rounded px-4 py-2 text-gray-700 transition hover:bg-[#991B1B]/5 hover:text-[#991B1B]"
            >
              {getCategoryDisplayName(category)}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}




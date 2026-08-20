'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { useSettings } from '@/app/lib/settings';

const COOKIE_KEY = 'pz_news_cookie_consent';
const COOKIE_TTL_MS = 1000 * 60 * 60 * 24 * 365;

function readStoredCookieConsent(): 'accepted' | 'rejected' | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const localValue = window.localStorage.getItem(COOKIE_KEY);
    if (localValue === 'accepted' || localValue === 'rejected') {
      return localValue;
    }

    const cookieValue = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith(`${COOKIE_KEY}=`));

    if (!cookieValue) {
      return null;
    }

    const rawValue = decodeURIComponent(cookieValue.split('=')[1] ?? '');
    if (rawValue === 'accepted' || rawValue === 'rejected') {
      return rawValue;
    }
  } catch {
    return null;
  }

  return null;
}

function persistCookieConsent(value: 'accepted' | 'rejected') {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(COOKIE_KEY, value);
  } catch {
    // localStorage pode ficar indisponível em alguns navegadores/ambientes.
  }

  const expires = new Date(Date.now() + COOKIE_TTL_MS).toUTCString();
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)}; path=/; max-age=${Math.floor(COOKIE_TTL_MS / 1000)}; expires=${expires}; SameSite=Lax`;
}

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { getSettings } = useSettings();
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;
  const [cookieConsent, setCookieConsent] = useState<'accepted' | 'rejected' | null>(null);

  useEffect(() => {
    setCookieConsent(readStoredCookieConsent());
  }, []);

  useEffect(() => {
    const { siteName, siteTagline } = getSettings().basic;
    const cleanTagline = siteTagline?.trim();
    document.title = cleanTagline ? `${siteName || 'RBN'} | ${cleanTagline}` : (siteName || 'RBN');
  }, [pathname, getSettings]);

  const acceptCookies = () => {
    persistCookieConsent('accepted');
    setCookieConsent('accepted');
  };

  const rejectCookies = () => {
    persistCookieConsent('rejected');
    setCookieConsent('rejected');
  };

  return (
    <>
      {!isAdminRoute && <Header />}
      <main className="flex-1">{children}</main>
      {!isAdminRoute && <Footer />}

      {!isAdminRoute && cookieConsent === null && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d9d2c4] bg-[#111111] px-4 py-4 shadow-[0_-12px_30px_rgba(17,17,17,0.2)] text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl text-sm leading-6 text-gray-200">
              <p className="font-medium text-white">
                Usamos cookies para melhorar sua experiência no site.
              </p>
              <p className="mt-1 text-gray-300">
                Você pode aceitar ou rejeitar. Saiba mais em nossa{' '}
                <Link href="/privacidade" className="font-semibold text-[#f7d7a8] underline decoration-[#f7d7a8]/70 underline-offset-2 hover:text-[#fff3d9]">
                  política de privacidade
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={rejectCookies}
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                Rejeitar
              </button>
              <button
                type="button"
                onClick={acceptCookies}
                className="inline-flex items-center justify-center rounded-full bg-[#991B1B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7f1d1d] focus:outline-none focus:ring-2 focus:ring-[#991B1B]/40"
              >
                Aceitar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

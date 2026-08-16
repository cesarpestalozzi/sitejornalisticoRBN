'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

const COOKIE_KEY = 'pz_news_cookie_consent';

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;
  const [cookieConsent, setCookieConsent] = useState<'accepted' | 'rejected' | null>(null);

  useEffect(() => {
    const storedConsent = window.localStorage.getItem(COOKIE_KEY);
    if (storedConsent === 'accepted' || storedConsent === 'rejected') {
      setCookieConsent(storedConsent);
      return;
    }
    setCookieConsent(null);
  }, []);

  const acceptCookies = () => {
    window.localStorage.setItem(COOKIE_KEY, 'accepted');
    setCookieConsent('accepted');
  };

  const rejectCookies = () => {
    window.localStorage.setItem(COOKIE_KEY, 'rejected');
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
                Para melhorar a sua experiência na plataforma e prover serviços personalizados, utilizamos cookies. Ao aceitar, você terá acesso a todas as funcionalidades do site.
              </p>
              <p className="mt-1 text-gray-300">
                Se clicar em {'"'}Rejeitar Cookies{'"'}, os cookies que não forem estritamente necessários serão desativados. Para escolher quais quer autorizar, clique em {'"'}Gerenciar cookies{'"'}. Saiba mais em nossa{' '}
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
                Rejeitar Cookies
              </button>
              <button
                type="button"
                onClick={acceptCookies}
                className="inline-flex items-center justify-center rounded-full bg-[#991B1B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7f1d1d] focus:outline-none focus:ring-2 focus:ring-[#991B1B]/40"
              >
                Aceitar
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                Gerenciar cookies
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

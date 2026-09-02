'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const standalone = Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone
    );
    setIsStandalone(standalone);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('Service worker do PWA não pôde ser registrado:', error);
      });
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (isStandalone || !visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-2xl border border-[#e5e7eb] bg-white/95 p-4 shadow-[0_18px_45px_rgba(17,17,17,0.16)] backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#991B1B] text-lg font-black text-white">R</div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">Instalar RBN Brasil</p>
          <p className="mt-1 text-xs leading-5 text-gray-600">Use o site como app no seu computador ou celular, sem perder as páginas e o conteúdo atual.</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#991B1B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7f1d1d]"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

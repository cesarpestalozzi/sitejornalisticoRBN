'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PageAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || typeof window === 'undefined') return;
    const key = `rbn_page_viewed_${pathname}`;
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: crypto.randomUUID(), eventType: 'page_view', occurredAt: new Date().toISOString(), metadata: { path: pathname } }),
      keepalive: true,
    }).catch((error) => console.warn('Falha ao registrar acesso:', error));
  }, [pathname]);

  return null;
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { canAccessAdminRoute, getCurrentAdminUser } from '@/app/lib/adminPermissions';

export default function AdminAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const user = getCurrentAdminUser();

    if (pathname === '/admin/login') {
      setAllowed(true);
      setReady(true);
      return;
    }

    if (!user) {
      router.replace('/admin/login');
      setAllowed(false);
      setReady(true);
      return;
    }

    setAllowed(canAccessAdminRoute(user, pathname));
    setReady(true);
  }, [pathname, router]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-100 p-8 text-sm text-gray-600">Carregando painel...</div>;
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-8">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-[#991B1B]" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Acesso negado</h1>
          <p className="mt-2 text-sm text-gray-600">Seu perfil não tem permissão para acessar esta área.</p>
          <Link href="/admin/dashboard" className="mt-6 inline-flex rounded-lg bg-[#111111] px-4 py-2 font-semibold text-white transition hover:bg-[#2a2a2a]">
            Ir para o painel
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

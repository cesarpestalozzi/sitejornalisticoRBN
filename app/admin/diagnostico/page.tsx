'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, TriangleAlert, XCircle } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';

type Check = { key: string; label: string; status: 'ok' | 'warning' | 'error'; detail: string; action?: string };

export default function DiagnosticsPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const run = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/diagnostics', { cache: 'no-store' });
      const data = await response.json() as { checks?: Check[] };
      setChecks(data.checks ?? []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void run(); }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div><h1 className="text-3xl font-bold text-gray-900">Diagnóstico e manutenção</h1><p className="mt-2 text-gray-600">Verificações reais do banco, usuários e conteúdo.</p></div>
            <button type="button" onClick={() => void run()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><RefreshCw className="h-4 w-4" />Verificar novamente</button>
          </div>
          <div className="grid gap-4">
            {checks.map((check) => {
              const Icon = check.status === 'ok' ? CheckCircle2 : check.status === 'warning' ? TriangleAlert : XCircle;
              const color = check.status === 'ok' ? 'text-green-600' : check.status === 'warning' ? 'text-amber-600' : 'text-red-600';
              return <section key={check.key} className="rounded-xl bg-white p-5 shadow-sm"><div className="flex gap-3"><Icon className={`mt-0.5 h-6 w-6 ${color}`} /><div><h2 className="font-bold text-gray-900">{check.label}</h2><p className="mt-1 text-sm text-gray-600">{check.detail}</p>{check.action && <p className="mt-2 text-xs font-semibold text-amber-700">Ação recomendada: {check.action}</p>}</div></div></section>;
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { getCurrentAdminUser } from '@/app/lib/adminPermissions';

type AccessRequest = { id: string; userId: string; userName: string; area: string; reason: string; status: string; createdAt: string };

export default function AccessRequestsPage() {
  const [items, setItems] = useState<AccessRequest[]>([]);
  const [error, setError] = useState('');
  const load = async () => {
    const user = getCurrentAdminUser();
    const response = await fetch('/api/admin/access-requests', { headers: { 'x-admin-user-id': user?.id ?? '' }, cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar solicitações.');
    setItems(data.requests ?? []);
  };
  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Erro ao carregar solicitações.')); }, []);
  const decide = async (item: AccessRequest, decision: 'approved' | 'denied' | 'revoked') => {
    const user = getCurrentAdminUser();
    const response = await fetch('/api/admin/access-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-user-id': user?.id ?? '' }, body: JSON.stringify({ userId: item.userId, requestId: item.id, decision }) });
    if (!response.ok) { const data = await response.json(); setError(data.error || 'Não foi possível concluir a decisão.'); return; }
    await load();
  };
  return <div className="flex min-h-screen bg-gray-100"><AdminSidebar /><main className="flex-1 p-6"><h1 className="text-2xl font-bold">Solicitações de acesso</h1>{error && <p className="mt-4 rounded bg-red-100 p-3 text-red-800">{error}</p>}<div className="mt-6 space-y-3">{items.map((item) => <div key={item.id} className="rounded-lg bg-white p-4 shadow"><div className="flex flex-wrap justify-between gap-3"><div><strong>{item.userName}</strong><p className="text-sm text-gray-600">{item.area} · {item.status}</p><p className="text-sm">{item.reason}</p></div>{item.status === 'pending' && <div className="flex gap-2"><button className="rounded bg-green-700 px-3 py-2 text-white" onClick={() => void decide(item, 'approved')}>Aprovar</button><button className="rounded bg-red-700 px-3 py-2 text-white" onClick={() => void decide(item, 'denied')}>Negar</button></div>}</div></div>)}</div></main></div>;
}

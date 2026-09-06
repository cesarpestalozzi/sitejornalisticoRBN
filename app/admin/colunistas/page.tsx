'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useArticles } from '@/app/hooks/useArticles';
import { useUsers } from '@/app/hooks/useUsers';

export default function ColumnistsPage() {
  const { users, updateUser, isLoaded } = useUsers();
  const { articles } = useArticles();
  const [selectedId, setSelectedId] = useState('');
  const columnist = users.find((user) => user.id === selectedId);
  const columnists = useMemo(() => users.filter((user) => user.status === 'ativo' && user.isColumnist), [users]);
  const authored = columnist ? articles.filter((article) => article.status === 'publicado' && (article.authorUserIds ?? []).includes(columnist.id)) : [];
  const [form, setForm] = useState({ bio: '', professionalInfo: '', columnistSlug: '', avatar: '' });

  const select = (id: string) => {
    const user = users.find((item) => item.id === id);
    setSelectedId(id);
    setForm({ bio: user?.bio ?? '', professionalInfo: user?.professionalInfo ?? user?.specialization ?? '', columnistSlug: user?.columnistSlug ?? '', avatar: user?.avatar ?? '' });
  };

  const save = async () => {
    if (!columnist) return;
    await updateUser(columnist.id, { isColumnist: true, ...form });
    window.alert('Perfil de colunista salvo.');
  };

  if (!isLoaded) return <div className="p-8">Carregando colunistas...</div>;
  return <div className="flex min-h-screen bg-gray-100"><AdminSidebar /><main className="flex-1 p-6 lg:p-10"><div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-bold text-gray-900">Colunistas</h1>
    <p className="mt-2 text-gray-600">Gerencie perfis públicos e o histórico editorial.</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-[280px,1fr]">
      <section className="rounded-xl bg-white p-4 shadow-sm"><h2 className="font-bold">Perfis ativos</h2>{columnists.map((user) => <button type="button" key={user.id} onClick={() => select(user.id)} className={`mt-2 block w-full rounded-lg px-3 py-2 text-left ${selectedId === user.id ? 'bg-[#991B1B] text-white' : 'bg-gray-50'}`}>{user.name}</button>)}{columnists.length === 0 && <p className="mt-3 text-sm text-gray-500">Nenhum colunista cadastrado.</p>}</section>
      <section className="rounded-xl bg-white p-6 shadow-sm">{columnist ? <><div className="flex items-center gap-4"><img src={form.avatar || '/logo-oficial.png'} alt="" className="h-20 w-20 rounded-full object-cover" /><div><h2 className="text-2xl font-bold">{columnist.name}</h2><Link className="text-sm text-[#991B1B]" href={`/colunistas/${form.columnistSlug || columnist.id}`}>Ver perfil público</Link></div></div><div className="mt-6 grid gap-4"><label className="text-sm font-semibold">Foto (URL)<input className="mt-1 w-full rounded border p-2" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} /></label><label className="text-sm font-semibold">Slug público<input className="mt-1 w-full rounded border p-2" value={form.columnistSlug} onChange={(e) => setForm({ ...form, columnistSlug: e.target.value })} /></label><label className="text-sm font-semibold">Biografia<textarea className="mt-1 w-full rounded border p-2" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label><label className="text-sm font-semibold">Informações profissionais<textarea className="mt-1 w-full rounded border p-2" rows={3} value={form.professionalInfo} onChange={(e) => setForm({ ...form, professionalInfo: e.target.value })} /></label><button type="button" onClick={() => void save()} className="rounded bg-[#991B1B] px-4 py-3 font-semibold text-white">Salvar perfil</button></div><h3 className="mt-8 text-lg font-bold">Matérias publicadas ({authored.length})</h3><ul className="mt-3 space-y-2">{authored.map((article) => <li key={article.id}><Link className="text-[#991B1B] hover:underline" href={`/artigo/${article.id}`}>{article.title}</Link></li>)}</ul></> : <p className="text-gray-500">Selecione um usuário marcado como colunista no cadastro de usuários.</p>}</section>
    </div>
  </div></main></div>;
}

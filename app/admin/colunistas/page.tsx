'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useArticles } from '@/app/hooks/useArticles';
import { useUsers } from '@/app/hooks/useUsers';

type EditorialForm = {
  publicName: string;
  avatar: string;
  bio: string;
  professionalInfo: string;
  publicRole: string;
  expertise: string;
  location: string;
  publicEmail: string;
  publicEmailAuthorized: boolean;
  website: string;
  columnistSlug: string;
  profileVisible: boolean;
};

const emptyForm: EditorialForm = {
  publicName: '',
  avatar: '',
  bio: '',
  professionalInfo: '',
  publicRole: '',
  expertise: '',
  location: '',
  publicEmail: '',
  publicEmailAuthorized: false,
  website: '',
  columnistSlug: '',
  profileVisible: true,
};

function formFromUser(user: ReturnType<typeof useUsers>['users'][number]): EditorialForm {
  return {
    publicName: user.publicName ?? '',
    avatar: user.avatar ?? '',
    bio: user.bio ?? '',
    professionalInfo: user.professionalInfo ?? '',
    publicRole: user.publicRole ?? '',
    expertise: user.expertise ?? user.specialization ?? '',
    location: user.location ?? '',
    publicEmail: user.publicEmail ?? '',
    publicEmailAuthorized: Boolean(user.publicEmailAuthorized),
    website: user.website ?? '',
    columnistSlug: user.columnistSlug ?? '',
    profileVisible: user.profileVisible !== false,
  };
}

export default function ColumnistsPage() {
  const { users, updateUser, isLoaded } = useUsers();
  const { articles } = useArticles();
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<EditorialForm>(emptyForm);
  const [message, setMessage] = useState('');
  const selected = users.find((user) => user.id === selectedId);

  const availableUsers = useMemo(() => users
    .filter((user) => user.status !== 'removido')
    .filter((user) => `${user.name} ${user.login} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((left, right) => Number(Boolean(right.isColumnist)) - Number(Boolean(left.isColumnist)) || left.name.localeCompare(right.name)), [users, search]);
  const authored = selected ? articles.filter((article) => article.status === 'publicado' && (article.authorUserIds ?? []).includes(selected.id)) : [];

  const select = (id: string) => {
    const user = users.find((item) => item.id === id);
    if (!user) return;
    setSelectedId(id);
    setForm(formFromUser(user));
    setMessage('');
  };

  const save = async () => {
    if (!selected) return;
    try {
      await updateUser(selected.id, { isColumnist: true, ...form });
      setMessage('Perfil editorial salvo no mesmo cadastro de usuário.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.');
    }
  };

  const unlink = async () => {
    if (!selected || !window.confirm('Remover somente o vínculo de colunista? O usuário e as matérias serão preservados.')) return;
    try {
      await updateUser(selected.id, { isColumnist: false, profileVisible: false });
      setMessage('Vínculo removido. O usuário continua cadastrado.');
      setForm((current) => ({ ...current, profileVisible: false }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível remover o vínculo.');
    }
  };

  if (!isLoaded) return <div className="p-8">Carregando usuários...</div>;
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-10">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900">Colunistas</h1>
          <p className="mt-2 text-gray-600">Os colunistas são usuários existentes. O perfil editorial usa o mesmo ID, login e histórico.</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[340px,1fr]">
            <section className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="font-bold">Adicionar ou localizar usuário</h2>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, login ou e-mail" className="mt-3 w-full rounded border p-2 text-sm" />
              <div className="mt-4 max-h-[620px] space-y-2 overflow-auto">
                {availableUsers.map((user) => (
                  <button type="button" key={user.id} onClick={() => select(user.id)} className={`block w-full rounded-lg px-3 py-3 text-left ${selectedId === user.id ? 'bg-[#991B1B] text-white' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    <span className="block font-semibold">{user.name}</span>
                    <span className={`block text-xs ${selectedId === user.id ? 'text-red-100' : 'text-gray-500'}`}>{user.login} {user.isColumnist ? '• colunista vinculado' : '• disponível'}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-xl bg-white p-6 shadow-sm">
              {!selected ? <p className="text-gray-500">Selecione um usuário para vincular ou editar o perfil editorial.</p> : (
                <>
                  <div className="flex flex-wrap items-center gap-4 border-b pb-5">
                    <img src={form.avatar || selected.avatar || '/logo-oficial.png'} alt="" className="h-20 w-20 rounded-full object-cover" />
                    <div><h2 className="text-2xl font-bold">{form.publicName || selected.name}</h2><p className="text-sm text-gray-500">Usuário: {selected.name} · ID preservado: {selected.id}</p>{selected.isColumnist && form.profileVisible && <Link className="text-sm text-[#991B1B]" href={`/colunistas/${form.columnistSlug || selected.id}`}>Ver perfil público</Link>}</div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold">Nome público<input className="mt-1 w-full rounded border p-2" placeholder={selected.name} value={form.publicName} onChange={(e) => setForm({ ...form, publicName: e.target.value })} /></label>
                    <label className="text-sm font-semibold">Foto do perfil (URL)<input className="mt-1 w-full rounded border p-2" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} /></label>
                    <label className="text-sm font-semibold">Slug público<input className="mt-1 w-full rounded border p-2" value={form.columnistSlug} onChange={(e) => setForm({ ...form, columnistSlug: e.target.value })} /></label>
                    <label className="text-sm font-semibold">Cargo ou função<input className="mt-1 w-full rounded border p-2" value={form.publicRole} onChange={(e) => setForm({ ...form, publicRole: e.target.value })} /></label>
                    <label className="text-sm font-semibold">Especialidade<input className="mt-1 w-full rounded border p-2" value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} /></label>
                    <label className="text-sm font-semibold">Cidade ou região<input className="mt-1 w-full rounded border p-2" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
                    <label className="text-sm font-semibold md:col-span-2">Biografia<textarea className="mt-1 w-full rounded border p-2" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
                    <label className="text-sm font-semibold md:col-span-2">Apresentação profissional<textarea className="mt-1 w-full rounded border p-2" rows={3} value={form.professionalInfo} onChange={(e) => setForm({ ...form, professionalInfo: e.target.value })} /></label>
                    <label className="text-sm font-semibold">Site pessoal<input className="mt-1 w-full rounded border p-2" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
                    <label className="text-sm font-semibold">E-mail público autorizado<input className="mt-1 w-full rounded border p-2" value={form.publicEmail} onChange={(e) => setForm({ ...form, publicEmail: e.target.value })} /></label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <label><input type="checkbox" checked={form.profileVisible} onChange={(e) => setForm({ ...form, profileVisible: e.target.checked })} /> Exibir perfil no site</label>
                    <label><input type="checkbox" checked={form.publicEmailAuthorized} onChange={(e) => setForm({ ...form, publicEmailAuthorized: e.target.checked })} /> Autorizar e-mail público</label>
                  </div>
                  {message && <p className="mt-4 rounded bg-gray-50 p-3 text-sm text-gray-700">{message}</p>}
                  <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void save()} className="rounded bg-[#991B1B] px-4 py-3 font-semibold text-white">Vincular e salvar perfil</button>{selected.isColumnist && <button type="button" onClick={() => void unlink()} className="rounded border border-gray-300 px-4 py-3 font-semibold text-gray-700">Remover vínculo</button>}</div>
                  <h3 className="mt-8 text-lg font-bold">Matérias publicadas ({authored.length})</h3>
                  <ul className="mt-3 space-y-2">{authored.map((article) => <li key={article.id}><Link className="text-[#991B1B] hover:underline" href={`/artigo/${article.id}`}>{article.title}</Link></li>)}</ul>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

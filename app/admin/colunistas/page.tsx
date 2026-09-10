'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useArticles } from '@/app/hooks/useArticles';
import { getArticleHref } from '@/app/lib/articleSlug';
import { ColumnistCanvasElement, ColumnistCanvasLayout, useUsers } from '@/app/hooks/useUsers';

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

function canvasFromUser(user: ReturnType<typeof useUsers>['users'][number]): ColumnistCanvasLayout {
  const name = user.publicName || user.name;
  return user.columnistCanvas ?? {
    background: '#f7f7f7',
    elements: [
      { id: 'logo', label: 'Logo RBN', kind: 'logo', content: '/logo-oficial.png', x: 235, y: 20, width: 130, height: 48, rotation: 0, opacity: 1, color: '#000000' },
      { id: 'section', label: 'COLUNISTA', kind: 'text', content: 'COLUNISTA', x: 28, y: 72, width: 190, height: 34, rotation: 0, opacity: 1, color: '#666666', fontSize: 16, fontWeight: '700', fontFamily: 'Arial' },
      { id: 'name', label: 'Nome', kind: 'text', content: name, x: 28, y: 108, width: 270, height: 52, rotation: 0, opacity: 1, color: '#E11A1A', fontSize: 30, fontWeight: '700', fontFamily: 'Arial' },
      { id: 'photo', label: 'Foto', kind: 'image', content: user.avatar || '', x: 470, y: 24, width: 92, height: 92, rotation: 0, opacity: 1, color: '#ffffff', circular: true, borderWidth: 4, shadow: true },
    ],
  };
}

export default function ColumnistsPage() {
  const { users, updateUser, isLoaded } = useUsers();
  const { articles } = useArticles();
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<EditorialForm>(emptyForm);
  const [message, setMessage] = useState('');
  const [canvas, setCanvas] = useState<ColumnistCanvasLayout | null>(null);
  const [selectedElementId, setSelectedElementId] = useState('name');
  const [history, setHistory] = useState<ColumnistCanvasLayout[]>([]);
  const [future, setFuture] = useState<ColumnistCanvasLayout[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const selected = users.find((user) => user.id === selectedId);
  const selectedElement = canvas?.elements.find((element) => element.id === selectedElementId);

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
    const nextCanvas = canvasFromUser(user);
    setCanvas(nextCanvas);
    setHistory([]);
    setFuture([]);
    setSelectedElementId(nextCanvas.elements[2]?.id || nextCanvas.elements[0]?.id || '');
    setMessage('');
  };

  const updateCanvas = (mutate: (current: ColumnistCanvasLayout) => ColumnistCanvasLayout) => {
    setCanvas((current) => {
      if (!current) return current;
      const next = mutate(current);
      setHistory((items) => [...items.slice(-19), current]);
      setFuture([]);
      return next;
    });
  };

  const updateElement = (updates: Partial<ColumnistCanvasElement>) => {
    if (!selectedElement) return;
    updateCanvas((current) => ({ ...current, elements: current.elements.map((element) => element.id === selectedElement.id ? { ...element, ...updates } : element) }));
  };

  const moveElement = (event: ReactPointerEvent<HTMLDivElement>, element: ColumnistCanvasElement) => {
    if (element.locked || !canvasRef.current) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = element.x;
    const initialY = element.y;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / 600;
    const move = (moveEvent: PointerEvent) => updateCanvas((current) => ({
      ...current,
      elements: current.elements.map((item) => item.id === element.id
        ? { ...item, x: Math.max(0, Math.min(600 - item.width, initialX + (moveEvent.clientX - startX) / scale)), y: Math.max(0, Math.min(360 - item.height, initialY + (moveEvent.clientY - startY) / scale)) }
        : item),
    }));
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous || !canvas) return;
    setFuture((items) => [canvas, ...items]);
    setCanvas(previous);
    setHistory((items) => items.slice(0, -1));
  };

  const redo = () => {
    const next = future[0];
    if (!next || !canvas) return;
    setHistory((items) => [...items, canvas]);
    setCanvas(next);
    setFuture((items) => items.slice(1));
  };

  const reorderElement = (id: string, direction: -1 | 1) => {
    updateCanvas((current) => {
      const index = current.elements.findIndex((element) => element.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.elements.length) return current;
      const elements = [...current.elements];
      [elements[index], elements[target]] = [elements[target], elements[index]];
      return { ...current, elements };
    });
  };

  const duplicateElement = (element: ColumnistCanvasElement) => {
    const copy = { ...element, id: `${element.id}-${Date.now()}`, label: `${element.label} (cópia)`, x: Math.min(600 - element.width, element.x + 12), y: Math.min(360 - element.height, element.y + 12) };
    updateCanvas((current) => ({ ...current, elements: [...current.elements, copy] }));
    setSelectedElementId(copy.id);
  };

  const handleCanvasImageUpload = (file: File | undefined) => {
    if (!file || !selectedElement || selectedElement.kind !== 'image') return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setMessage('Selecione uma imagem de até 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateElement({ content: String(reader.result ?? '') });
    reader.onerror = () => setMessage('Não foi possível ler a imagem selecionada.');
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!selected) return;
    try {
      await updateUser(selected.id, { isColumnist: true, ...form, columnistCanvas: canvas ?? canvasFromUser(selected) });
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

  const handlePhotoUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('A foto deve ter no máximo 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, avatar: String(reader.result ?? '') }));
    reader.onerror = () => setMessage('Não foi possível ler a foto selecionada.');
    reader.readAsDataURL(file);
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
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                      <h2 className="text-lg font-bold">Editor visual do cabeçalho</h2>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button type="button" onClick={undo} disabled={!history.length} className="rounded border bg-white px-2 py-1 disabled:opacity-40">Desfazer</button>
                        <button type="button" onClick={redo} disabled={!future.length} className="rounded border bg-white px-2 py-1 disabled:opacity-40">Refazer</button>
                        <button type="button" onClick={() => setSelectedElementId('')} className="rounded border bg-white px-2 py-1">Visualizar</button>
                        <button type="button" onClick={() => void save()} className="rounded bg-[#991B1B] px-3 py-1 font-semibold text-white">Salvar</button>
                      </div>
                    </div>
                    {canvas && (
                      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                        <div>
                          <div className="mb-2 flex flex-wrap gap-1 text-xs">
                            {[
                              ['left', '← Esquerda'], ['center', '↔ Centro'], ['right', '→ Direita'],
                              ['top', '↑ Topo'], ['bottom', '↓ Base'],
                            ].map(([alignment, label]) => (
                              <button key={alignment} type="button" className="rounded border bg-white px-2 py-1" onClick={() => {
                                if (!selectedElement) return;
                                const updates = alignment === 'left' ? { x: 0 } : alignment === 'center' ? { x: (600 - selectedElement.width) / 2 } : alignment === 'right' ? { x: 600 - selectedElement.width } : alignment === 'top' ? { y: 0 } : { y: 360 - selectedElement.height };
                                updateElement(updates);
                              }}>{label}</button>
                            ))}
                          </div>
                          <div ref={canvasRef} className="relative aspect-[5/3] w-full max-w-[600px] overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-[#f7f7f7]" style={{ background: canvas.background }}>
                            {canvas.elements.map((element) => element.hidden ? null : (
                              <div
                                key={element.id}
                                role="button"
                                tabIndex={0}
                                onPointerDown={(event) => { event.stopPropagation(); setSelectedElementId(element.id); moveElement(event, element); }}
                                onClick={() => setSelectedElementId(element.id)}
                                className={`absolute cursor-move overflow-hidden ${selectedElementId === element.id ? 'z-20 ring-2 ring-[#991B1B] ring-offset-1' : 'z-10'}`}
                                style={{ left: `${element.x / 6}%`, top: `${element.y / 3.6}%`, width: `${element.width / 6}%`, height: `${element.height / 3.6}%`, opacity: element.opacity, transform: `rotate(${element.rotation}deg)`, color: element.color, fontFamily: element.fontFamily, fontSize: `${element.fontSize || 16}px`, fontWeight: element.fontWeight, borderRadius: element.circular ? '9999px' : '0', border: element.borderWidth ? `${element.borderWidth}px solid ${element.color}` : undefined, boxShadow: element.shadow ? '0 3px 10px #0004' : undefined }}
                              >
                                {element.kind === 'text' ? <span className="flex h-full w-full items-center whitespace-pre-wrap">{element.content}</span> : element.content ? <img src={element.content} alt={element.label} className="h-full w-full object-contain" /> : <span className="flex h-full w-full items-center justify-center bg-gray-200 text-xs text-gray-500">Sem foto</span>}
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-gray-500">Clique e arraste qualquer elemento diretamente na prévia para reposicioná-lo.</p>
                        </div>
                        <div className="rounded-lg border bg-white p-3">
                          <h3 className="font-bold">Propriedades</h3>
                          {selectedElement ? (
                            <div className="mt-3 space-y-2 text-xs">
                              <p className="font-semibold uppercase text-gray-500">{selectedElement.label}</p>
                              {selectedElement.kind === 'text' && <label className="block">Conteúdo<input className="mt-1 w-full rounded border p-1.5" value={selectedElement.content} onChange={(event) => updateElement({ content: event.target.value })} /></label>}
                              {selectedElement.kind === 'image' && <><label className="block">Imagem<input className="mt-1 w-full rounded border p-1.5" value={selectedElement.content} onChange={(event) => updateElement({ content: event.target.value })} /></label><label className="block">Substituir imagem<input type="file" accept="image/*" className="mt-1 w-full text-xs" onChange={(event) => handleCanvasImageUpload(event.target.files?.[0])} /></label></>}
                              <div className="grid grid-cols-2 gap-2">
                                <label>Largura<input type="number" className="mt-1 w-full rounded border p-1.5" value={selectedElement.width} onChange={(event) => updateElement({ width: Math.max(10, Number(event.target.value)) })} /></label>
                                <label>Altura<input type="number" className="mt-1 w-full rounded border p-1.5" value={selectedElement.height} onChange={(event) => updateElement({ height: Math.max(10, Number(event.target.value)) })} /></label>
                                <label>Posição X<input type="number" className="mt-1 w-full rounded border p-1.5" value={selectedElement.x} onChange={(event) => updateElement({ x: Number(event.target.value) })} /></label>
                                <label>Posição Y<input type="number" className="mt-1 w-full rounded border p-1.5" value={selectedElement.y} onChange={(event) => updateElement({ y: Number(event.target.value) })} /></label>
                                <label>Rotação<input type="number" className="mt-1 w-full rounded border p-1.5" value={selectedElement.rotation} onChange={(event) => updateElement({ rotation: Number(event.target.value) })} /></label>
                                <label>Opacidade<input type="number" min="0" max="1" step="0.05" className="mt-1 w-full rounded border p-1.5" value={selectedElement.opacity} onChange={(event) => updateElement({ opacity: Number(event.target.value) })} /></label>
                              </div>
                              {selectedElement.kind !== 'logo' && <label className="flex items-center gap-2">Cor<input type="color" value={selectedElement.color} onChange={(event) => updateElement({ color: event.target.value })} /></label>}
                              {selectedElement.kind === 'text' && <div className="grid grid-cols-2 gap-2"><label>Tamanho<input type="number" className="mt-1 w-full rounded border p-1.5" value={selectedElement.fontSize || 16} onChange={(event) => updateElement({ fontSize: Number(event.target.value) })} /></label><label>Peso<select className="mt-1 w-full rounded border p-1.5" value={selectedElement.fontWeight || '400'} onChange={(event) => updateElement({ fontWeight: event.target.value })}><option value="400">Normal</option><option value="700">Negrito</option></select></label><label className="col-span-2">Fonte<select className="mt-1 w-full rounded border p-1.5" value={selectedElement.fontFamily || 'Arial'} onChange={(event) => updateElement({ fontFamily: event.target.value })}><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Tahoma</option></select></label></div>}
                              {selectedElement.kind === 'image' && <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(selectedElement.circular)} onChange={(event) => updateElement({ circular: event.target.checked })} /> Formato circular</label>}
                              <div className="flex flex-wrap gap-2 pt-1"><button type="button" className="rounded border px-2 py-1" onClick={() => updateElement({ locked: !selectedElement.locked })}>{selectedElement.locked ? 'Desbloquear' : 'Bloquear'}</button><button type="button" className="rounded border px-2 py-1" onClick={() => updateElement({ hidden: true })}>Ocultar</button><button type="button" className="rounded border border-red-200 px-2 py-1 text-red-700" onClick={() => updateCanvas((current) => ({ ...current, elements: current.elements.filter((item) => item.id !== selectedElement.id) }))}>Excluir</button></div>
                            </div>
                          ) : <p className="mt-3 text-xs text-gray-500">Modo visualização. Selecione um elemento para editar.</p>}
                          <label className="mt-4 block border-t pt-3 text-xs font-semibold">Cor do fundo<input type="color" className="ml-2 h-7 w-10 align-middle" value={canvas.background} onChange={(event) => updateCanvas((current) => ({ ...current, background: event.target.value }))} /></label>
                          <h3 className="mt-5 border-t pt-3 font-bold">Camadas</h3>
                          <div className="mt-2 space-y-1">{[...(canvas.elements)].reverse().map((element, index, layers) => <div key={element.id} className={`rounded px-2 py-1 text-xs ${selectedElementId === element.id ? 'bg-red-50 text-[#991B1B]' : 'hover:bg-gray-50'}`}><div className="flex items-center justify-between gap-2"><button type="button" onClick={() => setSelectedElementId(element.id)} className="min-w-0 flex-1 truncate text-left">{element.label}</button><span>{element.hidden ? 'oculta' : element.locked ? 'bloqueada' : `#${layers.length - index}`}</span></div><div className="mt-1 flex gap-1"><button type="button" className="rounded border px-1" onClick={() => reorderElement(element.id, 1)} aria-label={`Subir ${element.label}`}>↑</button><button type="button" className="rounded border px-1" onClick={() => reorderElement(element.id, -1)} aria-label={`Descer ${element.label}`}>↓</button><button type="button" className="rounded border px-1" onClick={() => duplicateElement(element)}>Duplicar</button></div></div>)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-4 border-b pb-5">
                    <img src={form.avatar || selected.avatar || '/logo-oficial.png'} alt="" className="h-20 w-20 rounded-full object-cover" />
                    <div><h2 className="text-2xl font-bold">{form.publicName || selected.name}</h2><p className="text-sm text-gray-500">Usuário: {selected.name} · ID preservado: {selected.id}</p>{selected.isColumnist && form.profileVisible && <Link className="text-sm text-[#991B1B]" href={`/colunistas/${form.columnistSlug || selected.id}`}>Ver perfil público</Link>}</div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold">Nome público<input className="mt-1 w-full rounded border p-2" placeholder={selected.name} value={form.publicName} onChange={(e) => setForm({ ...form, publicName: e.target.value })} /></label>
                    <label className="text-sm font-semibold">Foto do perfil
                      <input className="mt-1 w-full rounded border p-2" type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e.target.files?.[0])} />
                      <input className="mt-2 w-full rounded border p-2 font-normal" placeholder="Ou cole a URL da foto" value={form.avatar.startsWith('data:') ? '' : form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} />
                    </label>
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
                  <ul className="mt-3 space-y-2">{authored.map((article) => <li key={article.id}><Link className="text-[#991B1B] hover:underline" href={getArticleHref(article)}>{article.title}</Link></li>)}</ul>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

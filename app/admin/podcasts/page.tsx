'use client';

import { useMemo, useState } from 'react';
import { Pencil, PlayCircle, Plus, PauseCircle, Save, Trash2 } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { usePodcasts } from '@/app/hooks/usePodcasts';
import { useSettings } from '@/app/lib/settings';

const emptyForm = {
  title: '',
  description: '',
  image: '',
  audioUrl: '',
  status: 'rascunho' as 'rascunho' | 'publicado',
  episode: 1,
  duration: 20,
};

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível carregar o arquivo.'));
    reader.readAsDataURL(file);
  });
}

export default function AdminPodcastsPage() {
  const { episodes, addEpisode, updateEpisode, deleteEpisode, isLoaded } = usePodcasts();
  const { getSettings, saveSettings } = useSettings();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showOnHomepage, setShowOnHomepage] = useState<boolean>(getSettings().content.showPodcastsOnHomepage ?? false);

  const publishedCount = useMemo(() => episodes.filter((episode) => episode.status === 'publicado').length, [episodes]);

  const handleChange = (field: keyof typeof emptyForm, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileUpload = async (field: 'image' | 'audioUrl', file?: File | null) => {
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((current) => ({ ...current, [field]: dataUrl }));
    } catch {
      window.alert('Não foi possível carregar o arquivo selecionado.');
    }
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      window.alert('Adicione um título para o episódio.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image.trim() || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=630&fit=crop',
      audioUrl: form.audioUrl.trim(),
      status: form.status,
      episode: Number(form.episode) || 1,
      duration: Number(form.duration) || 20,
    };

    if (editingId) {
      updateEpisode(editingId, payload);
    } else {
      addEpisode(payload);
    }

    setForm(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (id: string) => {
    const episode = episodes.find((item) => item.id === id);
    if (!episode) return;

    setEditingId(id);
    setForm({
      title: episode.title,
      description: episode.description,
      image: episode.image,
      audioUrl: episode.audioUrl,
      status: episode.status,
      episode: episode.episode,
      duration: episode.duration,
    });
  };

  const handleToggleHomepage = () => {
    const settings = getSettings();
    const next = !settings.content.showPodcastsOnHomepage;
    const updated = {
      ...settings,
      content: {
        ...settings.content,
        showPodcastsOnHomepage: next,
      },
    };
    saveSettings(updated);
    setShowOnHomepage(next);
  };

  const toggleStatus = (id: string, status: 'rascunho' | 'publicado') => {
    updateEpisode(id, { status });
  };

  if (!isLoaded) {
    return <div className="p-6 text-sm text-gray-600">Carregando podcasts...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#991B1B]">Podcast</p>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Gerenciar episódios</h1>
            </div>

            <button
              type="button"
              onClick={handleToggleHomepage}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                showOnHomepage ? 'bg-[#111111] text-white hover:bg-[#2a2a2a]' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {showOnHomepage ? 'Exibindo na home' : 'Não exibir na home'}
            </button>
          </div>

          <div className="grid gap-8 xl:grid-cols-[420px,1fr]">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#991B1B]/10 text-[#991B1B]">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar episódio' : 'Novo episódio'}</h2>
                  <p className="text-sm text-gray-500">Crie, publique e organize o conteúdo de áudio.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Título</label>
                  <input value={form.title} onChange={(event) => handleChange('title', event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-[#991B1B] focus:outline-none" placeholder="Ex: O Brasil em foco" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Descrição</label>
                  <textarea value={form.description} onChange={(event) => handleChange('description', event.target.value)} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-[#991B1B] focus:outline-none" placeholder="Resumo do episódio" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Episódio</label>
                    <input type="number" min={1} value={form.episode} onChange={(event) => handleChange('episode', Number(event.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-[#991B1B] focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Duração (min)</label>
                    <input type="number" min={1} value={form.duration} onChange={(event) => handleChange('duration', Number(event.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-[#991B1B] focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Imagem de capa</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleFileUpload('image', event.target.files?.[0])}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:border-[#991B1B] focus:outline-none"
                  />
                  <input
                    value={form.image}
                    onChange={(event) => handleChange('image', event.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-[#991B1B] focus:outline-none"
                    placeholder="Ou cole a URL da imagem"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Arquivo de áudio</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => handleFileUpload('audioUrl', event.target.files?.[0])}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:border-[#991B1B] focus:outline-none"
                  />
                  <input
                    value={form.audioUrl}
                    onChange={(event) => handleChange('audioUrl', event.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-[#991B1B] focus:outline-none"
                    placeholder="Ou cole a URL do áudio"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Status</label>
                  <select value={form.status} onChange={(event) => handleChange('status', event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-[#991B1B] focus:outline-none">
                    <option value="rascunho">Rascunho</option>
                    <option value="publicado">Publicado</option>
                  </select>
                </div>

                <button type="button" onClick={handleSubmit} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-3 font-semibold text-white transition hover:bg-[#2a2a2a]">
                  <Save className="h-4 w-4" />
                  {editingId ? 'Salvar alterações' : 'Salvar episódio'}
                </button>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Lista de episódios</h2>
                  <p className="text-sm text-gray-500">{publishedCount} publicado(s) na plataforma</p>
                </div>
                <div className="rounded-full bg-[#991B1B]/10 px-3 py-1 text-sm font-semibold text-[#991B1B]">
                  {episodes.length} total
                </div>
              </div>

              <div className="space-y-4">
                {episodes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
                    Nenhum episódio cadastrado ainda.
                  </div>
                ) : (
                  episodes.map((episode) => (
                    <div key={episode.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-4">
                          <img src={episode.image} alt={episode.title} className="h-20 w-20 rounded-lg object-cover" />
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="rounded-full bg-[#991B1B]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#991B1B]">Ep. {episode.episode}</span>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${episode.status === 'publicado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {episode.status}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{episode.title}</h3>
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{episode.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-start">
                          <button type="button" onClick={() => toggleStatus(episode.id, episode.status === 'publicado' ? 'rascunho' : 'publicado')} className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50" title={episode.status === 'publicado' ? 'Despublicar' : 'Publicar'}>
                            {episode.status === 'publicado' ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          </button>
                          <button type="button" onClick={() => handleEdit(episode.id)} className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50" title="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => deleteEpisode(episode.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

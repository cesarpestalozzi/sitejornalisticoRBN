'use client';

import { Eye, EyeOff, Megaphone, PencilLine, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { ToastContainer, useToast } from '@/app/components/Toast';
import { useSettings } from '@/app/lib/settings';
import { useAdvertisements, type Advertisement, type AdvertisementPosition } from '@/app/hooks/useAdvertisements';

const initialFormData: Omit<Advertisement, 'id' | 'ctr'> = {
  title: '',
  description: '',
  imageUrl: '',
  link: '',
  position: 'header',
  startDate: '',
  endDate: '',
  active: true,
  clicks: 0,
  impressions: 0,
};

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function AdvertisementsPage() {
  const { ads, addAdvertisement, updateAdvertisement, deleteAdvertisement, isLoaded } = useAdvertisements();
  const { getSettings, saveSettings } = useSettings();
  const { toasts, addToast, removeToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [commercialData, setCommercialData] = useState({
    email: 'comercial@rbn.com.br',
    whatsapp: '5511999999999',
    instagram: '@rbn',
  });
  const [showAdsOnHomepage, setShowAdsOnHomepage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const settings = getSettings();
    setCommercialData({
      email: settings.commercial?.email || 'comercial@rbn.com.br',
      whatsapp: settings.commercial?.whatsapp || '5511999999999',
      instagram: settings.commercial?.instagram || '@rbn',
    });
    setShowAdsOnHomepage(settings.content?.showAdsOnHomepage ?? false);
  }, [getSettings]);

  const filteredAds = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return ads.filter((ad) => {
      if (!normalizedSearch) {
        return true;
      }

      return [ad.title, ad.description, ad.link, ad.position].join(' ').toLowerCase().includes(normalizedSearch);
    });
  }, [ads, searchTerm]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setErrors({});
    setShowForm(true);
  };

  const openEditModal = (ad: Advertisement) => {
    setEditingId(ad.id);
    setFormData({
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      link: ad.link,
      position: ad.position,
      startDate: ad.startDate,
      endDate: ad.endDate,
      active: ad.active,
      clicks: ad.clicks,
      impressions: ad.impressions,
    });
    setErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      nextErrors.title = 'Informe o título da campanha.';
    }

    if (!formData.description.trim()) {
      nextErrors.description = 'Descreva a campanha.';
    }

    if (!formData.link.trim()) {
      nextErrors.link = 'Informe o link de destino.';
    }

    if (!formData.startDate || !formData.endDate) {
      nextErrors.period = 'Defina as datas de início e término.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const imageUrl = await fileToDataUrl(file);
    setFormData((current) => ({ ...current, imageUrl }));
  };

  const handleSave = () => {
    if (!validateForm()) {
      addToast('Revise os campos obrigatórios antes de salvar.', 'error', 3000);
      return;
    }

    if (editingId) {
      updateAdvertisement(editingId, formData);
      addToast('Publicidade atualizada com sucesso.', 'success', 2500);
    } else {
      addAdvertisement(formData);
      addToast('Publicidade criada com sucesso.', 'success', 2500);
    }

    setShowForm(false);
    setFormData(initialFormData);
  };

  const handleToggleActive = (ad: Advertisement) => {
    updateAdvertisement(ad.id, { active: !ad.active });
    addToast('Status da publicidade atualizado.', 'success', 2000);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Deseja remover esta publicidade?')) {
      return;
    }

    deleteAdvertisement(id);
    addToast('Publicidade removida.', 'success', 2500);
  };

  const handleCommercialSave = () => {
    const settings = getSettings();
    const nextSettings = {
      ...settings,
      commercial: {
        ...settings.commercial,
        ...commercialData,
      },
    };

    saveSettings(nextSettings);
    addToast('Dados de contato comercial salvos.', 'success', 2500);
  };

  const handleToggleHomepageAds = () => {
    const nextValue = !showAdsOnHomepage;
    const settings = getSettings();
    const nextSettings = {
      ...settings,
      content: {
        ...settings.content,
        showAdsOnHomepage: nextValue,
      },
    };

    saveSettings(nextSettings);
    setShowAdsOnHomepage(nextValue);
    addToast(nextValue ? 'Publicidade ativada na página inicial.' : 'Publicidade removida da página inicial.', 'success', 2500);
  };

  const handleResetMetrics = () => {
    if (!window.confirm('Deseja zerar todos os cliques e impressões das campanhas?')) {
      return;
    }

    ads.forEach((ad) => {
      updateAdvertisement(ad.id, { clicks: 0, impressions: 0, ctr: 0 });
    });
    addToast('Métricas de publicidade zeradas.', 'success', 2500);
  };

  if (!isLoaded) {
    return <div className="p-6 text-sm text-gray-600">Carregando publicidades...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C40000]">Publicidade</p>
              <h1 className="text-3xl font-light tracking-[-0.06em] text-gray-900 sm:text-4xl">Publicidades do RBN</h1>
              <p className="mt-2 text-sm text-gray-600 sm:text-base">Cadastre campanhas, organize posições e mantenha anúncios persistentes.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleResetMetrics} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                <RotateCcw className="h-4 w-4" />
                Zerar métricas
              </button>
              <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(17,17,17,0.12)] transition hover:bg-[#2a2a2a]">
                <Plus className="h-5 w-5" />
                Nova publicidade
              </button>
            </div>
          </div>

          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total de campanhas', value: ads.length },
              { label: 'Ativas', value: ads.filter((ad) => ad.active).length },
              { label: 'Cliques totais', value: ads.reduce((sum, ad) => sum + ad.clicks, 0).toLocaleString() },
              { label: 'Impressões', value: ads.reduce((sum, ad) => sum + ad.impressions, 0).toLocaleString() },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-[#eceae8] bg-white p-6 shadow-[0_12px_35px_rgba(17,17,17,0.025)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{stat.label}</p>
                <p className="mt-3 text-3xl font-light tracking-[-0.06em] text-gray-900">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="mb-8 rounded-[24px] border border-[#eceae8] bg-white p-6 shadow-[0_12px_35px_rgba(17,17,17,0.025)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Publicidade na página inicial</h2>
                <p className="mt-1 text-sm text-gray-600">Ative para exibir campanhas na home. Desative para ocultar completamente.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${showAdsOnHomepage ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {showAdsOnHomepage ? 'Ativada' : 'Desativada'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleHomepageAds}
                  className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]"
                >
                  {showAdsOnHomepage ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showAdsOnHomepage ? 'Desativar na home' : 'Ativar na home'}
                </button>
              </div>
            </div>
          </section>

          <section className="mb-8 rounded-[28px] border border-[#eceae8] bg-white p-6 shadow-[0_16px_40px_rgba(17,17,17,0.025)] sm:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-light tracking-[-0.05em] text-gray-900">Contato comercial</h2>
                <p className="mt-1 text-sm text-gray-600">Esses dados atualizam a página de Anuncie Conosco automaticamente.</p>
              </div>
              <button type="button" onClick={handleCommercialSave} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Salvar configurações
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="block text-sm font-semibold text-gray-900">
                E-mail comercial
                <input
                  type="email"
                  value={commercialData.email}
                  onChange={(event) => setCommercialData((current) => ({ ...current, email: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-[#fafafa] px-4 py-3 text-gray-900 transition focus:border-[#C40000] focus:outline-none"
                  placeholder="comercial@rbn.com.br"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-900">
                WhatsApp comercial
                <input
                  type="text"
                  value={commercialData.whatsapp}
                  onChange={(event) => setCommercialData((current) => ({ ...current, whatsapp: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-[#fafafa] px-4 py-3 text-gray-900 transition focus:border-[#C40000] focus:outline-none"
                  placeholder="5511999999999"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-900">
                Instagram
                <input
                  type="text"
                  value={commercialData.instagram}
                  onChange={(event) => setCommercialData((current) => ({ ...current, instagram: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-[#fafafa] px-4 py-3 text-gray-900 transition focus:border-[#C40000] focus:outline-none"
                  placeholder="@rbn"
                />
              </label>
            </div>
          </section>

          <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-gray-900">Buscar campanhas</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Pesquise por título, descrição, link ou posição" className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-[#991B1B] focus:outline-none" />
            </div>
          </section>

          <section className="space-y-6">
            {filteredAds.map((ad) => (
              <article key={ad.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[300px,1fr,220px]">
                  <div className="h-full min-h-64 bg-gray-100">
                    <img src={ad.imageUrl} alt={ad.title} className="h-full w-full object-cover" />
                  </div>

                  <div className="space-y-5 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{ad.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-600">{ad.description}</p>
                      </div>
                      <span className="rounded-full bg-[#D8F0FA] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#236A88]">{ad.position}</span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Impressões</p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{ad.impressions.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cliques</p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{ad.clicks.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">CTR</p>
                        <p className="mt-2 text-2xl font-bold text-[#991B1B]">{ad.ctr.toFixed(2)}%</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-semibold text-gray-900">Link:</span> {ad.link}</p>
                      <p><span className="font-semibold text-gray-900">Período:</span> {ad.startDate} até {ad.endDate}</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-3 border-t border-gray-100 bg-gray-50 p-6 lg:border-l lg:border-t-0">
                    <span className={`rounded-full px-3 py-1 text-center text-xs font-semibold ${ad.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{ad.active ? 'Ativa' : 'Inativa'}</span>
                    <button type="button" onClick={() => handleToggleActive(ad)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">
                      {ad.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {ad.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button type="button" onClick={() => openEditModal(ad)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]">
                      <PencilLine className="h-4 w-4" />
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(ad.id)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700">
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          {filteredAds.length === 0 && (
            <section className="rounded-xl bg-white p-12 text-center shadow-sm">
              <Megaphone className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-600">Nenhuma campanha corresponde aos filtros informados.</p>
            </section>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between bg-[#991B1B] px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-bold">{editingId ? 'Editar publicidade' : 'Nova publicidade'}</h2>
                <p className="text-sm text-white/80">Os dados da campanha são salvos localmente no navegador.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-white/10">Fechar</button>
            </div>

            <div className="space-y-8 p-6">
              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Informações da campanha</h3>
                  <p className="text-sm text-gray-500">Defina o texto principal, o destino e a arte da publicidade.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Título</label>
                    <input type="text" value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none" />
                    {errors.title && <p className="mt-2 text-xs text-[#991B1B]">{errors.title}</p>}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900">Link de destino</label>
                    <input type="url" value={formData.link} onChange={(event) => setFormData((current) => ({ ...current, link: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none" />
                    {errors.link && <p className="mt-2 text-xs text-[#991B1B]">{errors.link}</p>}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-900">Descrição</label>
                  <textarea value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} rows={4} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none" />
                  {errors.description && <p className="mt-2 text-xs text-[#991B1B]">{errors.description}</p>}
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[1fr,260px]">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Distribuição da campanha</h3>
                    <p className="text-sm text-gray-500">Posição, período e status de exibição.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Posição</label>
                      <select value={formData.position} onChange={(event) => setFormData((current) => ({ ...current, position: event.target.value as AdvertisementPosition }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none">
                        <option value="header">Cabeçalho</option>
                        <option value="sidebar">Barra lateral</option>
                        <option value="footer">Rodapé</option>
                        <option value="inline">Inline</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
                        <input type="checkbox" checked={formData.active} onChange={(event) => setFormData((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-[#991B1B]" />
                        Campanha ativa
                      </label>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Data de início</label>
                      <input type="date" value={formData.startDate} onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Data de término</label>
                      <input type="date" value={formData.endDate} onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none" />
                    </div>
                  </div>
                  {errors.period && <p className="text-xs text-[#991B1B]">{errors.period}</p>}
                </div>

                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    {formData.imageUrl ? <img src={formData.imageUrl} alt="Preview do anúncio" className="h-48 w-full object-cover" /> : <div className="flex h-48 items-center justify-center text-gray-400">Pré-visualização</div>}
                  </div>
                  <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:border-[#991B1B] hover:bg-[#991B1B]/5">
                    Enviar imagem
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </section>

              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-6">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-900 transition hover:bg-gray-50">Cancelar</button>
                <button type="button" onClick={handleSave} className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700">Salvar publicidade</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, Check, ChevronDown, Shield, Zap, Mail, Share2, Database, Eye, Lock, Globe } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useSettings, SiteSettings, defaultSettings, validateSettings } from '@/app/lib/settings';
import { useToast, ToastContainer } from '@/app/components/Toast';

const fontOptions = [
  { label: 'Inter', value: '"Inter", "Segoe UI", sans-serif', sample: 'AO PONTO BR' },
  { label: 'Roboto', value: 'Roboto, "Segoe UI", sans-serif', sample: 'AO PONTO BR' },
  { label: 'Source Sans 3', value: '"Source Sans 3", "Segoe UI", sans-serif', sample: 'AO PONTO BR' },
  { label: 'Manrope', value: 'Manrope, "Segoe UI", sans-serif', sample: 'AO PONTO BR' },
  { label: 'Poppins', value: 'Poppins, "Segoe UI", sans-serif', sample: 'AO PONTO BR' },
  { label: 'Lato', value: 'Lato, "Segoe UI", sans-serif', sample: 'AO PONTO BR' },
];

export default function SettingsPage() {
  const { getSettings, saveSettings, updateSetting, resetToDefaults } = useSettings();
  const { toasts, addToast, removeToast } = useToast();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSettings(getSettings());
    setLoading(false);
  }, []);

  const handleInputChange = (section: keyof SiteSettings, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setErrors([]);
  };

  const handleSave = () => {
    const validation = validateSettings(settings);
    
    if (!validation.valid) {
      setErrors(validation.errors);
      addToast('Erros de validação encontrados', 'error', 5000);
      return;
    }

    try {
      saveSettings(settings);
      addToast('Configurações salvas com sucesso!', 'success', 3000);
    } catch (error) {
      addToast('Erro ao salvar configurações', 'error', 5000);
      console.error('Erro ao salvar:', error);
    }
  };

  const handleReset = () => {
    if (confirm('Restaurar todas as configurações padrão? Esta ação não pode ser desfeita.')) {
      try {
        resetToDefaults();
        setSettings(defaultSettings);
        addToast('Configurações restauradas com sucesso!', 'success', 3000);
      } catch (error) {
        addToast('Erro ao restaurar configurações', 'error', 5000);
        console.error('Erro ao restaurar:', error);
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

  const tabs: Array<{ id: string; label: string; icon: any }> = [
    { id: 'basic', label: 'Básico', icon: Globe },
    { id: 'seo', label: 'SEO & Metadata', icon: Eye },
    { id: 'visual', label: 'Visual & Tema', icon: Zap },
    { id: 'fonts', label: 'Fontes', icon: Globe },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'security', label: 'Segurança', icon: Lock },
    { id: 'email', label: 'Email & Notificações', icon: Mail },
    { id: 'commercial', label: 'Anuncie Conosco', icon: Mail },
    { id: 'social', label: 'Redes Sociais', icon: Share2 },
    { id: 'content', label: 'Conteúdo', icon: Database },
    { id: 'analytics', label: 'Analytics', icon: Eye },
    { id: 'backup', label: 'Backup', icon: Database },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:h-screen md:flex-row">
      <AdminSidebar />
      
      <div id="configuracoes" className="flex-1 overflow-auto scroll-mt-32">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações do Portal</h1>
            <p className="text-gray-600">Gerencie todas as configurações profissionais do AO PONTO BR.</p>
          </div>

          {/* Alerts */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-[#991B1B]/5 border-l-4 border-[#991B1B] rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-[#991B1B] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[#7F1D1D] mb-2">Erros de Validação</h3>
                  <ul className="space-y-1">
                    {errors.map((error, i) => (
                      <li key={i} className="text-[#7F1D1D] text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-[#991B1B] text-[#991B1B] font-semibold'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="mb-8 rounded-lg bg-white p-4 shadow-md sm:p-6 lg:p-8">
            {activeTab === 'basic' && (
              <BasicSettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'seo' && (
              <SEOSettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'visual' && (
              <VisualSettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'fonts' && (
              <FontsSettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'performance' && (
              <PerformanceSettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'security' && (
              <SecuritySettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'email' && (
              <EmailSettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'commercial' && (
              <CommercialSettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'social' && (
              <SocialSettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'content' && (
              <ContentSettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsSettings settings={settings} onChange={handleInputChange} />
            )}
            {activeTab === 'backup' && (
              <BackupSettings settings={settings} onChange={handleInputChange} />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Restaurar Padrões
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

// Componentes de Seções
function BasicSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Informações Básicas</h2>
      
      <div className="grid grid-cols-2 gap-6">
        <InputField
          label="Nome do Site"
          value={settings.basic.siteName}
          onChange={(value: string) => onChange('basic', 'siteName', value)}
          placeholder="Ex: AO PONTO BR"
        />
        <InputField
          label="Tagline"
          value={settings.basic.siteTagline}
          onChange={(value: string) => onChange('basic', 'siteTagline', value)}
          placeholder="Ex: Jornalismo • Informação • Entretenimento"
        />
      </div>

      <TextAreaField
        label="Descrição"
        value={settings.basic.description}
        onChange={(value: string) => onChange('basic', 'description', value)}
        placeholder="Descrição breve do portal"
        rows={4}
      />

      <div className="grid grid-cols-2 gap-6">
        <InputField
          label="Logo do topo (URL ou caminho)"
          value={settings.basic.logo || '/logo-oficial.png'}
          onChange={(value: string) => onChange('basic', 'logo', value)}
          placeholder="/logo-oficial.png"
        />
        <InputField
          label="Logo do rodapé (URL ou caminho)"
          value={settings.basic.footerLogo || settings.basic.logo || '/logo-oficial.png'}
          onChange={(value: string) => onChange('basic', 'footerLogo', value)}
          placeholder="/logo-oficial.png"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <InputField
          label="Fuso Horário"
          value={settings.basic.timezone}
          onChange={(value: string) => onChange('basic', 'timezone', value)}
          placeholder="Ex: America/Sao_Paulo"
        />
        <InputField
          label="Idioma"
          value={settings.basic.language}
          onChange={(value: string) => onChange('basic', 'language', value)}
          placeholder="Ex: pt-BR"
        />
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Nossa Equipe</h3>
          <button
            type="button"
            onClick={() => {
              const nextMembers = [...(settings.basic.teamMembers || []), { name: '[Nome do profissional]', role: 'Cargo / Função' }];
              onChange('basic', 'teamMembers', nextMembers);
            }}
            className="rounded-lg bg-[#991B1B] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#7F1D1D]"
          >
            Adicionar membro
          </button>
        </div>

        {(settings.basic.teamMembers || []).map((member: { name: string; role: string }, index: number) => (
          <div key={`${member.name}-${index}`} className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-2">
            <InputField
              label={`Nome ${index + 1}`}
              value={member.name}
              onChange={(value: string) => {
                const nextMembers = [...(settings.basic.teamMembers || [])];
                nextMembers[index] = { ...nextMembers[index], name: value };
                onChange('basic', 'teamMembers', nextMembers);
              }}
              placeholder="Ex: João Silva"
            />
            <InputField
              label={`Cargo ${index + 1}`}
              value={member.role}
              onChange={(value: string) => {
                const nextMembers = [...(settings.basic.teamMembers || [])];
                nextMembers[index] = { ...nextMembers[index], role: value };
                onChange('basic', 'teamMembers', nextMembers);
              }}
              placeholder="Ex: Editor / Redator"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SEOSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">SEO & Metadata</h2>
      
      <TextAreaField
        label="Meta Description"
        value={settings.seo.metaDescription}
        onChange={(value: string) => onChange('seo', 'metaDescription', value)}
        placeholder="Descrição para mecanismos de busca"
        rows={3}
      />

      <InputField
        label="Google Analytics ID"
        value={settings.seo.googleAnalyticsId}
        onChange={(value: string) => onChange('seo', 'googleAnalyticsId', value)}
        placeholder="Ex: G-XXXXXXXXXX"
      />

      <InputField
        label="Google Search Console ID"
        value={settings.seo.googleSearchConsoleId}
        onChange={(value: string) => onChange('seo', 'googleSearchConsoleId', value)}
        placeholder="Ex: verification_code"
      />

      <InputField
        label="Twitter Handle"
        value={settings.seo.twitterHandle}
        onChange={(value: string) => onChange('seo', 'twitterHandle', value)}
        placeholder="Ex: @pznews"
      />
    </div>
  );
}

function VisualSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Visual & Tema</h2>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cor Primária</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={settings.visual.primaryColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'primaryColor', e.target.value)}
              className="w-16 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={settings.visual.primaryColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'primaryColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cor Secundária</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={settings.visual.secondaryColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'secondaryColor', e.target.value)}
              className="w-16 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={settings.visual.secondaryColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'secondaryColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cor Destaque</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={settings.visual.accentColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'accentColor', e.target.value)}
              className="w-16 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={settings.visual.accentColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'accentColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cor do Rodapé</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={settings.visual.footerBackgroundColor || '#111111'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'footerBackgroundColor', e.target.value)}
              className="w-16 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={settings.visual.footerBackgroundColor || '#111111'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'footerBackgroundColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Texto do Rodapé</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={settings.visual.footerTextColor || '#FFFFFF'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'footerTextColor', e.target.value)}
              className="w-16 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={settings.visual.footerTextColor || '#FFFFFF'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'footerTextColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-700">Visual do site</p>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Preview</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" style={{ fontFamily: settings.visual.fontFamily || '"Inter", "Segoe UI", sans-serif' }}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" style={{ backgroundColor: settings.visual.primaryColor || '#991B1B' }}>
            <span className="text-base font-bold tracking-[0.12em]">AO PONTO BR</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/90">Portal</span>
          </div>

          <div className="bg-gray-100 px-4 py-3">
            <div className="mb-3 flex gap-2">
              {[
                settings.visual.primaryColor || '#991B1B',
                settings.visual.secondaryColor || '#111111',
                settings.visual.accentColor || '#FF796C',
                settings.visual.footerBackgroundColor || '#111111',
              ].map((color, index) => (
                <span key={`${color}-${index}`} className="h-6 w-6 rounded-full border border-white" style={{ backgroundColor: color }} />
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-[1.6fr,0.8fr]">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500" style={{ color: settings.visual.primaryColor || '#991B1B' }}>
                  Destaque
                </span>
                <h3 className="text-xl font-bold leading-tight text-gray-900" style={{ color: settings.visual.secondaryColor || '#111111' }}>
                  Jornalismo • Informação • Entretenimento
                </h3>
                <p className="mt-2 text-xs leading-5 text-gray-600">
                  A identidade visual do portal combina clareza editorial, contraste forte e leitura elegante.
                </p>
              </div>

              <div className="rounded-xl p-3 text-white" style={{ backgroundColor: settings.visual.secondaryColor || '#111111' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">Fonte</p>
                <p className="mt-2 text-sm font-semibold">{settings.visual.fontFamily || '"Inter", "Segoe UI", sans-serif'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-gray-500">
            <span>Notícias</span>
            <span>Economia</span>
            <span>Esportes</span>
            <span>Política</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="darkMode"
          checked={settings.visual.darkModeEnabled}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('visual', 'darkModeEnabled', e.target.checked)}
          className="w-4 h-4 text-[#991B1B] rounded"
        />
        <label htmlFor="darkMode" className="text-sm font-semibold text-gray-700">
          Ativar Modo Escuro
        </label>
      </div>
    </div>
  );
}

function FontsSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Fontes</h2>
        <p className="mt-2 text-sm text-gray-600">
          A fonte principal do portal é a Inter, com excelente legibilidade, hierarquia visual e aparência editorial.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fontOptions.map((font) => {
          const selected = settings.visual.fontFamily === font.value;
          return (
            <button
              key={font.label}
              type="button"
              onClick={() => onChange('visual', 'fontFamily', font.value)}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? 'border-[#991B1B] bg-[#991B1B]/5 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">{font.label}</span>
                {selected && <span className="rounded-full bg-[#991B1B] px-2 py-1 text-[10px] font-medium text-white">Ativa</span>}
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-semibold tracking-[-0.08em] text-gray-900" style={{ fontFamily: font.value }}>
                  {font.sample}
                </p>
                <p className="text-xs text-gray-500">Títulos: 700/800 · Subtítulos: 600/700 · Texto: 400</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-2 text-sm font-semibold text-gray-700">Configuração atual</p>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
          <span className="font-medium text-gray-900">Fonte principal:</span> {settings.visual.fontFamily}
        </div>
      </div>
    </div>
  );
}

function PerformanceSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Performance</h2>
      
      <InputField
        label="Duração do Cache (minutos)"
        type="number"
        value={settings.performance.cacheDuration}
        onChange={(value: string) => onChange('performance', 'cacheDuration', parseInt(value))}
        min="1"
        max="1440"
      />

      <div className="space-y-3">
        {['lazyLoadImages', 'minifyAssets', 'enableCDN'].map(key => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={key}
              checked={settings.performance[key as keyof typeof settings.performance]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('performance', key, e.target.checked)}
              className="w-4 h-4 text-[#991B1B] rounded"
            />
            <label htmlFor={key} className="text-sm font-semibold text-gray-700 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </label>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Nível de Compressão</label>
        <select
          value={settings.performance.compressionLevel}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('performance', 'compressionLevel', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        >
          <option value="low">Baixo</option>
          <option value="medium">Médio</option>
          <option value="high">Alto</option>
        </select>
      </div>
    </div>
  );
}

function SecuritySettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Segurança</h2>
      
      <div className="space-y-3">
        {['enableSSL', 'enableTwoFA', 'encryptSensitiveData'].map(key => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={key}
              checked={settings.security[key as keyof typeof settings.security]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('security', key, e.target.checked)}
              className="w-4 h-4 text-[#991B1B] rounded"
            />
            <label htmlFor={key} className="text-sm font-semibold text-gray-700">
              {key === 'enableSSL' && 'Ativar SSL'}
              {key === 'enableTwoFA' && 'Autenticação de Dois Fatores'}
              {key === 'encryptSensitiveData' && 'Criptografar Dados Sensíveis'}
            </label>
          </div>
        ))}
      </div>

      <InputField
        label="Timeout de Sessão (minutos)"
        type="number"
        value={settings.security.sessionTimeout}
        onChange={(value: string) => onChange('security', 'sessionTimeout', parseInt(value))}
        min="5"
        max="1440"
      />

      <InputField
        label="Rate Limit de API (req/min)"
        type="number"
        value={settings.security.apiRateLimit}
        onChange={(value: string) => onChange('security', 'apiRateLimit', parseInt(value))}
        min="1"
      />
    </div>
  );
}

function EmailSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Email & Notificações</h2>
      
      <div className="grid grid-cols-2 gap-6">
        <InputField
          label="Email do Remetente"
          type="email"
          value={settings.email.senderEmail}
          onChange={(value: string) => onChange('email', 'senderEmail', value)}
          placeholder="noreply@pznews.com.br"
        />
        <InputField
          label="Nome do Remetente"
          value={settings.email.senderName}
          onChange={(value: string) => onChange('email', 'senderName', value)}
          placeholder="AO PONTO BR"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <InputField
          label="Host SMTP"
          value={settings.email.smtpHost}
          onChange={(value: string) => onChange('email', 'smtpHost', value)}
          placeholder="smtp.gmail.com"
        />
        <InputField
          label="Porta SMTP"
          type="number"
          value={settings.email.smtpPort}
          onChange={(value: string) => onChange('email', 'smtpPort', parseInt(value))}
          min="1"
          max="65535"
        />
      </div>

      <InputField
        label="Email de Notificação"
        type="email"
        value={settings.email.notificationEmail}
        onChange={(value: string) => onChange('email', 'notificationEmail', value)}
        placeholder="admin@pznews.com.br"
      />

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="notifications"
          checked={settings.email.enableNotifications}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('email', 'enableNotifications', e.target.checked)}
          className="w-4 h-4 text-[#991B1B] rounded"
        />
        <label htmlFor="notifications" className="text-sm font-semibold text-gray-700">
          Ativar Notificações por Email
        </label>
      </div>
    </div>
  );
}

function CommercialSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Configuração de Anuncie Conosco</h2>
      <p className="text-sm text-gray-600 mb-6">
        Esses dados são exibidos publicamente na página “Anuncie Conosco” e são atualizados automaticamente no site.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <InputField
          label="E-mail comercial"
          type="email"
          value={settings.commercial?.email || 'comercial@pznews.com.br'}
          onChange={(value: string) => onChange('commercial', 'email', value)}
          placeholder="comercial@pznews.com.br"
        />
        <InputField
          label="WhatsApp comercial"
          value={settings.commercial?.whatsapp || '5511999999999'}
          onChange={(value: string) => onChange('commercial', 'whatsapp', value)}
          placeholder="5511999999999"
        />
      </div>

      <InputField
        label="Instagram"
        value={settings.commercial?.instagram || '@pznews'}
        onChange={(value: string) => onChange('commercial', 'instagram', value)}
        placeholder="@pznews ou https://instagram.com/pznews"
      />

      <div className="rounded-xl border border-dashed border-[#991B1B]/30 bg-[#991B1B]/5 p-5 text-sm text-gray-700">
        <p className="font-semibold text-[#7F1D1D] mb-2">Como o sistema gera os links</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>E-mail: gera automaticamente um link de contato via mailto.</li>
          <li>WhatsApp: remove caracteres extras e cria o link correto com DDD + número.</li>
          <li>Instagram: aceita @usuário ou URL do perfil e converte para o link da conta.</li>
        </ul>
      </div>
    </div>
  );
}

function SocialSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Redes Sociais</h2>
      
      <div className="grid grid-cols-2 gap-6">
        {Object.entries(settings.social).map(([key, value]) => (
          <InputField
            key={key}
            label={key.charAt(0).toUpperCase() + key.slice(1)}
            value={value as string}
            onChange={(val: string) => onChange('social', key, val)}
            placeholder={`https://${key}.com/pznews`}
          />
        ))}
      </div>
    </div>
  );
}

function ContentSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Conteúdo</h2>
      
      <div className="grid grid-cols-2 gap-6">
        <InputField
          label="Posts por Página"
          type="number"
          value={settings.content.postsPerPage}
          onChange={(value: string) => onChange('content', 'postsPerPage', parseInt(value))}
          min="1"
        />
        <InputField
          label="Tamanho Máximo de Imagem (MB)"
          type="number"
          value={settings.content.maxImageSize}
          onChange={(value: string) => onChange('content', 'maxImageSize', parseInt(value))}
          min="1"
        />
      </div>

      <InputField
        label="Tamanho Máximo de Vídeo (MB)"
        type="number"
        value={settings.content.maxVideoSize}
        onChange={(value: string) => onChange('content', 'maxVideoSize', parseInt(value))}
        min="1"
      />

      <div className="space-y-3">
        {['enableComments', 'commentModeration', 'enableNewsletterSignup', 'showAdsOnHomepage', 'showPodcastsOnHomepage'].map(key => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={key}
              checked={settings.content[key as keyof typeof settings.content]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('content', key, e.target.checked)}
              className="w-4 h-4 text-[#991B1B] rounded"
            />
            <label htmlFor={key} className="text-sm font-semibold text-gray-700">
              {key === 'enableComments' && 'Ativar Comentários'}
              {key === 'commentModeration' && 'Moderação de Comentários'}
              {key === 'enableNewsletterSignup' && 'Cadastro em Newsletter'}
              {key === 'showAdsOnHomepage' && 'Exibir publicidades na página inicial'}
              {key === 'showPodcastsOnHomepage' && 'Exibir podcasts na página inicial'}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Analytics & Rastreamento</h2>
      
      <div className="space-y-3">
        {['trackPageViews', 'trackUserBehavior', 'trackConversions'].map(key => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={key}
              checked={settings.analytics[key as keyof typeof settings.analytics]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('analytics', key, e.target.checked)}
              className="w-4 h-4 text-[#991B1B] rounded"
            />
            <label htmlFor={key} className="text-sm font-semibold text-gray-700">
              {key === 'trackPageViews' && 'Rastrear Visualizações de Página'}
              {key === 'trackUserBehavior' && 'Rastrear Comportamento de Usuário'}
              {key === 'trackConversions' && 'Rastrear Conversões'}
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="privacyMode"
          checked={settings.analytics.privacyMode}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('analytics', 'privacyMode', e.target.checked)}
          className="w-4 h-4 text-[#991B1B] rounded"
        />
        <label htmlFor="privacyMode" className="text-sm font-semibold text-gray-700">
          Modo de Privacidade (GDPR)
        </label>
      </div>
    </div>
  );
}

function BackupSettings({ settings, onChange }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Backup & Restauração</h2>
      
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="autoBackup"
          checked={settings.backup.autoBackupEnabled}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('backup', 'autoBackupEnabled', e.target.checked)}
          className="w-4 h-4 text-[#991B1B] rounded"
        />
        <label htmlFor="autoBackup" className="text-sm font-semibold text-gray-700">
          Ativar Backup Automático
        </label>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Frequência de Backup</label>
        <select
          value={settings.backup.backupFrequency}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('backup', 'backupFrequency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        >
          <option value="daily">Diariamente</option>
          <option value="weekly">Semanalmente</option>
          <option value="monthly">Mensalmente</option>
        </select>
      </div>

      <InputField
        label="Dias de Retenção"
        type="number"
        value={settings.backup.retentionDays}
        onChange={(value: string) => onChange('backup', 'retentionDays', parseInt(value))}
        min="1"
        max="365"
      />
    </div>
  );
}

// Componentes auxiliares
function InputField({ label, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#991B1B] focus:border-transparent"
      />
    </div>
  );
}

function TextAreaField({ label, rows, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <textarea
        {...props}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#991B1B] focus:border-transparent resize-none"
      />
    </div>
  );
}

import { useCallback, useMemo } from 'react';
import { getCurrentAdminUser, isAdmin } from '@/app/lib/adminPermissions';

/**
 * Sistema de Configurações - RBN
 * Gerencia todas as configurações do portal de forma centralizada
 * Integrado com localStorage para persistência
 */

export interface TeamMember {
  name: string;
  role: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface HeaderBarLink {
  label: string;
  href: string;
  enabled: boolean;
}

export const cleanTopBarLinks: HeaderBarLink[] = [];

export interface SiteSettings {
  // Informações Básicas
  basic: {
    siteName: string;
    siteTagline: string;
    description: string;
    logo: string;
    footerLogo: string;
    favicon: string;
    timezone: string;
    language: string;
    teamMembers: TeamMember[];
    footerLinks: FooterLink[];
    footerContactLinks: FooterLink[];
    homeHeadline: string;
    homeTopics: string[];
    topBarLinks: HeaderBarLink[];
  };

  // SEO e Metadata
  seo: {
    metaDescription: string;
    metaKeywords: string[];
    ogImage: string;
    twitterHandle: string;
    googleAnalyticsId: string;
    googleSearchConsoleId: string;
  };

  // Visual e Tema
  visual: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    footerBackgroundColor: string;
    footerTextColor: string;
    fontFamily: string;
    darkModeEnabled: boolean;
    customCSS: string;
  };

  // Performance
  performance: {
    cacheDuration: number;      // em minutos
    lazyLoadImages: boolean;
    minifyAssets: boolean;
    enableCDN: boolean;
    compressionLevel: 'low' | 'medium' | 'high';
  };

  // Segurança
  security: {
    enableSSL: boolean;
    requireLogin: boolean;
    sessionTimeout: number;     // em minutos
    apiRateLimit: number;       // requisições por minuto
    enableTwoFA: boolean;
    encryptSensitiveData: boolean;
  };

  // Email e Notificações
  email: {
    senderEmail: string;
    senderName: string;
    smtpHost: string;
    smtpPort: number;
    enableNotifications: boolean;
    notificationEmail: string;
  };

  // Anuncie Conosco
  commercial: {
    email: string;
    whatsapp: string;
    instagram: string;
  };

  // Social Media
  social: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
    youtube: string;
    tiktok: string;
  };

  // Conteúdo
  content: {
    postsPerPage: number;
    maxImageSize: number;       // em MB
    maxVideoSize: number;       // em MB
    enableComments: boolean;
    commentModeration: boolean;
    enableNewsletterSignup: boolean;
    showAdsOnHomepage: boolean;
    showPodcastsOnHomepage: boolean;
    showWeatherOnHomepage: boolean;
  };

  // Analytics e Rastreamento
  analytics: {
    trackPageViews: boolean;
    trackUserBehavior: boolean;
    trackConversions: boolean;
    privacyMode: boolean;
  };

  // Backup e Restauração
  backup: {
    autoBackupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
  };
}

// Configurações padrão
export const defaultSettings: SiteSettings = {
  basic: {
    siteName: 'RBN',
    siteTagline: '',
    description: 'Portal de notícias com cobertura completa de política, economia, cultura, Brasil e mundo.',
    logo: '/logo-oficial.png',
    footerLogo: '/logo-oficial.png',
    favicon: '/favicon.ico',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    teamMembers: [
      { name: '[Nome do profissional]', role: 'Cargo / Função' },
      { name: '[Nome do profissional]', role: 'Cargo / Função' },
      { name: '[Nome do profissional]', role: 'Cargo / Função' },
    ],
    footerLinks: [
      { label: 'quem somos', href: '/quem-somos' },
      { label: 'princípios editoriais', href: '/politica-editorial' },
      { label: 'política de privacidade', href: '/privacidade' },
      { label: 'termos de uso', href: '/termos' },
      { label: 'anúncio', href: '/contato' },
    ],
    footerContactLinks: [
      { label: 'Redação', href: '/contato' },
      { label: 'Publicidade', href: '/contato' },
      { label: 'Assessoria de imprensa', href: '/contato' },
      { label: 'Denúncias / Sugestões', href: '/contato' },
    ],
    homeHeadline: 'Notícias do Brasil e do mundo',
    homeTopics: ['POLÍTICA', 'BRASIL', 'MUNDO', 'ECONOMIA', 'ESPORTES', 'CULTURA', 'FAMOSOS', 'TECNOLOGIA'],
    topBarLinks: cleanTopBarLinks,
  },
  seo: {
    metaDescription: 'RBN - Rede Brasileira de Notícias com análise, contexto e informação em tempo real.',
    metaKeywords: ['notícias', 'jornalismo', 'política', 'economia', 'brasil', 'mundo', 'entretenimento'],
    ogImage: '/og-image.png',
    twitterHandle: '@rbn',
    googleAnalyticsId: 'G-XXXXXXXXXX',
    googleSearchConsoleId: '',
  },
  visual: {
    primaryColor: '#991B1B',
    secondaryColor: '#111111',
    accentColor: '#87CEEB',
    footerBackgroundColor: '#111111',
    footerTextColor: '#FFFFFF',
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    darkModeEnabled: true,
    customCSS: '',
  },
  performance: {
    cacheDuration: 60,
    lazyLoadImages: true,
    minifyAssets: true,
    enableCDN: true,
    compressionLevel: 'high',
  },
  security: {
    enableSSL: true,
    requireLogin: false,
    sessionTimeout: 30,
    apiRateLimit: 100,
    enableTwoFA: true,
    encryptSensitiveData: true,
  },
  email: {
    senderEmail: 'noreply@rbn.com.br',
    senderName: 'RBN',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    enableNotifications: true,
    notificationEmail: 'admin@rbn.com.br',
  },
  commercial: {
    email: 'comercial@rbn.com.br',
    whatsapp: '5511999999999',
    instagram: '@rbn',
  },
  social: {
    facebook: 'https://facebook.com/rbn',
    twitter: 'https://twitter.com/rbn',
    instagram: 'https://instagram.com/rbn',
    linkedin: 'https://linkedin.com/company/rbn',
    youtube: 'https://youtube.com/@rbn',
    tiktok: 'https://tiktok.com/@rbn',
  },
  content: {
    postsPerPage: 20,
    maxImageSize: 50,
    maxVideoSize: 500,
    enableComments: true,
    commentModeration: true,
    enableNewsletterSignup: true,
    showAdsOnHomepage: false,
    showPodcastsOnHomepage: false,
    showWeatherOnHomepage: true,
  },
  analytics: {
    trackPageViews: true,
    trackUserBehavior: true,
    trackConversions: true,
    privacyMode: false,
  },
  backup: {
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    retentionDays: 30,
  },
};

/**
 * Hook para gerenciar configurações
 */
function mergeSettings(base: SiteSettings, override: Partial<SiteSettings> | null | undefined): SiteSettings {
  if (!override) return base;

  const merged = { ...base } as SiteSettings;

  (Object.keys(base) as Array<keyof SiteSettings>).forEach((section) => {
    const baseSection = base[section] as Record<string, any>;
    const overrideSection = (override[section] as Record<string, any>) || {};
    merged[section] = { ...baseSection, ...overrideSection } as any;
  });

  const rawTagline = merged.basic.siteTagline?.trim();
  const legacyTaglines = new Set(['Rede Brasileira de Notícias', 'Rede brasileria de noticias', 'Rede Brasileira de noticias']);
  if (rawTagline && legacyTaglines.has(rawTagline)) {
    merged.basic.siteTagline = defaultSettings.basic.siteTagline;
  }

  const rawDescription = merged.seo.metaDescription?.trim();
  if (rawDescription && rawDescription.toLowerCase().includes('rede brasileira de notícias')) {
    merged.seo.metaDescription = defaultSettings.seo.metaDescription;
  }

  const blockedTopBarLabels = new Set([
    'RBN',
    'Notícias do Brasil e do mundo',
    'POLÍTICA',
    'BRASIL',
    'MUNDO',
    'ECONOMIA',
    'ESPORTES',
    'CULTURA',
    'FAMOSOS',
    'TECNOLOGIA',
  ]);

  merged.basic.topBarLinks = (merged.basic.topBarLinks ?? cleanTopBarLinks)
    .filter((link) => !blockedTopBarLabels.has(link.label?.trim() ?? ''));

  if (merged.basic.topBarLinks.length === 0) {
    merged.basic.topBarLinks = cleanTopBarLinks;
  }

  return merged;
}

export function useSettings() {
  const STORAGE_KEY = 'pz_news_settings';
  const currentUser = getCurrentAdminUser();
  const canManageSettings = isAdmin(currentUser);

  const getSettings = useCallback((): SiteSettings => {
    if (typeof window === 'undefined') return defaultSettings;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSettings;

    try {
      const parsed = JSON.parse(stored) as Partial<SiteSettings>;
      return mergeSettings(defaultSettings, parsed);
    } catch (error) {
      console.error('Erro ao ler configurações salvas:', error);
      return defaultSettings;
    }
  }, []);

  const saveSettings = useCallback((settings: SiteSettings) => {
    if (typeof window === 'undefined') return;
    if (!canManageSettings) {
      throw new Error('Acesso negado para alterar configurações.');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
  }, [canManageSettings]);

  const updateSetting = useCallback(
    <K extends keyof SiteSettings>(section: K, updates: Partial<SiteSettings[K]>) => {
      if (!canManageSettings) {
        throw new Error('Acesso negado para alterar configurações.');
      }

      const current = getSettings();
      const updated = {
        ...current,
        [section]: {
          ...current[section],
          ...updates,
        },
      };
      saveSettings(updated);
      return updated;
    },
    [canManageSettings, getSettings, saveSettings]
  );

  const resetToDefaults = useCallback(() => {
    if (!canManageSettings) {
      throw new Error('Acesso negado para alterar configurações.');
    }

    saveSettings(defaultSettings);
  }, [canManageSettings, saveSettings]);

  return useMemo(
    () => ({
      getSettings,
      saveSettings,
      updateSetting,
      resetToDefaults,
    }),
    [getSettings, saveSettings, updateSetting, resetToDefaults]
  );
}

/**
 * Função para validar configurações
 */
export function validateSettings(settings: Partial<SiteSettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (settings.basic) {
    if (!settings.basic.siteName?.trim()) errors.push('Nome do site é obrigatório');
  }

  if (settings.email) {
    if (!settings.email.senderEmail?.includes('@')) errors.push('Email válido obrigatório');
    if (settings.email.smtpPort && (settings.email.smtpPort < 1 || settings.email.smtpPort > 65535)) {
      errors.push('Porta SMTP inválida');
    }
  }

  if (settings.commercial) {
    if (settings.commercial.email && !settings.commercial.email.includes('@')) {
      errors.push('E-mail comercial deve ser válido');
    }
  }

  if (settings.content) {
    if (settings.content.postsPerPage && settings.content.postsPerPage < 1) {
      errors.push('Posts por página deve ser maior que 0');
    }
  }

  if (settings.security) {
    if (settings.security.sessionTimeout && settings.security.sessionTimeout < 5) {
      errors.push('Timeout de sessão deve ser mínimo 5 minutos');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

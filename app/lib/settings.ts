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
    siteTagline: 'Rede Brasileira de Notícias',
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
    if (!settings.basic.siteTagline?.trim()) errors.push('Tagline do site é obrigatória');
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

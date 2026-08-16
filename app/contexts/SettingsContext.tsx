'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SiteSettings, useSettings } from '@/app/lib/settings';

interface SettingsContextType {
  settings: SiteSettings | null;
  loading: boolean;
  updateSettings: (settings: SiteSettings) => void;
  applyColorSettings: () => void;
  applyFontSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { getSettings, saveSettings } = useSettings();

  // Load settings on mount
  useEffect(() => {
    try {
      const loaded = getSettings();
      setSettings(loaded);
      applySettings(loaded);
    } catch (error) {
      console.error('Erro ao carregar settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
        applySettings(customEvent.detail);
      }
    };

    window.addEventListener('settingsChanged', handleSettingsChange);
    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, []);

  const applySettings = (newSettings: SiteSettings) => {
    applyColorSettings(newSettings);
    applyFontSettings(newSettings);
  };

  const applyColorSettings = (newSettings: SiteSettings) => {
    const root = document.documentElement;

    const primary = newSettings.visual.primaryColor || '#c40000';
    const secondary = newSettings.visual.secondaryColor || '#111111';
    const accent = newSettings.visual.accentColor || primary;
    const footerBg = newSettings.visual.footerBackgroundColor || '#111111';
    const footerText = newSettings.visual.footerTextColor || '#FFFFFF';

    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-secondary', secondary);
    root.style.setProperty('--color-accent', accent);
    root.style.setProperty('--color-footer-bg', footerBg);
    root.style.setProperty('--color-footer-text', footerText);
    root.style.setProperty('--primary-red', primary);
    root.style.setProperty('--dark-black', '#111111');
    root.style.setProperty('--accent', accent);
  };

  const applyFontSettings = (newSettings: SiteSettings) => {
    const root = document.documentElement;

    if (newSettings.visual.fontFamily) {
      root.style.setProperty('--font-primary', newSettings.visual.fontFamily);
      root.style.setProperty('--font-sans', newSettings.visual.fontFamily);
      root.style.setProperty('--font-secondary', newSettings.visual.fontFamily);
      root.style.setProperty('--font-family', newSettings.visual.fontFamily);
    }
  };

  const updateSettings = (newSettings: SiteSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    applySettings(newSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        applyColorSettings: () => settings && applyColorSettings(settings),
        applyFontSettings: () => settings && applyFontSettings(settings),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext deve ser usado dentro de SettingsProvider');
  }
  return context;
}

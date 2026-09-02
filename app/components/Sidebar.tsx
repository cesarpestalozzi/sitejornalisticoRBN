'use client';

import { useEffect, useMemo } from 'react';
import WeatherWidget from '@/app/components/WeatherWidget';
import { useAdvertisements } from '@/app/hooks/useAdvertisements';
import { defaultSettings } from '@/app/lib/settings';
import { useSettingsContext } from '@/app/contexts/SettingsContext';

function normalizeDay(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export default function Sidebar() {
  const { settings: contextSettings } = useSettingsContext();
  const { ads = [], incrementAdImpression, incrementAdClick } = useAdvertisements();
  const currentSettings = contextSettings ?? defaultSettings;
  const showAdsOnHomepage = currentSettings.content.showAdsOnHomepage;
  const showWeatherOnHomepage = currentSettings.content.showWeatherOnHomepage;
  const visibleAds = useMemo(() => {
    if (!showAdsOnHomepage) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return ads.filter((ad) => {
      if (!ad.active) {
        return false;
      }

      const startDate = normalizeDay(ad.startDate);
      const endDate = normalizeDay(ad.endDate);

      const starts = !startDate || startDate <= today;
      const ends = !endDate || endDate >= today;

      return starts && ends;
    });
  }, [ads, showAdsOnHomepage]);

  useEffect(() => {
    if (typeof window === 'undefined' || visibleAds.length === 0) {
      return;
    }

    visibleAds.forEach((ad) => {
      const key = `pznews-ad-impression-${ad.id}`;
      if (sessionStorage.getItem(key)) {
        return;
      }

      sessionStorage.setItem(key, '1');
      incrementAdImpression(ad.id);
    });
  }, [visibleAds, incrementAdImpression]);

  if (!showAdsOnHomepage && !showWeatherOnHomepage) {
    return null;
  }

  return (
    <aside className="w-full max-w-[320px] space-y-6 lg:ml-auto">
      {showWeatherOnHomepage && (
        <div className="hidden lg:block">
          <WeatherWidget />
        </div>
      )}

      {showAdsOnHomepage && visibleAds.length > 0 && (
        <div className="space-y-4">
          {visibleAds.map((ad) => (
            <div key={ad.id} className="rounded-lg bg-white shadow-md overflow-hidden border border-gray-200">
              {ad.imageUrl && (
                <div className="h-40 bg-gray-200 overflow-hidden">
                  <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <h4 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">{ad.title}</h4>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{ad.description}</p>
                {ad.link && (
                  <a
                    href={ad.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => incrementAdClick(ad.id)}
                    className="inline-flex w-full items-center justify-center rounded bg-[#991B1B] px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-[#7F1D1D] focus:outline-none focus:ring-2 focus:ring-[#991B1B]/40 !text-white"
                  >
                    Saiba mais
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-400 px-4 pb-2">Publicidade</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

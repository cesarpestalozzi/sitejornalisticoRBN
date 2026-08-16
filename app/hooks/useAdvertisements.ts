import { useEffect, useState } from 'react';
import { getCurrentAdminUser, isAdmin } from '@/app/lib/adminPermissions';

export type AdvertisementPosition = 'header' | 'sidebar' | 'footer' | 'inline';

export interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  position: AdvertisementPosition;
  startDate: string;
  endDate: string;
  active: boolean;
  clicks: number;
  impressions: number;
  ctr: number;
}

const ADS_KEY = 'pz_news_ads';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_TABLE = 'pz_news_ads';

type SupabaseAdvertisementRow = {
  id: string;
  payload: Advertisement;
  updated_at?: string;
};

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getSupabaseEndpoint(query = '') {
  return `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}${query}`;
}

function getSupabaseHeaders() {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY as string,
    'Content-Type': 'application/json',
  };

  const key = SUPABASE_ANON_KEY as string;
  if (key.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

function svgBanner(label: string, background: string, accent: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="${background}" />
      <rect x="72" y="72" width="1056" height="486" rx="40" fill="${accent}" opacity="0.16" />
      <text x="96" y="285" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="#111827">AO PONTO BR</text>
      <text x="96" y="385" font-family="Arial, sans-serif" font-size="42" fill="#1f2937">${label}</text>
    </svg>
  `;
  const bytes = new TextEncoder().encode(svg);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function getMockAds(): Advertisement[] {
  return [
    {
      id: '1',
      title: 'Campanha institucional',
      description: 'Banner principal no topo com divulgação institucional do AO PONTO BR.',
      imageUrl: svgBanner('Campanha institucional', '#FEE2E2', '#991B1B'),
      link: 'https://pznews.com.br',
      position: 'header',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      active: true,
      clicks: 1250,
      impressions: 15000,
      ctr: 8.33,
    },
    {
      id: '2',
      title: 'Anúncio lateral',
      description: 'Campanha promocional exibida na barra lateral do portal.',
      imageUrl: svgBanner('Anúncio lateral', '#eef4ff', '#5b7cfa'),
      link: 'https://pznews.com.br/publicidade',
      position: 'sidebar',
      startDate: '2026-08-05',
      endDate: '2026-08-25',
      active: true,
      clicks: 850,
      impressions: 12000,
      ctr: 7.08,
    },
  ];
}

const DEFAULT_ADS = getMockAds();

function calculateCtr(clicks: number, impressions: number) {
  if (impressions <= 0) {
    return 0;
  }
  return Number(((clicks / impressions) * 100).toFixed(2));
}

function normalizeAd(ad: Partial<Advertisement>): Advertisement {
  const clicks = typeof ad.clicks === 'number' ? ad.clicks : 0;
  const impressions = typeof ad.impressions === 'number' ? ad.impressions : 0;

  return {
    id: ad.id ?? Date.now().toString(),
    title: ad.title ?? '',
    description: ad.description ?? '',
    imageUrl: ad.imageUrl ?? '',
    link: ad.link ?? '',
    position: (ad.position as AdvertisementPosition) ?? 'sidebar',
    startDate: ad.startDate ?? '',
    endDate: ad.endDate ?? '',
    active: typeof ad.active === 'boolean' ? ad.active : true,
    clicks,
    impressions,
    ctr: calculateCtr(clicks, impressions),
  };
}

function readLocalAds() {
  const stored = localStorage.getItem(ADS_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as Advertisement[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((ad) => normalizeAd(ad));
  } catch (error) {
    console.error('Erro ao carregar publicidades locais:', error);
    return [];
  }
}

async function readRemoteAds() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const response = await fetch(
    getSupabaseEndpoint('?select=id,payload,updated_at&order=updated_at.desc'),
    {
      method: 'GET',
      headers: getSupabaseHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao ler publicidades remotas: ${response.status}`);
  }

  const rows = (await response.json()) as SupabaseAdvertisementRow[];
  return rows
    .filter((row) => row && row.payload)
    .map((row) => normalizeAd({ ...row.payload, id: row.id }));
}

async function upsertRemoteAd(ad: Advertisement) {
  if (!hasSupabaseConfig()) {
    return;
  }

  const response = await fetch(getSupabaseEndpoint('?on_conflict=id'), {
    method: 'POST',
    headers: {
      ...getSupabaseHeaders(),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([
      {
        id: ad.id,
        payload: ad,
        updated_at: new Date().toISOString(),
      },
    ]),
  });

  if (!response.ok) {
    throw new Error(`Erro ao salvar publicidade remota: ${response.status}`);
  }
}

async function deleteRemoteAdById(id: string) {
  if (!hasSupabaseConfig()) {
    return;
  }

  const response = await fetch(getSupabaseEndpoint(`?id=eq.${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: {
      ...getSupabaseHeaders(),
      Prefer: 'return=minimal',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao excluir publicidade remota: ${response.status}`);
  }
}

export function useAdvertisements() {
  const [ads, setAds] = useState<Advertisement[]>(DEFAULT_ADS);
  const [isLoaded, setIsLoaded] = useState(false);
  const currentUser = getCurrentAdminUser();
  const canManageAds = isAdmin(currentUser);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      const localAds = readLocalAds();

      try {
        const remoteAds = await readRemoteAds();

        if (!isActive) {
          return;
        }

        if (remoteAds) {
          if (remoteAds.length === 0) {
            if (localAds.length > 0) {
              setAds(localAds);
              localAds.forEach((ad) => {
                void upsertRemoteAd(ad).catch((error) => {
                  console.error('Erro ao semear publicidade local no remoto:', error);
                });
              });
            } else {
              setAds(getMockAds());
            }
          } else {
            setAds(remoteAds);
          }

          setIsLoaded(true);
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar publicidades remotas:', error);
      }

      if (!isActive) {
        return;
      }

      setAds(localAds.length > 0 ? localAds : getMockAds());
      setIsLoaded(true);
    };

    load();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(ADS_KEY, JSON.stringify(ads));
    }
  }, [ads, isLoaded]);

  const addAdvertisement = (ad: Omit<Advertisement, 'id' | 'ctr'> & { ctr?: number }) => {
    if (!canManageAds) {
      throw new Error('Acesso negado para gerenciar publicidades.');
    }

    const newAd = normalizeAd({
      ...ad,
      id: Date.now().toString(),
    });

    setAds((current) => [newAd, ...current]);
    void upsertRemoteAd(newAd).catch((error) => {
      console.error('Erro ao sincronizar nova publicidade:', error);
    });
    return newAd;
  };

  const updateAdvertisement = (id: string, updates: Partial<Advertisement>) => {
    if (!canManageAds) {
      throw new Error('Acesso negado para gerenciar publicidades.');
    }

    setAds((current) =>
      current.map((ad) => {
        if (ad.id !== id) {
          return ad;
        }

        const next = normalizeAd({ ...ad, ...updates });
        void upsertRemoteAd(next).catch((error) => {
          console.error('Erro ao sincronizar atualização de publicidade:', error);
        });

        return next;
      })
    );
  };

  const deleteAdvertisement = (id: string) => {
    if (!canManageAds) {
      throw new Error('Acesso negado para gerenciar publicidades.');
    }

    setAds((current) => current.filter((ad) => ad.id !== id));
    void deleteRemoteAdById(id).catch((error) => {
      console.error('Erro ao sincronizar exclusão de publicidade:', error);
    });
  };

  const incrementAdImpression = (id: string) => {
    setAds((current) =>
      current.map((ad) => {
        if (ad.id !== id) {
          return ad;
        }

        const next = normalizeAd({
          ...ad,
          impressions: (ad.impressions ?? 0) + 1,
        });
        void upsertRemoteAd(next).catch((error) => {
          console.error('Erro ao sincronizar impressão de publicidade:', error);
        });
        return next;
      })
    );
  };

  const incrementAdClick = (id: string) => {
    setAds((current) =>
      current.map((ad) => {
        if (ad.id !== id) {
          return ad;
        }

        const next = normalizeAd({
          ...ad,
          clicks: (ad.clicks ?? 0) + 1,
        });
        void upsertRemoteAd(next).catch((error) => {
          console.error('Erro ao sincronizar clique de publicidade:', error);
        });
        return next;
      })
    );
  };

  return {
    ads: ads.length > 0 ? ads : DEFAULT_ADS,
    isLoaded,
    addAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,
    incrementAdImpression,
    incrementAdClick,
  };
}

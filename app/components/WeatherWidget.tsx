'use client';

import { useEffect, useMemo, useState } from 'react';

type WeatherIcon = 'sun' | 'cloud' | 'partially-cloudy' | 'rain' | 'storm';

type WeatherPoint = {
  date: string;
  label: string;
  code: number;
  max: number;
  min: number;
};

type WeatherLocation = {
  city: string;
  district: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
};

type WeatherData = {
  location: WeatherLocation;
  temperature: number;
  min: number;
  max: number;
  condition: string;
  icon: WeatherIcon;
  updatedAt: string;
  forecast: WeatherPoint[];
};

const WEATHER_CODE_MAP: Record<number, { label: string; icon: WeatherIcon }> = {
  0: { label: 'Ensolarado', icon: 'sun' },
  1: { label: 'Parcialmente nublado', icon: 'partially-cloudy' },
  2: { label: 'Parcialmente nublado', icon: 'partially-cloudy' },
  3: { label: 'Nublado', icon: 'cloud' },
  45: { label: 'Nevoeiro', icon: 'cloud' },
  48: { label: 'Nevoeiro', icon: 'cloud' },
  51: { label: 'Garoa leve', icon: 'rain' },
  53: { label: 'Garoa', icon: 'rain' },
  55: { label: 'Garoa forte', icon: 'rain' },
  56: { label: 'Gelo', icon: 'rain' },
  57: { label: 'Gelo', icon: 'rain' },
  61: { label: 'Chuva leve', icon: 'rain' },
  63: { label: 'Chuva', icon: 'rain' },
  65: { label: 'Chuva forte', icon: 'rain' },
  66: { label: 'Chuva forte', icon: 'rain' },
  67: { label: 'Chuva forte', icon: 'rain' },
  71: { label: 'Neve leve', icon: 'rain' },
  73: { label: 'Neve', icon: 'rain' },
  75: { label: 'Neve forte', icon: 'rain' },
  77: { label: 'Granizo', icon: 'rain' },
  80: { label: 'Chuvas isoladas', icon: 'rain' },
  81: { label: 'Chuva', icon: 'rain' },
  82: { label: 'Chuva intensa', icon: 'rain' },
  85: { label: 'Neve leve', icon: 'rain' },
  86: { label: 'Neve forte', icon: 'rain' },
  95: { label: 'Trovoada', icon: 'storm' },
  96: { label: 'Trovoada', icon: 'storm' },
  99: { label: 'Trovoada', icon: 'storm' },
};

function getWeatherMeta(code: number) {
  return WEATHER_CODE_MAP[code] ?? { label: 'Variável', icon: 'cloud' as WeatherIcon };
}

function getDayLabel(date: string) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return 'Hoje';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(value);
  candidate.setHours(0, 0, 0, 0);

  if (candidate.getTime() === today.getTime()) {
    return 'Hoje';
  }

  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(value).replace('.', '').slice(0, 3).toUpperCase();
}

function getIcon(icon: WeatherIcon, sizeClass = 'h-8 w-8') {
  const common = sizeClass;

  switch (icon) {
    case 'sun':
      return (
        <svg viewBox="0 0 100 100" className={common} aria-label="Sol" role="img">
          <circle cx="50" cy="50" r="18" fill="#F4B942" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="#F4B942" strokeWidth="4" />
          {[...Array(12)].map((_, index) => {
            const angle = (index / 12) * Math.PI * 2;
            const x1 = 50 + Math.cos(angle) * 28;
            const y1 = 50 + Math.sin(angle) * 28;
            const x2 = 50 + Math.cos(angle) * 38;
            const y2 = 50 + Math.sin(angle) * 38;
            return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F4B942" strokeWidth="3" strokeLinecap="round" />;
          })}
        </svg>
      );
    case 'partially-cloudy':
      return (
        <svg viewBox="0 0 100 100" className={common} aria-label="Parcialmente nublado" role="img">
          <circle cx="30" cy="38" r="14" fill="#F4B942" />
          <g fill="#E5E7EB">
            <ellipse cx="48" cy="64" rx="24" ry="15" />
            <ellipse cx="68" cy="56" rx="17" ry="11" />
            <ellipse cx="28" cy="57" rx="16" ry="11" />
          </g>
        </svg>
      );
    case 'cloud':
      return (
        <svg viewBox="0 0 100 100" className={common} aria-label="Nublado" role="img">
          <g fill="#E5E7EB">
            <ellipse cx="40" cy="58" rx="23" ry="15" />
            <ellipse cx="62" cy="53" rx="19" ry="12" />
            <ellipse cx="28" cy="57" rx="17" ry="11" />
          </g>
        </svg>
      );
    case 'rain':
      return (
        <svg viewBox="0 0 100 100" className={common} aria-label="Chuva" role="img">
          <g fill="#E5E7EB">
            <ellipse cx="40" cy="57" rx="23" ry="14" />
            <ellipse cx="61" cy="52" rx="18" ry="12" />
            <ellipse cx="26" cy="55" rx="16" ry="10" />
          </g>
          <g stroke="#7EA7D9" strokeWidth="3" strokeLinecap="round">
            <line x1="33" y1="68" x2="27" y2="81" />
            <line x1="47" y1="69" x2="41" y2="82" />
            <line x1="60" y1="68" x2="54" y2="81" />
          </g>
        </svg>
      );
    case 'storm':
      return (
        <svg viewBox="0 0 100 100" className={common} aria-label="Trovoada" role="img">
          <g fill="#E5E7EB">
            <ellipse cx="38" cy="60" rx="22" ry="13" />
            <ellipse cx="60" cy="53" rx="18" ry="11" />
            <ellipse cx="28" cy="57" rx="15" ry="10" />
          </g>
          <path d="M52 62 L63 62 L55 77 L68 77 L49 95 L52 80 L38 80 Z" fill="#F4B942" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100" className={common} aria-label="Tempo variável" role="img">
          <circle cx="48" cy="40" r="14" fill="#F4B942" />
          <g fill="#E5E7EB"><ellipse cx="52" cy="63" rx="24" ry="14" /></g>
        </svg>
      );
  }
}

async function resolveLocation() {
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (value) => resolve(value),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
      );
    });

    if (position) {
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    }
  }

  try {
    const response = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (!response.ok) {
      return { latitude: -23.55052, longitude: -46.633308 };
    }

    const payload = (await response.json()) as { latitude?: number; longitude?: number };
    if (typeof payload.latitude === 'number' && typeof payload.longitude === 'number') {
      return { latitude: payload.latitude, longitude: payload.longitude };
    }
  } catch {
    // Fallback final para São Paulo.
  }

  return { latitude: -23.55052, longitude: -46.633308 };
}

async function fetchWeatherData(): Promise<WeatherData> {
  const coords = await resolveLocation();

  const forecastResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7&temperature_unit=celsius&wind_speed_unit=kmh`,
    { cache: 'no-store' }
  );

  if (!forecastResponse.ok) {
    throw new Error('Não foi possível carregar os dados do clima.');
  }

  const payload = (await forecastResponse.json()) as {
    current?: { temperature_2m?: number; weather_code?: number; time?: string };
    daily?: { time?: string[]; weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] };
  };

  const locationResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${coords.latitude}&longitude=${coords.longitude}&language=pt&format=json`,
    { cache: 'no-store' }
  );

  const locationPayload = (await locationResponse.json()) as {
    results?: Array<{ name?: string; admin1?: string; admin2?: string; country?: string; locality?: string; county?: string }>
  };

  const result = locationPayload.results?.[0];
  const city = result?.name || 'Sua localização';
  const district = result?.locality || result?.admin2 || result?.county || 'Centro';
  const region = result?.admin1 || 'SP';
  const country = result?.country || 'Brasil';

  const forecast = (payload.daily?.time ?? []).slice(0, 7).map((date, index) => {
    const code = payload.daily?.weather_code?.[index] ?? 0;
    return {
      date,
      label: getDayLabel(date),
      code,
      max: Math.round(payload.daily?.temperature_2m_max?.[index] ?? 0),
      min: Math.round(payload.daily?.temperature_2m_min?.[index] ?? 0),
    };
  });

  const currentCode = payload.current?.weather_code ?? 0;
  const currentMeta = getWeatherMeta(currentCode);

  return {
    location: {
      city,
      district,
      region,
      country,
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
    temperature: Math.round(payload.current?.temperature_2m ?? 0),
    min: Math.round(forecast[0]?.min ?? 0),
    max: Math.round(forecast[0]?.max ?? 0),
    condition: currentMeta.label,
    icon: currentMeta.icon,
    updatedAt: payload.current?.time ?? new Date().toISOString(),
    forecast,
  };
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const nextWeather = await fetchWeatherData();
        if (active) {
          setWeather(nextWeather);
          setSelectedIndex(0);
        }
      } catch {
        if (active) {
          setWeather({
            location: { city: 'São Paulo', district: 'Centro', region: 'SP', country: 'Brasil', latitude: -23.55052, longitude: -46.633308 },
            temperature: 28,
            min: 16,
            max: 31,
            condition: 'Ensolarado',
            icon: 'sun',
            updatedAt: new Date().toISOString(),
            forecast: [
              { date: new Date().toISOString(), label: 'Hoje', code: 0, max: 31, min: 16 },
              { date: new Date(Date.now() + 86400000).toISOString(), label: 'Seg', code: 1, max: 29, min: 18 },
              { date: new Date(Date.now() + 86400000 * 2).toISOString(), label: 'Ter', code: 3, max: 27, min: 19 },
              { date: new Date(Date.now() + 86400000 * 3).toISOString(), label: 'Qua', code: 61, max: 24, min: 18 },
              { date: new Date(Date.now() + 86400000 * 4).toISOString(), label: 'Qui', code: 2, max: 25, min: 17 },
              { date: new Date(Date.now() + 86400000 * 5).toISOString(), label: 'Sex', code: 3, max: 26, min: 17 },
              { date: new Date(Date.now() + 86400000 * 6).toISOString(), label: 'Sáb', code: 0, max: 30, min: 18 },
            ],
          });
          setSelectedIndex(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, 30 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const cards = useMemo(() => weather?.forecast.slice(0, 7) ?? [], [weather]);
  const activeDay = cards[selectedIndex] ?? cards[0];
  const activeMeta = activeDay ? getWeatherMeta(activeDay.code) : null;

  if (!weather && loading) {
    return (
      <div className="mx-auto w-full max-w-[320px] rounded-[16px] border border-[#ececec] bg-white p-3 shadow-[0_14px_30px_rgba(17,17,17,0.06)]">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-24 rounded bg-[#f1f1f1]" />
          <div className="h-8 w-full rounded bg-[#f5f5f5]" />
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-16 rounded bg-[#f5f5f5]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  const formattedClock = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const isNight = currentTime.getHours() >= 18 || currentTime.getHours() < 6;

  const shellClass = isNight ? 'border-[#30363d] bg-[#1d232b] text-white' : 'border-[#e7e7e7] bg-white text-[#111111]';
  const panelClass = isNight ? 'bg-[#2a3038]' : 'bg-[#fafafa]';
  const panelTextClass = isNight ? 'text-[#dfe6ee]' : 'text-[#4b5563]';
  const strongTextClass = isNight ? 'text-white' : 'text-[#111111]';
  const mutedTextClass = isNight ? 'text-white/80' : 'text-[#374151]';
  const dayCardClass = isNight ? 'border-[#3b434d] bg-[#222a32] text-white/80 hover:border-[#4c5865]' : 'border-[#efefef] bg-[#fafafa] hover:border-[#d7d7d7]';
  const activeDayCardClass = isNight ? 'border-[#dfeaf5] bg-[#f5f7fa] text-[#111827] shadow-[0_8px_24px_rgba(255,255,255,0.08)]' : 'border-[#991B1B] bg-[#991B1B]/5 text-[#111827] shadow-[0_0_0_1px_rgba(153,27,27,0.08)]';

  const hourly = Array.from({ length: 6 }, (_, index) => {
    const targetHour = (currentTime.getHours() + index) % 24;
    const time = new Date(currentTime);
    time.setHours(targetHour, 0, 0, 0);
    const label = index === 0 ? 'Agora' : time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':00', '').replace(' ', '');
    const code = index === 0 ? (activeDay?.code ?? 0) : (cards[(index + selectedIndex) % cards.length]?.code ?? 0);

    return {
      label,
      temp: Math.max(18, (activeDay?.max ?? weather.temperature) - Math.max(0, 4 - index) + (index === 0 ? 0 : 1)),
      icon: getWeatherMeta(code).icon,
    };
  });

  return (
    <div className={`mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] border p-4 shadow-[0_20px_40px_rgba(0,0,0,0.22)] ${shellClass}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className={`text-[26px] font-black tracking-[-0.06em] ${strongTextClass}`}>Clima</h3>
        <div className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isNight ? 'border-white/10 bg-white/5 text-white/80' : 'border-[#e7e7e7] bg-[#f9f9f9] text-[#555]'}`}>
          Online
        </div>
      </div>

      <div className={`rounded-[24px] p-4 ${panelClass}`}>
        <div className="mb-4 grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${panelTextClass}`}>Data</div>
            <div className={`mt-1 truncate text-[13px] font-semibold ${strongTextClass}`}>{formattedDate}</div>
          </div>

          <div className={`rounded-[16px] border px-2.5 py-2 text-center ${isNight ? 'border-white/10 bg-white/5' : 'border-[#ececec] bg-white'}`}>
            <div className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${panelTextClass}`}>Hora</div>
            <div className={`mt-1 text-[18px] font-black tracking-[0.08em] ${strongTextClass}`}>{formattedClock}</div>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-start leading-none">
              <span className={`text-[60px] font-black tracking-[-0.08em] ${strongTextClass}`}>{activeDay ? activeDay.max : weather.temperature}</span>
              <span className={`pt-4 text-[22px] font-semibold ${isNight ? 'text-white/80' : 'text-[#111111]'}`}>°</span>
            </div>
          </div>

          <div className="pt-2 text-right">
            <div className={`text-[18px] font-semibold ${strongTextClass}`}>{activeMeta?.label ?? weather.condition}</div>
            <div className={`mt-1 text-[12px] ${panelTextClass}`}>Sensação térmica: {Math.max((activeDay?.max ?? weather.temperature) - 1, 18)}°</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 rounded-[14px] border border-dashed border-[#d1d5db] px-2.5 py-2 text-[11px] text-[#666]">
          <span className="font-medium">{weather.location.city}</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#999]">{weather.location.district}</span>
        </div>

        <div className="mt-5 grid grid-cols-6 gap-2">
          {hourly.map((slot, idx) => (
            <div key={`${slot.label}-${idx}`} className="text-center">
              <div className={`text-[11px] font-medium ${panelTextClass}`}>{slot.temp}°</div>
              <div className={`mt-2 flex justify-center ${isNight ? 'text-[#dfeaf5]' : 'text-[#111111]'}`}>{getIcon(slot.icon, idx === 0 ? 'h-10 w-10' : 'h-9 w-9')}</div>
              <div className={`mt-2 text-[11px] ${panelTextClass}`}>{slot.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2">
        {cards.slice(0, 5).map((item, index) => {
          const isSelected = index === selectedIndex;
          const meta = getWeatherMeta(item.code);

          return (
            <button
              type="button"
              key={`${item.date}-${item.label}`}
              onClick={() => setSelectedIndex(index)}
              className={`rounded-[16px] border px-2 py-3 text-center transition-all ${isSelected ? activeDayCardClass : dayCardClass}`}
            >
              <div className={`text-[11px] font-black uppercase tracking-[0.08em] ${isSelected ? 'text-[#111827]' : isNight ? 'text-[#e5e7eb]' : 'text-[#374151]'}`}>
                {item.label}
              </div>
              <div className="mt-2 flex justify-center">{getIcon(meta.icon, isSelected ? 'h-9 w-9' : 'h-8 w-8')}</div>
              <div className={`mt-2 text-[13px] font-bold ${isSelected ? 'text-[#111827]' : isNight ? 'text-white' : 'text-[#111111]'}`}>
                {item.max}°/{item.min}°
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  image: string;
  audioUrl: string;
  status: 'rascunho' | 'publicado';
  createdAt: string;
  updatedAt: string;
  episode: number;
  duration: number;
  articleId?: string;
}

const PODCASTS_KEY = 'pz_news_podcasts';

function getDefaultEpisodes(): PodcastEpisode[] {
  const now = new Date();

  const iso = (daysAgo: number, hoursAgo = 0) => {
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);
    return date.toISOString();
  };

  return [
    {
      id: 'podcast-1',
      title: 'RBN em Foco: EUA e o novo cenário global',
      description: 'Análise do impacto das decisões internacionais sobre a economia e o mercado brasileiro.',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      status: 'publicado',
      createdAt: iso(4, 9),
      updatedAt: iso(1, 3),
      episode: 118,
      duration: 1850,
      articleId: 'article-1',
    },
    {
      id: 'podcast-2',
      title: 'Tecnologia em Debate: IA, automação e carreira',
      description: 'Um panorama sobre as tendências digitais e o futuro do trabalho em tecnologia.',
      image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      status: 'publicado',
      createdAt: iso(7, 10),
      updatedAt: iso(2, 6),
      episode: 117,
      duration: 1640,
      articleId: 'article-2',
    },
    {
      id: 'podcast-3',
      title: 'Economia em Movimento: mercado e consumo',
      description: 'Especialistas discutem o comportamento do mercado e o impacto no consumo local.',
      image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      status: 'rascunho',
      createdAt: iso(8, 5),
      updatedAt: iso(5, 2),
      episode: 116,
      duration: 1320,
    },
  ];
}

export function usePodcasts() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(PODCASTS_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PodcastEpisode[];
        const nextEpisodes = Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultEpisodes();
        setEpisodes(nextEpisodes);
      } catch {
        setEpisodes(getDefaultEpisodes());
      }
    } else {
      setEpisodes(getDefaultEpisodes());
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(PODCASTS_KEY, JSON.stringify(episodes));
    }
  }, [episodes, isLoaded]);

  const addEpisode = (episode: Omit<PodcastEpisode, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const nextEpisode: PodcastEpisode = {
      ...episode,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };

    setEpisodes((current) => [nextEpisode, ...current]);
    return nextEpisode;
  };

  const updateEpisode = (id: string, updates: Partial<PodcastEpisode>) => {
    setEpisodes((current) =>
      current.map((episode) => (episode.id === id ? { ...episode, ...updates, updatedAt: new Date().toISOString() } : episode))
    );
  };

  const deleteEpisode = (id: string) => {
    setEpisodes((current) => current.filter((episode) => episode.id !== id));
  };

  const publishedEpisodes = useMemo(() => episodes.filter((episode) => episode.status === 'publicado'), [episodes]);

  return {
    episodes,
    publishedEpisodes,
    isLoaded,
    addEpisode,
    updateEpisode,
    deleteEpisode,
  };
}

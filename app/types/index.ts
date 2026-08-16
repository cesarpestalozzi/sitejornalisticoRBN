// RBN - Types and Interfaces

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  excerpt: string;
  category: string;
  author: string;
  authorImage?: string;
  image: string;
  date: Date;
  readingTime: number;
  tags: string[];
  featured?: boolean;
  views?: number;
  comments?: number;
  shares?: number;
}

export interface NewsCard {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: Date;
  author: string;
  readingTime: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
}

export interface Breaking {
  id: string;
  title: string;
  timestamp: Date;
  urgent: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'journalist' | 'columnist';
  image?: string;
}

export interface VideoContent {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  duration: number;
  date: Date;
  category: string;
}

export interface Podcast {
  id: string;
  title: string;
  episode: number;
  season: number;
  description: string;
  audioUrl: string;
  thumbnail: string;
  date: Date;
  duration: number;
}

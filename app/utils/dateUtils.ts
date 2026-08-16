// Date utilities for RBN

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(date: Date): string {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (seconds < 60) {
    return 'há alguns segundos';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }

  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
}

export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

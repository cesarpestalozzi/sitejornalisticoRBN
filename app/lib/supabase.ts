export function isValidSupabaseUrl(value?: string | null) {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export const hasSupabaseConfig = false;
export const supabase: any = null;

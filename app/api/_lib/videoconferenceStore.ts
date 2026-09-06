import { hasUserStoreConfig } from '@/app/api/_lib/userStore';

export type MeetingStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export type MeetingParticipant = {
  userId: string;
  name: string;
  email: string;
  role?: string;
  status: 'invited' | 'accepted' | 'declined' | 'attended';
  joinedAt?: string;
};

export type VideoconferenceMeeting = {
  id: string;
  title: string;
  description?: string | null;
  roomName: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  scheduledAt: string;
  durationMinutes: number;
  status: MeetingStatus;
  participants: MeetingParticipant[];
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  payload?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  deleted?: boolean;
};

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
    if (value && value !== '[SENSITIVE]') return value;
  }
  return '';
}

const baseUrl = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, '');
const key = env('SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
const table = baseUrl ? `${baseUrl}/rest/v1/pz_news_videoconferences` : '';
const fallbackTable = baseUrl ? `${baseUrl}/rest/v1/pz_news_articles` : '';

export function hasVideoconferenceStoreConfig() {
  return hasUserStoreConfig() && Boolean(baseUrl && key);
}

function headers() {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Supabase recusou a operação de videoconferência (${response.status}).${detail ? ` ${detail.slice(0, 180)}` : ''}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return [];
  const text = await response.text().catch(() => '');
  if (!text.trim()) return [];
  try {
    return JSON.parse(text) as Row[];
  } catch {
    return [];
  }
}

function isMissingTable(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 404);
}

function meetingFromPayload(payload: Record<string, unknown>, id: string): VideoconferenceMeeting {
  return {
    id: String(payload.id ?? id),
    title: String(payload.title ?? 'Reunião sem título'),
    description: typeof payload.description === 'string' ? payload.description : null,
    roomName: String(payload.roomName ?? `rbn-videoconf-${id.slice(0, 8)}`),
    hostId: String(payload.hostId ?? ''),
    hostName: String(payload.hostName ?? 'Organizador'),
    hostEmail: String(payload.hostEmail ?? ''),
    scheduledAt: String(payload.scheduledAt ?? new Date().toISOString()),
    durationMinutes: Number(payload.durationMinutes ?? 30),
    status: (['scheduled', 'active', 'completed', 'cancelled'].includes(String(payload.status)) ? payload.status : 'scheduled') as MeetingStatus,
    participants: Array.isArray(payload.participants) ? (payload.participants as MeetingParticipant[]) : [],
    startedAt: typeof payload.startedAt === 'string' ? payload.startedAt : null,
    endedAt: typeof payload.endedAt === 'string' ? payload.endedAt : null,
    createdAt: String(payload.createdAt ?? new Date().toISOString()),
    updatedAt: String(payload.updatedAt ?? new Date().toISOString()),
  };
}

export async function listMeetings(userId?: string): Promise<VideoconferenceMeeting[]> {
  try {
    const rows = await request(`${table}?select=id,payload,created_at,updated_at&order=updated_at.desc&limit=1000`);
    const meetings = rows.map((row) => meetingFromPayload(row.payload ?? {}, row.id));
    if (!userId) return meetings;
    return meetings.filter(
      (m) => m.hostId === userId || m.participants.some((p) => p.userId === userId)
    );
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    const rows = await request(`${fallbackTable}?id=like.__videoconference:*&select=id,payload,updated_at&order=updated_at.desc&limit=1000`);
    const meetings = rows
      .map((row) => row.payload)
      .filter((p): p is Record<string, unknown> => Boolean(p && p._type === 'videoconference_meeting'))
      .map((p) => meetingFromPayload(p, String(p.id ?? '')));
    if (!userId) return meetings;
    return meetings.filter(
      (m) => m.hostId === userId || m.participants.some((p) => p.userId === userId)
    );
  }
}

export async function getMeeting(id: string): Promise<VideoconferenceMeeting | null> {
  try {
    const rows = await request(`${table}?id=eq.${encodeURIComponent(id)}&select=id,payload,created_at,updated_at&limit=1`);
    if (rows[0]?.payload) return meetingFromPayload(rows[0].payload, rows[0].id);
    return null;
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    const rows = await request(`${fallbackTable}?id=eq.__videoconference:${encodeURIComponent(id)}&select=payload&limit=1`);
    if (rows[0]?.payload?._type === 'videoconference_meeting') {
      return meetingFromPayload(rows[0].payload as Record<string, unknown>, id);
    }
    return null;
  }
}

export async function saveMeeting(meeting: VideoconferenceMeeting): Promise<VideoconferenceMeeting> {
  const payload = { ...meeting, _type: 'videoconference_meeting' };
  try {
    await request(table, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: meeting.id, payload, updated_at: meeting.updatedAt }),
    });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    await request(fallbackTable, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: `__videoconference:${meeting.id}`,
        payload,
        deleted: false,
        updated_at: meeting.updatedAt,
      }),
    });
  }
  return meeting;
}

export async function updateMeeting(id: string, fields: Partial<VideoconferenceMeeting>): Promise<void> {
  const current = await getMeeting(id);
  if (!current) throw new Error('Reunião não encontrada.');
  const updated: VideoconferenceMeeting = {
    ...current,
    ...fields,
    updatedAt: new Date().toISOString(),
  };
  await saveMeeting(updated);
}

export async function deleteMeeting(id: string): Promise<void> {
  try {
    await request(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {
    await request(`${fallbackTable}?id=eq.__videoconference:${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}

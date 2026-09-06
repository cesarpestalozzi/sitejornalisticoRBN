export type DocumentationStatus = 'pending' | 'review' | 'approved' | 'rejected' | 'expired';

export type DocumentationRow = {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: DocumentationStatus;
  expires_at: string | null;
  notes: string | null;
  request_reason: string | null;
  content_base64: string | null;
  requested_by: string | null;
  uploaded_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
    if (value && value !== '[SENSITIVE]') return value;
  }
  return '';
}

const baseUrl = env('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL').replace(/\/$/, '');
const key = env('SUPABASE_SERVICE_ROLE_KEY');
const table = baseUrl ? `${baseUrl}/rest/v1/pz_news_team_documents` : '';
const auditTable = baseUrl ? `${baseUrl}/rest/v1/pz_news_team_document_audit` : '';

export function hasDocumentationStoreConfig() {
  if (!table || !key) return false;
  try {
    const parsed = new URL(table);
    return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname);
  } catch {
    return false;
  }
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
    throw new Error(`Supabase recusou a operação de documentação (${response.status}).${detail ? ` ${detail.slice(0, 180)}` : ''}`);
  }
  if (response.status === 204) return [];
  return (await response.json()) as DocumentationRow[];
}

const PUBLIC_COLUMNS = 'id,user_id,document_type,file_name,mime_type,size_bytes,status,expires_at,notes,request_reason,requested_by,uploaded_by,deleted_at,created_at,updated_at';
const PRIVATE_COLUMNS = `${PUBLIC_COLUMNS},content_base64`;

export async function listDocuments(userId?: string) {
  const filter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : '';
  return request(`${table}?select=${PUBLIC_COLUMNS}${filter}&deleted_at=is.null&order=updated_at.desc`) as Promise<DocumentationRow[]>;
}

export async function getDocument(id: string) {
  const rows = await request(`${table}?select=${PRIVATE_COLUMNS}&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] ?? null;
}

export async function saveDocument(document: Partial<DocumentationRow> & Pick<DocumentationRow, 'id' | 'user_id' | 'document_type'>) {
  await request(table, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(document),
  });
  return document;
}

export async function updateDocument(id: string, fields: Partial<DocumentationRow>) {
  await request(`${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(fields),
  });
}

export async function deleteDocument(id: string) {
  await request(`${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
}

export async function saveAudit(entry: {
  document_id: string;
  user_id: string;
  actor_id: string;
  action: string;
  from_status?: DocumentationStatus | null;
  to_status?: DocumentationStatus | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await request(auditTable, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      ...entry,
      metadata: entry.metadata ?? {},
    }),
  });
}

export async function listAudit(documentId: string) {
  return request(`${auditTable}?select=id,document_id,user_id,actor_id,action,from_status,to_status,notes,metadata,created_at&document_id=eq.${encodeURIComponent(documentId)}&order=created_at.desc`) as unknown as Promise<Array<{
    id: string;
    document_id: string;
    user_id: string;
    actor_id: string;
    action: string;
    from_status: DocumentationStatus | null;
    to_status: DocumentationStatus | null;
    notes: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>>;
}

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
const fallbackTable = baseUrl ? `${baseUrl}/rest/v1/pz_news_articles` : '';

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
    const error = new Error(`Supabase recusou a operação de documentação (${response.status}).${detail ? ` ${detail.slice(0, 180)}` : ''}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return [];
  const text = await response.text().catch(() => '');
  if (!text.trim()) return [];
  try {
    return JSON.parse(text) as DocumentationRow[];
  } catch {
    return [];
  }
}

function isMissingTable(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 404);
}

async function fallbackRequest(init?: RequestInit) {
  return request(fallbackTable + (init?.method === 'GET' ? '?id=like.__document__:*&select=id,payload,updated_at&order=updated_at.desc&limit=10000' : ''), init);
}

const PUBLIC_COLUMNS = 'id,user_id,document_type,file_name,mime_type,size_bytes,status,expires_at,notes,request_reason,requested_by,uploaded_by,deleted_at,created_at,updated_at';
const PRIVATE_COLUMNS = `${PUBLIC_COLUMNS},content_base64`;

export async function listDocuments(userId?: string) {
  const filter = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : '';
  try {
    return await request(`${table}?select=${PUBLIC_COLUMNS}${filter}&deleted_at=is.null&order=updated_at.desc`) as DocumentationRow[];
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    const rows = await fallbackRequest() as Array<{ payload?: DocumentationRow & { _type?: string } }>;
    return rows.map((row) => row.payload).filter((document): document is DocumentationRow => Boolean(document?._type === 'team_document' && !document.deleted_at && (!userId || document.user_id === userId))).map(({ content_base64: _content, ...document }) => document);
  }
}

export async function getDocument(id: string) {
  try {
    const rows = await request(`${table}?select=${PRIVATE_COLUMNS}&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ?? null;
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    const rows = await request(`${fallbackTable}?id=eq.__document__:${encodeURIComponent(id)}&select=payload&limit=1`) as Array<{ payload?: DocumentationRow & { _type?: string } }>;
    return rows[0]?.payload?._type === 'team_document' ? rows[0].payload : null;
  }
}

export async function saveDocument(document: Partial<DocumentationRow> & Pick<DocumentationRow, 'id' | 'user_id' | 'document_type'>) {
  try {
    await request(table, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(document),
    });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    await request(fallbackTable, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: `__document__:${document.id}`, payload: { ...document, _type: 'team_document' }, deleted: false, updated_at: document.updated_at ?? new Date().toISOString() }),
    });
  }
  return document;
}

export async function updateDocument(id: string, fields: Partial<DocumentationRow>) {
  try {
    await request(`${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(fields),
    });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    const current = await getDocument(id);
    if (!current) throw new Error('Documento não encontrado.');
    await request(`${fallbackTable}?id=eq.__document__:${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ payload: { ...current, ...fields, _type: 'team_document' }, updated_at: new Date().toISOString() }),
    });
  }
}

export async function deleteDocument(id: string) {
  const now = new Date().toISOString();
  try {
    await updateDocument(id, {
      deleted_at: now,
      content_base64: null,
      file_name: null,
      mime_type: null,
      size_bytes: null,
    });
  } catch {
    try {
      await request(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      await request(`${fallbackTable}?id=eq.__document__:${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
  }
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
  const audit = { id: crypto.randomUUID(), ...entry, metadata: entry.metadata ?? {} };
  try {
    await request(auditTable, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(audit) });
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    await request(fallbackTable, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: `__document_audit__:${audit.id}`, payload: { ...audit, _type: 'team_document_audit' }, deleted: false, updated_at: new Date().toISOString() }) });
  }
}

export async function listAudit(documentId: string) {
  try {
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
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    const rows = await request(`${fallbackTable}?id=like.__document_audit__:*&select=payload&order=updated_at.desc&limit=10000`) as Array<{ payload?: { _type?: string; document_id?: string } }>;
    return rows.map((row) => row.payload).filter((audit): audit is NonNullable<typeof audit> => audit?._type === 'team_document_audit' && audit.document_id === documentId);
  }
}

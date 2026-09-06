import { NextRequest, NextResponse } from 'next/server';
import { getAdminDirectory, resolveAdminUser } from '@/app/api/_lib/adminServerAuth';
import {
  getDocument,
  hasDocumentationStoreConfig,
  listAudit,
  listDocuments,
  saveAudit,
  saveDocument,
  updateDocument,
  type DocumentationStatus,
} from '@/app/api/_lib/documentationStore';

export const dynamic = 'force-dynamic';

const STATUSES = new Set<DocumentationStatus>(['pending', 'review', 'approved', 'rejected', 'expired']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const DOCUMENT_TYPES = [
  'RG/CNH',
  'CPF',
  'Certidão de nascimento',
  'Comprovante de endereço',
  'Título de eleitor',
  'Conta bancária',
  'Registro profissional',
  'Contrato de trabalho',
  'Termo de responsabilidade',
  'Termo de autorização de uso de imagem',
  'Diploma',
  'Certificados',
  'Outros documentos',
] as const;

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function can(user: Awaited<ReturnType<typeof resolveAdminUser>>, permission: string) {
  return Boolean(user && (user.role === 'admin' || user.permissions.includes(permission)));
}

function canManage(user: Awaited<ReturnType<typeof resolveAdminUser>>) {
  return can(user, 'documentation:manage');
}

async function authorizedTarget(user: Awaited<ReturnType<typeof resolveAdminUser>>, targetId: string) {
  if (!user || !targetId) return false;
  if (canManage(user)) return true;
  return user.id === targetId;
}

async function userExists(userId: string) {
  const directory = await getAdminDirectory();
  return directory.some((row) => String(row.id) === userId && String(row.payload.status ?? 'ativo').toLowerCase() !== 'removido');
}

function publicUser(row: { id: string; payload: Record<string, unknown> }) {
  return {
    id: row.id,
    name: String(row.payload.name ?? 'Usuário'),
    email: String(row.payload.email ?? ''),
    role: String(row.payload.role ?? ''),
    status: String(row.payload.status ?? 'ativo'),
    avatar: typeof row.payload.avatar === 'string' ? row.payload.avatar : undefined,
  };
}

export async function GET(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || !can(user, 'documentation:view')) return errorResponse('Sessão ou permissão de documentação inválida.', 401);
  if (!hasDocumentationStoreConfig()) return errorResponse('Armazenamento de documentação não configurado.', 503);

  try {
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId')?.trim() || '';
    const documentId = url.searchParams.get('documentId')?.trim() || '';
    if (documentId) {
      const document = await getDocument(documentId);
      if (!document || document.deleted_at) return errorResponse('Documento não encontrado.', 404);
      if (!(await authorizedTarget(user, document.user_id))) return errorResponse('Você não pode acessar este documento.', 403);
      return NextResponse.json({ ok: true, document: { ...document, content_base64: undefined }, audit: await listAudit(document.id) });
    }
    if (targetUserId && !(await authorizedTarget(user, targetUserId))) return errorResponse('Você não pode consultar os documentos deste usuário.', 403);

    const [documents, directory] = await Promise.all([
      listDocuments(targetUserId || (canManage(user) ? undefined : user.id)),
      getAdminDirectory(),
    ]);
    const uniqueUsers = new Map<string, ReturnType<typeof publicUser>>();
    directory.forEach((row) => {
      if (!uniqueUsers.has(String(row.id)) && String(row.payload.status ?? 'ativo').toLowerCase() !== 'removido') {
        uniqueUsers.set(String(row.id), publicUser(row));
      }
    });
    const counts = documents.reduce<Record<string, number>>((result, document) => {
      result[document.user_id] = (result[document.user_id] ?? 0) + 1;
      return result;
    }, {});
    const statusCounts = documents.reduce<Record<string, number>>((result, document) => {
      result[document.status] = (result[document.status] ?? 0) + 1;
      return result;
    }, {});
    const visibleUsers = [...uniqueUsers.values()].filter((item) => canManage(user) || item.id === user.id);
    return NextResponse.json({
      ok: true,
      documents,
      users: targetUserId ? visibleUsers.filter((item) => item.id === targetUserId) : visibleUsers,
      counts,
      statusCounts,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Não foi possível carregar a documentação.', 502);
  }
}

export async function POST(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || (!can(user, 'documentation:upload') && !can(user, 'documentation:request'))) {
    return errorResponse('Sessão ou permissão de documentação inválida.', 401);
  }
  if (!hasDocumentationStoreConfig()) return errorResponse('Armazenamento de documentação não configurado.', 503);

  try {
    const form = await request.formData();
    const action = String(form.get('action') ?? (form.get('file') ? 'upload' : 'request')).trim();
    const targetUserId = String(form.get('userId') ?? '').trim();
    const documentType = String(form.get('documentType') ?? '').trim().slice(0, 120);
    let documentTypes = documentType ? [documentType] : [];
    const rawDocumentTypes = String(form.get('documentTypes') ?? '').trim();
    if (rawDocumentTypes) {
      try {
        documentTypes = [...new Set((JSON.parse(rawDocumentTypes) as unknown[]).filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).map((item) => item.slice(0, 120)))];
      } catch {
        return errorResponse('A seleção de documentos é inválida.');
      }
    }
    const notes = String(form.get('notes') ?? '').trim().slice(0, 5000);
    const requestReason = String(form.get('requestReason') ?? '').trim().slice(0, 2000);
    const expiresAt = String(form.get('expiresAt') ?? '').trim() || null;
    if (!targetUserId || documentTypes.length === 0) return errorResponse('Selecione pelo menos um documento.');
    if (action === 'request' && documentTypes.some((item) => !DOCUMENT_TYPES.includes(item as typeof DOCUMENT_TYPES[number]))) return errorResponse('Tipo de documento inválido.');
    if (action === 'upload' && documentTypes.length !== 1) return errorResponse('Envios devem conter apenas um tipo de documento.');
    if (!(await userExists(targetUserId))) return errorResponse('Usuário não encontrado.', 404);
    if (!(await authorizedTarget(user, targetUserId))) return errorResponse('Você não pode alterar documentos deste usuário.', 403);
    if (action === 'request' && !can(user, 'documentation:request')) return errorResponse('Sem permissão para solicitar documentos.', 403);
    if (action === 'upload' && !can(user, 'documentation:upload')) return errorResponse('Sem permissão para enviar documentos.', 403);

    const file = form.get('file');
    let contentBase64: string | null = null;
    let fileName: string | null = null;
    let mimeType: string | null = null;
    let sizeBytes: number | null = null;
    if (file instanceof File) {
      if (file.size > MAX_FILE_SIZE) return errorResponse('O arquivo deve ter no máximo 10 MB.');
      if (!ALLOWED_MIME_TYPES.has(file.type)) return errorResponse('Formato não permitido. Envie PDF, imagem ou documento do Word.');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180);
      fileName = safeName || 'documento';
      mimeType = file.type;
      sizeBytes = file.size;
      contentBase64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    } else if (action === 'upload') {
      return errorResponse('Selecione um arquivo para enviar.');
    }

    const now = new Date().toISOString();
    const status: DocumentationStatus = 'pending';
    const ids: string[] = [];
    for (const selectedType of documentTypes) {
      const id = crypto.randomUUID();
      await saveDocument({
        id,
        user_id: targetUserId,
        document_type: selectedType,
        file_name: fileName,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        status,
        expires_at: expiresAt,
        notes: notes || null,
        request_reason: requestReason || null,
        content_base64: contentBase64,
        requested_by: user.id,
        uploaded_by: contentBase64 ? user.id : null,
        created_at: now,
        updated_at: now,
      });
      await saveAudit({
        document_id: id,
        user_id: targetUserId,
        actor_id: user.id,
        action: contentBase64 ? 'upload' : 'request',
        to_status: status,
        notes: notes || requestReason || null,
        metadata: { documentType: selectedType, fileName },
      });
      ids.push(id);
    }
    return NextResponse.json({ ok: true, ids, status }, { status: 201 });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Não foi possível salvar o documento.', 502);
  }
}

export async function PATCH(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || !can(user, 'documentation:view')) return errorResponse('Sessão ou permissão de documentação inválida.', 401);
  if (!hasDocumentationStoreConfig()) return errorResponse('Armazenamento de documentação não configurado.', 503);
  try {
    const body = (await request.json()) as { id?: string; status?: DocumentationStatus; notes?: string; expiresAt?: string | null };
    const id = String(body.id ?? '').trim();
    if (!id) return errorResponse('id é obrigatório.');
    const document = await getDocument(id);
    if (!document || document.deleted_at) return errorResponse('Documento não encontrado.', 404);
    if (!(await authorizedTarget(user, document.user_id))) return errorResponse('Você não pode alterar este documento.', 403);
    const nextStatus = body.status;
    if (nextStatus && (!STATUSES.has(nextStatus) || !can(user, 'documentation:review'))) {
      return errorResponse('Sem permissão ou status inválido.', 403);
    }
    const nextNotes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 5000) : undefined;
    const fields: Record<string, unknown> = {};
    if (nextStatus) fields.status = nextStatus;
    if (nextNotes !== undefined) fields.notes = nextNotes || null;
    if (body.expiresAt !== undefined) fields.expires_at = body.expiresAt || null;
    if (!Object.keys(fields).length) return errorResponse('Nenhuma alteração informada.');
    await updateDocument(id, fields);
    await saveAudit({
      document_id: id,
      user_id: document.user_id,
      actor_id: user.id,
      action: nextStatus ? 'status_change' : 'update',
      from_status: document.status,
      to_status: nextStatus ?? document.status,
      notes: nextNotes ?? document.notes,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Não foi possível atualizar o documento.', 502);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || !can(user, 'documentation:delete')) return errorResponse('Sem permissão para excluir documentos.', 403);
  if (!hasDocumentationStoreConfig()) return errorResponse('Armazenamento de documentação não configurado.', 503);
  try {
    const id = new URL(request.url).searchParams.get('id')?.trim() || '';
    if (!id) return errorResponse('id é obrigatório.');
    const document = await getDocument(id);
    if (!document || document.deleted_at) return errorResponse('Documento não encontrado.', 404);
    if (!(await authorizedTarget(user, document.user_id))) return errorResponse('Você não pode excluir este documento.', 403);
    await updateDocument(id, { deleted_at: new Date().toISOString(), content_base64: null, file_name: null, mime_type: null, size_bytes: null });
    await saveAudit({
      document_id: id,
      user_id: document.user_id,
      actor_id: user.id,
      action: 'delete',
      from_status: document.status,
      notes: document.notes,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Não foi possível excluir o documento.', 502);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDirectory, hasDocumentationPinAccess, resolveAdminUser } from '@/app/api/_lib/adminServerAuth';
import {
  deleteDocument,
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
  if (canManage(user) || user.role === 'admin') return true;
  return user.id === targetId;
}

async function userExists(userId: string) {
  const directory = await getAdminDirectory();
  return directory.some((row) => String(row.id) === userId && String(row.payload.status ?? 'ativo').toLowerCase() !== 'removido');
}

async function findUserById(userId: string) {
  const directory = await getAdminDirectory();
  const row = directory.find((item) => String(item.id) === userId);
  if (!row) return null;
  const name = String(row.payload.name ?? row.payload.publicName ?? row.payload.email ?? 'Colaborador').trim();
  const email = String(row.payload.email ?? '').trim();
  return { id: String(row.id), name, email };
}

function escapeHtml(val: string) {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendDocumentationEmail({
  toEmail,
  toName,
  subject,
  title,
  messageLines,
  actionUrl = 'https://www.rbnbrasil.com.br/admin/recursos-humanos',
}: {
  toEmail: string;
  toName: string;
  subject: string;
  title: string;
  messageLines: string[];
  actionUrl?: string;
}) {
  if (!toEmail || !toEmail.includes('@')) return;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'RBN Recursos Humanos <noreply@rbnbrasil.com.br>';

  if (!apiKey) {
    console.log(`[RBN RH Email Skipped - No RESEND_API_KEY] To: ${toEmail} | Subject: ${subject}`);
    return;
  }

  const linesHtml = messageLines
    .map((line) => `<p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #374151;">${escapeHtml(line)}</p>`)
    .join('');

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #f4f4f6; padding: 32px 16px; color: #111827;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="border-bottom: 2px solid #991b1b; padding-bottom: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #991b1b; font-weight: 800;">RBN — RECURSOS HUMANOS</p>
          <h1 style="margin: 0; font-size: 22px; color: #111827; font-weight: 700;">${escapeHtml(title)}</h1>
        </div>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #111827;">Olá, <strong>${escapeHtml(toName)}</strong>!</p>
        ${linesHtml}
        <div style="margin: 28px 0 16px;">
          <a href="${escapeHtml(actionUrl)}" style="display: inline-block; background: #991b1b; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
            Acessar Central de RH
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
        <p style="margin: 0; font-size: 13px; color: #6b7280;">Este e-mail é enviado automaticamente pelo Portal RBN — Central Protegida de Recursos Humanos.</p>
      </div>
    </div>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error('Erro ao enviar e-mail de documentação:', err);
  }
}

function publicUser(row: { id: string; payload: Record<string, unknown> }) {
  const nameCandidate = String(row.payload.name ?? row.payload.publicName ?? '').trim();
  const name = nameCandidate || String(row.payload.email ?? '').split('@')[0] || 'Usuário';
  return {
    id: String(row.id),
    name,
    email: String(row.payload.email ?? ''),
    role: String(row.payload.role ?? ''),
    status: String(row.payload.status ?? 'ativo'),
    avatar: typeof row.payload.avatar === 'string' ? row.payload.avatar : undefined,
  };
}

export async function GET(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || !can(user, 'documentation:view')) return errorResponse('Sessão ou permissão de documentação inválida.', 401);
  if (!hasDocumentationPinAccess(request, user.id)) return errorResponse('Desbloqueie Recursos Humanos com o PIN.', 403);
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
      listDocuments(targetUserId || (canManage(user) || user.role === 'admin' ? undefined : user.id)),
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
    const canSeeAll = canManage(user) || user.role === 'admin' || can(user, 'documentation:request') || can(user, 'documentation:view') || can(user, 'documentation:upload');
    const visibleUsers = [...uniqueUsers.values()].filter((item) => canSeeAll || item.id === user.id);
    return NextResponse.json({
      ok: true,
      documents,
      users: visibleUsers,
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
  if (!hasDocumentationPinAccess(request, user.id)) return errorResponse('Desbloqueie Recursos Humanos com o PIN.', 403);
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

    const targetUser = await findUserById(targetUserId);

    if (action === 'request') {
      await sendSystemNotification(
        user.id,
        targetUserId,
        `📄 *Solicitação de Documento(s)*:\n\nOs seguintes documentos foram solicitados para você na central de Recursos Humanos:\n• ${documentTypes.join('\n• ')}${requestReason ? `\n\n*Motivo:* ${requestReason}` : ''}`
      );

      if (targetUser?.email) {
        void sendDocumentationEmail({
          toEmail: targetUser.email,
          toName: targetUser.name,
          subject: `[RBN RH] Solicitação de documento(s): ${documentTypes.join(', ')}`,
          title: 'Solicitação de Documentação Profissional',
          messageLines: [
            `Foram solicitados os seguintes documentos para o seu perfil no Portal RBN:`,
            `• ${documentTypes.join(', ')}`,
            ...(requestReason ? [`Motivo informado: ${requestReason}`] : []),
            `Por favor, acesse a central de Recursos Humanos para anexar os arquivos solicitados.`,
          ],
        });
      }
    } else if (action === 'upload') {
      if (user.id !== targetUserId) {
        await sendSystemNotification(
          user.id,
          targetUserId,
          `📄 *Documento Recebido*: Foi adicionado o documento *${documentTypes[0]}* (${fileName ?? 'arquivo'}) ao seu perfil por ${user.name}.`
        );
      }

      if (targetUser?.email) {
        void sendDocumentationEmail({
          toEmail: targetUser.email,
          toName: targetUser.name,
          subject: `[RBN RH] Documento registrado: ${documentTypes[0]}`,
          title: 'Confirmação de Recebimento de Documento',
          messageLines: [
            `O documento "${documentTypes[0]}" (${fileName ?? 'arquivo'}) foi cadastrado com sucesso no seu perfil de Recursos Humanos por ${user.name}.`,
            `O arquivo foi recebido e está em fase de verificação e revisão pela equipe de gestão.`,
          ],
        });
      }
    }

    return NextResponse.json({ ok: true, ids, status }, { status: 201 });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Não foi possível salvar o documento.', 502);
  }
}

export async function PATCH(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || !can(user, 'documentation:view')) return errorResponse('Sessão ou permissão de documentação inválida.', 401);
  if (!hasDocumentationPinAccess(request, user.id)) return errorResponse('Desbloqueie Recursos Humanos com o PIN.', 403);
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

    if (nextStatus) {
      const statusLabelsMap: Record<string, string> = {
        pending: 'Pendente',
        review: 'Em revisão',
        approved: 'Aprovado',
        rejected: 'Rejeitado / Recusado',
        expired: 'Expirado',
      };
      const statusLabel = statusLabelsMap[nextStatus] ?? nextStatus;
      const statusEmoji = nextStatus === 'approved' ? '✅' : nextStatus === 'rejected' ? '❌' : 'ℹ️';
      
      await sendSystemNotification(
        user.id,
        document.user_id,
        `${statusEmoji} *Atualização de Documento*: O seu documento *${document.document_type}* foi alterado para *${statusLabel}* por ${user.name}.${nextNotes ? `\n\n*Observação:* ${nextNotes}` : ''}`
      );

      const docUser = await findUserById(document.user_id);
      if (docUser?.email) {
        void sendDocumentationEmail({
          toEmail: docUser.email,
          toName: docUser.name,
          subject: `[RBN RH] Status do documento (${document.document_type}): ${statusLabel}`,
          title: 'Atualização de Status de Documento',
          messageLines: [
            `O seu documento "${document.document_type}" teve o status de revisão alterado para "${statusLabel}" por ${user.name}.`,
            ...(nextNotes ? [`Observações informadas: ${nextNotes}`] : []),
          ],
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Não foi possível atualizar o documento.', 502);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return errorResponse('Sessão inválida.', 401);
  if (!hasDocumentationPinAccess(request, user.id)) return errorResponse('Desbloqueie Recursos Humanos com o PIN.', 403);
  if (!hasDocumentationStoreConfig()) return errorResponse('Armazenamento de documentação não configurado.', 503);
  try {
    const id = new URL(request.url).searchParams.get('id')?.trim() || '';
    if (!id) return errorResponse('id é obrigatório.');
    const document = await getDocument(id);
    if (!document || document.deleted_at) return errorResponse('Documento não encontrado.', 404);
    
    const isOwnerOrAuthor = user.id === document.user_id || user.id === document.requested_by || user.id === document.uploaded_by;
    const canDeleteDoc = user.role === 'admin' || can(user, 'documentation:delete') || can(user, 'documentation:manage') || can(user, 'users:manage') || isOwnerOrAuthor;

    if (!canDeleteDoc) {
      return errorResponse('Você não possui permissão para excluir este documento.', 403);
    }

    await deleteDocument(id);
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

async function sendSystemNotification(senderId: string, recipientId: string, text: string) {
  if (!senderId || !recipientId || senderId === recipientId) return;
  try {
    const { listConversations, saveConversation, saveMessage, saveNotification } = await import('@/app/api/_lib/messagingStore');
    const conversations = await listConversations();
    let conversation = conversations.find(
      (c) => !c.isGroup && c.participantIds.includes(senderId) && c.participantIds.includes(recipientId)
    );
    const now = new Date().toISOString();
    if (!conversation) {
      conversation = {
        id: crypto.randomUUID(),
        participantIds: [senderId, recipientId],
        createdBy: senderId,
        createdAt: now,
        lastActivityAt: now,
        lastMessagePreview: text,
      };
      await saveConversation(conversation);
    } else {
      conversation = { ...conversation, lastActivityAt: now, lastMessagePreview: text };
      await saveConversation(conversation);
    }
    const messageId = crypto.randomUUID();
    await saveMessage({
      id: messageId,
      conversationId: conversation.id,
      senderId,
      body: text,
      createdAt: now,
    });
    await saveNotification({
      id: crypto.randomUUID(),
      userId: recipientId,
      conversationId: conversation.id,
      messageId,
      createdAt: now,
    });
  } catch (err) {
    console.error('Falha ao enviar notificação de documento:', err);
  }
}

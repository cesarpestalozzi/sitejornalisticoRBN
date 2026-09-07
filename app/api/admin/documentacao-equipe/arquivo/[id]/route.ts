import { NextRequest, NextResponse } from 'next/server';
import { hasDocumentationPinAccess, resolveAdminUser } from '@/app/api/_lib/adminServerAuth';
import { getDocument, hasDocumentationStoreConfig } from '@/app/api/_lib/documentationStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await resolveAdminUser(request);
  if (!user || !user.permissions.includes('documentation:view') && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Sessão ou permissão de documentação inválida.' }, { status: 401 });
  }
  if (!hasDocumentationStoreConfig()) {
    return NextResponse.json({ ok: false, error: 'Armazenamento de documentação não configurado.' }, { status: 503 });
  }
  const { id } = await context.params;
  const document = await getDocument(id);
  if (!document || document.deleted_at || !document.content_base64 || !document.mime_type) {
    return NextResponse.json({ ok: false, error: 'Arquivo não encontrado.' }, { status: 404 });
  }
  const canManage = user.role === 'admin' || user.permissions.includes('documentation:manage') || user.permissions.includes('documentation:review');
  if (!canManage && document.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'Você não pode acessar este arquivo.' }, { status: 403 });
  }
  const bytes = Buffer.from(document.content_base64, 'base64');
  const disposition = new URL(request.url).searchParams.get('download') === '1' ? 'attachment' : 'inline';
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': document.mime_type,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `${disposition}; filename="${(document.file_name || 'documento').replace(/["\r\n]/g, '_')}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

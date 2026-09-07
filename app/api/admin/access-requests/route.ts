import { NextRequest, NextResponse } from 'next/server';
import { getAdminDirectory, resolveAdminUser, updateStoredUserActivity } from '@/app/api/_lib/adminServerAuth';

type AccessRequest = {
  id: string;
  area: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'revoked';
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  grantedPermission?: string;
};

const allowedAreas: Record<string, string> = {
  rh: 'documentation:request',
  documentation: 'documentation:review',
  'news-production': 'articles:create',
  'news-editing': 'articles:edit:any',
  publishing: 'articles:publish:any',
};

function response(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return response('Sessão inválida.', 401);
  const directory = await getAdminDirectory();
  const rows = user.role === 'admin' ? directory : directory.filter((row) => row.id === user.id);
  const requests = rows.flatMap((row) => {
    const values = Array.isArray(row.payload.accessRequests) ? row.payload.accessRequests : [];
    return values.filter((item): item is AccessRequest => Boolean(item && typeof item === 'object')).map((item) => ({
      ...item,
      userId: row.id,
      userName: String(row.payload.name ?? row.payload.publicName ?? row.id),
    }));
  }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return NextResponse.json({ ok: true, requests });
}

export async function POST(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return response('Sessão inválida.', 401);
  const body = await request.json().catch(() => null) as { area?: unknown; reason?: unknown } | null;
  const area = String(body?.area ?? '').trim();
  if (!allowedAreas[area]) return response('Área de acesso inválida.');
  const directory = await getAdminDirectory();
  const row = directory.find((item) => item.id === user.id);
  const existing = Array.isArray(row?.payload.accessRequests) ? row.payload.accessRequests : [];
  if (existing.some((item) => item?.area === area && item?.status === 'pending')) return response('Já existe uma solicitação pendente para esta área.', 409);
  const item: AccessRequest = {
    id: crypto.randomUUID(),
    area,
    reason: String(body?.reason ?? '').trim().slice(0, 1000),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await updateStoredUserActivity(user.id, { accessRequests: [item, ...existing].slice(0, 50) });
  return NextResponse.json({ ok: true, request: item }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || user.role !== 'admin') return response('Apenas o administrador principal pode decidir solicitações.', 403);
  const body = await request.json().catch(() => null) as { userId?: unknown; requestId?: unknown; decision?: unknown } | null;
  const userId = String(body?.userId ?? '').trim();
  const requestId = String(body?.requestId ?? '').trim();
  const decision = String(body?.decision ?? '').trim();
  if (!userId || !requestId || !['approved', 'denied', 'revoked'].includes(decision)) return response('Dados da decisão inválidos.');
  const directory = await getAdminDirectory();
  const target = directory.find((item) => item.id === userId);
  if (!target) return response('Usuário não encontrado.', 404);
  const requests = Array.isArray(target.payload.accessRequests) ? target.payload.accessRequests : [];
  const selected = requests.find((item) => item?.id === requestId) as AccessRequest | undefined;
  if (!selected) return response('Solicitação não encontrada.', 404);
  const permission = allowedAreas[selected.area];
  const nextRequests = requests.map((item) => item?.id === requestId ? { ...item, status: decision, decidedAt: new Date().toISOString(), decidedBy: user.id, grantedPermission: decision === 'approved' ? permission : undefined } : item);
  const currentPermissions = Array.isArray(target.payload.permissions) ? target.payload.permissions.filter((item): item is string => typeof item === 'string') : [];
  const nextPermissions = decision === 'approved'
    ? [...new Set([...currentPermissions, permission])]
    : decision === 'revoked'
      ? currentPermissions.filter((item) => item !== permission)
      : currentPermissions;
  await updateStoredUserActivity(userId, { accessRequests: nextRequests, permissions: nextPermissions });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDirectory, resolveAdminUser, updateStoredUserActivity } from '@/app/api/_lib/adminServerAuth';
import { getUserActivities, logUserActivity } from '@/app/api/_lib/activityStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });

  try {
    const userId = request.nextUrl.searchParams.get('userId') || undefined;
    const directory = await getAdminDirectory();
    const onlineWindow = Date.now() - 5 * 60 * 1000; // 5 minutes active window

    const usersStatus = directory.map((row) => {
      const p = row.payload ?? {};
      const lastSeen = typeof p.lastSeenAt === 'string' ? p.lastSeenAt : null;
      const isOnline = Boolean(lastSeen && new Date(lastSeen).getTime() >= onlineWindow);
      const activities = Array.isArray(p.activities) ? p.activities : [];

      return {
        id: row.id,
        name: String(p.publicName ?? p.name ?? 'Usuário'),
        fullName: String(p.name ?? 'Usuário'),
        login: String(p.login ?? ''),
        email: String(p.email ?? ''),
        role: String(p.role ?? 'jornalista'),
        status: isOnline ? 'online' : 'offline',
        isOnline,
        lastLoginAt: typeof p.lastLoginAt === 'string' ? p.lastLoginAt : null,
        lastSeenAt: lastSeen,
        lastActivityAt: typeof p.lastActivityAt === 'string' ? p.lastActivityAt : lastSeen,
        lastActivity: p.lastActivity ?? (activities.length > 0 ? activities[0] : null),
        activitiesCount: activities.length,
      };
    });

    const logs = await getUserActivities(userId);

    return NextResponse.json({
      ok: true,
      users: usersStatus,
      logs,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Falha ao consultar atividades.' },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();

  const action = String(body.action ?? (body.event === 'login' ? 'Entrou no sistema' : 'Navegou no painel'));
  const description = String(body.description ?? (body.event === 'login' ? 'Usuário efetuou login no sistema' : 'Usuário ativo no painel'));
  const area = String(body.area ?? 'Painel Administrativo');

  try {
    const fields: Record<string, unknown> = body.event === 'login'
      ? { lastLoginAt: now, lastSeenAt: now, isOnline: true }
      : { lastSeenAt: now, isOnline: true };

    await updateStoredUserActivity(user.id, fields);
    const logEntry = await logUserActivity(user.id, user.name, action, description, area);

    const response = NextResponse.json({ ok: true, log: logEntry });
    response.cookies.set('rbn_admin_user', user.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 12,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível atualizar a atividade.' }, { status: 502 });
  }
}

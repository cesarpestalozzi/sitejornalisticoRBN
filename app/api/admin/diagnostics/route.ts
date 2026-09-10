import { NextRequest, NextResponse } from 'next/server';
import { listStoredArticles } from '@/app/api/_lib/articleStore';
import { listStoredUsers, hasUserStoreConfig } from '@/app/api/_lib/userStore';
import { hasAnalyticsStoreConfig, listAnalyticsEvents } from '@/app/api/_lib/analyticsStore';
import { hasCommentStoreConfig, listStoredComments } from '@/app/api/_lib/commentStore';
import { resolveAdminUser } from '@/app/api/_lib/adminServerAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await resolveAdminUser(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ ok: false, error: 'Apenas o administrador principal pode acessar Diagnósticos.' }, { status: 403 });
  const checks: Array<{ key: string; label: string; status: 'ok' | 'warning' | 'error'; detail: string; action?: string }> = [];
  checks.push({
    key: 'users-store',
    label: 'Armazenamento de usuários',
    status: hasUserStoreConfig() ? 'ok' : 'error',
    detail: hasUserStoreConfig() ? 'Tabela pz_news_users configurada.' : 'Variáveis do Supabase não configuradas.',
  });
  checks.push({
    key: 'analytics-store',
    label: 'Armazenamento de métricas',
    status: hasAnalyticsStoreConfig() ? 'ok' : 'error',
    detail: hasAnalyticsStoreConfig() ? 'Tabela de eventos de audiência configurada.' : 'Tabela pz_news_analytics_events não configurada.',
  });
  if (hasAnalyticsStoreConfig()) {
    try {
      const events = await listAnalyticsEvents();
      const latest = events.at(-1);
      checks.push({
        key: 'analytics-read',
        label: 'Última métrica registrada',
        status: latest ? 'ok' : 'warning',
        detail: latest ? `${latest.event_type} em ${new Date(latest.occurred_at).toLocaleString('pt-BR')}. ${events.length} eventos consultados.` : 'Nenhum evento de audiência foi registrado.',
      });
    } catch (error) {
      checks.push({ key: 'analytics-read', label: 'Consulta de métricas', status: 'error', detail: error instanceof Error ? error.message : 'Falha desconhecida.' });
    }
  }
  checks.push({
    key: 'comments-store',
    label: 'Armazenamento de comentários',
    status: hasCommentStoreConfig() ? 'ok' : 'error',
    detail: hasCommentStoreConfig() ? 'Tabela de comentários configurada.' : 'Tabela pz_news_comments não configurada.',
  });
  if (hasCommentStoreConfig()) {
    try {
      const comments = await listStoredComments();
      const latest = comments[0]?.payload;
      checks.push({
        key: 'comments-read',
        label: 'Último comentário registrado',
        status: latest ? 'ok' : 'warning',
        detail: latest ? `Comentário de ${String(latest.author ?? 'autor desconhecido')} encontrado.` : 'Nenhum comentário registrado.',
      });
    } catch (error) {
      checks.push({ key: 'comments-read', label: 'Consulta de comentários', status: 'error', detail: error instanceof Error ? error.message : 'Falha desconhecida.' });
    }
  }
  try {
    const users = await listStoredUsers();
    const visible = users.filter((row) => !['removido', 'removed', 'deleted'].includes(String(row.payload.status ?? '').toLowerCase()));
    checks.push({ key: 'users-read', label: 'Consulta de usuários', status: 'ok', detail: `${visible.length} usuários administrativos disponíveis.` });
  } catch (error) {
    checks.push({ key: 'users-read', label: 'Consulta de usuários', status: 'error', detail: error instanceof Error ? error.message : 'Falha desconhecida.' });
  }
  try {
    const articles = await listStoredArticles(undefined, { lite: true });
    const active = articles.filter((row) => !row.deleted);
    const withoutAuthorId = active.filter((row) => !Array.isArray(row.payload.authorUserIds) || row.payload.authorUserIds.length === 0);
    checks.push({
      key: 'articles-read',
      label: 'Consulta de matérias',
      status: withoutAuthorId.length ? 'warning' : 'ok',
      detail: `${active.length} matérias ativas; ${withoutAuthorId.length} sem vínculo de autor por ID.`,
      action: withoutAuthorId.length ? 'Migrar vínculos legados de autoria.' : undefined,
    });
  } catch (error) {
    checks.push({ key: 'articles-read', label: 'Consulta de matérias', status: 'error', detail: error instanceof Error ? error.message : 'Falha desconhecida.' });
  }
  return NextResponse.json({ ok: checks.every((check) => check.status !== 'error'), checks, generatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
}

import { NextResponse } from 'next/server';
import { listStoredArticles } from '@/app/api/_lib/articleStore';
import { listStoredUsers, hasUserStoreConfig } from '@/app/api/_lib/userStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Array<{ key: string; label: string; status: 'ok' | 'warning' | 'error'; detail: string; action?: string }> = [];
  checks.push({
    key: 'users-store',
    label: 'Armazenamento de usuários',
    status: hasUserStoreConfig() ? 'ok' : 'error',
    detail: hasUserStoreConfig() ? 'Tabela pz_news_users configurada.' : 'Variáveis do Supabase não configuradas.',
  });
  try {
    const users = await listStoredUsers();
    const visible = users.filter((row) => !['removido', 'removed', 'deleted'].includes(String(row.payload.status ?? '').toLowerCase()));
    checks.push({ key: 'users-read', label: 'Consulta de usuários', status: 'ok', detail: `${visible.length} usuários administrativos disponíveis.` });
  } catch (error) {
    checks.push({ key: 'users-read', label: 'Consulta de usuários', status: 'error', detail: error instanceof Error ? error.message : 'Falha desconhecida.' });
  }
  try {
    const articles = await listStoredArticles();
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

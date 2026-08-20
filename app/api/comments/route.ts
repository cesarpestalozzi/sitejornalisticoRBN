import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function GET(request: NextRequest) {
  const adminClient = getAdminClient();
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId') || searchParams.get('id');

  if (!adminClient) {
    return NextResponse.json({ error: 'Supabase service role not configured.' }, { status: 500 });
  }

  let query = adminClient
    .from('pz_news_comments')
    .select('id, payload, updated_at')
    .order('updated_at', { ascending: false });

  if (articleId) {
    query = query.eq('payload->>articleId', articleId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? [], { status: 200 });
}

export async function POST(request: NextRequest) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Supabase service role not configured.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const comment = body?.comment;
    if (!comment || !comment.id) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const { error } = await adminClient.from('pz_news_comments').upsert(
      [
        {
          id: comment.id,
          payload: comment,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'id' }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar comentário.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Supabase service role not configured.' }, { status: 500 });
  }

  let id: string | null = null;

  try {
    const body = await request.clone().json().catch(() => null);
    id = typeof body?.id === 'string' ? body.id : null;
  } catch {
    id = null;
  }

  if (!id) {
    const { searchParams } = new URL(request.url);
    id = searchParams.get('id');
  }

  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });
  }

  const { data: rowsToDelete, error: lookupError } = await adminClient
    .from('pz_news_comments')
    .select('id')
    .or(`id.eq.${id},payload->>id.eq.${id}`);

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  const idsToDelete = (rowsToDelete ?? []).map((row) => row.id).filter(Boolean);

  if (idsToDelete.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 }, { status: 200 });
  }

  const { error } = await adminClient.from('pz_news_comments').delete().in('id', idsToDelete);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: idsToDelete.length }, { status: 200 });
}

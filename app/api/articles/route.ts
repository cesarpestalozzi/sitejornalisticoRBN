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

export async function GET() {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Supabase service role not configured.' }, { status: 500 });
  }

  const { data, error } = await adminClient
    .from('pz_news_articles')
    .select('id, payload, deleted, updated_at')
    .order('updated_at', { ascending: false });

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
    const article = body?.article;
    const deleted = Boolean(body?.deleted);

    if (!article || !article.id) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const { error } = await adminClient.from('pz_news_articles').upsert(
      [
        {
          id: article.id,
          payload: article,
          deleted,
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
    const message = error instanceof Error ? error.message : 'Erro ao salvar artigo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: 'Supabase service role not configured.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const trash = searchParams.get('trash') === 'true';

  try {
    if (trash) {
      const { error } = await adminClient.from('pz_news_articles').delete().eq('deleted', true);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });
    }

    const { error } = await adminClient.from('pz_news_articles').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao remover artigo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

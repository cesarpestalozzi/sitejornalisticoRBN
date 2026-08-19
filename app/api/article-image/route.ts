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

function getPrimaryArticleImage(payload?: Record<string, any>) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const directImage = typeof payload.image === 'string' ? payload.image : null;
  if (directImage) {
    return directImage;
  }

  const images = Array.isArray(payload.images) ? payload.images : [];
  const imageFromList = images.find((item) => typeof item?.url === 'string' && item.url.trim())?.url ?? null;
  return imageFromList;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID da matéria obrigatório.' }, { status: 400 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.redirect(new URL('/logo-oficial.png', request.url));
  }

  try {
    const { data, error } = await adminClient
      .from('pz_news_articles')
      .select('payload')
      .eq('id', id)
      .eq('deleted', false)
      .maybeSingle();

    if (error || !data?.payload) {
      return NextResponse.redirect(new URL('/logo-oficial.png', request.url));
    }

    const imageValue = getPrimaryArticleImage(data.payload as Record<string, any>);
    if (!imageValue) {
      return NextResponse.redirect(new URL('/logo-oficial.png', request.url));
    }

    if (!imageValue.startsWith('data:')) {
      return NextResponse.redirect(imageValue.startsWith('http') ? imageValue : new URL(imageValue, request.url).toString());
    }

    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/i.exec(imageValue);
    if (!match) {
      return NextResponse.redirect(new URL('/logo-oficial.png', request.url));
    }

    const mimeType = match[1] || 'image/png';
    const base64Payload = match[2] ?? '';
    const buffer = Buffer.from(base64Payload, 'base64');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Content-Length': String(buffer.length),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.redirect(new URL('/logo-oficial.png', request.url));
  }
}

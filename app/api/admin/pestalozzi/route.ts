import { NextRequest, NextResponse } from 'next/server';
import {
  buildPestalozziSystemPrompt,
  type PestalozziChatMessage,
  type PestalozziContext,
  type PestalozziSuggestionPayload,
} from '@/app/lib/pestalozzi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PestalozziBody = {
  messages?: PestalozziChatMessage[];
  context?: PestalozziContext;
};

const AI_PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase();
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

function fallbackResponse(messages: PestalozziChatMessage[], context: PestalozziContext): PestalozziSuggestionPayload {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  const baseTitle = context.title || 'Matéria em revisão';
  const baseSubtitle = context.subtitle || context.excerpt || 'Linha fina em revisão editorial.';
  const baseExcerpt = context.excerpt || 'Resumo em revisão editorial.';
  const plainContent = context.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const core = plainContent || 'Adicione conteúdo no corpo da matéria para gerar uma proposta editorial.';

  const versions = [
    {
      label: 'Versão 1 — Objetiva',
      title: baseTitle,
      subtitle: baseSubtitle,
      excerpt: baseExcerpt,
      content: `<p>${baseExcerpt}</p><p>${core}</p>`,
    },
    {
      label: 'Versão 2 — Contextual',
      title: baseTitle.includes(':') ? baseTitle : `${baseTitle}: entenda o contexto`,
      subtitle: baseSubtitle,
      excerpt: baseExcerpt,
      content: `<p><strong>Lead:</strong> ${baseExcerpt}</p><p>${core}</p>`,
    },
  ];

  return {
    assistantMessage: `Preparei versões editoriais baseadas no texto atual. Pedido: "${lastUserMessage}".`,
    versions,
    titleOptions: [baseTitle, `${baseTitle}: o que se sabe até agora`].slice(0, 5),
    subtitleOptions: [baseSubtitle].filter(Boolean),
    sourceNotes: ['Modo de contingência ativo: configure AI_PROVIDER/AI_MODEL/OPENAI_API_KEY para resposta avançada.'],
  };
}

async function callOpenAi(messages: PestalozziChatMessage[], context: PestalozziContext) {
  const contextBlock = JSON.stringify(
    {
      context,
      chatHistory: messages.slice(-20),
    },
    null,
    2
  );

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildPestalozziSystemPrompt() },
        {
          role: 'user',
          content: `Contexto e histórico da sessão:\n${contextBlock}\n\nResponda no JSON especificado no prompt do sistema.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawContent = payload.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Resposta vazia do provedor de IA.');
  }

  const parsed = JSON.parse(rawContent) as PestalozziSuggestionPayload;
  return {
    assistantMessage: parsed.assistantMessage || 'Sugestão pronta.',
    versions: Array.isArray(parsed.versions) ? parsed.versions : [],
    titleOptions: Array.isArray(parsed.titleOptions) ? parsed.titleOptions : [],
    subtitleOptions: Array.isArray(parsed.subtitleOptions) ? parsed.subtitleOptions : [],
    sourceNotes: Array.isArray(parsed.sourceNotes) ? parsed.sourceNotes : [],
  } satisfies PestalozziSuggestionPayload;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as PestalozziBody;
    const messages = Array.isArray(body.messages) ? body.messages.filter((m) => m?.role && m?.content) : [];
    const context = body.context;

    if (!context) {
      return NextResponse.json({ ok: false, error: 'Contexto da matéria é obrigatório.' }, { status: 400 });
    }
    if (messages.length === 0) {
      return NextResponse.json({ ok: false, error: 'Envie ao menos uma mensagem para o Pestalozzi.' }, { status: 400 });
    }

    let suggestion: PestalozziSuggestionPayload;
    if (AI_PROVIDER === 'openai' && OPENAI_API_KEY) {
      suggestion = await callOpenAi(messages, context);
    } else {
      suggestion = fallbackResponse(messages, context);
    }

    return NextResponse.json({ ok: true, suggestion }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao processar solicitação do Pestalozzi.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}


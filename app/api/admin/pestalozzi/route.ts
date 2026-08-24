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

function stripHtml(content: string) {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildTitleOptions(baseTitle: string) {
  const normalizedBase = baseTitle || 'Matéria em revisão';
  const options = [
    normalizedBase,
    `${normalizedBase}: o que se sabe até agora`,
    `${normalizedBase}: análise completa e próximos passos`,
    `${normalizedBase}: pontos centrais da apuração`,
  ];

  return Array.from(new Set(options)).slice(0, 5);
}

function buildFallbackVersionContent(plainContent: string, summary: string, subtitle: string) {
  const safeSummary = summary || 'Texto revisado sem alterar os fatos reportados.';
  const safeSubtitle = subtitle || 'Apuração revisada com foco em clareza e contexto.';
  const core = plainContent || 'Adicione conteúdo no corpo da matéria para gerar uma versão completa.';

  return [
    `<p><strong>Lead revisado:</strong> ${safeSummary}</p>`,
    `<p>${core}</p>`,
    '<h2>Contexto</h2>',
    `<p>${safeSubtitle}</p>`,
    '<h2>Pontos de atenção antes de publicar</h2>',
    '<ul><li>Confirmar datas, nomes e números.</li><li>Checar atribuição de falas e fontes.</li><li>Validar crédito de imagens e links.</li></ul>',
  ].join('');
}

function fallbackResponse(messages: PestalozziChatMessage[], context: PestalozziContext): PestalozziSuggestionPayload {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  const baseTitle = context.title?.trim() || 'Matéria em revisão';
  const plainContent = stripHtml(context.content || '');
  const extractedLead = plainContent.slice(0, 220);
  const baseExcerpt =
    context.excerpt?.trim() ||
    `${extractedLead}${plainContent.length > 220 ? '...' : ''}` ||
    'Resumo em revisão editorial.';
  const baseSubtitle =
    context.subtitle?.trim() || 'Texto analisado, revisado e reescrito com foco em precisão factual e clareza.';
  const titleOptions = buildTitleOptions(baseTitle);

  const versions = [
    {
      label: 'Versão 1 — Completa e objetiva',
      title: baseTitle,
      subtitle: baseSubtitle,
      excerpt: baseExcerpt,
      content: buildFallbackVersionContent(plainContent, baseExcerpt, baseSubtitle),
    },
    {
      label: 'Versão 2 — Analítica',
      title: titleOptions[1] || baseTitle,
      subtitle: baseSubtitle,
      excerpt: baseExcerpt,
      content: [
        `<p><strong>Abertura:</strong> ${baseExcerpt}</p>`,
        `<p>${plainContent || 'Sem conteúdo suficiente para expansão automática.'}</p>`,
        '<h2>Por que esse tema importa</h2>',
        `<p>${baseSubtitle}</p>`,
      ].join(''),
    },
    {
      label: 'Versão 3 — Enxuta',
      title: titleOptions[2] || baseTitle,
      subtitle: baseSubtitle,
      excerpt: baseExcerpt,
      content: [
        `<p>${baseExcerpt}</p>`,
        `<p>${plainContent || 'Adicione corpo de texto para refino completo.'}</p>`,
      ].join(''),
    },
  ];

  return {
    assistantMessage:
      `Concluí análise, revisão e reescrita em um único fluxo com 3 versões editoriais. Pedido: "${lastUserMessage}".`,
    versions,
    titleOptions,
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
      try {
        suggestion = await callOpenAi(messages, context);
      } catch (providerError) {
        const fallback = fallbackResponse(messages, context);
        suggestion = {
          ...fallback,
          assistantMessage: `IA avançada indisponível no momento. ${fallback.assistantMessage}`,
          sourceNotes: [
            ...(fallback.sourceNotes || []),
            providerError instanceof Error ? providerError.message : 'Falha ao consultar provedor avançado.',
          ],
        };
      }
    } else {
      suggestion = fallbackResponse(messages, context);
    }

    return NextResponse.json({ ok: true, suggestion }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao processar solicitação do Pestalozzi.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

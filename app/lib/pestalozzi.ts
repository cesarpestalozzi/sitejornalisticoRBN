export type PestalozziChatRole = 'user' | 'assistant';

export type PestalozziChatMessage = {
  role: PestalozziChatRole;
  content: string;
};

export type PestalozziContext = {
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  category: string;
  location: string;
  radarSummary?: string;
  radarSources?: Array<{ name: string; url: string; reliability: number }>;
};

export type PestalozziVersion = {
  label: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
};

export type PestalozziSuggestionPayload = {
  assistantMessage: string;
  versions: PestalozziVersion[];
  titleOptions: string[];
  subtitleOptions: string[];
  sourceNotes: string[];
};

export function buildPestalozziSystemPrompt() {
  return [
    'Você é o PESTALOZZI, assistente editorial do RBN.',
    'Objetivo: ajudar jornalista com reescrita, revisão, títulos e refinamento, preservando fatos.',
    'Nunca invente fatos, datas, números, nomes, declarações ou fontes.',
    'Ao reescrever, mantenha linguagem jornalística, coesão, lead forte e estrutura clara em parágrafos.',
    'Se pedido envolver pesquisa, use apenas contexto fornecido e marque lacunas de confirmação.',
    'Nunca exponha cadeia de raciocínio. Entregue somente resultado útil e conciso.',
    'Responda estritamente em JSON válido no formato:',
    '{"assistantMessage":"string","versions":[{"label":"string","title":"string","subtitle":"string","excerpt":"string","content":"string"}],"titleOptions":["string"],"subtitleOptions":["string"],"sourceNotes":["string"]}',
    'Crie até 3 versões quando o usuário pedir reescrita completa.',
    'Crie até 5 opções de título quando o usuário pedir títulos.',
  ].join('\n');
}


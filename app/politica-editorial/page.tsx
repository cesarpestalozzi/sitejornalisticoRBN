'use client';

import Link from 'next/link';

const editorialSections = [
  {
    id: '01',
    title: 'O compromisso do AO PONTO BR com o jornalismo',
    paragraphs: [
      'O AO PONTO BR nasceu com o propósito de informar. Em um ambiente digital em que qualquer pessoa pode produzir e compartilhar conteúdo em poucos segundos, acreditamos que o jornalismo profissional tem uma responsabilidade ainda maior: apurar, verificar, contextualizar e apresentar os fatos com clareza.',
      'Nossa relação com o leitor é baseada em confiança. Por isso, estes princípios estabelecem os critérios que orientam a produção, edição e publicação do conteúdo jornalístico do AO PONTO BR.',
      'Este documento não pretende substituir manuais de redação ou definir cada decisão editorial. Seu objetivo é tornar públicos os valores e procedimentos que orientam nosso trabalho e permitir que o leitor conheça os critérios utilizados na construção das nossas notícias.'
    ]
  },
  {
    id: '02',
    title: 'O que entendemos por jornalismo',
    paragraphs: [
      'Para o AO PONTO BR, jornalismo é a atividade de apurar e apresentar informações relevantes sobre fatos, acontecimentos e pessoas, contribuindo para que o público compreenda a realidade ao seu redor.',
      'O jornalismo não se limita a transmitir acontecimentos. Ele também deve buscar contexto, explicar informações complexas e apresentar diferentes perspectivas quando elas forem relevantes para a compreensão de um assunto.',
      'Reconhecemos que nenhuma cobertura consegue representar todos os aspectos de uma realidade complexa. Por isso, nosso compromisso é trabalhar continuamente para reduzir erros, evitar distorções e aproximar o leitor dos fatos por meio de métodos responsáveis de apuração.',
      'Notícia, análise, opinião e conteúdo publicitário são formatos diferentes e devem ser identificados de maneira clara.'
    ]
  },
  {
    id: '03',
    title: 'Os pilares da informação de qualidade',
    paragraphs: [
      'Nosso trabalho jornalístico se apoia em quatro princípios fundamentais.',
      'Precisão: Informações devem ser verificadas antes da publicação sempre que as circunstâncias permitirem. Nomes, datas, números, locais, declarações e demais informações objetivas devem ser conferidos com atenção. Quando uma informação ainda não puder ser confirmada integralmente, isso deve ser informado ao leitor de maneira clara.',
      'Imparcialidade na apuração: Buscamos apresentar os fatos sem favorecer deliberadamente pessoas, grupos, empresas, partidos ou instituições. Quando uma reportagem envolver acusações, conflitos ou controvérsias, procuraremos ouvir as partes diretamente envolvidas e apresentar suas posições de maneira proporcional e contextualizada.',
      'Contexto: Uma informação isolada pode produzir uma compreensão incompleta dos acontecimentos. Por isso, sempre que necessário, nossas reportagens buscarão apresentar antecedentes, dados, documentos, consequências e informações que ajudem o leitor a compreender o assunto.',
      'Agilidade responsável: O jornalismo digital exige velocidade, mas velocidade não deve significar precipitação. O AO PONTO BR buscará publicar informações relevantes com rapidez, sem abandonar os procedimentos necessários de verificação. Ser rápido é importante. Estar correto é indispensável.'
    ]
  },
  {
    id: '04',
    title: 'Apuração e verificação',
    paragraphs: [
      'A apuração é uma das etapas mais importantes do trabalho jornalístico.',
      'Sempre que possível, informações relevantes serão verificadas por meio de fontes independentes, documentos, registros oficiais, entrevistas, bases de dados e outras evidências disponíveis.',
      'Conteúdos publicados originalmente por outros veículos, redes sociais ou usuários da internet não serão automaticamente tratados como fatos confirmados.',
      'Quando uma informação externa for relevante para uma cobertura, o AO PONTO BR buscará verificar seu conteúdo e identificar sua origem.',
      'Imagens, vídeos, áudios e documentos recebidos pela internet também deverão passar por processos de verificação compatíveis com sua importância e com as circunstâncias da cobertura.'
    ]
  },
  {
    id: '05',
    title: 'Direito de resposta e contraditório',
    paragraphs: [
      'Pessoas, empresas e instituições citadas em acusações ou questionamentos relevantes devem ter a oportunidade de apresentar sua versão.',
      'Quando uma parte não responder a uma solicitação de posicionamento, o conteúdo poderá informar que houve tentativa de contato, desde que isso seja relevante para a compreensão da reportagem.',
      'O direito de resposta não significa alterar fatos comprovados para acomodar opiniões divergentes. Significa garantir que o leitor tenha acesso às manifestações relevantes das partes envolvidas.'
    ]
  },
  {
    id: '06',
    title: 'Fontes jornalísticas',
    paragraphs: [
      'Fontes são fundamentais para o trabalho jornalístico.',
      'O AO PONTO BR buscará identificar as fontes sempre que isso for possível e adequado.',
      'Fontes anônimas poderão ser utilizadas em situações excepcionais, especialmente quando houver interesse público relevante e quando a identificação puder colocar a fonte em risco.',
      'Informações fornecidas anonimamente não serão tratadas automaticamente como verdadeiras. A necessidade de confirmação será avaliada de acordo com a relevância e a natureza da informação.',
      'O compromisso com uma fonte nunca estará acima do compromisso com a precisão da informação publicada.'
    ]
  },
  {
    id: '07',
    title: 'Correções e transparência',
    paragraphs: [
      'Erros podem acontecer no jornalismo. O que não pode acontecer é ignorá-los.',
      'Quando uma informação publicada estiver incorreta, o AO PONTO BR buscará corrigi-la de maneira clara, transparente e proporcional à relevância do erro.',
      'Atualizações que alterem significativamente a compreensão de uma notícia poderão ser identificadas no próprio conteúdo.',
      'Nosso objetivo não é aparentar infalibilidade, mas manter um processo permanente de aperfeiçoamento e correção.'
    ]
  },
  {
    id: '08',
    title: 'Independência editorial',
    paragraphs: [
      'As decisões jornalísticas do AO PONTO BR devem ser orientadas pelo interesse jornalístico e pelo interesse público.',
      'Publicidade, relações comerciais, interesses pessoais ou pressões externas não devem determinar o conteúdo editorial.',
      'Conteúdo patrocinado, publicidade e material comercial deverão ser identificados de forma que o leitor consiga diferenciá-los do conteúdo jornalístico.',
      'A independência editorial é essencial para preservar a confiança do público.'
    ]
  },
  {
    id: '09',
    title: 'Notícias, análises e opiniões',
    paragraphs: [
      'O AO PONTO BR reconhece que jornalismo possui diferentes formatos.',
      'Notícia apresenta fatos e informações apuradas.',
      'Análise busca explicar acontecimentos, apresentar contexto e interpretar informações com base em dados e conhecimentos disponíveis.',
      'Opinião apresenta uma perspectiva argumentativa identificada como tal.',
      'Esses formatos devem ser diferenciados para que o leitor saiba claramente quando está diante de informação factual, análise ou posicionamento opinativo.'
    ]
  },
  {
    id: '10',
    title: 'Sensacionalismo',
    paragraphs: [
      'O AO PONTO BR não utilizará deliberadamente informações distorcidas, títulos enganosos ou recursos sensacionalistas para provocar medo, indignação ou choque e aumentar artificialmente a audiência.',
      'Títulos devem representar adequadamente o conteúdo da matéria.',
      'A relevância de uma notícia deve ser determinada pelo seu interesse jornalístico, e não apenas pelo potencial de gerar cliques.',
      'Informar vem antes de chamar atenção.'
    ]
  },
  {
    id: '11',
    title: 'Privacidade e dignidade',
    paragraphs: [
      'O interesse público deve ser considerado antes da exposição de informações relacionadas à vida privada de qualquer pessoa.',
      'A existência de uma informação não significa, por si só, que sua publicação seja necessária.',
      'O AO PONTO BR buscará evitar exposição gratuita, humilhação ou divulgação de informações pessoais que não contribuam para a compreensão de um fato de interesse público.',
      'Casos envolvendo crianças, vítimas, pessoas vulneráveis e situações de sofrimento exigem atenção especial.'
    ]
  },
  {
    id: '12',
    title: 'Conteúdo sensível',
    paragraphs: [
      'Imagens, vídeos e descrições de acidentes, violência, tragédias ou outros acontecimentos sensíveis serão avaliados considerando sua relevância jornalística e seu impacto sobre o público.',
      'O AO PONTO BR evitará a publicação de conteúdo gráfico ou perturbador quando sua exposição não contribuir significativamente para a compreensão da notícia.',
      'Quando determinado material for essencial para explicar um acontecimento, sua apresentação deverá ser feita com contexto e responsabilidade.'
    ]
  },
  {
    id: '13',
    title: 'Redes sociais e conteúdo produzido pelo público',
    paragraphs: [
      'As redes sociais são importantes fontes de informação, mas uma publicação em uma rede social não constitui, por si só, confirmação de um fato.',
      'Conteúdos produzidos por usuários poderão ser utilizados quando forem relevantes e quando houver condições adequadas de verificação.',
      'Sempre que possível, a origem do material será identificada.',
      'O AO PONTO BR também reconhece que conteúdos digitais podem ser manipulados, retirados do ar, publicados fora de contexto ou atribuídos incorretamente. Por isso, a verificação de origem e contexto é parte essencial desse processo.'
    ]
  },
  {
    id: '14',
    title: 'Inteligência artificial',
    paragraphs: [
      'O AO PONTO BR reconhece o potencial da inteligência artificial como ferramenta de apoio ao jornalismo.',
      'Tecnologias de IA podem auxiliar em tarefas como organização de informações, análise de dados, transcrição, tradução, pesquisa, revisão e produção de determinados formatos.',
      'A utilização dessas ferramentas não transfere para a tecnologia a responsabilidade pelo conteúdo publicado.',
      'A responsabilidade editorial permanece humana.',
      'Conteúdos produzidos ou modificados com auxílio significativo de inteligência artificial serão submetidos a processos adequados de revisão e verificação.',
      'Imagens, áudios ou vídeos sintéticos não deverão ser apresentados de maneira que induza o público a acreditar que representam acontecimentos reais quando não representam.',
      'O uso de IA também deverá respeitar direitos autorais, privacidade, segurança de dados e demais obrigações legais aplicáveis.'
    ]
  },
  {
    id: '15',
    title: 'Interesse público',
    paragraphs: [
      'O AO PONTO BR considera de interesse público informações que possam contribuir significativamente para que a sociedade compreenda acontecimentos, decisões, políticas, problemas, riscos ou situações que afetem a coletividade.',
      'Interesse público não é sinônimo de curiosidade pública.',
      'A audiência potencial de uma informação não será, isoladamente, justificativa suficiente para sua publicação.'
    ]
  },
  {
    id: '16',
    title: 'Diversidade de perspectivas',
    paragraphs: [
      'Uma cobertura jornalística responsável deve considerar diferentes perspectivas relevantes para a compreensão dos fatos.',
      'Buscamos ouvir pessoas com experiências, conhecimentos e posições diferentes, especialmente em assuntos controversos.',
      'A pluralidade não significa abandonar critérios jornalísticos ou dar espaço equivalente a informações comprovadamente falsas. Significa garantir que o leitor tenha acesso às perspectivas relevantes e às evidências disponíveis.'
    ]
  },
  {
    id: '17',
    title: 'Relação com o leitor',
    paragraphs: [
      'O leitor é parte importante do processo jornalístico.',
      'Críticas, sugestões, correções e informações enviadas pelo público podem contribuir para melhorar nossas coberturas.',
      'O AO PONTO BR buscará manter canais adequados para receber manifestações dos leitores e avaliar informações que possam contribuir para corrigir ou complementar conteúdos publicados.'
    ]
  }
];

const sidebarList = [
  { label: 'O compromisso do AO PONTO BR', href: '#01' },
  { label: 'Jornalismo e apuração', href: '#02' },
  { label: 'Pilares da informação', href: '#03' },
  { label: 'Verificação e fontes', href: '#04' },
  { label: 'Independência e transparência', href: '#08' },
  { label: 'Interesse público e ética', href: '#15' }
];

export default function EditorialPolicyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-10 border-b border-gray-200 pb-8">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.24em] text-[#991B1B]">AO PONTO BR</p>
        <h1 className="max-w-4xl text-4xl font-light leading-none tracking-[-0.06em] text-gray-900 sm:text-5xl lg:text-7xl">
          Princípios Editoriais
        </h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.8fr_0.8fr]">
        <article className="space-y-10">
          <header className="rounded-[28px] border border-gray-200 bg-[#F8F8F8] p-6 sm:p-8">
            <p className="text-base leading-8 text-gray-700">
              O <span className="font-medium text-gray-900">AO PONTO BR</span> nasceu com o propósito de informar. Em um ambiente digital em que qualquer pessoa pode produzir e compartilhar conteúdo em poucos segundos, acreditamos que o jornalismo profissional tem uma responsabilidade ainda maior: <span className="font-medium text-gray-900">apurar, verificar, contextualizar e apresentar os fatos com clareza.</span>
            </p>
            <p className="mt-4 text-base leading-8 text-gray-700">
              Nossa relação com o leitor é baseada em confiança. Por isso, estes princípios estabelecem os critérios que orientam a produção, edição e publicação do conteúdo jornalístico do AO PONTO BR.
            </p>
          </header>

          {editorialSections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 border-b border-gray-200 pb-8 last:border-b-0 last:pb-0">
              <div className="mb-4 flex items-center gap-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#991B1B]/10 text-sm font-medium text-[#991B1B]">
                  {section.id}
                </span>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-gray-900 sm:text-3xl">
                  {section.title}
                </h2>
              </div>

              <div className="space-y-4 text-base leading-8 text-gray-700">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={`${section.id}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section className="rounded-[28px] border border-[#111111] bg-[#111111] p-6 text-white sm:p-8">
            <h2 className="mb-4 text-2xl font-light tracking-[-0.04em] text-white sm:text-3xl">Compromisso final</h2>
            <p className="text-base leading-8 text-gray-200">
              Os princípios editoriais do AO PONTO BR representam um compromisso permanente com o leitor.
            </p>
            <p className="mt-4 text-base leading-8 text-gray-200">
              Sabemos que jornalismo é um processo humano, sujeito a limitações e erros. Por isso, nosso objetivo não é prometer perfeição, mas estabelecer métodos, responsabilidades e critérios que aumentem a qualidade da informação.
            </p>
            <p className="mt-6 text-xl font-light tracking-[-0.04em] text-white">
              Precisão. Independência. Contexto. Transparência. Responsabilidade.
            </p>
            <p className="mt-6 text-base leading-8 text-gray-200">
              O AO PONTO BR acredita que a confiança não deve ser simplesmente exigida do leitor. Ela deve ser construída todos os dias.
            </p>
          </section>

        </article>

        <aside className="lg:pt-14">
          <div className="sticky top-8 rounded-[26px] border border-gray-200 bg-[#F8F8F8] p-6">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#991B1B]">Sumário</p>
            <h3 className="text-3xl font-light tracking-[-0.05em] text-gray-900">Pilares editoriais</h3>
            <nav aria-label="Sumário dos princípios editoriais" className="mt-6 space-y-3 text-sm text-gray-700">
              {sidebarList.map((item) => (
                <Link key={item.label} href={item.href} className="block rounded-lg border border-transparent px-2 py-2 transition hover:border-gray-200 hover:bg-white hover:text-gray-900">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 border-t border-gray-200 pt-5 text-sm leading-7 text-gray-700">
              <p>Informar com responsabilidade.</p>
              <p>Apurar com transparência.</p>
              <p>Servir o leitor com clareza.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

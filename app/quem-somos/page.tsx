import { BadgeCheck, BookOpenText, Newspaper, ShieldCheck, Sparkles, Users2 } from 'lucide-react';

const principles = [
  {
    icon: ShieldCheck,
    title: 'Jornalismo responsável',
    description:
      'A apuração e a verificação das informações são prioridades em nosso trabalho. Buscamos publicar conteúdos baseados em fatos e fontes confiáveis.',
  },
  {
    icon: BadgeCheck,
    title: 'Independência editorial',
    description:
      'A RBN busca preservar sua independência na produção e publicação de conteúdo jornalístico, mantendo critérios editoriais próprios e transparentes.',
  },
  {
    icon: BookOpenText,
    title: 'Transparência',
    description:
      'Reconhecemos a importância de deixar claro ao leitor como a informação é produzida. Quando necessário, corrigimos erros e atualizamos conteúdos para manter a precisão das informações publicadas.',
  },
  {
    icon: Users2,
    title: 'Pluralidade',
    description:
      'Acreditamos que uma sociedade informada precisa ter acesso a diferentes opiniões, perspectivas e vozes. Buscamos ampliar o debate público com respeito à diversidade de ideias.',
  },
  {
    icon: Sparkles,
    title: 'Inovação',
    description:
      'Utilizamos tecnologia e novos formatos para tornar o jornalismo mais acessível, dinâmico e adequado à forma como as pessoas consomem informação atualmente.',
  },
];

export default function QuemSomosPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-10 border-b border-gray-200 pb-8">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.24em] text-[#991B1B]">RBN</p>
        <h1 className="max-w-4xl text-4xl font-light leading-none tracking-[-0.06em] text-gray-900 sm:text-5xl lg:text-7xl">
          Quem Somos
        </h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.65fr_0.85fr]">
        <div className="space-y-10">
          <section className="space-y-6 rounded-[28px] border border-gray-200 bg-white p-6 sm:p-8">
            <p className="text-xl font-light leading-relaxed text-gray-700 sm:text-2xl">
              O <span className="font-medium text-gray-900">RBN</span> é um portal jornalístico digital criado para levar informação de forma <span className="font-medium text-gray-900">clara, responsável e acessível</span> aos leitores.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <p className="text-base leading-8 text-gray-700">
                Fundado em 2026 pelo jornalista César Pestalozzi, o RBN nasceu com a proposta de construir uma nova experiência de jornalismo digital, pautada pela qualidade da informação, pela inovação e pelo compromisso com o leitor.
              </p>
              <p className="text-base leading-8 text-gray-700">
                Nossa missão é acompanhar os principais acontecimentos do Brasil e do mundo com rigor editorial, contexto e clareza, ajudando a construir uma cultura de informação mais consciente e confiável.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-200 bg-[#F8F8F8] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-[#991B1B]/10 p-2 text-[#991B1B]">
                <Newspaper className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-light tracking-[-0.04em] text-gray-900 sm:text-3xl">Sobre o RBN</h2>
            </div>
            <div className="space-y-5 text-base leading-8 text-gray-700">
              <p>
                O RBN foi fundado em 2026 pelo jornalista César Pestalozzi, com a proposta de construir uma nova experiência de jornalismo digital, pautada pela informação de qualidade, pela inovação e pelo compromisso com o leitor.
              </p>
              <p>
                Desde sua criação, o portal busca oferecer um jornalismo independente, responsável e acessível, valorizando a apuração dos fatos, a clareza da informação e o respeito ao público.
              </p>
              <p>
                O RBN nasce com o propósito de acompanhar as transformações do jornalismo e da sociedade, ampliando sua cobertura e desenvolvendo novas formas de informar, conectar e aproximar o leitor dos acontecimentos que fazem parte do seu cotidiano.
              </p>
              <p>
                Em constante evolução, o portal investe no aprimoramento de seus processos, na diversidade de temas e na qualidade de seu conteúdo, mantendo como princípio fundamental o compromisso com a informação e com o interesse público.
              </p>
              <p className="font-medium text-gray-900">RBN. Informação que acompanha o seu tempo.</p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#991B1B]/10 p-2 text-[#991B1B]">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-light tracking-[-0.04em] text-gray-900 sm:text-3xl">Nossa missão</h2>
            </div>
            <p className="text-base leading-8 text-gray-700">
              Produzir jornalismo com responsabilidade, rigor e clareza, contribuindo para que o leitor compreenda os acontecimentos que impactam a sociedade e tenha acesso a uma informação útil, contextualizada e confiável.
            </p>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#991B1B]/10 p-2 text-[#991B1B]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-light tracking-[-0.04em] text-gray-900 sm:text-3xl">Nossos princípios</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {principles.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-[22px] border border-gray-200 bg-white p-5 shadow-[0_10px_30px_rgba(17,17,17,0.02)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(17,17,17,0.04)]">
                  <div className="mb-4 inline-flex rounded-full bg-[#991B1B]/10 p-2 text-[#991B1B]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-3 text-xl font-light leading-snug tracking-[-0.04em] text-gray-900">{title}</h3>
                  <p className="text-sm leading-7 text-gray-700">{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-6 rounded-[28px] border border-gray-200 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#991B1B]/10 p-2 text-[#991B1B]">
                <Users2 className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-light tracking-[-0.04em] text-gray-900 sm:text-3xl">Quem está por trás do RBN</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#111111] text-3xl font-semibold text-white md:h-40 md:w-40">
                CP
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#991B1B]">Fundador</p>
                <h3 className="text-3xl font-light tracking-[-0.05em] text-gray-900">César Pestalozzi</h3>
                <p className="text-base leading-8 text-gray-700">Jornalista e fundador do RBN.</p>
                <p className="text-base leading-8 text-gray-700">
                  Com uma visão voltada para a credibilidade, a contextualização e a aproximação com o leitor, César lidera a construção de um portal que busca traduzir o jornalismo contemporâneo em uma experiência clara, moderna e confiável.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:pt-14">
          <div className="sticky top-8 space-y-6">
            <div className="rounded-[26px] border border-gray-200 bg-[#F8F8F8] p-6">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#991B1B]">RBN</p>
              <h3 className="text-3xl font-light tracking-[-0.05em] text-gray-900">Nossa visão</h3>
              <div className="mt-6 space-y-4 text-sm leading-7 text-gray-700">
                <p>Ser uma referência em jornalismo digital com foco em clareza, confiança e impacto social.</p>
                <p>Ampliar o alcance da informação de qualidade e fortalecer a relação entre o leitor e o conhecimento.</p>
                <p>Construir um espaço onde a credibilidade, a apuração e o interesse público estejam no centro.</p>
              </div>
            </div>

            <div id="expediente" className="rounded-[26px] border border-gray-200 bg-[#111111] p-6 text-white">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#F5C4C4]">Expediente</p>
              <h3 className="mt-3 text-2xl font-light tracking-[-0.04em] text-white">Jornalismo com rigor</h3>
              <ul className="mt-5 space-y-2 text-sm leading-7 text-gray-200">
                <li>• Independência editorial</li>
                <li>• Apuração e verificação</li>
                <li>• Transparência</li>
                <li>• Correção de informação</li>
                <li>• Respeito ao leitor</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

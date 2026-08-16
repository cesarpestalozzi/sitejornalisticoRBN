import { ArrowRight, BadgeCheck, BookOpenText, Globe2, Newspaper, ShieldCheck, Sparkles, Users2 } from 'lucide-react';

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
      'O AO PONTO BR busca preservar sua independência na produção e publicação de conteúdo jornalístico, mantendo critérios editoriais próprios e transparentes.',
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

const coverageAreas = [
  'Brasil',
  'Mundo',
  'Política',
  'Economia',
  'Tecnologia',
  'Cultura',
  'Entretenimento',
  'Esportes',
  'Saúde',
  'Ciência',
  'Notícias locais e regionais',
];

export default function QuemSomosPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-10 border-b border-gray-200 pb-8">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.24em] text-[#991B1B]">AO PONTO BR</p>
        <h1 className="max-w-4xl text-4xl font-light leading-none tracking-[-0.06em] text-gray-900 sm:text-5xl lg:text-7xl">
          Quem Somos
        </h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_0.8fr]">
        <div className="space-y-12">
          <section className="space-y-6">
            <p className="text-xl font-light leading-relaxed text-gray-700 sm:text-2xl">
              O <span className="font-medium text-gray-900">AO PONTO BR</span> é um portal jornalístico digital criado para levar informação de forma <span className="font-medium text-gray-900">clara, responsável e acessível</span> aos leitores.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <p className="text-base leading-8 text-gray-700">
                Nossa proposta é acompanhar os principais acontecimentos do Brasil e do mundo, oferecendo notícias, análises e conteúdos informativos com compromisso com a apuração dos fatos, pluralidade de perspectivas e transparência editorial.
              </p>
              <p className="text-base leading-8 text-gray-700">
                Em um cenário em que a informação circula cada vez mais rápido, acreditamos que jornalismo de qualidade exige mais do que velocidade: exige responsabilidade, contexto e compromisso com a verdade.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-200 bg-[#F8F8F8] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-[#991B1B]/10 p-2 text-[#991B1B]">
                <Newspaper className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-light tracking-[-0.04em] text-gray-900 sm:text-3xl">Nossa Missão</h2>
            </div>
            <p className="max-w-3xl text-lg leading-8 text-gray-700">
              Nossa missão é <span className="font-medium text-gray-900">informar com responsabilidade e contribuir para que nossos leitores compreendam os acontecimentos que impactam a sociedade</span>.
            </p>
            <div className="mt-6 border-t border-gray-200 pt-6">
              <p className="text-base leading-8 text-gray-700">
                Buscamos produzir conteúdos jornalísticos relevantes, objetivos e bem apurados, valorizando a informação de interesse público e o direito do leitor de ter acesso a diferentes perspectivas sobre os fatos.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#991B1B]/10 p-2 text-[#991B1B]">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-light tracking-[-0.04em] text-gray-900 sm:text-3xl">Nossos Princípios</h2>
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

          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#991B1B]/10 p-2 text-[#991B1B]">
                <Globe2 className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-light tracking-[-0.04em] text-gray-900 sm:text-3xl">O Que Você Encontra no AO PONTO BR</h2>
            </div>

            <p className="max-w-3xl text-base leading-8 text-gray-700">
              Nossa cobertura reúne diferentes áreas de interesse público, incluindo:
            </p>

            <div className="flex flex-wrap gap-3">
              {coverageAreas.map((area) => (
                <span key={area} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700">
                  {area}
                </span>
              ))}
            </div>

            <p className="text-base leading-8 text-gray-700">
              Nosso objetivo é oferecer uma experiência completa para quem busca <span className="font-medium text-gray-900">informação, contexto e credibilidade</span> em um único lugar.
            </p>
          </section>

          <section className="rounded-[28px] border border-gray-200 bg-white p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-full bg-[#991B1B]/10 p-2 text-[#991B1B]">
                <ArrowRight className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-light tracking-[-0.04em] text-gray-900 sm:text-3xl">Nossa História</h2>
            </div>
            <p className="text-base leading-8 text-gray-700">
              O <span className="font-medium text-gray-900">AO PONTO BR foi fundado em 2026</span>, com a proposta de construir uma nova experiência de jornalismo digital.
            </p>
            <p className="mt-4 text-base leading-8 text-gray-700">
              Desde o início, o projeto tem como pilares a qualidade da informação, a inovação e o respeito ao leitor. O portal está em constante evolução, buscando aprimorar seus processos, ampliar sua cobertura e desenvolver novas formas de apresentar informação jornalística.
            </p>
          </section>

          <section className="rounded-[28px] border border-gray-200 bg-[#F8F8F8] p-6 sm:p-8">
            <p className="text-base leading-8 text-gray-700">
              À medida que o AO PONTO BR cresce, nosso compromisso permanece o mesmo: <span className="font-medium text-gray-900">produzir informação relevante, responsável e útil para nossos leitores.</span>
            </p>
          </section>

          <section className="rounded-[28px] border border-[#111111] bg-[#111111] p-6 text-white sm:p-8">
            <h2 className="mb-4 text-2xl font-light tracking-[-0.04em] text-white sm:text-3xl">Nosso Compromisso com o Leitor</h2>
            <p className="text-base leading-8 text-gray-200">
              O leitor está no centro do nosso trabalho.
            </p>
            <p className="mt-4 text-base leading-8 text-gray-200">
              Por isso, buscamos manter uma relação baseada em <span className="font-medium text-white">confiança, transparência e responsabilidade</span>. Valorizamos sugestões, críticas e apontamentos que possam contribuir para o aprimoramento do nosso jornalismo.
            </p>
            <p className="mt-6 text-base leading-8 text-gray-200">
              O AO PONTO BR acredita que informação de qualidade é essencial para uma sociedade mais consciente, participativa e preparada para tomar decisões.
            </p>
            <p className="mt-8 text-xl font-light tracking-[-0.04em] text-white">AO PONTO BR — Informação que importa.</p>
          </section>
        </div>

        <aside className="lg:pt-14">
          <div className="sticky top-8 rounded-[26px] border border-gray-200 bg-[#F8F8F8] p-6">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#991B1B]">AO PONTO BR</p>
            <h3 className="text-3xl font-light tracking-[-0.05em] text-gray-900">Jornalismo com rigor</h3>
            <div className="mt-6 space-y-5 border-t border-gray-200 pt-5 text-sm leading-7 text-gray-700">
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

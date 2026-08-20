import BackButton from "../components/BackButton";

export default function ComoFunciona() {

  return (
    <main className="bg-[#faf7f0] text-[#2b2118] min-h-screen">

      <div className="px-6 pt-24">
        <BackButton />
      </div>

      <section className="py-16 px-6 text-center">
        <div className="max-w-5xl mx-auto">
          <p className="uppercase tracking-[0.35em] text-sm text-[#b08d57] mb-8">
            Como funciona
          </p>

          <h1 className="text-5xl md:text-6xl font-serif font-bold leading-tight">
            Um processo claro para tirar seu livro do papel
          </h1>

          <p className="mt-8 text-xl leading-9 text-gray-700">
            Na Casa do Autor, cada projeto recebe suporte editorial, criação e estratégia de publicação. Nós guiamos você em etapas objetivas, com atenção à sua voz e ao público que você quer alcançar.
          </p>

          <div className="mt-14 rounded-[2.5rem] bg-white p-10 shadow-[0_20px_80px_rgba(43,33,24,0.08)]">
            <p className="text-3xl md:text-4xl font-serif italic leading-relaxed text-[#2b2118]">
              Um percurso feito com criatividade, método e cuidado.
            </p>
            <p className="mt-6 text-gray-600 leading-8">
              Do esboço inicial à obra pronta, nosso trabalho inclui ideias, revisão, supervisão editorial e suporte para que seu livro chegue ao leitor com qualidade.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-8">
            {[
              {
                etapa: "1. Descoberta",
                titulo: "Entendemos sua história",
                descricao: "Conversamos sobre suas ideias, referências e objetivos para criar um projeto alinhado ao seu estilo e ao mercado editorial.",
              },
              {
                etapa: "2. Desenvolvimento",
                titulo: "Transformamos ideias em narrativa",
                descricao: "Construímos personagens, trama e capítulos com foco em uma experiência de leitura fluida e envolvente.",
              },
              {
                etapa: "3. Aperfeiçoamento",
                titulo: "Aprimoramos cada detalhe",
                descricao: "Realizamos leitura crítica, revisão de estilo e sugestões estruturais para fortalecer o impacto da obra.",
              },
              {
                etapa: "4. Publicação",
                titulo: "Preparamos seu livro para o público",
                descricao: "Orientamos formatação, capa, divulgação e canais de lançamento para dar visibilidade ao seu projeto.",
              },
            ].map((item) => (
              <div key={item.etapa} className="rounded-[2rem] border border-[#dcc9ae] bg-white p-8 shadow-[0_20px_40px_rgba(43,33,24,0.06)]">
                <p className="text-sm uppercase tracking-[0.25em] text-[#b08d57] mb-3">
                  {item.etapa}
                </p>
                <h2 className="text-3xl font-serif mb-4">
                  {item.titulo}
                </h2>
                <p className="text-gray-700 leading-7">
                  {item.descricao}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[2rem] overflow-hidden shadow-[0_30px_80px_rgba(43,33,24,0.15)]">
            <img
              src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1000&q=80"
              alt="Projeto de livro com notas e caneta"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif mb-8">
            Transparência e parceria em cada passo
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-[#faf7f0] p-8 border border-[#e7decf]">
              <h3 className="text-2xl font-serif mb-4">Processo claro</h3>
              <p className="text-gray-700 leading-7">Explicamos cada fase e mantemos você informado com prazos e entregas claras.</p>
            </div>
            <div className="rounded-3xl bg-[#faf7f0] p-8 border border-[#e7decf]">
              <h3 className="text-2xl font-serif mb-4">Atenção à sua voz</h3>
              <p className="text-gray-700 leading-7">Trabalhamos para que sua obra mantenha sua identidade e significado.</p>
            </div>
            <div className="rounded-3xl bg-[#faf7f0] p-8 border border-[#e7decf]">
              <h3 className="text-2xl font-serif mb-4">Suporte completo</h3>
              <p className="text-gray-700 leading-7">Da concepção ao lançamento, você conta com apoio especializado em todas as escolhas.</p>
            </div>
          </div>
        </div>
      </section>

    </main>
  );

}
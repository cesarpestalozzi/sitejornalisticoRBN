import BackButton from "../components/BackButton";

export default function Servicos(){

  return(

    <main className="min-h-screen bg-[#f4efe7] p-10">

      <div className="mb-8">
        <BackButton />
      </div>

      <div className="max-w-6xl mx-auto">

        <header className="text-center mb-16">
          <p className="uppercase tracking-[8px] text-[#b08d57] mb-4">
            Serviços
          </p>

          <h1 className="text-5xl md:text-6xl font-serif mb-6">
            Do rascunho ao livro pronto para o leitor.
          </h1>

          <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-8">
            Na Casa do Autor, oferecemos suporte completo, do desenvolvimento da ideia à preparação para lançamento. Nosso trabalho vai além da edição: alinhamos sua voz à forma certa para que a obra encante e conquiste os leitores.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-3 mb-16">
          {[
            {
              titulo: "Desenvolvimento literário",
              descricao: "Ajudamos você a estruturar trama, personagens, ritmo e arcabouço narrativo para transformar sua ideia em um livro envolvente.",
              itens: [
                "Mapeamento de enredo e personagens",
                "Construção de capítulos e cenas",
                "Acompanhamento criativo colaborativo"
              ]
            },
            {
              titulo: "Leitura crítica",
              descricao: "Analisamos sua obra com olhar profissional e humanizado, entregando sugestões claras para elevar estilo, coerência e impacto emocional.",
              itens: [
                "Feedback sobre trama e personagens",
                "Revisão de ritmo e voz narrativa",
                "Sugestões para aperfeiçoar estrutura"
              ]
            },
            {
              titulo: "Preparação para publicação",
              descricao: "Orientamos cada passo para que seu livro seja publicado com confiança, desde formatação até divulgação e escolha de canais.",
              itens: [
                "Formatação editorial e capa",
                "Planejamento de lançamento",
                "Sugestões de canais e divulgação"
              ]
            }
          ].map((item) => (
            <div key={item.titulo} className="rounded-3xl border border-[#dcc9ae] bg-white p-8 shadow-[0_20px_50px_rgba(43,33,24,0.08)]">
              <h2 className="text-2xl font-serif mb-4 text-[#2b2118]">
                {item.titulo}
              </h2>
              <p className="text-gray-700 leading-7 mb-6">
                {item.descricao}
              </p>
              <ul className="space-y-3 text-gray-600">
                {item.itens.map((linha) => (
                  <li key={linha} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#b08d57]" />
                    <span>{linha}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-center">
          <div>
            <h2 className="text-4xl font-serif mb-5">
              Um serviço feito para quem quer contar histórias de verdade.
            </h2>
            <p className="text-lg text-gray-700 leading-8 mb-6">
              Nós trabalhamos com respeito à sua voz e atenção à sua jornada. Cada projeto é tratado como uma obra única, com apoio especializado para que sua mensagem chegue clara e impactante ao leitor.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-[#fff9f1] p-6 border border-[#e5d6b9]">
                <h3 className="font-serif text-xl mb-3">Atendimento personalizado</h3>
                <p className="text-sm text-gray-600 leading-6">
                  Conversas profundas para entender seu livro e suas metas.
                </p>
              </div>
              <div className="rounded-3xl bg-[#f3f0ef] p-6 border border-[#d9d1c7]">
                <h3 className="font-serif text-xl mb-3">Processo transparente</h3>
                <p className="text-sm text-gray-600 leading-6">
                  Etapas claras e feedback constante durante todo o projeto.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            <img
              src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80"
              alt="Pessoa lendo em uma biblioteca"
              className="h-64 w-full rounded-3xl object-cover shadow-xl"
            />
            <img
              src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80"
              alt="Livros alinhados em prateleira"
              className="h-64 w-full rounded-3xl object-cover shadow-xl"
            />
          </div>
        </section>

      </div>

    </main>

  )

}
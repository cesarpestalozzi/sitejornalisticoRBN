'use client';

import Sidebar from '@/app/components/Sidebar';

export default function TermsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Termos de Uso</h1>
          <p className="text-gray-600 mb-8">Última atualização: 09 de agosto de 2026</p>

          <div className="prose prose-lg max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Aceitação dos Termos</h2>
              <p className="text-gray-700 leading-relaxed">
                Ao acessar e usar o RBN, você concorda em aceitar e estar vinculado por este Acordo de Termos de Serviço. 
                Se você não concordar em estar vinculado por estes termos, não use este Portal.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Licença de Uso</h2>
              <p className="text-gray-700 leading-relaxed">
                O RBN concede a você uma licença limitada, não exclusiva e não transferível para acessar e usar este Portal 
                para fins pessoais, não comerciais. Você não pode reproduzir, distribuir, transmitir, exibir ou vender qualquer conteúdo 
                sem permissão escrita prévia.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Restrições de Conteúdo</h2>
              <p className="text-gray-700 leading-relaxed">
                Você não pode:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Reproduzir ou distribuir conteúdo sem permissão</li>
                <li>Usar conteúdo para fins comerciais</li>
                <li>Modificar ou adaptar o conteúdo</li>
                <li>Vender ou licenciar conteúdo</li>
                <li>Fazer scraping ou coletar dados automaticamente</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Propriedade Intelectual</h2>
              <p className="text-gray-700 leading-relaxed">
                Todo o conteúdo, recursos e designs do RBN, incluindo texto, gráficos, logos e imagens, 
                são propriedade do RBN ou de seus fornecedores de conteúdo e protegidos pelas leis de 
                direitos autorais internacionais.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Isenção de Responsabilidade</h2>
              <p className="text-gray-700 leading-relaxed">
                O RBN fornece o conteúdo "no estado em que se encontra". Não oferecemos garantias de 
                qualquer tipo, expressas ou implícitas. Não garantimos que o Portal seja ininterrupto, 
                seguro ou livre de erros.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Limitação de Responsabilidade</h2>
              <p className="text-gray-700 leading-relaxed">
                Em nenhum caso o RBN será responsável por danos indiretos, incidentais, especiais ou 
                consequentes decorrentes do uso ou da impossibilidade de usar o Portal ou o conteúdo.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Modificações dos Termos</h2>
              <p className="text-gray-700 leading-relaxed">
                O RBN se reserva o direito de modificar estes Termos de Uso a qualquer momento. 
                Continuando a usar o Portal após tais modificações, você aceita os novos termos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Lei Aplicável</h2>
              <p className="text-gray-700 leading-relaxed">
                Estes Termos de Uso são regidos pelas leis aplicáveis e você concorda em se submeter 
                à jurisdição exclusiva dos tribunais competentes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Contato</h2>
              <p className="text-gray-700 leading-relaxed">
                Se tiver dúvidas sobre estes Termos de Uso, entre em contato conosco em:<br />
                E-mail: legal@rbn.com.br
              </p>
            </section>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}

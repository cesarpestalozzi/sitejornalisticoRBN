'use client';

import Link from 'next/link';
import Sidebar from '@/app/components/Sidebar';

export default function PrivacyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Política de Privacidade</h1>
          <p className="text-gray-600 mb-8">Última atualização: 09 de agosto de 2026</p>

          <div className="prose prose-lg max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Introdução</h2>
              <p className="text-gray-700 leading-relaxed">
                O AO PONTO BR ("Portal", "nós", "nosso") respeita a privacidade de seus usuários e visitantes. 
                Esta Política de Privacidade explica como coletamos, usamos, divulgamos e salvaguardamos suas informações.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Informações que Coletamos</h2>
              <p className="text-gray-700 leading-relaxed">
                Coletamos informações que você nos fornece voluntariamente, como:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Endereço de e-mail (para newsletter)</li>
                <li>Nome completo (opcional)</li>
                <li>Dados de conta (se criar login)</li>
                <li>Comentários e feedback</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Como Usamos Suas Informações</h2>
              <p className="text-gray-700 leading-relaxed">
                Usamos as informações coletadas para:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Enviar newsletter e atualizações</li>
                <li>Responder suas dúvidas e comentários</li>
                <li>Melhorar o Portal</li>
                <li>Análise de uso e estatísticas</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Segurança de Dados</h2>
              <p className="text-gray-700 leading-relaxed">
                Implementamos medidas técnicas e administrativas apropriadas para proteger suas informações pessoais 
                contra acesso não autorizado, alteração, divulgação ou destruição.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Cookies</h2>
              <p className="text-gray-700 leading-relaxed">
                Usamos cookies para melhorar sua experiência. Você pode controlar as preferências de cookies 
                nas configurações do seu navegador.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Links para Terceiros</h2>
              <p className="text-gray-700 leading-relaxed">
                O AO PONTO BR pode conter links para sites de terceiros. Não somos responsáveis pela privacidade 
                desses sites. Recomendamos revisar suas políticas de privacidade.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Seus Direitos</h2>
              <p className="text-gray-700 leading-relaxed">
                Você tem o direito de:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir informações imprecisas</li>
                <li>Solicitar a exclusão de seus dados</li>
                <li>Optar por não receber comunicações de marketing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Contato</h2>
              <p className="text-gray-700 leading-relaxed">
                Se tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco em:
              </p>
              <p className="text-gray-700 leading-relaxed">
                E-mail: privacidade@pznews.com.br<br />
                Endereço: São Paulo, SP
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

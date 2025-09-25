'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';

export default function SobreEmpresaPage() {
  useEffect(() => {
    // Scroll para o topo da página
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-4xl font-bold text-gray-900 text-center mb-8">
              Sobre a Consert
            </h1>
            
            <div className="prose prose-lg max-w-none text-gray-700">
              <p className="text-lg text-gray-600 mb-8 text-center">
                Transformando a gestão de assistência técnica com tecnologia e inovação
              </p>

              <div className="space-y-8">
                {/* Nossa História */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Nossa História
                  </h2>
                  <p className="mb-4">
                    A Consert nasceu da necessidade de modernizar e simplificar a gestão de assistência técnica. 
                    Observamos que muitas empresas do setor ainda dependiam de planilhas, papel e processos manuais 
                    que geravam ineficiências e erros.
                  </p>
                  <p className="mb-4">
                    Nossa missão é oferecer uma solução completa e intuitiva que permita aos técnicos e gestores 
                    focarem no que realmente importa: oferecer um excelente atendimento aos clientes.
                  </p>
                  <p>
                    Hoje, somos referência em sistemas de gestão para assistência técnica, atendendo empresas 
                    de todos os portes em todo o Brasil.
                  </p>
                </section>

                {/* Nossa Missão */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Nossa Missão
                  </h2>
                  <p className="mb-4">
                    Simplificar e automatizar a gestão de assistência técnica através de tecnologia inovadora, 
                    proporcionando eficiência operacional e excelência no atendimento ao cliente.
                  </p>
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-xl font-medium text-blue-900 mb-3">
                      O que nos move:
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-blue-800">
                      <li>Facilitar o trabalho dos técnicos e gestores</li>
                      <li>Reduzir erros e retrabalho</li>
                      <li>Aumentar a satisfação dos clientes</li>
                      <li>Promover o crescimento sustentável das empresas</li>
                    </ul>
                  </div>
                </section>

                {/* Nossos Valores */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Nossos Valores
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-xl font-medium text-gray-800 mb-3">
                        🎯 Simplicidade
                      </h3>
                      <p className="text-gray-700">
                        Acreditamos que a tecnologia deve ser intuitiva e fácil de usar, 
                        não complicar o trabalho das pessoas.
                      </p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-xl font-medium text-gray-800 mb-3">
                        ⚡ Eficiência
                      </h3>
                      <p className="text-gray-700">
                        Buscamos constantemente otimizar processos e eliminar desperdícios 
                        de tempo e recursos.
                      </p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-xl font-medium text-gray-800 mb-3">
                        🤝 Confiança
                      </h3>
                      <p className="text-gray-700">
                        Construímos relacionamentos duradouros baseados na transparência 
                        e na entrega de resultados.
                      </p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-xl font-medium text-gray-800 mb-3">
                        🚀 Inovação
                      </h3>
                      <p className="text-gray-700">
                        Estamos sempre buscando novas formas de resolver problemas 
                        e melhorar a experiência dos usuários.
                      </p>
                    </div>
                  </div>
                </section>

                {/* O que fazemos */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    O que fazemos
                  </h2>
                  <p className="mb-4">
                    Desenvolvemos e oferecemos uma plataforma completa de gestão para assistência técnica, 
                    que inclui:
                  </p>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center p-4">
                      <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📋</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        Gestão de Ordens
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Controle completo de ordens de serviço, desde a abertura até a finalização
                      </p>
                    </div>
                    <div className="text-center p-4">
                      <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">👥</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        Gestão de Equipe
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Controle de técnicos, comissões e níveis de acesso personalizados
                      </p>
                    </div>
                    <div className="text-center p-4">
                      <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">💰</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        Controle Financeiro
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Acompanhamento de vendas, pagamentos e movimentações financeiras
                      </p>
                    </div>
                    <div className="text-center p-4">
                      <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📱</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        WhatsApp Automático
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Notificações automáticas para clientes via WhatsApp
                      </p>
                    </div>
                    <div className="text-center p-4">
                      <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📊</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        Relatórios
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Dashboards e relatórios detalhados para tomada de decisão
                      </p>
                    </div>
                    <div className="text-center p-4">
                      <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🔧</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        Suporte Técnico
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Suporte especializado para garantir o melhor uso da plataforma
                      </p>
                    </div>
                  </div>
                </section>

                {/* Nossa Equipe */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Nossa Equipe
                  </h2>
                  <p className="mb-4">
                    Somos uma equipe apaixonada por tecnologia e comprometida com o sucesso dos nossos clientes. 
                    Nossos desenvolvedores, designers e especialistas em atendimento trabalham em conjunto 
                    para criar soluções que realmente fazem a diferença no dia a dia das empresas.
                  </p>
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
                    <h3 className="text-xl font-medium text-gray-800 mb-3">
                      Por que escolher a Consert?
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      <li><strong>Experiência:</strong> Conhecemos profundamente as necessidades do setor</li>
                      <li><strong>Inovação:</strong> Sempre buscamos as melhores tecnologias</li>
                      <li><strong>Suporte:</strong> Estamos aqui para ajudar quando você precisar</li>
                      <li><strong>Evolução:</strong> Melhoramos constantemente baseado no feedback dos clientes</li>
                    </ul>
                  </div>
                </section>

                {/* Contato */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    Entre em Contato
                  </h2>
                  <p className="mb-4">
                    Quer saber mais sobre como podemos ajudar sua empresa? Estamos aqui para conversar!
                  </p>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 mb-3">
                          📧 E-mail
                        </h3>
                        <p className="text-gray-600">contato@consert.app</p>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 mb-3">
                          💬 WhatsApp
                        </h3>
                        <p className="text-gray-600">Através do sistema de chat</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        Nossa equipe de suporte está disponível para ajudar você a aproveitar ao máximo 
                        todas as funcionalidades da plataforma Consert.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Call to Action */}
                <section className="text-center">
                  <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-8 rounded-lg">
                    <h3 className="text-2xl font-bold mb-4">
                      Pronto para transformar sua gestão?
                    </h3>
                    <p className="text-lg mb-6 opacity-90">
                      Junte-se a centenas de empresas que já confiam na Consert para gerenciar suas operações.
                    </p>
                    <Link 
                      href="/cadastro"
                      className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Começar Agora
                    </Link>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-8 border-t border-gray-200 text-center">
                <p className="text-gray-500 text-sm">
                  © {new Date().getFullYear()} Consert. Todos os direitos reservados.
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Sistema de Gestão de Ordens de Serviço
                </p>
                <div className="mt-4 space-x-4">
                  <Link href="/politicas-privacidade" className="text-blue-600 hover:text-blue-800 text-sm">
                    Políticas de Privacidade
                  </Link>
                  <Link href="/termos" className="text-blue-600 hover:text-blue-800 text-sm">
                    Termos de Uso
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

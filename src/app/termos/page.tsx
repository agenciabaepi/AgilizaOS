'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';

export default function TermosPage() {
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
              Termos de Uso
            </h1>
            
            <div className="prose prose-lg max-w-none text-gray-700">
              <p className="text-lg text-gray-600 mb-6 text-center">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>

              <div className="space-y-8">
                {/* Introdução */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    1. Introdução
                  </h2>
                  <p className="mb-4">
                    Bem-vindo ao Consert! Estes Termos de Uso ("Termos") regem o uso do sistema de gestão 
                    de ordens de serviço Consert ("Sistema", "Serviço") operado pela Consert ("nós", "nosso", "empresa").
                  </p>
                  <p className="mb-4">
                    Ao acessar ou usar nosso Sistema, você concorda em cumprir estes Termos. 
                    Se você não concorda com qualquer parte destes termos, não deve usar nosso Sistema.
                  </p>
                  <p>
                    Estes Termos constituem um acordo legal entre você e a Consert. 
                    Leia-os cuidadosamente antes de usar o Sistema.
                  </p>
                </section>

                {/* Aceitação dos Termos */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    2. Aceitação dos Termos
                  </h2>
                  <p className="mb-4">
                    Ao criar uma conta, fazer login ou usar qualquer funcionalidade do Sistema, 
                    você confirma que:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Você tem pelo menos 18 anos de idade</li>
                    <li>Você tem capacidade legal para celebrar este acordo</li>
                    <li>Você leu e compreendeu estes Termos</li>
                    <li>Você concorda em cumprir todas as disposições aqui estabelecidas</li>
                    <li>Você é responsável por todas as atividades que ocorrem em sua conta</li>
                  </ul>
                </section>

                {/* Descrição do Serviço */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    3. Descrição do Serviço
                  </h2>
                  <p className="mb-4">
                    O Consert é uma plataforma de gestão empresarial que oferece:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Gestão de ordens de serviço</li>
                    <li>Controle de clientes e equipamentos</li>
                    <li>Gestão de equipe e comissões</li>
                    <li>Controle financeiro e relatórios</li>
                    <li>Integração com WhatsApp para notificações</li>
                    <li>Outras funcionalidades relacionadas à gestão empresarial</li>
                  </ul>
                  <p className="mt-4">
                    Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer 
                    aspecto do Serviço a qualquer momento, com ou sem aviso prévio.
                  </p>
                </section>

                {/* Conta de Usuário */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    4. Conta de Usuário
                  </h2>
                  <div className="space-y-4">
                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      4.1 Criação de Conta
                    </h3>
                    <p className="mb-4">
                      Para usar o Sistema, você deve criar uma conta fornecendo informações precisas e atualizadas. 
                      Você é responsável por manter a confidencialidade de sua senha e por todas as atividades 
                      que ocorrem em sua conta.
                    </p>

                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      4.2 Responsabilidades do Usuário
                    </h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Manter informações de conta precisas e atualizadas</li>
                      <li>Proteger a confidencialidade de sua senha</li>
                      <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
                      <li>Usar o Sistema apenas para fins legais e comerciais legítimos</li>
                      <li>Não compartilhar sua conta com terceiros</li>
                    </ul>

                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      4.3 Suspensão de Conta
                    </h3>
                    <p>
                      Reservamo-nos o direito de suspender ou encerrar sua conta se você violar 
                      estes Termos ou se houver suspeita de atividade fraudulenta.
                    </p>
                  </div>
                </section>

                {/* Uso Aceitável */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    5. Uso Aceitável
                  </h2>
                  <p className="mb-4">
                    Você concorda em usar o Sistema apenas para fins legais e de acordo com estes Termos. 
                    Você não deve:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Usar o Sistema para atividades ilegais ou não autorizadas</li>
                    <li>Tentar acessar sistemas ou dados não autorizados</li>
                    <li>Interferir com o funcionamento normal do Sistema</li>
                    <li>Usar bots, scripts ou outros meios automatizados</li>
                    <li>Violar direitos de propriedade intelectual</li>
                    <li>Enviar spam ou conteúdo malicioso</li>
                    <li>Fazer engenharia reversa do Sistema</li>
                  </ul>
                </section>

                {/* Propriedade Intelectual */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    6. Propriedade Intelectual
                  </h2>
                  <p className="mb-4">
                    O Sistema e todo seu conteúdo, incluindo mas não limitado a software, design, 
                    textos, gráficos, logos e marcas comerciais, são propriedade da Consert e 
                    protegidos por leis de propriedade intelectual.
                  </p>
                  <p className="mb-4">
                    Você não pode:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Copiar, modificar ou distribuir o Sistema</li>
                    <li>Criar trabalhos derivados baseados no Sistema</li>
                    <li>Usar nossas marcas comerciais sem autorização</li>
                    <li>Remover avisos de propriedade intelectual</li>
                  </ul>
                </section>

                {/* Pagamentos e Assinaturas */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    7. Pagamentos e Assinaturas
                  </h2>
                  <div className="space-y-4">
                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      7.1 Planos de Assinatura
                    </h3>
                    <p className="mb-4">
                      O Sistema oferece diferentes planos de assinatura com funcionalidades específicas. 
                      Os preços e condições estão disponíveis na página de planos.
                    </p>

                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      7.2 Cobrança
                    </h3>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Os pagamentos são processados mensalmente</li>
                      <li>Os preços podem ser alterados com aviso prévio de 30 dias</li>
                      <li>Não oferecemos reembolsos por períodos não utilizados</li>
                      <li>Você pode cancelar sua assinatura a qualquer momento</li>
                    </ul>

                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      7.3 Período de Teste
                    </h3>
                    <p>
                      Oferecemos um período de teste gratuito. Após o término do período de teste, 
                      será necessário assinar um plano pago para continuar usando o Sistema.
                    </p>
                  </div>
                </section>

                {/* Privacidade */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    8. Privacidade e Proteção de Dados
                  </h2>
                  <p className="mb-4">
                    Sua privacidade é importante para nós. Nossa coleta e uso de informações pessoais 
                    é regida por nossa Política de Privacidade, que faz parte integrante destes Termos.
                  </p>
                  <p className="mb-4">
                    Você pode revisar nossa Política de Privacidade em: 
                    <Link href="/politicas-privacidade" className="text-blue-600 hover:text-blue-800 ml-1">
                      /politicas-privacidade
                    </Link>
                  </p>
                </section>

                {/* Limitação de Responsabilidade */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    9. Limitação de Responsabilidade
                  </h2>
                  <p className="mb-4">
                    O Sistema é fornecido "como está" e "conforme disponível". Não garantimos que o Sistema 
                    será ininterrupto, livre de erros ou atenderá às suas necessidades específicas.
                  </p>
                  <p className="mb-4">
                    Em nenhuma circunstância a Consert será responsável por:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Danos diretos, indiretos, incidentais ou consequenciais</li>
                    <li>Perda de lucros, dados ou oportunidades de negócio</li>
                    <li>Interrupção de negócios ou perda de tempo</li>
                    <li>Danos resultantes do uso ou incapacidade de usar o Sistema</li>
                  </ul>
                </section>

                {/* Modificações */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    10. Modificações dos Termos
                  </h2>
                  <p className="mb-4">
                    Reservamo-nos o direito de modificar estes Termos a qualquer momento. 
                    Quando fizermos alterações significativas:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Notificaremos você por e-mail</li>
                    <li>Atualizaremos a data de "última atualização"</li>
                    <li>Destacaremos as mudanças importantes</li>
                  </ul>
                  <p className="mt-4">
                    O uso continuado do Sistema após as modificações constitui aceitação dos novos Termos.
                  </p>
                </section>

                {/* Rescisão */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    11. Rescisão
                  </h2>
                  <p className="mb-4">
                    Você pode encerrar sua conta a qualquer momento através das configurações da conta. 
                    Nós podemos encerrar ou suspender sua conta imediatamente, sem aviso prévio, 
                    se você violar estes Termos.
                  </p>
                  <p className="mb-4">
                    Após a rescisão:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Seu acesso ao Sistema será imediatamente suspenso</li>
                    <li>Seus dados podem ser excluídos após um período de retenção</li>
                    <li>Você permanece responsável por todas as obrigações pendentes</li>
                  </ul>
                </section>

                {/* Lei Aplicável */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    12. Lei Aplicável
                  </h2>
                  <p className="mb-4">
                    Estes Termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida 
                    nos tribunais competentes do Brasil.
                  </p>
                </section>

                {/* Contato */}
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    13. Entre em Contato
                  </h2>
                  <p className="mb-4">
                    Se você tiver dúvidas sobre estes Termos de Uso:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">Consert - Sistema de Gestão</p>
                    <p>E-mail: contato@consert.app</p>
                    <p>Através do sistema: Acesse as configurações e entre em contato</p>
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
                  <Link href="/sobre" className="text-blue-600 hover:text-blue-800 text-sm">
                    Sobre a Empresa
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

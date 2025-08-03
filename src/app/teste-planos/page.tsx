'use client';

import PlanPayment from '@/components/PlanPayment';

export default function TestePlanos() {
  const plans = [
    {
      name: 'Básico',
      price: 1.00,
      features: [
        '1 usuário, 1 técnico',
        'Sistema de OS completo',
        'Cadastro de clientes',
        'Relatórios simples',
        'Segurança na nuvem'
      ]
    },
    {
      name: 'Pro',
      price: 2.00,
      features: [
        '5 usuários, 5 técnicos',
        'Controle financeiro',
        'Comissão por técnico',
        'Emissão de nota fiscal',
        'Controle de permissões',
        'Controle de estoque'
      ]
    },
    {
      name: 'Avançado',
      price: 3.00,
      features: [
        '10 usuários, 10 técnicos',
        'Kanban para OS',
        'App do técnico',
        'Integração WhatsApp',
        'Dashboard de performance',
        'Relatórios personalizados'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Teste de Pagamento - Planos
          </h1>
          <p className="text-gray-600">
            Teste o PIX com valores reduzidos para validação
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <PlanPayment
              key={plan.name}
              planName={plan.name}
              price={plan.price}
              features={plan.features}
              onSuccess={(paymentId) => {
                console.log(`Pagamento do plano ${plan.name} criado:`, paymentId);
                alert(`Pagamento do plano ${plan.name} criado com sucesso!`);
              }}
              onError={(error) => {
                console.error(`Erro no pagamento do plano ${plan.name}:`, error);
                alert(`Erro no pagamento: ${error}`);
              }}
            />
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              ⚠️ Teste de Pagamento
            </h3>
            <p className="text-yellow-700 text-sm">
              Os valores foram reduzidos temporariamente para teste do PIX. 
              Use valores pequenos (R$ 1,00 a R$ 3,00) para validar a integração.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
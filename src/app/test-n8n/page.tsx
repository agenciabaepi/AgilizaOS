'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function TestN8nPage() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [webhookTests, setWebhookTests] = useState<any>({});

  const testarIntegracao = async (tipo: string) => {
    setLoading(true);
    setResultado(null);

    try {
      const dadosTeste = {
        os_id: 'test-os-' + Date.now(),
        empresa_id: 'test-empresa-123',
        tecnico_nome: 'João Silva',
        tecnico_whatsapp: '5511999999999',
        cliente_nome: 'Maria Santos',
        cliente_telefone: '5511888888888',
        equipamento: 'iPhone 12',
        servico: 'Troca de tela',
        numero_os: Math.floor(Math.random() * 1000),
        status: tipo === 'nova-os' ? 'Pendente' : 'APROVADO',
        valor: 'R$ 250,00',
        link_os: `https://gestaoconsert.com.br/ordens/test-os-${Date.now()}`
      };

      const response = await fetch('/api/n8n/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo,
          dados: dadosTeste
        }),
      });

      const result = await response.json();
      setResultado(result);

      if (result.success) {
        toast.success(`✅ ${result.message}`);
      } else {
        toast.error(`❌ ${result.message}`);
      }

    } catch (error) {
      console.error('Erro ao testar N8N:', error);
      toast.error('❌ Erro ao testar integração N8N');
      setResultado({
        success: false,
        error: 'Erro de conexão',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(false);
    }
  };

  const executarDiagnostico = async () => {
    setLoading(true);
    setDiagnostico(null);

    try {
      const response = await fetch('/api/n8n/diagnostico');
      const result = await response.json();
      setDiagnostico(result);
      
      if (result.success) {
        toast.success('✅ Diagnóstico concluído');
      } else {
        toast.error('❌ Erro no diagnóstico');
      }
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      toast.error('❌ Erro ao executar diagnóstico');
      setDiagnostico({
        success: false,
        error: 'Erro de conexão',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(false);
    }
  };

  const testarWebhookIndividual = async (webhookType: string) => {
    setLoading(true);
    
    const webhookUrls = {
      'nova-os': 'https://gestaoconsert.app.n8n.cloud/webhook/consertos/nova-os',
      'os-status': 'https://gestaoconsert.app.n8n.cloud/webhook/consertos/os-status',
      'status-change': 'https://gestaoconsert.app.n8n.cloud/webhook/consertos/mudanca-status'
    };

    const testPayload = {
      test: true,
      tipo: webhookType,
      timestamp: new Date().toISOString(),
      os_id: `test-${webhookType}-${Date.now()}`,
      empresa_id: 'test-empresa-123',
      tecnico_nome: 'João Silva',
      tecnico_whatsapp: '5511999999999',
      cliente_nome: 'Maria Santos',
      cliente_telefone: '5511888888888',
      equipamento: 'iPhone 12',
      servico: 'Troca de tela',
      numero_os: Math.floor(Math.random() * 1000),
      status: 'TESTE'
    };

    try {
      const response = await fetch('/api/n8n/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook_url: webhookUrls[webhookType as keyof typeof webhookUrls],
          payload: testPayload
        }),
      });

      const result = await response.json();
      
      setWebhookTests(prev => ({
        ...prev,
        [webhookType]: result
      }));

      if (result.success) {
        toast.success(`✅ Webhook ${webhookType} funcionando`);
      } else {
        toast.error(`❌ Webhook ${webhookType} com erro`);
      }

    } catch (error) {
      console.error(`Erro ao testar webhook ${webhookType}:`, error);
      toast.error(`❌ Erro ao testar webhook ${webhookType}`);
      
      setWebhookTests(prev => ({
        ...prev,
        [webhookType]: {
          success: false,
          error: 'Erro de conexão',
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              🧪 Teste de Integração N8N
            </h1>
            <p className="text-lg text-gray-600">
              Teste os webhooks do N8N para automação WhatsApp
            </p>
          </div>

          {/* Botão de Diagnóstico */}
          <div className="mb-6">
            <button
              onClick={executarDiagnostico}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors w-full"
            >
              {loading ? '⏳ Executando...' : '🔍 Executar Diagnóstico'}
            </button>
          </div>

          {/* Resultado do Diagnóstico */}
          {diagnostico && (
            <div className={`p-4 rounded-lg border mb-6 ${
              diagnostico.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className="text-lg font-semibold mb-2">
                {diagnostico.success ? '✅ Diagnóstico' : '❌ Erro no Diagnóstico'}
              </h3>
              <pre className="text-sm overflow-auto bg-gray-100 p-3 rounded">
                {JSON.stringify(diagnostico, null, 2)}
              </pre>
            </div>
          )}

          {/* Testes Individuais de Webhooks */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">🔗 Testes Individuais de Webhooks</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <button
                onClick={() => testarWebhookIndividual('nova-os')}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? '⏳' : '🔗'} Testar Nova OS Webhook
              </button>
              
              <button
                onClick={() => testarWebhookIndividual('os-status')}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? '⏳' : '🔗'} Testar OS Status Webhook
              </button>
              
              <button
                onClick={() => testarWebhookIndividual('status-change')}
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? '⏳' : '🔗'} Testar Status Change Webhook
              </button>
            </div>

            {/* Resultados dos Testes Individuais */}
            {Object.keys(webhookTests).length > 0 && (
              <div className="space-y-4">
                {Object.entries(webhookTests).map(([tipo, resultado]: [string, any]) => (
                  <div key={tipo} className={`p-4 rounded-lg border ${
                    resultado.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h4 className="font-semibold mb-2">
                      {resultado.success ? '✅' : '❌'} Webhook {tipo}
                    </h4>
                    <details>
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        Ver detalhes
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto bg-gray-100 p-2 rounded">
                        {JSON.stringify(resultado, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões de Teste */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => testarIntegracao('nova-os')}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ Testando...' : '🆕 Testar Nova OS'}
            </button>

            <button
              onClick={() => testarIntegracao('os-aprovada')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ Testando...' : '✅ Testar OS Aprovada'}
            </button>

            <button
              onClick={() => testarIntegracao('mudanca-status')}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '⏳ Testando...' : '🔄 Testar Mudança Status'}
            </button>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className={`p-4 rounded-lg border ${
              resultado.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className="text-lg font-semibold mb-2">
                {resultado.success ? '✅ Sucesso' : '❌ Erro'}
              </h3>
              <p className="text-gray-700 mb-2">{resultado.message}</p>
              
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                  Ver detalhes técnicos
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(resultado, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Informações de Configuração */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">🔧 Configuração Necessária</h3>
            <div className="space-y-2 text-sm">
              <p><strong>N8N_WEBHOOK_URL:</strong> {process.env.NODE_ENV === 'development' ? 'https://gestaoconsert.app.n8n.cloud/webhook/consertos/os-status' : 'Configurado no ambiente de produção'}</p>
              <p><strong>N8N_WEBHOOK_NOVA_OS_URL:</strong> {process.env.NODE_ENV === 'development' ? 'https://gestaoconsert.app.n8n.cloud/webhook/consertos/nova-os' : 'Configurado no ambiente de produção'}</p>
              <p><strong>N8N_WEBHOOK_STATUS_URL:</strong> {process.env.NODE_ENV === 'development' ? 'https://gestaoconsert.app.n8n.cloud/webhook/consertos/mudanca-status' : 'Configurado no ambiente de produção'}</p>
            </div>
          </div>

          {/* Instruções */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📋 Instruções</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Certifique-se de que as variáveis de ambiente N8N estão configuradas</li>
              <li>• Verifique se os webhooks do N8N estão ativos e funcionando</li>
              <li>• Os testes enviam dados simulados para o N8N</li>
              <li>• Verifique os logs do N8N para confirmar o recebimento</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

export default function TestNovaOSN8N() {
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

         // Dados de teste padrão
         const [testData, setTestData] = useState({
           tecnico_id: '5671d602-42e6-4103-953a-a2fffac04585',
           numero_os: '995',
           cliente_nome: 'Lucas Oliveira',
           equipamento: 'iPhone 14',
           defeito: 'Face ID não funciona',
           status: 'Orçamento',
           tecnico_nome: 'Pedro',
           tecnico_whatsapp: '12988353971'
         });

  const testarWebhookN8N = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/n8n/test-nova-os', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();
      setTestResult(result);

    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      
      setTestResult({
        success: false,
        error: 'Erro de conexão',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🔔 Teste de Integração N8N - Nova OS
        </h1>
        
        <div className="space-y-6">
          {/* Configuração do Teste */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuração do Teste</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Número da OS</label>
                <input
                  type="text"
                  value={testData.numero_os}
                  onChange={(e) => setTestData(prev => ({ ...prev, numero_os: e.target.value }))}
                  placeholder="995"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Cliente</label>
                <input
                  type="text"
                  value={testData.cliente_nome}
                  onChange={(e) => setTestData(prev => ({ ...prev, cliente_nome: e.target.value }))}
                  placeholder="Lucas Oliveira"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Equipamento</label>
                <input
                  type="text"
                  value={testData.equipamento}
                  onChange={(e) => setTestData(prev => ({ ...prev, equipamento: e.target.value }))}
                  placeholder="iPhone 14"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Defeito</label>
                <input
                  type="text"
                  value={testData.defeito}
                  onChange={(e) => setTestData(prev => ({ ...prev, defeito: e.target.value }))}
                  placeholder="Face ID não funciona"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <input
                  type="text"
                  value={testData.status}
                  onChange={(e) => setTestData(prev => ({ ...prev, status: e.target.value }))}
                  placeholder="Orçamento"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nome do Técnico</label>
                <input
                  type="text"
                  value={testData.tecnico_nome}
                  onChange={(e) => setTestData(prev => ({ ...prev, tecnico_nome: e.target.value }))}
                  placeholder="Pedro"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">WhatsApp do Técnico</label>
                <input
                  type="text"
                  value={testData.tecnico_whatsapp}
                  onChange={(e) => setTestData(prev => ({ ...prev, tecnico_whatsapp: e.target.value }))}
                  placeholder="12988353971"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Formato: 12988353971 (será convertido para 5512988353971)
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Teste */}
          <div className="flex gap-4">
            <button 
              onClick={testarWebhookN8N} 
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {loading ? '⏳ Testando...' : '🧪 Testar Webhook N8N'}
            </button>
            
                   <button
                     onClick={() => setTestData({
                       tecnico_id: '5671d602-42e6-4103-953a-a2fffac04585',
                       numero_os: '995',
                       cliente_nome: 'Lucas Oliveira',
                       equipamento: 'iPhone 14',
                       defeito: 'Face ID não funciona',
                       status: 'Orçamento',
                       tecnico_nome: 'Pedro',
                       tecnico_whatsapp: '12988353971'
                     })}
                     className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 flex items-center gap-2"
                   >
                     🔄 Resetar Dados
                   </button>
          </div>

          {/* Resultado do Teste */}
          {testResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Resultado do Teste</h3>
              
              <div className={`p-4 rounded-lg border-2 ${testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <h4 className={`font-semibold flex items-center gap-2 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.success ? '✅ Sucesso' : '❌ Erro'}
                </h4>
                
                <div className="mt-3 space-y-2">
                  <p><strong>Status:</strong> {testResult.success ? 'Sucesso' : 'Falha'}</p>
                  {testResult.message && <p><strong>Mensagem:</strong> {testResult.message}</p>}
                  {testResult.error && <p><strong>Erro:</strong> {testResult.error}</p>}
                  
                  {testResult.payload && (
                    <div>
                      <p><strong>Payload Enviado:</strong></p>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto mt-2">
                        {JSON.stringify(testResult.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {testResult.details && (
                    <div>
                      <p><strong>Detalhes:</strong></p>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto mt-2">
                        {JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Informações do Webhook */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações do Webhook</h3>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Webhook N8N:</h4>
              <p className="text-blue-700 font-mono text-sm">https://gestaoconsert.app.n8n.cloud/webhook/novo-aparelho</p>
              
                     <h4 className="font-semibold text-blue-800 mt-4 mb-2">Payload Esperado:</h4>
                     <pre className="text-blue-700 text-sm bg-blue-100 p-3 rounded overflow-x-auto">
       {`{
         "tecnico_id": "5671d602-42e6-4103-953a-a2fffac04585",
         "numero_os": 995,
         "cliente_nome": "Lucas Oliveira",
         "equipamento": "iPhone 14",
         "defeito": "Face ID não funciona",
         "status": "Orçamento",
         "tecnico_nome": "Pedro",
         "tecnico_whatsapp": "5512988353971",
         "link_os": "https://gestaoconsert.com.br/ordens/995"
       }`}
                     </pre>
              
              <h4 className="font-semibold text-blue-800 mt-4 mb-2">Mensagem Final:</h4>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm">
                  🔔 Nova OS #{testData.numero_os}<br/>
                  Cliente: {testData.cliente_nome}<br/>
                  Equipamento: {testData.equipamento}<br/>
                  Defeito: {testData.defeito}<br/>
                  Status: {testData.status}<br/>
                  Técnico: {testData.tecnico_nome}<br/>
                  👉 Detalhes: https://gestaoconsert.com.br/ordens/{testData.numero_os}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';

export default function DebugWhatsAppTecnicoPage() {
  const [osId, setOsId] = useState('');
  const [status, setStatus] = useState('APROVADO');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { addToast } = useToast();

  const testarNotificacao = async () => {
    if (!osId.trim()) {
      addToast('error', 'Digite o ID da OS');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug-whatsapp-tecnico', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          osId: osId.trim(),
          status: status
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        addToast('success', 'Teste executado com sucesso!');
      } else {
        addToast('error', data.error || 'Erro no teste');
        setResult({ error: data.error, details: data.details });
      }
    } catch (error) {
      addToast('error', 'Erro ao executar teste');
      setResult({ error: 'Erro de conexão', details: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 Debug WhatsApp - Notificação para Técnico
          </h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Configuração do Teste</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID da OS
                </label>
                <input
                  type="text"
                  value={osId}
                  onChange={(e) => setOsId(e.target.value)}
                  placeholder="Ex: 64bdea43-ebb8-4044-85b5-b45c6da1df4a"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status para Teste
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="APROVADO">APROVADO</option>
                  <option value="CONCLUIDO">CONCLUIDO</option>
                  <option value="ENTREGUE">ENTREGUE</option>
                  <option value="EM_ANALISE">EM_ANALISE</option>
                  <option value="AGUARDANDO_PECA">AGUARDANDO_PECA</option>
                </select>
              </div>

              <Button
                onClick={testarNotificacao}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testando...' : '🧪 Testar Notificação WhatsApp'}
              </Button>
            </div>
          </div>

          {result && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Resultado do Teste</h2>
              
              <div className="space-y-4">
                {result.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h3 className="text-red-800 font-medium">❌ Erro</h3>
                    <p className="text-red-700 mt-1">{result.error}</p>
                    {result.details && (
                      <pre className="text-xs text-red-600 mt-2 bg-red-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <h3 className="text-green-800 font-medium">✅ Sucesso</h3>
                      <p className="text-green-700 mt-1">{result.message}</p>
                    </div>

                    {result.data && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                          <h4 className="font-medium text-blue-800">📋 Dados da OS</h4>
                          <div className="text-sm text-blue-700 mt-1">
                            <p><strong>ID:</strong> {result.data.os.id}</p>
                            <p><strong>Número:</strong> {result.data.os.numero_os}</p>
                            <p><strong>Cliente:</strong> {result.data.os.cliente_nome}</p>
                            <p><strong>Técnico ID:</strong> {result.data.os.tecnico_id}</p>
                          </div>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                          <h4 className="font-medium text-purple-800">👨‍🔧 Dados do Técnico</h4>
                          <div className="text-sm text-purple-700 mt-1">
                            <p><strong>ID:</strong> {result.data.tecnico.id}</p>
                            <p><strong>Nome:</strong> {result.data.tecnico.nome}</p>
                            <p><strong>WhatsApp:</strong> {result.data.tecnico.whatsapp}</p>
                            <p><strong>Email:</strong> {result.data.tecnico.email}</p>
                          </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                          <h4 className="font-medium text-yellow-800">📱 Resultado da Notificação</h4>
                          <div className="text-sm text-yellow-700 mt-1">
                            <p><strong>Status Testado:</strong> {result.data.testStatus}</p>
                            <p><strong>Notificação Enviada:</strong> {result.data.notificationSent ? '✅ Sim' : '❌ Não'}</p>
                          </div>
                        </div>

                        {result.data.todosTecnicos && result.data.todosTecnicos.length > 0 && (
                          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                            <h4 className="font-medium text-gray-800">👥 Todos os Técnicos no Sistema</h4>
                            <div className="text-sm text-gray-700 mt-2 space-y-1">
                              {result.data.todosTecnicos.map((tecnico: any, index: number) => (
                                <div key={tecnico.id} className="flex justify-between items-center p-2 bg-white rounded border">
                                  <div>
                                    <span className="font-medium">{tecnico.nome}</span>
                                    <span className="text-gray-500 ml-2">({tecnico.nivel})</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500">ID: {tecnico.id}</div>
                                    <div className="text-xs">{tecnico.whatsapp || 'Sem WhatsApp'}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold mb-3">ℹ️ Como usar este teste:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Digite o ID de uma OS existente</li>
              <li>Selecione o status que deseja testar</li>
              <li>Clique em "Testar Notificação WhatsApp"</li>
              <li>Verifique se o técnico recebeu a mensagem</li>
              <li>Analise os logs no console do navegador (F12)</li>
            </ol>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}

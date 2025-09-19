'use client';

import { useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';

export default function CheckWhatsAppStatusPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { addToast } = useToast();

  const verificarStatus = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/check-whatsapp-account-status', {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        addToast('success', 'Status verificado!');
      } else {
        addToast('error', data.error || 'Erro ao verificar status');
        setResult({ error: data.error, details: data.details });
      }
    } catch (error) {
      addToast('error', 'Erro ao verificar status');
      setResult({ error: 'Erro de conexão', details: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (status: boolean) => {
    return status ? '✅' : '❌';
  };

  return (
    <MenuLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔍 Verificação de Status da Conta WhatsApp
          </h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Verificação Completa</h2>
            
            <div className="space-y-4">
              <p className="text-gray-700">
                Esta ferramenta verifica todos os aspectos da conta WhatsApp Business:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Informações básicas da conta</li>
                <li>Status de verificação</li>
                <li>Templates disponíveis</li>
                <li>Configuração de webhooks</li>
                <li>Teste de envio de mensagem</li>
              </ul>

              <Button
                onClick={verificarStatus}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Verificando...' : '🔍 Verificar Status Completo'}
              </Button>
            </div>
          </div>

          {result && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Resultado da Verificação</h2>
              
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
                    {/* Resumo */}
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h3 className="text-blue-800 font-medium mb-3">📊 Resumo do Status</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{getStatusIcon(result.summary.accountWorking)}</span>
                          <span className={getStatusColor(result.summary.accountWorking)}>
                            Conta: {result.summary.accountWorking ? 'OK' : 'ERRO'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{getStatusIcon(result.summary.verificationWorking)}</span>
                          <span className={getStatusColor(result.summary.verificationWorking)}>
                            Verificação: {result.summary.verificationWorking ? 'OK' : 'ERRO'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{getStatusIcon(result.summary.templatesWorking)}</span>
                          <span className={getStatusColor(result.summary.templatesWorking)}>
                            Templates: {result.summary.templatesWorking ? 'OK' : 'ERRO'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{getStatusIcon(result.summary.webhooksWorking)}</span>
                          <span className={getStatusColor(result.summary.webhooksWorking)}>
                            Webhooks: {result.summary.webhooksWorking ? 'OK' : 'ERRO'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{getStatusIcon(result.summary.sendWorking)}</span>
                          <span className={getStatusColor(result.summary.sendWorking)}>
                            Envio: {result.summary.sendWorking ? 'OK' : 'ERRO'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{getStatusIcon(result.summary.allWorking)}</span>
                          <span className={getStatusColor(result.summary.allWorking)}>
                            Geral: {result.summary.allWorking ? 'OK' : 'ERRO'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Detalhes da Conta */}
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-gray-800 mb-2">📱 Informações da Conta</h4>
                      <div className="text-sm text-gray-600 mb-2">
                        Status: {result.data.account.status} | OK: {result.data.account.ok ? 'Sim' : 'Não'}
                      </div>
                      <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data.account.data, null, 2)}
                      </pre>
                    </div>

                    {/* Status de Verificação */}
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-gray-800 mb-2">✅ Status de Verificação</h4>
                      <div className="text-sm text-gray-600 mb-2">
                        Status: {result.data.verification.status} | OK: {result.data.verification.ok ? 'Sim' : 'Não'}
                      </div>
                      <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data.verification.data, null, 2)}
                      </pre>
                    </div>

                    {/* Templates */}
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-gray-800 mb-2">📋 Templates Disponíveis</h4>
                      <div className="text-sm text-gray-600 mb-2">
                        Status: {result.data.templates.status} | OK: {result.data.templates.ok ? 'Sim' : 'Não'}
                      </div>
                      <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data.templates.data, null, 2)}
                      </pre>
                    </div>

                    {/* Webhooks */}
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-gray-800 mb-2">🔗 Configuração de Webhooks</h4>
                      <div className="text-sm text-gray-600 mb-2">
                        Status: {result.data.webhooks.status} | OK: {result.data.webhooks.ok ? 'Sim' : 'Não'}
                      </div>
                      <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data.webhooks.data, null, 2)}
                      </pre>
                    </div>

                    {/* Teste de Envio */}
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-gray-800 mb-2">🧪 Teste de Envio de Mensagem</h4>
                      <div className="text-sm text-gray-600 mb-2">
                        Status: {result.data.testSend.status} | OK: {result.data.testSend.ok ? 'Sim' : 'Não'}
                      </div>
                      <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data.testSend.data, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold mb-3">⚠️ Possíveis Problemas:</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-yellow-800">
              <li><strong>Token Expirado:</strong> Tokens do WhatsApp têm validade limitada</li>
              <li><strong>Conta Suspensa:</strong> Violação de políticas do WhatsApp</li>
              <li><strong>Limite de Rate:</strong> Muitas mensagens enviadas</li>
              <li><strong>Verificação Revogada:</strong> Status de verificação alterado</li>
              <li><strong>Configuração Alterada:</strong> Permissões modificadas</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold mb-3">💡 Soluções:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
              <li>Verifique o status da conta no Facebook Business Manager</li>
              <li>Renove o token de acesso se necessário</li>
              <li>Verifique se a conta não foi suspensa</li>
              <li>Confirme se os templates ainda estão aprovados</li>
              <li>Verifique se o webhook ainda está configurado</li>
            </ol>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}

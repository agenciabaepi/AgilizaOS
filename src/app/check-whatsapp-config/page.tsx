'use client';

import { useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';

export default function CheckWhatsAppConfigPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('12988353971');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateResult, setTemplateResult] = useState<any>(null);
  const { addToast } = useToast();

  const verificarConfiguracao = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/check-whatsapp-business-config', {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        addToast('success', 'Configuração verificada!');
      } else {
        addToast('error', data.error || 'Erro ao verificar configuração');
        setResult({ error: data.error, details: data.details });
      }
    } catch (error) {
      addToast('error', 'Erro ao verificar configuração');
      setResult({ error: 'Erro de conexão', details: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testarTemplate = async () => {
    if (!phoneNumber.trim()) {
      addToast('error', 'Digite um número de telefone');
      return;
    }

    setTemplateLoading(true);
    setTemplateResult(null);

    try {
      const response = await fetch('/api/test-whatsapp-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTemplateResult(data);
        addToast('success', 'Template testado!');
      } else {
        addToast('error', data.errorMessage || data.error || 'Erro no teste');
        setTemplateResult({ 
          error: data.errorMessage || data.error, 
          errorType: data.errorType,
          details: data.details,
          phoneNumber: data.phoneNumber,
          formattedPhone: data.formattedPhone
        });
      }
    } catch (error) {
      addToast('error', 'Erro ao testar template');
      setTemplateResult({ error: 'Erro de conexão', details: error.message });
    } finally {
      setTemplateLoading(false);
    }
  };

  return (
    <MenuLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔧 Verificação de Configuração WhatsApp Business
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Verificar Configuração */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Verificar Configuração</h2>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Verifica a configuração da conta WhatsApp Business, webhooks e status da conta.
                </p>

                <Button
                  onClick={verificarConfiguracao}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Verificando...' : '🔍 Verificar Configuração'}
                </Button>
              </div>
            </div>

            {/* Testar Template */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Testar Template</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número do WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ex: 12988353971"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <Button
                  onClick={testarTemplate}
                  disabled={templateLoading || !phoneNumber.trim()}
                  className="w-full"
                >
                  {templateLoading ? 'Testando...' : '📱 Testar Template'}
                </Button>
              </div>
            </div>
          </div>

          {/* Resultados da Configuração */}
          {result && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">Configuração da Conta WhatsApp Business</h2>
              
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
                <div className="space-y-4">
                  {/* Informações da Conta */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="text-blue-800 font-medium">📱 Informações da Conta</h3>
                    <div className="text-sm text-blue-700 mt-2">
                      <p><strong>Status:</strong> {result.business.status}</p>
                      <p><strong>Sucesso:</strong> {result.business.ok ? 'Sim' : 'Não'}</p>
                      <p><strong>Phone Number ID:</strong> {result.debug?.phoneNumberId}</p>
                      <p><strong>Access Token:</strong> {result.debug?.hasAccessToken ? 'Configurado' : 'Não configurado'}</p>
                    </div>
                    {result.business.data && (
                      <pre className="text-xs text-gray-600 mt-2 bg-blue-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.business.data, null, 2)}
                      </pre>
                    )}
                  </div>

                  {/* Webhooks */}
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h3 className="text-green-800 font-medium">🔗 Webhooks</h3>
                    <div className="text-sm text-green-700 mt-2">
                      <p><strong>Status:</strong> {result.webhooks.status}</p>
                      <p><strong>Sucesso:</strong> {result.webhooks.ok ? 'Sim' : 'Não'}</p>
                    </div>
                    {result.webhooks.data && (
                      <pre className="text-xs text-gray-600 mt-2 bg-green-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.webhooks.data, null, 2)}
                      </pre>
                    )}
                  </div>

                  {/* Status da Conta */}
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                    <h3 className="text-purple-800 font-medium">📋 Status da Conta</h3>
                    <div className="text-sm text-purple-700 mt-2">
                      <p><strong>Status:</strong> {result.accountStatus.status}</p>
                      <p><strong>Sucesso:</strong> {result.accountStatus.ok ? 'Sim' : 'Não'}</p>
                    </div>
                    {result.accountStatus.data && (
                      <pre className="text-xs text-gray-600 mt-2 bg-purple-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.accountStatus.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resultados do Template */}
          {templateResult && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">Resultado do Teste de Template</h2>
              
              {templateResult.error ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="text-red-800 font-medium">❌ Erro</h3>
                  <p className="text-red-700 mt-1">{templateResult.error}</p>
                  {templateResult.details && (
                    <pre className="text-xs text-red-600 mt-2 bg-red-100 p-2 rounded overflow-auto">
                      {JSON.stringify(templateResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h3 className="text-green-800 font-medium">✅ Sucesso</h3>
                  <p className="text-green-700 mt-1">{templateResult.message}</p>
                  <div className="text-sm text-green-700 mt-2 space-y-1">
                    <p><strong>Message ID:</strong> {templateResult.messageId || 'N/A'}</p>
                    <p><strong>Número:</strong> {templateResult.phoneNumber}</p>
                    <p><strong>Formatado:</strong> {templateResult.formattedPhone}</p>
                    <p><strong>Template:</strong> {templateResult.debug?.templateUsed}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-yellow-50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold mb-3">💡 Possíveis Problemas:</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-yellow-800">
              <li><strong>Conta não verificada:</strong> A conta WhatsApp Business pode não estar verificada</li>
              <li><strong>Webhook não configurado:</strong> Status de entrega não está sendo recebido</li>
              <li><strong>Limite de mensagens:</strong> Pode ter atingido o limite da API</li>
              <li><strong>Template não aprovado:</strong> Templates de mensagem podem não estar aprovados</li>
              <li><strong>Configuração incorreta:</strong> Phone Number ID ou Access Token podem estar incorretos</li>
              <li><strong>Conta suspensa:</strong> A conta pode ter sido suspensa por violação de políticas</li>
            </ul>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}

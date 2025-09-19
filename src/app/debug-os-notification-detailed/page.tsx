'use client';

import { useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';

export default function DebugOSNotificationDetailedPage() {
  const [osId, setOsId] = useState('fd10ee8e-3ae5-4a3a-bca9-38692768dc59');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { addToast } = useToast();

  const debugarNotificacao = async () => {
    if (!osId.trim()) {
      addToast('error', 'Digite o ID da OS');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug-os-notification-detailed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          osId: osId.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        if (data.success) {
          addToast('success', 'Debug executado com sucesso!');
        } else {
          addToast('error', data.error || 'Erro no debug');
        }
      } else {
        addToast('error', data.error || 'Erro no debug');
        setResult({ error: data.error, details: data.details });
      }
    } catch (error) {
      addToast('error', 'Erro ao executar debug');
      setResult({ error: 'Erro de conexão', details: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'buscar_os': return '🔍';
      case 'verificar_tecnico': return '👤';
      case 'buscar_tecnico': return '🔍';
      case 'verificar_whatsapp': return '📱';
      case 'envio_sucesso': return '✅';
      case 'erro_envio': return '❌';
      case 'erro_comunicacao': return '📡';
      case 'erro_geral': return '💥';
      default: return '🔍';
    }
  };

  const getStepTitle = (step: string) => {
    switch (step) {
      case 'buscar_os': return 'Buscar OS';
      case 'verificar_tecnico': return 'Verificar Técnico';
      case 'buscar_tecnico': return 'Buscar Técnico';
      case 'verificar_whatsapp': return 'Verificar WhatsApp';
      case 'envio_sucesso': return 'Envio Bem-Sucedido';
      case 'erro_envio': return 'Erro no Envio';
      case 'erro_comunicacao': return 'Erro de Comunicação';
      case 'erro_geral': return 'Erro Geral';
      default: return 'Debug';
    }
  };

  return (
    <MenuLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔍 Debug Detalhado de Notificação de OS
          </h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Configuração do Debug</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID da OS
                </label>
                <input
                  type="text"
                  value={osId}
                  onChange={(e) => setOsId(e.target.value)}
                  placeholder="Ex: fd10ee8e-3ae5-4a3a-bca9-38692768dc59"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite o ID da OS que você alterou o status
                </p>
              </div>

              <Button
                onClick={debugarNotificacao}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Debugando...' : '🔍 Debug Detalhado'}
              </Button>
            </div>
          </div>

          {result && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Resultado do Debug</h2>
              
              <div className="space-y-4">
                {/* Status Principal */}
                <div className={`border rounded-md p-4 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <h3 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {getStepIcon(result.step)} {getStepTitle(result.step)}
                  </h3>
                  <p className={`mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.message || result.error}
                  </p>
                  {result.details && (
                    <p className={`text-sm mt-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      <strong>Detalhes:</strong> {result.details}
                    </p>
                  )}
                </div>

                {/* Dados da OS */}
                {result.osData && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="font-medium text-blue-800 mb-2">📋 Dados da OS</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p><strong>ID:</strong> {result.osData.id}</p>
                      <p><strong>Técnico Responsável:</strong> {result.osData.responsavel_id || 'Não definido'}</p>
                      <p><strong>Cliente:</strong> {result.osData.cliente || 'Não informado'}</p>
                    </div>
                  </div>
                )}

                {/* Dados do Técnico */}
                {result.tecnicoData && (
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                    <h4 className="font-medium text-purple-800 mb-2">👤 Dados do Técnico</h4>
                    <div className="text-sm text-purple-700 space-y-1">
                      <p><strong>ID:</strong> {result.tecnicoData.id}</p>
                      <p><strong>Nome:</strong> {result.tecnicoData.nome}</p>
                      <p><strong>WhatsApp:</strong> {result.tecnicoData.whatsapp || 'Não cadastrado'}</p>
                      <p><strong>Nível:</strong> {result.tecnicoData.nivel}</p>
                    </div>
                  </div>
                )}

                {/* Dados do WhatsApp */}
                {result.whatsappData && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h4 className="font-medium text-green-800 mb-2">📱 Dados do WhatsApp</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>OS ID:</strong> {result.whatsappData.osId}</p>
                      <p><strong>Cliente:</strong> {result.whatsappData.clienteNome}</p>
                      <p><strong>Técnico:</strong> {result.whatsappData.tecnicoNome}</p>
                      <p><strong>WhatsApp:</strong> {result.whatsappData.tecnicoWhatsapp}</p>
                      <p><strong>Status:</strong> {result.whatsappData.status}</p>
                    </div>
                    <div className="mt-3">
                      <h5 className="font-medium text-green-800 mb-1">Mensagem:</h5>
                      <pre className="text-xs text-green-600 bg-green-100 p-2 rounded overflow-auto whitespace-pre-wrap">
                        {result.whatsappData.message}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Resultado do Envio */}
                {result.sendResult && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h4 className="font-medium text-gray-800 mb-2">📡 Resultado do Envio</h4>
                    <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(result.sendResult, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Debug Completo */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h4 className="font-medium text-gray-800 mb-2">🔍 Debug Completo</h4>
                  <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold mb-3">💡 Como usar:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
              <li>Digite o ID da OS que você alterou o status</li>
              <li>Clique em "Debug Detalhado"</li>
              <li>Analise cada etapa do processo</li>
              <li>Identifique onde está falhando</li>
              <li>Corrija o problema identificado</li>
            </ol>
          </div>

          <div className="bg-green-50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold mb-3">🎯 Objetivo:</h3>
            <p className="text-sm text-green-800">
              Este debug detalhado vai mostrar exatamente onde está falhando o processo de notificação:
              se é na busca da OS, na verificação do técnico, na validação do WhatsApp, ou no envio da mensagem.
            </p>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}

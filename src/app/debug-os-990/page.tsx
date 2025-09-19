'use client';

import { useState } from 'react';

export default function DebugOS990Page() {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDebug = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 DEBUG OS #990: Iniciando investigação...');
      
      // Chamar a API de debug específica para OS #990
      const response = await fetch('/api/debug-status-historico?os_id=64bdea43-ebb8-4044-85b5-b45c6da1df4a');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro na API de debug');
      }
      
      setDebugData(data.debug);
      console.log('✅ Debug concluído:', data.debug);
      
    } catch (err: any) {
      console.error('❌ Erro no debug:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔍 Debug OS #990 - Histórico de Status
          </h1>
          
          <div className="mb-6">
            <button
              onClick={runDebug}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 Investigando...' : '🚀 Executar Debug'}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-800 font-semibold mb-2">❌ Erro:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {debugData && (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-blue-800 font-semibold mb-3">📊 Resumo da Investigação</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">OSs Verificadas:</span>
                    <br />
                    {debugData.resumo?.total_os_verificadas || 0}
                  </div>
                  <div>
                    <span className="font-medium">Com Histórico:</span>
                    <br />
                    {debugData.resumo?.os_com_historico || 0}
                  </div>
                  <div>
                    <span className="font-medium">Sem Histórico:</span>
                    <br />
                    {debugData.resumo?.os_sem_historico || 0}
                  </div>
                  <div>
                    <span className="font-medium">OS Investigada:</span>
                    <br />
                    {debugData.resumo?.os_investigada ? '✅ Sim' : '❌ Não'}
                  </div>
                </div>
              </div>
              
              {/* Investigação Específica */}
              {debugData.investigacao_especifica && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-green-800 font-semibold mb-3">🎯 Investigação Específica da OS #990</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">📋 Dados da OS:</h4>
                      <div className="bg-white p-3 rounded border">
                        <p><strong>OS Encontrada:</strong> {debugData.investigacao_especifica.os_encontrada ? '✅ Sim' : '❌ Não'}</p>
                        {debugData.investigacao_especifica.os_dados && (
                          <div className="mt-2 text-sm">
                            <p><strong>Número:</strong> {debugData.investigacao_especifica.os_dados.numero_os}</p>
                            <p><strong>Status:</strong> {debugData.investigacao_especifica.os_dados.status}</p>
                            <p><strong>Status Técnico:</strong> {debugData.investigacao_especifica.os_dados.status_tecnico || 'Não definido'}</p>
                            <p><strong>Criada em:</strong> {new Date(debugData.investigacao_especifica.os_dados.created_at).toLocaleString('pt-BR')}</p>
                          </div>
                        )}
                        {debugData.investigacao_especifica.os_error && (
                          <p className="text-red-600"><strong>Erro:</strong> {debugData.investigacao_especifica.os_error}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">📝 Histórico de Status:</h4>
                      <div className="bg-white p-3 rounded border">
                        <p><strong>Registros Encontrados:</strong> {debugData.investigacao_especifica.historico_encontrado}</p>
                        {debugData.investigacao_especifica.historico_dados && debugData.investigacao_especifica.historico_dados.length > 0 ? (
                          <div className="mt-2">
                            <h5 className="font-medium mb-2">Registros:</h5>
                            {debugData.investigacao_especifica.historico_dados.map((registro: any, index: number) => (
                              <div key={index} className="bg-gray-50 p-2 rounded mb-2 text-sm">
                                <p><strong>Status:</strong> {registro.status_anterior} → {registro.status_novo}</p>
                                <p><strong>Motivo:</strong> {registro.motivo}</p>
                                <p><strong>Data:</strong> {new Date(registro.created_at).toLocaleString('pt-BR')}</p>
                                <p><strong>Usuário:</strong> {registro.usuario_nome || 'Sistema'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-600">Nenhum registro de histórico encontrado</p>
                        )}
                        {debugData.investigacao_especifica.historico_error && (
                          <p className="text-red-600"><strong>Erro:</strong> {debugData.investigacao_especifica.historico_error}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">🧪 Teste de Inserção:</h4>
                      <div className="bg-white p-3 rounded border">
                        <p><strong>Sucesso:</strong> {debugData.investigacao_especifica.teste_insert_sucesso ? '✅ Sim' : '❌ Não'}</p>
                        {debugData.investigacao_especifica.teste_insert_error && (
                          <p className="text-red-600"><strong>Erro:</strong> {debugData.investigacao_especifica.teste_insert_error}</p>
                        )}
                        {debugData.investigacao_especifica.teste_insert_dados && (
                          <div className="mt-2 text-sm">
                            <p><strong>Dados Inseridos:</strong></p>
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                              {JSON.stringify(debugData.investigacao_especifica.teste_insert_dados, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* OSs Recentes */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-gray-800 font-semibold mb-3">📋 OSs Recentes Verificadas</h3>
                {debugData.os_recentes && debugData.os_recentes.length > 0 ? (
                  <div className="space-y-2">
                    {debugData.os_recentes.map((os: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded border text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p><strong>OS #{os.numero_os}</strong></p>
                            <p>Status: {os.status_atual}</p>
                            <p>Status Técnico: {os.status_tecnico_atual || 'Não definido'}</p>
                            <p>Criada: {new Date(os.created_at).toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="text-right">
                            <p className={os.tem_historico ? 'text-green-600' : 'text-red-600'}>
                              {os.tem_historico ? '✅ Tem histórico' : '❌ Sem histórico'}
                            </p>
                            <p>Registros: {os.total_registros}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Nenhuma OS encontrada</p>
                )}
              </div>
              
              {/* Dados Completos */}
              <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-gray-800">
                  🔍 Dados Completos da Investigação
                </summary>
                <pre className="mt-4 bg-white p-4 rounded border text-xs overflow-auto max-h-96">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

export default function FixHistoricoInicialPage() {
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executarCorrecao = async () => {
    setLoading(true);
    setError(null);
    setResultado(null);
    
    try {
      console.log('🔧 Iniciando correção do histórico inicial...');
      
      const response = await fetch('/api/fix-historico-inicial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro na correção');
      }
      
      setResultado(data);
      console.log('✅ Correção concluída:', data);
      
    } catch (err: any) {
      console.error('❌ Erro na correção:', err);
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
            🔧 Correção do Histórico Inicial das OSs
          </h1>
          
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h3 className="text-yellow-800 font-semibold mb-2">⚠️ Importante:</h3>
              <p className="text-yellow-700">
                Esta ferramenta irá registrar o status inicial de todas as OSs que não possuem histórico.
                Isso é necessário para que o sistema de histórico funcione corretamente.
              </p>
            </div>
            
            <button
              onClick={executarCorrecao}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 Executando Correção...' : '🚀 Executar Correção'}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-800 font-semibold mb-2">❌ Erro:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {resultado && (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-green-800 font-semibold mb-3">📊 Resumo da Correção</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total de OSs:</span>
                    <br />
                    {resultado.resumo?.total_os_encontradas || 0}
                  </div>
                  <div>
                    <span className="font-medium">Sem Histórico:</span>
                    <br />
                    {resultado.resumo?.os_sem_historico || 0}
                  </div>
                  <div>
                    <span className="font-medium">Com Histórico:</span>
                    <br />
                    {resultado.resumo?.os_com_historico || 0}
                  </div>
                  <div>
                    <span className="font-medium">Processadas:</span>
                    <br />
                    {resultado.resumo?.os_processadas || 0}
                  </div>
                  <div>
                    <span className="font-medium">Sucessos:</span>
                    <br />
                    <span className="text-green-600">{resultado.resumo?.sucessos || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium">Erros:</span>
                    <br />
                    <span className="text-red-600">{resultado.resumo?.erros || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Detalhes */}
              {resultado.detalhes && resultado.detalhes.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-gray-800 font-semibold mb-3">📋 Detalhes das OSs Processadas</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {resultado.detalhes.map((detalhe: any, index: number) => (
                      <div key={index} className={`p-3 rounded border text-sm ${
                        detalhe.status === 'sucesso' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p><strong>OS #{detalhe.numero_os}</strong></p>
                            <p className="text-gray-600">ID: {detalhe.os_id}</p>
                            {detalhe.status === 'sucesso' ? (
                              <div className="mt-1">
                                <p>Status Inicial: {detalhe.status_inicial}</p>
                                {detalhe.status_tecnico_inicial && (
                                  <p>Status Técnico: {detalhe.status_tecnico_inicial}</p>
                                )}
                                <p>Motivo: {detalhe.motivo}</p>
                              </div>
                            ) : (
                              <p className="text-red-600">Erro: {detalhe.erro}</p>
                            )}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            detalhe.status === 'sucesso' 
                              ? 'bg-green-200 text-green-800' 
                              : 'bg-red-200 text-red-800'
                          }`}>
                            {detalhe.status === 'sucesso' ? '✅ Sucesso' : '❌ Erro'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Dados Completos */}
              <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-gray-800">
                  🔍 Dados Completos da Correção
                </summary>
                <pre className="mt-4 bg-white p-4 rounded border text-xs overflow-auto max-h-96">
                  {JSON.stringify(resultado, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

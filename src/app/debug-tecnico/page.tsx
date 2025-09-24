'use client';

import { useState } from 'react';

export default function DebugTecnicoPage() {
  const [osId, setOsId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testarOS = async () => {
    if (!osId.trim()) {
      alert('Digite um ID de OS válido');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug/tecnico-os', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ os_id: osId }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        alert('✅ Debug realizado com sucesso!');
      } else {
        alert(`❌ Erro: ${data.error}`);
      }

    } catch (error) {
      console.error('Erro ao testar:', error);
      alert(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setResult({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Debug - Dados do Técnico na OS</h1>
        
        <div className="space-y-6">
          {/* Input para ID da OS */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Testar OS Específica</h3>
            
            <div className="flex gap-4">
              <input
                type="text"
                value={osId}
                onChange={(e) => setOsId(e.target.value)}
                placeholder="Digite o ID da OS (ex: 28a7989b-63a5-4ee8-95b5-70637ec0ef29)"
                className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              <button
                onClick={testarOS}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading ? '⏳ Testando...' : '🔍 Debugar OS'}
              </button>
            </div>
          </div>

          {/* Resultado */}
          {result && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Resultado do Debug:</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dados da OS */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Dados da OS:</h4>
                  <pre className="text-blue-700 text-sm bg-blue-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(result.os_data, null, 2)}
                  </pre>
                </div>

                {/* Dados do Técnico */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Dados do Técnico:</h4>
                  <pre className="text-green-700 text-sm bg-green-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(result.tecnico_encontrado, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Informações de Debug */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Informações de Debug:</h4>
                <pre className="text-gray-700 text-sm bg-gray-100 p-3 rounded overflow-x-auto">
                  {JSON.stringify(result.debug_info, null, 2)}
                </pre>
              </div>

              {/* Erros */}
              {result.tecnico_error && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Erro ao Buscar Técnico:</h4>
                  <pre className="text-red-700 text-sm bg-red-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(result.tecnico_error, null, 2)}
                  </pre>
                </div>
              )}

              {/* Amostra de Usuários */}
              {result.all_users_sample && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Amostra de Usuários (primeiros 10):</h4>
                  <pre className="text-yellow-700 text-sm bg-yellow-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(result.all_users_sample, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Instruções */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Como usar:</h3>
            <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
              <li>Copie o ID da OS que está falhando (ex: do erro no N8N)</li>
              <li>Cole no campo acima</li>
              <li>Clique em "Debugar OS"</li>
              <li>Verifique se o técnico está sendo encontrado corretamente</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

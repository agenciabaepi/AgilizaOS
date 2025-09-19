'use client';

import { useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';

export default function GenerateCurlPage() {
  const [phoneNumber, setPhoneNumber] = useState('12988353971');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { addToast } = useToast();

  const gerarComandoCurl = async () => {
    if (!phoneNumber.trim()) {
      addToast('error', 'Digite um número de telefone');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/generate-curl-command?phone=${encodeURIComponent(phoneNumber.trim())}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        addToast('success', 'Comando curl gerado!');
      } else {
        addToast('error', data.error || 'Erro ao gerar comando');
        setResult({ error: data.error, details: data.details });
      }
    } catch (error) {
      addToast('error', 'Erro ao gerar comando');
      setResult({ error: 'Erro de conexão', details: error.message });
    } finally {
      setLoading(false);
    }
  };

  const copiarComando = () => {
    if (result?.curlCommand) {
      navigator.clipboard.writeText(result.curlCommand);
      addToast('success', 'Comando copiado para a área de transferência!');
    }
  };

  return (
    <MenuLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔧 Gerador de Comando Curl WhatsApp
          </h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Configuração</h2>
            
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
                <p className="text-xs text-gray-500 mt-1">
                  Digite apenas os números (sem +, espaços ou parênteses)
                </p>
              </div>

              <Button
                onClick={gerarComandoCurl}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Gerando...' : '🔧 Gerar Comando Curl'}
              </Button>
            </div>
          </div>

          {result && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Comando Curl Gerado</h2>
              
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
                      <h3 className="text-green-800 font-medium">✅ Comando Gerado</h3>
                      <p className="text-green-700 mt-1">{result.message}</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h4 className="font-medium text-blue-800 mb-2">📱 Detalhes</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Número Original:</strong> {result.phoneNumber}</p>
                        <p><strong>Número Formatado:</strong> {result.formattedPhone}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-800">📋 Comando Curl</h4>
                        <Button
                          onClick={copiarComando}
                          className="px-3 py-1 text-sm"
                        >
                          📋 Copiar
                        </Button>
                      </div>
                      <pre className="text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-auto whitespace-pre-wrap">
                        {result.curlCommand}
                      </pre>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <h4 className="font-medium text-yellow-800 mb-2">📋 Instruções</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
                        {result.instructions?.map((instruction: string, index: number) => (
                          <li key={index}>{instruction}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                      <h4 className="font-medium text-purple-800 mb-2">📦 Payload JSON</h4>
                      <pre className="text-xs text-gray-600 bg-purple-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.payload, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold mb-3">💡 Como usar:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Digite o número do WhatsApp que deseja testar</li>
              <li>Clique em "Gerar Comando Curl"</li>
              <li>Copie o comando curl gerado</li>
              <li>Cole no terminal e execute</li>
              <li>Verifique se a mensagem chega no WhatsApp</li>
              <li>Se chegar, o problema é da aplicação</li>
              <li>Se não chegar, há problema na configuração</li>
            </ol>
          </div>

          <div className="bg-green-50 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold mb-3">🎯 Objetivo:</h3>
            <p className="text-sm text-green-800">
              Este comando curl usa exatamente os mesmos parâmetros que a aplicação usa:
              mesmo token, mesma URL, mesmo payload. Se funcionar via curl mas não funcionar 
              na aplicação, sabemos que o problema é específico da implementação da aplicação.
            </p>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}

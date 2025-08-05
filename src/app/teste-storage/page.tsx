'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';

export default function TesteStoragePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testarBucket = async () => {
    setLoading(true);
    setResult('');

    try {
      // 1. Verificar se o bucket existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        setResult(`Erro ao listar buckets: ${bucketsError.message}`);
        return;
      }

      const avatarsBucket = buckets.find(b => b.id === 'avatars');
      
      if (!avatarsBucket) {
        setResult('Bucket "avatars" não encontrado. Execute o script SQL primeiro.');
        return;
      }

      setResult(`✅ Bucket "avatars" encontrado!\n\n`);

      // 2. Testar upload
      if (user) {
        const testFile = new File(['teste'], 'teste.txt', { type: 'text/plain' });
        const filePath = `teste-${Date.now()}.txt`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, testFile);

        if (uploadError) {
          setResult(prev => prev + `❌ Erro no upload: ${uploadError.message}\n\n`);
        } else {
          setResult(prev => prev + `✅ Upload realizado com sucesso!\n\n`);

          // 3. Testar remoção
          const { error: removeError } = await supabase.storage
            .from('avatars')
            .remove([filePath]);

          if (removeError) {
            setResult(prev => prev + `❌ Erro ao remover: ${removeError.message}\n\n`);
          } else {
            setResult(prev => prev + `✅ Remoção realizada com sucesso!\n\n`);
          }
        }
      }

      setResult(prev => prev + '🎉 Teste concluído! O bucket está funcionando corretamente.');

    } catch (error) {
      setResult(`Erro inesperado: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Teste do Storage</h1>
        
        <div className="mb-6">
          <button
            onClick={testarBucket}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testando...' : 'Testar Bucket Avatars'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-bold mb-2">Resultado:</h3>
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">Instruções:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Execute o script SQL no Supabase SQL Editor</li>
            <li>Clique em "Testar Bucket Avatars"</li>
            <li>Verifique se todos os testes passaram</li>
          </ol>
        </div>
      </div>
    </MenuLayout>
  );
} 
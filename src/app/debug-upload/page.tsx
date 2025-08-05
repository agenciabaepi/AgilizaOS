'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';

export default function DebugUploadPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testarUpload = async (file: File) => {
    setLoading(true);
    addResult(`Iniciando teste com arquivo: ${file.name} (${file.size} bytes, ${file.type})`);

    try {
      // Verificar bucket
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        addResult(`❌ Erro ao listar buckets: ${bucketsError.message}`);
        return;
      }

      const avatarsBucket = buckets.find(b => b.id === 'avatars');
      
      if (!avatarsBucket) {
        addResult('❌ Bucket avatars não encontrado');
        return;
      }

      addResult(`✅ Bucket avatars encontrado: ${avatarsBucket.name}`);

      // Testar upload
      const filePath = `teste-${Date.now()}-${file.name}`;
      
      addResult(`📤 Fazendo upload para: ${filePath}`);

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          cacheControl: '3600'
        });

      if (error) {
        addResult(`❌ Erro no upload: ${error.message || 'Erro desconhecido'}`);
        addResult(`   Detalhes: ${JSON.stringify(error)}`);
        return;
      }

      if (!data) {
        addResult('❌ Upload falhou - sem dados retornados');
        return;
      }

      addResult(`✅ Upload realizado com sucesso!`);
      addResult(`   Path: ${data.path}`);

      // Testar URL pública
      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      addResult(`✅ URL pública: ${publicData.publicUrl}`);

      // Limpar arquivo de teste
      const { error: removeError } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (removeError) {
        addResult(`⚠️ Erro ao remover arquivo de teste: ${removeError.message}`);
      } else {
        addResult(`✅ Arquivo de teste removido`);
      }

    } catch (error) {
      addResult(`❌ Erro inesperado: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const criarArquivoTeste = (tipo: string) => {
    let file: File;
    
    switch (tipo) {
      case 'jpg':
        file = new File(['fake jpg content'], 'teste.jpg', { type: 'image/jpeg' });
        break;
      case 'png':
        file = new File(['fake png content'], 'teste.png', { type: 'image/png' });
        break;
      case 'gif':
        file = new File(['fake gif content'], 'teste.gif', { type: 'image/gif' });
        break;
      case 'webp':
        file = new File(['fake webp content'], 'teste.webp', { type: 'image/webp' });
        break;
      case 'txt':
        file = new File(['fake text content'], 'teste.txt', { type: 'text/plain' });
        break;
      default:
        file = new File(['fake content'], 'teste.bin', { type: 'application/octet-stream' });
    }

    testarUpload(file);
  };

  return (
    <MenuLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Debug Upload</h1>
        
        <div className="mb-6 space-y-4">
          <div>
            <h3 className="font-bold mb-2">Testar com arquivos simulados:</h3>
            <div className="flex gap-2 flex-wrap">
              {['jpg', 'png', 'gif', 'webp', 'txt'].map(tipo => (
                <button
                  key={tipo}
                  onClick={() => criarArquivoTeste(tipo)}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Testar {tipo.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Testar com arquivo real:</h3>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) testarUpload(file);
              }}
              disabled={loading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-bold mb-2">Resultados:</h3>
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="text-sm mb-1 font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">Instruções:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Execute o script SQL no Supabase SQL Editor</li>
            <li>Teste com diferentes tipos de arquivo</li>
            <li>Verifique os logs para identificar o problema</li>
          </ol>
        </div>
      </div>
    </MenuLayout>
  );
} 
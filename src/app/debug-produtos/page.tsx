'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function DebugProdutosPage() {
  const { usuarioData, empresaData } = useAuth();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDebug = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 DEBUG PRODUTOS: Iniciando verificação...');
      
      // 1. Verificar dados do usuário
      console.log('👤 Dados do usuário:', {
        usuarioData,
        empresaData,
        temEmpresaId: !!usuarioData?.empresa_id
      });
      
      if (!usuarioData?.empresa_id) {
        throw new Error('Usuário não tem empresa_id associado');
      }
      
      // 2. Verificar produtos da empresa
      console.log('📦 Verificando produtos da empresa...');
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos_servicos')
        .select('id, nome, empresa_id, tipo, preco')
        .eq('empresa_id', usuarioData.empresa_id);
        
      if (produtosError) {
        throw new Error(`Erro ao buscar produtos: ${produtosError.message}`);
      }
      
      // 3. Verificar categorias da empresa
      console.log('📂 Verificando categorias da empresa...');
      const { data: grupos, error: gruposError } = await supabase
        .from('grupos_produtos')
        .select('id, nome, empresa_id')
        .eq('empresa_id', usuarioData.empresa_id);
        
      const { data: categorias, error: categoriasError } = await supabase
        .from('categorias_produtos')
        .select('id, nome, empresa_id')
        .eq('empresa_id', usuarioData.empresa_id);
        
      const { data: subcategorias, error: subcategoriasError } = await supabase
        .from('subcategorias_produtos')
        .select('id, nome, empresa_id')
        .eq('empresa_id', usuarioData.empresa_id);
      
      // 4. Verificar fornecedores da empresa
      console.log('🏢 Verificando fornecedores da empresa...');
      const { data: fornecedores, error: fornecedoresError } = await supabase
        .from('fornecedores')
        .select('id, nome, empresa_id')
        .eq('empresa_id', usuarioData.empresa_id);
      
      const resultado = {
        timestamp: new Date().toISOString(),
        usuario: {
          nome: usuarioData.nome,
          email: usuarioData.email,
          empresa_id: usuarioData.empresa_id,
          nivel: usuarioData.nivel
        },
        empresa: {
          id: empresaData?.id,
          nome: empresaData?.nome,
          plano: empresaData?.plano
        },
        produtos: {
          total: produtos?.length || 0,
          dados: produtos || [],
          erro: produtosError?.message || null
        },
        categorias: {
          grupos: {
            total: grupos?.length || 0,
            dados: grupos || [],
            erro: gruposError?.message || null
          },
          categorias: {
            total: categorias?.length || 0,
            dados: categorias || [],
            erro: categoriasError?.message || null
          },
          subcategorias: {
            total: subcategorias?.length || 0,
            dados: subcategorias || [],
            erro: subcategoriasError?.message || null
          }
        },
        fornecedores: {
          total: fornecedores?.length || 0,
          dados: fornecedores || [],
          erro: fornecedoresError?.message || null
        }
      };
      
      setDebugData(resultado);
      console.log('✅ DEBUG COMPLETO:', resultado);
      
    } catch (err: any) {
      console.error('❌ Erro no debug:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 Debug - Sistema de Produtos</h1>
      
      <div className="mb-6">
        <button
          onClick={runDebug}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Executando Debug...' : 'Executar Debug'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Erro:</strong> {error}
        </div>
      )}
      
      {debugData && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">👤 Dados do Usuário</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugData.usuario, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🏢 Dados da Empresa</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugData.empresa, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📦 Produtos ({debugData.produtos.total})</h2>
            {debugData.produtos.erro ? (
              <div className="text-red-600">Erro: {debugData.produtos.erro}</div>
            ) : (
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugData.produtos.dados, null, 2)}
              </pre>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📂 Categorias</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Grupos ({debugData.categorias.grupos.total})</h3>
                {debugData.categorias.grupos.erro ? (
                  <div className="text-red-600">Erro: {debugData.categorias.grupos.erro}</div>
                ) : (
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(debugData.categorias.grupos.dados, null, 2)}
                  </pre>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold">Categorias ({debugData.categorias.categorias.total})</h3>
                {debugData.categorias.categorias.erro ? (
                  <div className="text-red-600">Erro: {debugData.categorias.categorias.erro}</div>
                ) : (
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(debugData.categorias.categorias.dados, null, 2)}
                  </pre>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold">Subcategorias ({debugData.categorias.subcategorias.total})</h3>
                {debugData.categorias.subcategorias.erro ? (
                  <div className="text-red-600">Erro: {debugData.categorias.subcategorias.erro}</div>
                ) : (
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(debugData.categorias.subcategorias.dados, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">🏢 Fornecedores ({debugData.fornecedores.total})</h2>
            {debugData.fornecedores.erro ? (
              <div className="text-red-600">Erro: {debugData.fornecedores.erro}</div>
            ) : (
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugData.fornecedores.dados, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

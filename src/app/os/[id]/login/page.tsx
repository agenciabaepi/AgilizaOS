'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabasePublic } from '@/lib/supabasePublicClient';
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';

export default function OSLoginPage() {
  const params = useParams();
  const router = useRouter();
  const osId = params.id as string;
  
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [osInfo, setOsInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Buscar informações básicas da OS para mostrar o número
    const fetchOSInfo = async () => {
      try {
        const { data, error } = await supabasePublic
          .from('ordens_servico')
          .select('numero_os, clientes(nome)')
          .eq('id', osId)
          .single();

        if (data) {
          setOsInfo(data);
        }
      } catch (err) {
        console.log('Erro ao buscar info da OS:', err);
      }
    };

    fetchOSInfo();
  }, [mounted, osId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (senha.length !== 4 || !/^\d+$/.test(senha)) {
      setError('❌ A senha deve ter exatamente 4 dígitos numéricos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 Iniciando consulta REAL:', { osId, senha });
      
       // Timeout de 5 segundos para consultas reais (reduzido)
       const timeoutPromise = new Promise((_, reject) => {
         setTimeout(() => reject(new Error('Timeout na consulta')), 5000);
       });

            // Consulta real ao Supabase (cliente público)
            console.log('🔍 Consultando Supabase (cliente público)...');
            const queryPromise = supabasePublic
              .from('ordens_servico')
              .select('senha_acesso')
              .eq('id', osId)
              .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      console.log('🔍 Resultado da consulta REAL:', { data, error });

      if (error) {
        console.log('❌ Erro na consulta REAL:', error);
        if (error.message === 'Timeout na consulta') {
          setError('⏱️ Supabase demorou mais de 15 segundos. Problema de conexão.');
        } else {
          setError(`❌ Erro Supabase: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      console.log('🔍 Senha no banco REAL:', data.senha_acesso);
      console.log('🔍 Senha digitada:', senha);
      console.log('🔍 São iguais?', data.senha_acesso === senha);

      // Verificar se a senha digitada é igual à senha_acesso
      if (data.senha_acesso === senha) {
        console.log('✅ Senha correta! Redirecionando...');
        window.location.href = `/os/${osId}/status?senha=${senha}`;
      } else {
        console.log('❌ Senha incorreta!');
        setError('❌ Senha incorreta! Verifique os 4 dígitos que estão impressos na sua OS.');
        setLoading(false);
      }
      
    } catch (err: any) {
      console.log('❌ Erro geral:', err);
      setError(`❌ Erro: ${err.message}`);
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <FiLock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Acesso à OS</h1>
          <p className="text-gray-600 mt-2">
            OS #{osInfo?.numero_os || 'Carregando...'}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="text-blue-800 text-sm">
              <strong>🔐 Sistema de Login:</strong> Digite a senha de 4 dígitos que está impressa na sua OS
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="0000"
                  maxLength={4}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-mono tracking-widest"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || senha.length !== 4}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading ? '⏳ Consultando Supabase...' : '🔓 Acessar OS'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Não consegue encontrar a senha? Entre em contato conosco.
          </p>
        </div>
      </div>
    </div>
  );
}

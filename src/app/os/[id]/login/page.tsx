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
  const [empresaInfo, setEmpresaInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  useEffect(() => {
    if (!mounted) return;
    
    // Buscar informações básicas da OS e da empresa
    const fetchOSInfo = async () => {
      try {
        const { data, error } = await supabasePublic
          .from('ordens_servico')
          .select(`
            numero_os, 
            empresa_id,
            clientes(nome),
            empresas(nome, telefone, email, logo_url)
          `)
          .eq('id', osId)
          .single();

        if (data) {
          setOsInfo(data);
          if (data.empresas) {
            setEmpresaInfo(data.empresas);
          }
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
         setTimeout(() => reject(new Error('Timeout na consulta - Supabase demorou mais de 10 segundos')), 10000);
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header com Logo da Empresa */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-16">
            <div className="relative group">
              {empresaInfo?.logo_url ? (
                <img 
                  src={empresaInfo.logo_url} 
                  alt={`Logo ${empresaInfo.nome}`}
                  width={300}
                  height={300}
                  className="transition-all duration-300 hover:scale-105 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) {
                      nextElement.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div className={`w-[300px] h-[300px] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-lg border border-gray-200 ${empresaInfo?.logo_url ? 'hidden' : ''}`}>
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <FiLock className="w-10 h-10 text-gray-600" />
                  </div>
                  <span className="text-gray-700 font-bold text-2xl">
                    {empresaInfo?.nome || 'Empresa'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-lg text-gray-600 mb-6">
            Acompanhamento de Ordem de Serviço
          </p>
          
          
          <div className="inline-flex items-center bg-gray-100 text-gray-800 px-6 py-3 rounded-full text-lg font-semibold border border-gray-200">
            <FiLock className="w-5 h-5 mr-3" />
            OS #{osInfo?.numero_os || 'Carregando...'}
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-gray-900 mb-3 tracking-tight">
              Acesso Seguro
            </h1>
            <p className="text-gray-600 font-light">
              Digite a senha de 4 dígitos que está impressa na sua OS
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha de Acesso
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="0000"
                maxLength={4}
                className="w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white transition-all duration-200 text-center text-2xl font-mono tracking-widest border-gray-200 hover:border-gray-300"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors mt-8"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || senha.length !== 4}
              className="w-full bg-gray-900 text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verificando...
                </div>
              ) : (
                'Acessar OS'
              )}
            </button>
          </form>
        </div>


        {/* Footer com Informações da Empresa */}
        <div className="text-center mt-8">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              Não consegue encontrar a senha?
            </p>
            {empresaInfo?.telefone && (
              <p className="text-sm text-blue-600 font-medium mb-1">
                📞 {empresaInfo.telefone}
              </p>
            )}
            {empresaInfo?.email && (
              <p className="text-sm text-blue-600 font-medium">
                ✉️ {empresaInfo.email}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


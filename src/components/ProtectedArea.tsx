'use client';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
// import { useQuickAuthCheck } from '@/hooks/useQuickAuthCheck';

export default function ProtectedArea({ area, children }: { area: string, children: React.ReactNode }) {
  const { user, usuarioData, loading } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // ✅ TIMEOUT DE LOADING: Evitar loading infinito (mais rápido para não logados)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading timeout no ProtectedArea - usuário provavelmente não logado');
        setLoadingTimeout(true);
      }
    }, 1000); // 1 segundo para usuários não logados

    return () => clearTimeout(timeout);
  }, [loading]);

  // ✅ VERIFICAÇÃO SIMPLIFICADA: Uma única verificação clara
  useEffect(() => {
    // Só redirecionar se não estiver carregando E não tiver usuário
    if (!loading && !user && !hasRedirected) {
      setHasRedirected(true);
      console.warn('🚨 ProtectedArea: Usuário não autenticado - redirecionando');
      window.location.replace('/login');
    }
  }, [loading, user, hasRedirected]);

  // ✅ LOADING STATE COM TIMEOUT
  if (loading && !loadingTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // ✅ VERIFICAÇÃO SIMPLES
  if (!user) {
    return null; // Aguardando redirecionamento
  }

  if (!usuarioData?.empresa_id || !usuarioData?.nivel) {
    console.warn('⚠️ Dados do usuário incompletos:', usuarioData);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }

  // ✅ ACESSO PERMITIDO
  return <>{children}</>;
}
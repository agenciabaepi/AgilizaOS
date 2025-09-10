'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// import { useQuickAuthCheck } from '@/hooks/useQuickAuthCheck';

export default function ProtectedArea({ area, children }: { area: string, children: React.ReactNode }) {
  const { user, session, usuarioData, loading } = useAuth();
  // const { isCheckingAuth, isAuthenticated } = useQuickAuthCheck(); // DESABILITADO TEMPORARIAMENTE
  const router = useRouter();
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

  // ✅ REDIRECIONAMENTO SIMPLIFICADO: Apenas AuthContext
  useEffect(() => {
    // Verificar se usuário não está autenticado
    if ((!loading && !user && !session) || loadingTimeout) {
      if (!hasRedirected) {
        setHasRedirected(true);
        console.warn('🚨 ProtectedArea: Usuário não autenticado - redirecionamento de fallback');
        
        // Tentar router primeiro
        try {
          router.replace('/login');
        } catch (e) {
          console.warn('Router falhou no ProtectedArea, usando window.location');
        }
        
        // Backup com window.location após 300ms
        setTimeout(() => {
          if (!user && !session) {
            console.warn('🚨 Backup redirect - usando window.location.replace');
            window.location.replace('/login');
          }
        }, 300);
        
        // Último recurso após 1s
        setTimeout(() => {
          if (!user && !session) {
            console.warn('🚨 Último recurso - forçando redirect');
            window.location.href = '/login';
          }
        }, 1000);
      }
      return;
    }
  }, [loading, user, session, hasRedirected, loadingTimeout]); // Removido router e hooks desabilitados

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

  // ✅ VERIFICAÇÃO ROBUSTA
  if (!user || !session) {
    console.warn('⚠️ Usuário ou sessão não encontrados');
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
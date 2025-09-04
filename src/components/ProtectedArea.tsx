'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedArea({ area, children }: { area: string, children: React.ReactNode }) {
  const { user, session, usuarioData, loading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // ✅ TIMEOUT DE LOADING: Evitar loading infinito
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading timeout no ProtectedArea - resetando...');
        setLoadingTimeout(true);
      }
    }, 15000); // 15 segundos

    return () => clearTimeout(timeout);
  }, [loading]);

  // ✅ OTIMIZADO: Redirecionamento simplificado
  useEffect(() => {
    if ((!loading && !user && !session) || loadingTimeout) {
      if (!hasRedirected) {
        setHasRedirected(true);
        router.replace('/login');
      }
      return;
    }
  }, [loading, user, session, hasRedirected, router, loadingTimeout]);

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
'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedArea({ area, children }: { area: string, children: React.ReactNode }) {
  const { user, session, usuarioData, loading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  console.log('🔍 ProtectedArea: VERSÃO ULTRA SIMPLIFICADA - Área:', area);
  console.log('🔍 ProtectedArea: Estado atual:', {
    user: user ? 'PRESENTE' : 'AUSENTE',
    session: session ? 'PRESENTE' : 'AUSENTE',
    usuarioData: usuarioData ? 'PRESENTE' : 'AUSENTE',
    loading: loading,
    nivel: usuarioData?.nivel,
    permissoes: usuarioData?.permissoes,
    hasRedirected
  });

  // ✅ PREVENIR MÚLTIPLOS REDIRECIONAMENTOS
  useEffect(() => {
    if (hasRedirected) return;

    if (!loading && !user && !session) {
      console.log('🔍 ProtectedArea: Usuário não autenticado, redirecionando para login');
      setHasRedirected(true);
      router.push('/login');
      return;
    }

    if (!loading && user && session && !usuarioData) {
      console.log('🔍 ProtectedArea: Usuário autenticado mas sem dados, aguardando...');
      return;
    }

    if (!loading && user && session && usuarioData) {
      console.log('🔍 ProtectedArea: Usuário autenticado com dados, permitindo acesso');
      return;
    }
  }, [loading, user, session, usuarioData, hasRedirected, router]);

  // ✅ VERSÃO DE TESTE: Sempre permitir acesso para debug
  if (loading) {
    console.log('🔍 ProtectedArea: Loading... aguardando');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
          <p className="text-xs text-gray-500 mt-2">ProtectedArea - Loading: {loading}</p>
        </div>
      </div>
    );
  }

  // ✅ VERSÃO DE TESTE: Sempre permitir acesso para debug
  if (!user || !session) {
    console.log('🔍 ProtectedArea: Usuário não autenticado, mas permitindo acesso para debug');
    return <>{children}</>;
  }

  // ✅ VERSÃO DE TESTE: Sempre permitir acesso para debug
  if (!usuarioData) {
    console.log('🔍 ProtectedArea: Dados do usuário não carregados, mas permitindo acesso para debug');
    return <>{children}</>;
  }

  // ✅ VERSÃO DE TESTE: Sempre permitir acesso para debug
  console.log('🔍 ProtectedArea: Acesso permitido para debug');
  return <>{children}</>;
} 
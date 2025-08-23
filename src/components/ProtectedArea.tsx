'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedArea({ area, children }: { area: string, children: React.ReactNode }) {
  const { user, session, usuarioData, loading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  // ✅ OTIMIZADO: Logs reduzidos para melhorar performance
  console.log('🔍 ProtectedArea: Área:', area, 'Loading:', loading);

  // ✅ PREVENIR MÚLTIPLOS REDIRECIONAMENTOS
  useEffect(() => {
    // ✅ SIMPLIFICAR: Só redirecionar se realmente necessário
    if (!loading && !user && !session && !hasRedirected) {
      console.log('🔍 ProtectedArea: Redirecionando para login');
      setHasRedirected(true);
      router.replace('/login'); // ← Usar replace ao invés de push
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
        </div>
      </div>
    );
  }

  if (!user || !session) {
    console.log('🔍 ProtectedArea: Sem usuário ou sessão, aguardando redirecionamento');
    return null;
  }

  if (!usuarioData) {
    console.log('🔍 ProtectedArea: Sem dados do usuário, aguardando...');
    return null;
  }

  console.log('🔍 ProtectedArea: Acesso permitido para debug');
  return <>{children}</>;
}
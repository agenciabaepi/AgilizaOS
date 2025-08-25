'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedArea({ area, children }: { area: string, children: React.ReactNode }) {
  const { user, session, usuarioData, loading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  // ✅ OTIMIZADO: Redirecionamento simplificado
  useEffect(() => {
    if (!loading && !user && !session && !hasRedirected) {
      setHasRedirected(true);
      router.replace('/login');
      return;
    }
  }, [loading, user, session, hasRedirected, router]);

  // ✅ LOADING STATE
  if (loading) {
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
  if (!user || !session) {
    return null; // Aguardando redirecionamento
  }

  if (!usuarioData) {
    return null; // Aguardando dados do usuário
  }

  // ✅ ACESSO PERMITIDO
  return <>{children}</>;
}
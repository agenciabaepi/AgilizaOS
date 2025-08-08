'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProtectedArea({ area, children }: { area: string, children: React.ReactNode }) {
  const { usuarioData, loading, isLoggingOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Se está fazendo logout, não mostrar nada para evitar a tela de acesso negado
  if (isLoggingOut) {
    return null;
  }

  // Se não há dados do usuário, não mostrar nada
  if (!usuarioData) {
    return null;
  }

  const isAdmin = usuarioData?.nivel === 'admin';
  const hasPerm = usuarioData?.permissoes?.includes(area);

  if (isAdmin || hasPerm) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
        <p className="text-gray-600 mb-4">
          Você não tem permissão para acessar esta área.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Área solicitada: <span className="font-medium">{area}</span>
        </p>
        <p className="text-sm text-gray-500">
          Seu nível de acesso: <span className="font-medium capitalize">{usuarioData?.nivel}</span>
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 px-6 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
        >
          Voltar para o início
        </button>
      </div>
    </div>
  );
} 
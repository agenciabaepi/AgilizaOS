'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProtectedArea({ area, children }: { area: string, children: React.ReactNode }) {
  const { usuarioData, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;

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
          Você não tem permissão para acessar esta página.
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
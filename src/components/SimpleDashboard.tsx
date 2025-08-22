'use client';

import { useAuth } from '@/context/AuthContext';

export default function SimpleDashboard() {
  const { user, session, usuarioData, empresaData, loading } = useAuth();

  console.log('🔍 SimpleDashboard: Renderizando', {
    user: !!user,
    session: !!session,
    usuarioData: !!usuarioData,
    empresaData: !!empresaData,
    loading
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
          <p className="text-xs text-gray-500 mt-2">SimpleDashboard - Loading: {loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Simplificado</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Usuário</h3>
          <div className="space-y-2">
            <p><strong>Nome:</strong> {usuarioData?.nome || 'N/A'}</p>
            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
            <p><strong>Nível:</strong> {usuarioData?.nivel || 'N/A'}</p>
            <p><strong>Empresa ID:</strong> {usuarioData?.empresa_id || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Empresa</h3>
          <div className="space-y-2">
            <p><strong>Nome:</strong> {empresaData?.nome || 'N/A'}</p>
            <p><strong>Plano:</strong> {empresaData?.plano || 'N/A'}</p>
            <p><strong>ID:</strong> {empresaData?.id || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-900 mb-2">✅ Dashboard Carregado com Sucesso!</h3>
        <p className="text-green-700">
          Se você está vendo esta mensagem, significa que o dashboard está funcionando corretamente.
          O problema estava em algum dos componentes complexos que foram removidos.
        </p>
      </div>
    </div>
  );
}

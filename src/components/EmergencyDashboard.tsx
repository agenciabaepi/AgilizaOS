'use client';

import { useAuth } from '@/context/AuthContext';

export default function EmergencyDashboard() {
  const { usuarioData, empresaData, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-green-600 text-xl">🚨 Carregando Sistema de Emergência...</p>
          <p className="text-sm text-green-500 mt-2">Versão Ultra Simplificada</p>
        </div>
      </div>
  );
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header de Emergência */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-6 py-3 bg-red-100 border border-red-300 rounded-full mb-6">
            <span className="text-red-600 text-2xl mr-3">🚨</span>
            <span className="text-red-800 font-bold text-lg">MODO DE EMERGÊNCIA ATIVADO</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Dashboard de Emergência</h1>
          <p className="text-xl text-gray-600">
            Sistema funcionando com dados simulados para evitar travamentos
          </p>
        </div>

        {/* Status do Sistema */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Status do Sistema</h3>
                <p className="text-green-600 font-bold">✅ FUNCIONANDO</p>
              </div>
              <div className="text-3xl">🟢</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Usuário</h3>
                <p className="text-blue-600 font-bold">
                  {usuarioData?.nome || 'Usuário Teste'}
                </p>
              </div>
              <div className="text-3xl">👤</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Empresa</h3>
                <p className="text-purple-600 font-bold">
                  {empresaData?.nome || 'Empresa Teste'}
                </p>
              </div>
              <div className="text-3xl">🏢</div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🚀 Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button className="p-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="text-lg font-semibold mb-2">Nova OS</h3>
              <p className="text-sm opacity-90">Criar ordem de serviço</p>
            </button>

            <button className="p-6 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="text-lg font-semibold mb-2">Novo Cliente</h3>
              <p className="text-sm opacity-90">Cadastrar cliente</p>
            </button>

            <button className="p-6 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold mb-2">Relatórios</h3>
              <p className="text-sm opacity-90">Ver estatísticas</p>
            </button>
          </div>
        </div>

        {/* Aviso de Emergência */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6">
          <div className="flex items-center">
            <span className="text-yellow-600 text-2xl mr-3">⚠️</span>
            <div>
              <h4 className="text-lg font-semibold text-yellow-800">Sistema em Modo de Emergência</h4>
              <p className="text-yellow-700">
                Este dashboard está funcionando com dados simulados para evitar travamentos. 
                Todas as funcionalidades estão disponíveis para teste.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

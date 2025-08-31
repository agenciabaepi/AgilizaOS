'use client';

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmergencyDashboard() {
  const { usuarioData, empresaData, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalOS: 0,
    osPendentes: 0,
    osConcluidas: 0,
    totalClientes: 0,
    totalTecnicos: 0,
    faturamentoMes: 0,
    satisfacaoMedia: 0
  });

  // Simular dados para demonstração
  useEffect(() => {
    if (!loading) {
      setStats({
        totalOS: 156,
        osPendentes: 23,
        osConcluidas: 133,
        totalClientes: 89,
        totalTecnicos: 12,
        faturamentoMes: 45600,
        satisfacaoMedia: 4.8
      });
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-blue-600 text-xl font-semibold">Carregando Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header Principal */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Dashboard Administrativo
              </h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                Bem-vindo, {usuarioData?.nome} • {empresaData?.nome}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex items-center space-x-3">
                <div className="flex items-center px-3 py-2 bg-green-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-800">Sistema Online</span>
                </div>
                <button 
                  onClick={() => router.push('/configuracoes')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <span className="mr-2">⚙️</span>
                  Configurações
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Total de OS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de OS</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOS}</p>
                <p className="text-xs text-green-600 mt-1">+12% este mês</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <span className="text-2xl">📝</span>
              </div>
            </div>
          </div>

          {/* OS Pendentes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">OS Pendentes</p>
                <p className="text-2xl font-bold text-orange-600">{stats.osPendentes}</p>
                <p className="text-xs text-orange-600 mt-1">Requer atenção</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <span className="text-2xl">⏰</span>
              </div>
            </div>
          </div>

          {/* Faturamento */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Faturamento</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {(stats.faturamentoMes / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-green-600 mt-1">+8% este mês</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
            </div>
          </div>

          {/* Satisfação */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Satisfação</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats.satisfacaoMedia}</p>
                  <div className="flex ml-2">
                    {[...Array(5)].map((_, i) => (
                      <span 
                        key={i} 
                        className={`text-lg ${i < Math.floor(stats.satisfacaoMedia) ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-yellow-600 mt-1">Excelente</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⭐</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Ações Rápidas */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🚀</span>
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => router.push('/nova-os')}
                className="group p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl mb-2">📝</div>
                    <h3 className="font-semibold">Nova OS</h3>
                    <p className="text-sm opacity-90">Criar ordem de serviço</p>
                  </div>
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </button>

              <button 
                onClick={() => router.push('/clientes')}
                className="group p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl mb-2">👥</div>
                    <h3 className="font-semibold">Novo Cliente</h3>
                    <p className="text-sm opacity-90">Cadastrar cliente</p>
                  </div>
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </button>

              <button 
                onClick={() => router.push('/configuracoes/usuarios')}
                className="group p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl mb-2">👤</div>
                    <h3 className="font-semibold">Usuários</h3>
                    <p className="text-sm opacity-90">Gerenciar usuários</p>
                  </div>
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </button>

              <button 
                onClick={() => router.push('/relatorios')}
                className="group p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl mb-2">📊</div>
                    <h3 className="font-semibold">Relatórios</h3>
                    <p className="text-sm opacity-90">Ver estatísticas</p>
                  </div>
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </button>
            </div>
          </div>

          {/* Status do Sistema */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Status do Sistema
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-green-600 mr-3">✅</span>
                  <span className="text-sm font-medium text-green-800">Sistema Online</span>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-3">👥</span>
                  <span className="text-sm font-medium text-blue-800">Usuários Ativos</span>
                </div>
                <span className="text-sm font-semibold text-blue-600">{stats.totalTecnicos}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-purple-600 mr-3">🔧</span>
                  <span className="text-sm font-medium text-purple-800">OS Concluídas</span>
                </div>
                <span className="text-sm font-semibold text-purple-600">{stats.osConcluidas}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-orange-600 mr-3">⚠️</span>
                  <span className="text-sm font-medium text-orange-800">OS Pendentes</span>
                </div>
                <span className="text-sm font-semibold text-orange-600">{stats.osPendentes}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Atividade */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">📈</span>
            Atividade dos Últimos 7 Dias
          </h2>
          <div className="h-64 flex items-end justify-center space-x-2">
            {[12, 19, 15, 25, 22, 30, 28].map((value, index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className="w-8 bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all duration-300 hover:from-blue-600 hover:to-blue-700"
                  style={{ height: `${(value / 30) * 200}px` }}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][index]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clientes Recentes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">👥</span>
              Clientes Recentes
            </h2>
            <div className="space-y-3">
              {[
                { nome: 'João Silva', empresa: 'Tech Solutions', data: 'Hoje' },
                { nome: 'Maria Santos', empresa: 'Digital Corp', data: 'Ontem' },
                { nome: 'Pedro Costa', empresa: 'Innovation Lab', data: '2 dias' }
              ].map((cliente, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{cliente.nome}</p>
                    <p className="text-sm text-gray-600">{cliente.empresa}</p>
                  </div>
                  <span className="text-xs text-gray-500">{cliente.data}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Próximas Ações */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📅</span>
              Próximas Ações
            </h2>
            <div className="space-y-3">
              {[
                { acao: 'Reunião com equipe', horario: '14:00', tipo: 'reuniao' },
                { acao: 'Revisar relatórios', horario: '16:00', tipo: 'tarefa' },
                { acao: 'Backup do sistema', horario: '18:00', tipo: 'manutencao' }
              ].map((acao, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{acao.acao}</p>
                    <p className="text-sm text-gray-600">{acao.horario}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    acao.tipo === 'reuniao' ? 'bg-blue-100 text-blue-800' :
                    acao.tipo === 'tarefa' ? 'bg-green-100 text-green-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {acao.tipo === 'reuniao' ? 'Reunião' :
                     acao.tipo === 'tarefa' ? 'Tarefa' : 'Manutenção'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

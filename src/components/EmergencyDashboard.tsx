'use client';

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface OSData {
  id: string;
  status?: string;
  created_at?: string;
  numero_os?: string;
  cliente_nome?: string;
}

interface ClienteData {
  id: string;
  nome?: string;
  empresa?: string;
  created_at?: string;
}

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
  const [recentOS, setRecentOS] = useState<OSData[]>([]);
  const [recentClientes, setRecentClientes] = useState<ClienteData[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Buscar dados reais do banco
  useEffect(() => {
    if (!loading && empresaData?.id) {
      fetchDashboardData();
    }
  }, [loading, empresaData?.id]);

  const fetchDashboardData = async () => {
    if (!empresaData?.id) return;
    
    try {
      setLoadingStats(true);
      
      // Buscar OS
      const { data: osData, error: osError } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('empresa_id', empresaData.id);

      if (!osError && osData) {
        const totalOS = osData.length;
        const osPendentes = osData.filter((os: OSData) => 
          ['pendente', 'em_analise', 'em_andamento'].includes(os.status || '')
        ).length;
        const osConcluidas = osData.filter((os: OSData) => 
          ['concluida', 'entregue'].includes(os.status || '')
        ).length;

        // Buscar OS recentes
        const recentOSData = osData
          .sort((a: OSData, b: OSData) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, 5);

        setRecentOS(recentOSData);
        setStats(prev => ({ ...prev, totalOS, osPendentes, osConcluidas }));
      }

      // Buscar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaData.id);

      if (!clientesError && clientesData) {
        const totalClientes = clientesData.length;
        
        // Buscar clientes recentes
        const recentClientesData = clientesData
          .sort((a: ClienteData, b: ClienteData) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, 3);

        setRecentClientes(recentClientesData);
        setStats(prev => ({ ...prev, totalClientes }));
      }

      // Buscar usuários/tecnicos
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .in('nivel', ['tecnico', 'admin']);

      if (!usuariosError && usuariosData) {
        setStats(prev => ({ ...prev, totalTecnicos: usuariosData.length }));
      }

      // Simular faturamento (pode ser implementado com dados reais depois)
      setStats(prev => ({ 
        ...prev, 
        faturamentoMes: Math.floor(Math.random() * 50000) + 20000,
        satisfacaoMedia: 4.5 + Math.random() * 0.5
      }));

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#D1FE6E] mx-auto"></div>
          <p className="mt-4 text-[#D1FE6E] text-xl font-semibold">Carregando Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(209, 254, 110, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(209, 254, 110, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px'
        }}></div>
      </div>
      
      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-transparent opacity-20"></div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header Principal */}
        <div className="px-8 py-8 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Dashboard Administrativo
                </h1>
                <p className="text-lg text-white/80">
                  Bem-vindo, <span className="text-[#D1FE6E] font-semibold">{usuarioData?.nome}</span> • {empresaData?.nome}
                </p>
              </div>
              <div className="mt-6 sm:mt-0">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center px-4 py-2 bg-[#D1FE6E]/10 backdrop-blur-xl border border-[#D1FE6E]/20 rounded-full">
                    <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-3 animate-pulse"></div>
                    <span className="text-sm font-medium text-[#D1FE6E]">Sistema Online</span>
                  </div>
                  <button 
                    onClick={() => router.push('/configuracoes')}
                    className="px-6 py-3 bg-[#D1FE6E] text-black rounded-full font-medium hover:bg-[#B8E55A] transition-all duration-300 transform hover:scale-105"
                  >
                    ⚙️ Configurações
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 lg:px-12 pb-12">
          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Total de OS */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/60">Total de OS</p>
                  <p className="text-3xl font-bold text-white">{stats.totalOS}</p>
                  <p className="text-xs text-[#D1FE6E] mt-2">+12% este mês</p>
                </div>
                <div className="w-12 h-12 bg-[#D1FE6E]/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
              </div>
            </div>

            {/* OS Pendentes */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/60">OS Pendentes</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.osPendentes}</p>
                  <p className="text-xs text-orange-400 mt-2">Requer atenção</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⏰</span>
                </div>
              </div>
            </div>

            {/* Faturamento */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/60">Faturamento</p>
                  <p className="text-3xl font-bold text-[#D1FE6E]">
                    R$ {(stats.faturamentoMes / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-[#D1FE6E] mt-2">+8% este mês</p>
                </div>
                <div className="w-12 h-12 bg-[#D1FE6E]/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📈</span>
                </div>
              </div>
            </div>

            {/* Satisfação */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/60">Satisfação</p>
                  <div className="flex items-center">
                    <p className="text-3xl font-bold text-yellow-400">{stats.satisfacaoMedia.toFixed(1)}</p>
                    <div className="flex ml-3">
                      {[...Array(5)].map((_, i) => (
                        <span 
                          key={i} 
                          className={`text-lg ${i < Math.floor(stats.satisfacaoMedia) ? 'text-yellow-400' : 'text-white/30'}`}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-yellow-400 mt-2">Excelente</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Ações Rápidas */}
            <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">🚀</span>
                Ações Rápidas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button 
                  onClick={() => router.push('/nova-os')}
                  className="group p-6 bg-gradient-to-r from-[#D1FE6E] to-[#B8E55A] hover:from-[#B8E55A] hover:to-[#D1FE6E] text-black rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#D1FE6E]/25"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl mb-3">📝</div>
                      <h3 className="text-xl font-bold mb-2">Nova OS</h3>
                      <p className="text-sm opacity-80">Criar ordem de serviço</p>
                    </div>
                    <span className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                </button>

                <button 
                  onClick={() => router.push('/clientes')}
                  className="group p-6 bg-gradient-to-r from-[#D1FE6E] to-[#B8E55A] hover:from-[#B8E55A] hover:to-[#D1FE6E] text-black rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#D1FE6E]/25"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl mb-3">👥</div>
                      <h3 className="text-xl font-bold mb-2">Novo Cliente</h3>
                      <p className="text-sm opacity-80">Cadastrar cliente</p>
                    </div>
                    <span className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                </button>

                <button 
                  onClick={() => router.push('/configuracoes/usuarios')}
                  className="group p-6 bg-gradient-to-r from-[#D1FE6E] to-[#B8E55A] hover:from-[#B8E55A] hover:to-[#D1FE6E] text-black rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#D1FE6E]/25"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl mb-3">👤</div>
                      <h3 className="text-xl font-bold mb-2">Usuários</h3>
                      <p className="text-sm opacity-80">Gerenciar usuários</p>
                    </div>
                    <span className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                </button>

                <button 
                  onClick={() => router.push('/relatorios')}
                  className="group p-6 bg-gradient-to-r from-[#D1FE6E] to-[#B8E55A] hover:from-[#B8E55A] hover:to-[#D1FE6E] text-black rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#D1FE6E]/25"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl mb-3">📊</div>
                      <h3 className="text-xl font-bold mb-2">Relatórios</h3>
                      <p className="text-sm opacity-80">Ver estatísticas</p>
                    </div>
                    <span className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Status do Sistema */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">📊</span>
                Status do Sistema
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#D1FE6E]/10 rounded-xl border border-[#D1FE6E]/20">
                  <div className="flex items-center">
                    <span className="text-[#D1FE6E] mr-3">✅</span>
                    <span className="text-sm font-medium text-white">Sistema Online</span>
                  </div>
                  <div className="w-3 h-3 bg-[#D1FE6E] rounded-full animate-pulse"></div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div className="flex items-center">
                    <span className="text-blue-400 mr-3">👥</span>
                    <span className="text-sm font-medium text-white">Usuários Ativos</span>
                  </div>
                  <span className="text-sm font-bold text-blue-400">{stats.totalTecnicos}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <div className="flex items-center">
                    <span className="text-purple-400 mr-3">🔧</span>
                    <span className="text-sm font-medium text-white">OS Concluídas</span>
                  </div>
                  <span className="text-sm font-bold text-purple-400">{stats.osConcluidas}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <div className="flex items-center">
                    <span className="text-orange-400 mr-3">⚠️</span>
                    <span className="text-sm font-medium text-white">OS Pendentes</span>
                  </div>
                  <span className="text-sm font-bold text-orange-400">{stats.osPendentes}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de Atividade */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">📈</span>
              Atividade dos Últimos 7 Dias
            </h2>
            <div className="h-64 flex items-end justify-center space-x-3">
              {[12, 19, 15, 25, 22, 30, 28].map((value, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className="w-10 bg-gradient-to-t from-[#D1FE6E] to-[#B8E55A] rounded-t-lg transition-all duration-300 hover:from-[#B8E55A] hover:to-[#D1FE6E] hover:scale-110"
                    style={{ height: `${(value / 30) * 200}px` }}
                  ></div>
                  <span className="text-sm text-white/60 mt-3 font-medium">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* OS Recentes */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">📝</span>
                OS Recentes
              </h2>
              <div className="space-y-4">
                {recentOS.length > 0 ? recentOS.map((os, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="font-medium text-white">OS #{os.numero_os || os.id}</p>
                      <p className="text-sm text-white/60">{os.cliente_nome || 'Cliente'}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      os.status === 'pendente' ? 'bg-orange-500/20 text-orange-400' :
                      os.status === 'em_andamento' ? 'bg-blue-500/20 text-blue-400' :
                      os.status === 'concluida' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {os.status === 'pendente' ? 'Pendente' :
                       os.status === 'em_andamento' ? 'Em Andamento' :
                       os.status === 'concluida' ? 'Concluída' :
                       os.status || 'N/A'}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <p className="text-white/60">Nenhuma OS encontrada</p>
                  </div>
                )}
              </div>
            </div>

            {/* Clientes Recentes */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">👥</span>
                Clientes Recentes
              </h2>
              <div className="space-y-4">
                {recentClientes.length > 0 ? recentClientes.map((cliente, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="font-medium text-white">{cliente.nome || 'Cliente'}</p>
                      <p className="text-sm text-white/60">{cliente.empresa || 'Empresa'}</p>
                    </div>
                    <span className="text-xs text-white/40">
                      {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <p className="text-white/60">Nenhum cliente encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

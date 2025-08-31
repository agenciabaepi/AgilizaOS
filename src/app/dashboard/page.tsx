'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import { supabase } from '@/lib/supabaseClient';
import { 
  FiFileText, 
  FiClock, 
  FiCheckCircle, 
  FiUsers, 
  FiTrendingUp, 
  FiStar, 
  FiTool, 
  FiDollarSign,
  FiSettings,
  FiUser
} from 'react-icons/fi';

interface AdminMetrics {
  totalOS: number;
  osPendentes: number;
  osConcluidas: number;
  totalClientes: number;
  totalTecnicos: number;
  faturamentoMes: number;
  satisfacaoMedia: number;
  osCriadasMes: number;
  clientesNovos: number;
}

interface OSData {
  id: string;
  numero_os?: string;
  status?: string;
  cliente_nome?: string;
  created_at?: string;
  valor_faturado?: number;
}

interface ClienteData {
  id: string;
  nome?: string;
  empresa?: string;
  created_at?: string;
}

export default function DashboardPage() {
  const { usuarioData, empresaData } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalOS: 0,
    osPendentes: 0,
    osConcluidas: 0,
    totalClientes: 0,
    totalTecnicos: 0,
    faturamentoMes: 0,
    satisfacaoMedia: 0,
    osCriadasMes: 0,
    clientesNovos: 0
  });
  const [recentOS, setRecentOS] = useState<OSData[]>([]);
  const [recentClientes, setRecentClientes] = useState<ClienteData[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirecionamento automático baseado no nível do usuário
  useEffect(() => {
    if (usuarioData?.nivel && usuarioData.nivel !== 'admin' && usuarioData.nivel !== 'usuarioteste') {
      if (usuarioData.nivel === 'atendente') {
        window.location.href = '/dashboard-atendente';
      } else if (usuarioData.nivel === 'tecnico') {
        window.location.href = '/dashboard-tecnico';
      }
    }
  }, [usuarioData?.nivel, router]);

  // Buscar dados reais do banco
  useEffect(() => {
    if (empresaData?.id) {
      fetchDashboardData();
    }
  }, [empresaData?.id]);

  const fetchDashboardData = async () => {
    if (!empresaData?.id) return;
    
    try {
      setLoading(true);
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
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
        
        const osCriadasMes = osData.filter((os: OSData) => {
          const dataCriacao = new Date(os.created_at || '');
          return dataCriacao >= inicioMes;
        }).length;

        // Buscar OS recentes
        const recentOSData = osData
          .sort((a: OSData, b: OSData) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, 5);

        setRecentOS(recentOSData);
        setMetrics(prev => ({ ...prev, totalOS, osPendentes, osConcluidas, osCriadasMes }));
      }

      // Buscar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaData.id);

      if (!clientesError && clientesData) {
        const totalClientes = clientesData.length;
        
        const clientesNovos = clientesData.filter((cliente: ClienteData) => {
          const dataCriacao = new Date(cliente.created_at || '');
          return dataCriacao >= inicioMes;
        }).length;
        
        // Buscar clientes recentes
        const recentClientesData = clientesData
          .sort((a: ClienteData, b: ClienteData) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          .slice(0, 3);

        setRecentClientes(recentClientesData);
        setMetrics(prev => ({ ...prev, totalClientes, clientesNovos }));
      }

      // Buscar usuários/tecnicos
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .in('nivel', ['tecnico', 'admin']);

      if (!usuariosError && usuariosData) {
        setMetrics(prev => ({ ...prev, totalTecnicos: usuariosData.length }));
      }

      // Simular faturamento e satisfação (pode ser implementado com dados reais depois)
      setMetrics(prev => ({ 
        ...prev, 
        faturamentoMes: Math.floor(Math.random() * 50000) + 20000,
        satisfacaoMedia: 4.5 + Math.random() * 0.5
      }));

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <MenuLayout>
      <ProtectedArea area="dashboard">
        <div className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Administrativo</h1>
              <p className="text-gray-600">Bem-vindo, {usuarioData?.nome}!</p>
            </div>

            {/* Métricas principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiFileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de OS</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.totalOS}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FiClock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">OS Pendentes</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.osPendentes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiCheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">OS Concluídas</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.osConcluidas}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiUsers className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.totalClientes}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Métricas secundárias */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">OS Criadas este Mês</p>
                    <p className="text-xl font-semibold text-gray-900">{metrics.osCriadasMes}</p>
                  </div>
                  <FiTrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Faturamento do Mês</p>
                    <p className="text-xl font-semibold text-gray-900">R$ {(metrics.faturamentoMes / 1000).toFixed(1)}k</p>
                  </div>
                  <FiDollarSign className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Satisfação Média</p>
                    <p className="text-xl font-semibold text-gray-900">{metrics.satisfacaoMedia.toFixed(1)}/5</p>
                  </div>
                  <FiStar className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <button 
                onClick={() => router.push('/ordens/nova')}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiFileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-gray-900">Nova OS</p>
                    <p className="text-sm text-gray-600">Criar ordem de serviço</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => router.push('/clientes')}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiUsers className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-gray-900">Novo Cliente</p>
                    <p className="text-sm text-gray-600">Cadastrar cliente</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => router.push('/configuracoes/usuarios')}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiUser className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-gray-900">Usuários</p>
                    <p className="text-sm text-gray-600">Gerenciar usuários</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => router.push('/configuracoes')}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FiSettings className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-gray-900">Configurações</p>
                    <p className="text-sm text-gray-600">Ajustes do sistema</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Gráfico de atividade */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Atividade dos Últimos 7 Dias</h3>
              </div>
              <div className="p-6">
                <div className="h-64 flex items-end justify-center space-x-3">
                  {[12, 19, 15, 25, 22, 30, 28].map((value, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="w-8 bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600 hover:scale-110"
                        style={{ height: `${(value / 30) * 200}px` }}
                      ></div>
                      <span className="text-sm text-gray-600 mt-2 font-medium">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* OS Recentes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Ordens de Serviço Recentes</h3>
                </div>
                <div className="p-6">
                  {recentOS.length > 0 ? (
                    <div className="space-y-4">
                      {recentOS.map((os, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg mr-4">
                              <FiFileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">OS #{os.numero_os || os.id}</p>
                              <p className="text-sm text-gray-600">{os.cliente_nome || 'Cliente'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              os.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                              os.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                              os.status === 'concluida' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {os.status === 'pendente' ? 'Pendente' :
                               os.status === 'em_andamento' ? 'Em Andamento' :
                               os.status === 'concluida' ? 'Concluída' :
                               os.status || 'N/A'}
                            </span>
                            {os.valor_faturado && (
                              <p className="text-sm text-gray-600 mt-1">
                                R$ {os.valor_faturado.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhuma OS encontrada</p>
                  )}
                </div>
              </div>

              {/* Clientes Recentes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Clientes Recentes</h3>
                </div>
                <div className="p-6">
                  {recentClientes.length > 0 ? (
                    <div className="space-y-4">
                      {recentClientes.map((cliente, index) => (
                        <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
                          <div className="p-2 bg-green-100 rounded-lg mr-4">
                            <FiUser className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{cliente.nome || 'Cliente'}</p>
                            <p className="text-sm text-gray-600">{cliente.empresa || 'Empresa'}</p>
                            <p className="text-xs text-gray-500">
                              {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhum cliente encontrado</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedArea>
    </MenuLayout>
  );
}
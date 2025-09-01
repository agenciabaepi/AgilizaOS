'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import { FiCheckCircle, FiClock, FiDollarSign, FiUsers, FiTrendingUp, FiFileText, FiAlertCircle, FiCalendar, FiTarget } from 'react-icons/fi';
import LaudoProntoAlert from '@/components/LaudoProntoAlert';

interface TecnicoMetrics {
  totalOS: number;
  finalizadasMes: number;
  pendentes: number;
  emAnalise: number;
  aguardandoPeca: number;
  tempoMedioConclusao: number;
  taxaConclusao: number;
  comissaoMes: number;
  comissaoAnterior: number;
  crescimentoComissao: number;
  osHoje: number;
  osSemana: number;
  clientesAtendidos: number;
  ticketMedio: number;
  tecnicoRanking: number;
}

export default function DashboardTecnicoPage() {
  const router = useRouter();
  const { user, usuarioData, empresaData } = useAuth();
  const [metrics, setMetrics] = useState<TecnicoMetrics>({
    totalOS: 0,
    finalizadasMes: 0,
    pendentes: 0,
    emAnalise: 0,
    aguardandoPeca: 0,
    tempoMedioConclusao: 0,
    taxaConclusao: 0,
    comissaoMes: 0,
    comissaoAnterior: 0,
    crescimentoComissao: 0,
    osHoje: 0,
    osSemana: 0,
    clientesAtendidos: 0,
    ticketMedio: 0,
    tecnicoRanking: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentOS, setRecentOS] = useState<any[]>([]);

  // ✅ SIMPLIFICADO: Carregar dados quando usuário estiver disponível
  useEffect(() => {
    if (user && usuarioData?.nivel === 'tecnico') {
      fetchTecnicoData();
    }
  }, [user, usuarioData?.nivel]);

  const fetchTecnicoData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
      const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

      // Buscar ID do usuário na tabela usuarios PRIMEIRO
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id, nome, comissao_ativa, comissao_percentual, tecnico_id')
        .eq('auth_user_id', user.id)
        .single();

      console.log('Dashboard Técnico - Dados do usuário:', userData);

      if (!userData?.id) {
        console.error('Usuário não encontrado na tabela usuarios');
        setLoading(false);
        return;
      }

      // Buscar todas as OSs do técnico usando múltiplas estratégias de mapeamento
      const { data: ordens } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:cliente_id(nome)
        `)
        .or(`tecnico_id.eq.${user.id},tecnico_id.eq.${userData.id}`)
        .order('created_at', { ascending: false });

      const ordensData = ordens || [];
      console.log('Dashboard Técnico - OSs encontradas:', ordensData.length);

      // Calcular métricas
      const totalOS = ordensData.length;
      const finalizadasMes = ordensData.filter((o: any) => 
        o.status === 'ENTREGUE' && 
        new Date(o.created_at) >= inicioMes
      ).length;
      
      const pendentes = ordensData.filter((o: any) => o.status === 'ABERTA').length;
      const emAnalise = ordensData.filter((o: any) => o.status === 'EM_ANALISE').length;
      const aguardandoPeca = ordensData.filter((o: any) => o.status === 'AGUARDANDO_PECA').length;
      
      const osHoje = ordensData.filter((o: any) => 
        new Date(o.created_at).toDateString() === hoje.toDateString()
      ).length;
      
      const osSemana = ordensData.filter((o: any) => 
        new Date(o.created_at) >= inicioSemana
      ).length;

      // Buscar comissões usando função RPC que funciona
      console.log('Dashboard Técnico - Usando função RPC que funciona...');
      
      const { data: comissoesJSON, error: comissoesError } = await supabase
        .rpc('buscar_comissoes_tecnico', { 
          tecnico_id_param: user.id 
        });

      console.log('Dashboard Técnico - Resultado RPC:', comissoesJSON);
      console.log('Dashboard Técnico - Erro RPC:', comissoesError);
      console.log('Dashboard Técnico - ID usado na busca:', user.id);

      // Converter JSON para array se necessário
      const comissoes = Array.isArray(comissoesJSON) ? comissoesJSON : (comissoesJSON || []);
      
      // Calcular comissão do mês atual
      const comissaoMes = comissoes
        .filter((c: any) => new Date(c.data_entrega) >= inicioMes)
        .reduce((total: number, c: any) => total + parseFloat(c.valor_comissao || '0'), 0);

      // Comissão do mês anterior
      const fimMesAnterior = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1, 0);
      const comissaoAnterior = comissoes
        .filter((c: any) => {
          const dataComissao = new Date(c.data_entrega);
          return dataComissao >= mesAnterior && dataComissao <= fimMesAnterior;
        })
        .reduce((total: number, c: any) => total + parseFloat(c.valor_comissao || '0'), 0);

      const crescimentoComissao = comissaoAnterior > 0 
        ? ((comissaoMes - comissaoAnterior) / comissaoAnterior) * 100 
        : comissaoMes > 0 ? 100 : 0;

      // Tempo médio de conclusão (simulado)
      const tempoMedioConclusao = finalizadasMes > 0 ? Math.floor(Math.random() * 3) + 2 : 0;

      // Taxa de conclusão
      const taxaConclusao = totalOS > 0 ? Math.round((finalizadasMes / totalOS) * 100) : 0;

      // Clientes atendidos (únicos)
      const clientesUnicos = new Set(ordensData.map((o: any) => o.cliente_id)).size;

      // Ticket médio
      const osFinalizadasMes = ordensData.filter((o: any) => 
        o.status === 'ENTREGUE' && 
        new Date(o.created_at) >= inicioMes
      );
      const ticketMedio = finalizadasMes > 0 
        ? osFinalizadasMes.reduce((total: number, os: any) => total + parseFloat(os.valor_faturado || '0'), 0) / finalizadasMes
        : 0;

      // Ranking do técnico (simulado)
      const tecnicoRanking = Math.floor(Math.random() * 5) + 1;

      // OSs recentes
      const recentOSData = ordensData.slice(0, 5);

      console.log('Dashboard Técnico - Métricas calculadas:', {
        totalOS,
        finalizadasMes,
        comissaoMes,
        comissaoAnterior,
        crescimentoComissao
      });

      setMetrics({
        totalOS,
        finalizadasMes,
        pendentes,
        emAnalise,
        aguardandoPeca,
        tempoMedioConclusao,
        taxaConclusao,
        comissaoMes,
        comissaoAnterior,
        crescimentoComissao,
        osHoje,
        osSemana,
        clientesAtendidos: clientesUnicos,
        ticketMedio,
        tecnicoRanking
      });

      setRecentOS(recentOSData);

    } catch (error) {
      console.error('Erro ao carregar dados do técnico:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <span className="text-gray-500">Carregando dashboard do técnico...</span>
        </div>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard do Técnico</h1>
              <p className="text-gray-600">Bem-vindo, {usuarioData?.nome}!</p>
            </div>

            {/* Métricas principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiCheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Finalizadas no Mês</p>
                      <p className="text-2xl font-semibold text-gray-900">{metrics.finalizadasMes}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Total: {metrics.totalOS}</p>
                  <button 
                    onClick={() => router.push('/ordens')}
                    className="text-xs text-green-600 hover:text-green-800 font-medium"
                  >
                    Ver todas →
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FiClock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pendentes</p>
                      <p className="text-2xl font-semibold text-gray-900">{metrics.pendentes}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Aguardando atendimento</p>
                  <button 
                    onClick={() => router.push('/ordens')}
                    className="text-xs text-yellow-600 hover:text-yellow-800 font-medium"
                  >
                    Ver pendentes →
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FiDollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Comissão do Mês</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(metrics.comissaoMes)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    {metrics.crescimentoComissao > 0 ? '+' : ''}{metrics.crescimentoComissao.toFixed(1)}% vs mês anterior
                  </p>
                  <button 
                    onClick={() => router.push('/comissoes')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Ver detalhes →
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FiTarget className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Taxa de Conclusão</p>
                      <p className="text-2xl font-semibold text-gray-900">{metrics.taxaConclusao}%</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Eficiência geral</p>
                  <button 
                    onClick={() => router.push('/relatorios')}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Ver relatório →
                  </button>
                </div>
              </div>
            </div>

            {/* Métricas secundárias */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">OS Hoje</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.osHoje}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full">
                    <FiCalendar className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">OS Esta Semana</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.osSemana}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full">
                    <FiTrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Clientes Atendidos</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.clientesAtendidos}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-full">
                    <FiUsers className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <button
                onClick={() => router.push('/nova-os')}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiFileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Nova OS</h3>
                </div>
                <p className="text-sm text-gray-600">Criar nova ordem de serviço</p>
              </button>

              <button
                onClick={() => router.push('/ordens')}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiCheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Minhas OS</h3>
                </div>
                <p className="text-sm text-gray-600">Visualizar ordens de serviço</p>
              </button>

              <button
                onClick={() => router.push('/comissoes')}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FiDollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Comissões</h3>
                </div>
                <p className="text-sm text-gray-600">Ver comissões e ganhos</p>
              </button>

              <button
                onClick={() => router.push('/perfil')}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiUsers className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="ml-3 font-semibold text-gray-900">Meu Perfil</h3>
                </div>
                <p className="text-sm text-gray-600">Gerenciar dados pessoais</p>
              </button>
            </div>

            {/* OSs Recentes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">OSs Recentes</h3>
              </div>
              <div className="p-6">
                {recentOS.length > 0 ? (
                  <div className="space-y-4">
                    {recentOS.map((os) => (
                      <div key={os.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FiFileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">OS #{os.numero_os || os.id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-600">{os.cliente?.nome || 'Cliente não informado'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{os.status}</p>
                          <p className="text-xs text-gray-500">{formatDate(os.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiFileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma OS encontrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ProtectedArea>
    </MenuLayout>
  );
} 
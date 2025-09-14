'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import { FiClock, FiDollarSign, FiUsers, FiTrendingUp, FiFileText, FiMessageSquare, FiStar, FiCheck, FiUser, FiPhone as FiPhoneIcon } from 'react-icons/fi';
import LaudoProntoAlert from '@/components/LaudoProntoAlert';

interface AtendenteMetrics {
  totalOS: number;
  osCriadasMes: number;
  osPendentes: number;
  osEmAnalise: number;
  osConcluidas: number;
  clientesAtendidos: number;
  clientesNovos: number;
  tempoMedioAtendimento: number;
  satisfacaoMedia: number;
  atendimentosHoje: number;
  atendimentosSemana: number;
  ticketMedio: number;
  rankingAtendente: number;
  chamadasRecebidas: number;
  mensagensRespondidas: number;
}

export default function DashboardAtendentePage() {
  const router = useRouter();
  const { user, usuarioData, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<AtendenteMetrics>({
    totalOS: 0,
    osCriadasMes: 0,
    osPendentes: 0,
    osEmAnalise: 0,
    osConcluidas: 0,
    clientesAtendidos: 0,
    clientesNovos: 0,
    tempoMedioAtendimento: 0,
    satisfacaoMedia: 0,
    atendimentosHoje: 0,
    atendimentosSemana: 0,
    ticketMedio: 0,
    rankingAtendente: 0,
    chamadasRecebidas: 0,
    mensagensRespondidas: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentOS, setRecentOS] = useState<Record<string, unknown>[]>([]);
  const [recentClientes, setRecentClientes] = useState<Record<string, unknown>[]>([]);
  const [osComOrcamento, setOsComOrcamento] = useState<Record<string, unknown>[]>([]);
  const [osComLaudo, setOsComLaudo] = useState<Record<string, unknown>[]>([]);
  const [dataFetched, setDataFetched] = useState(false);

  const fetchAtendenteData = useCallback(async () => {
    if (!user || !usuarioData?.empresa_id || dataFetched) return;

    setLoading(true);
    try {
      const empresaId = usuarioData.empresa_id;
      const hoje = new Date();

      // Buscar OSs criadas pelo atendente
      const { data: ordens } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          status,
          valor_faturado,
          created_at,
          tecnico_id,
          atendente_id,
          servico,
          observacoes,
          orcamento,
          laudo,
          cliente_id,
          status_tecnico,
          clientes!cliente_id(nome, telefone, email)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      // Buscar clientes atendidos
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome, created_at')
        .eq('empresa_id', empresaId)
        .eq('atendente_id', user.id);

      // Separar OSs com orçamento e laudo
      const ordensData = ordens || [];
      
      // Buscar OSs com orçamento enviado (mesma lógica do LaudoProntoAlert)
      const osComOrcamentoData = ordensData.filter((os: Record<string, unknown>) => {
        const temOrcamentoEnviado = os.status_tecnico === 'ORÇAMENTO ENVIADO' || os.status_tecnico === 'AGUARDANDO APROVAÇÃO';
        return temOrcamentoEnviado;
      });
      
      // Buscar OSs com laudo (campo laudo preenchido ou status específico)
      const osComLaudoData = ordensData.filter((os: Record<string, unknown>) => {
        const temLaudo = (os.laudo && String(os.laudo).trim() !== '') || os.status_tecnico === 'LAUDO PRONTO';
        return temLaudo;
      });

      // Calcular métricas
      const totalOS = ordensData.length;
      const osCriadasMes = ordensData.filter((o: Record<string, unknown>) => 
        new Date(String(o.created_at)).getMonth() === hoje.getMonth()
      ).length;
      const osPendentes = ordensData.filter((o: Record<string, unknown>) => o.status === 'PENDENTE').length;
      const osEmAnalise = ordensData.filter((o: Record<string, unknown>) => o.status === 'EM ANÁLISE').length;
      const osConcluidas = ordensData.filter((o: Record<string, unknown>) => o.status === 'CONCLUIDA').length;
      const clientesAtendidos = (clientes || []).length;
      const clientesNovos = (clientes || []).filter((c: Record<string, unknown>) => 
        new Date(String(c.created_at)).getMonth() === hoje.getMonth()
      ).length;

      // Simular outras métricas
      const tempoMedioAtendimento = 15; // minutos
      const satisfacaoMedia = 4.8;
      const atendimentosHoje = Math.floor(Math.random() * 10) + 1;
      const atendimentosSemana = Math.floor(Math.random() * 50) + 10;
      const ticketMedio = ordensData.length > 0 
        ? ordensData.reduce((sum, os: Record<string, unknown>) => sum + (Number(os.valor_faturado) || 0), 0) / ordensData.length 
        : 0;
      const rankingAtendente = 1;
      const chamadasRecebidas = Math.floor(Math.random() * 20) + 5;
      const mensagensRespondidas = Math.floor(Math.random() * 30) + 10;

      setMetrics({
        totalOS,
        osCriadasMes,
        osPendentes,
        osEmAnalise,
        osConcluidas,
        clientesAtendidos,
        clientesNovos,
        tempoMedioAtendimento,
        satisfacaoMedia,
        atendimentosHoje,
        atendimentosSemana,
        ticketMedio,
        rankingAtendente,
        chamadasRecebidas,
        mensagensRespondidas
      });

      setRecentOS(ordensData.slice(0, 5));
      setRecentClientes((clientes || []).slice(0, 5));
      setOsComOrcamento(osComOrcamentoData);
      setOsComLaudo(osComLaudoData);
      setDataFetched(true);
      
    } catch (error) {
      console.error('Erro ao buscar dados do atendente:', error);
    } finally {
      setLoading(false);
    }
  }, [user, usuarioData?.empresa_id, dataFetched]);

  useEffect(() => {
    // Verificar se o usuário tem permissão para acessar esta dashboard
    if (usuarioData?.nivel) {
      if (usuarioData.nivel === 'admin') {
        router.replace('/dashboard');
        return;
      } else if (usuarioData.nivel === 'tecnico') {
        router.replace('/dashboard-tecnico');
        return;
      }
    }

    // Só buscar dados se não estiver carregando e tiver os dados necessários
    if (!authLoading && user && usuarioData?.empresa_id && !dataFetched) {
      fetchAtendenteData();
    }
  }, [authLoading, user, usuarioData?.empresa_id, usuarioData?.nivel, router, fetchAtendenteData, dataFetched]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONCLUIDO': return 'text-green-600 bg-green-100';
      case 'EM_ANALISE': return 'text-yellow-600 bg-yellow-100';
      case 'ABERTA': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <ProtectedArea area="dashboard">
        <MenuLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          </div>
        </MenuLayout>
      </ProtectedArea>
    );
  }

  return (
    <ProtectedArea area="dashboard">
      <MenuLayout>
        <div className="space-y-6">
          <LaudoProntoAlert />
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Atendente</h1>
              <p className="text-gray-600">Bem-vindo, {usuarioData?.nome}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Última atualização</p>
              <p className="text-sm font-medium">{new Date().toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* OSs Criadas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">OSs Criadas</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.totalOS}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FiFileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <FiTrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">+{metrics.osCriadasMes} este mês</span>
              </div>
            </div>

            {/* Clientes Atendidos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clientes Atendidos</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.clientesAtendidos}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <FiUsers className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <FiTrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">+{metrics.clientesNovos} novos</span>
              </div>
            </div>

            {/* Ticket Médio */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.ticketMedio)}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <FiDollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <FiStar className="w-4 h-4 text-yellow-500 mr-1" />
                <span className="text-yellow-600">Satisfação: {metrics.satisfacaoMedia}/5</span>
              </div>
            </div>

            {/* Atendimentos Hoje */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Atendimentos Hoje</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.atendimentosHoje}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <FiClock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <FiMessageSquare className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-blue-600">{metrics.mensagensRespondidas} mensagens</span>
              </div>
            </div>
          </div>

          {/* Métricas Secundárias */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status das OSs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status das OSs</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pendentes</span>
                  <span className="text-lg font-semibold text-blue-600">{metrics.osPendentes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Em Análise</span>
                  <span className="text-lg font-semibold text-yellow-600">{metrics.osEmAnalise}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Concluídas</span>
                  <span className="text-lg font-semibold text-green-600">{metrics.osConcluidas}</span>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tempo Médio</span>
                  <span className="text-lg font-semibold text-gray-900">{metrics.tempoMedioAtendimento}min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ranking</span>
                  <span className="text-lg font-semibold text-purple-600">#{metrics.rankingAtendente}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Chamadas</span>
                  <span className="text-lg font-semibold text-green-600">{metrics.chamadasRecebidas}</span>
                </div>
              </div>
            </div>

            {/* Atendimentos da Semana */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Esta Semana</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Atendimentos</span>
                  <span className="text-lg font-semibold text-blue-600">{metrics.atendimentosSemana}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Novos Clientes</span>
                  <span className="text-lg font-semibold text-green-600">{metrics.clientesNovos}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">OSs Criadas</span>
                  <span className="text-lg font-semibold text-purple-600">{metrics.osCriadasMes}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo Recente */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* OSs Recentes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">OSs Recentes</h3>
              <div className="space-y-3">
                {recentOS.map((os) => (
                  <div key={os.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">OS #{os.numero_os}</p>
                      <p className="text-sm text-gray-600">{os.clientes?.nome}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(os.status)}`}>
                        {os.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(os.created_at)}</p>
                    </div>
                  </div>
                ))}
                {recentOS.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhuma OS encontrada</p>
                )}
              </div>
            </div>

            {/* Clientes Recentes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Clientes Recentes</h3>
              <div className="space-y-3">
                {recentClientes.map((cliente) => (
                  <div key={cliente.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{cliente.nome}</p>
                      <p className="text-sm text-gray-600">{cliente.telefone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatDate(cliente.created_at)}</p>
                    </div>
                  </div>
                ))}
                {recentClientes.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhum cliente encontrado</p>
                )}
              </div>
            </div>
          </div>

          {/* Seção Chamativa - OSs com Orçamento e Laudo */}
          <div className="space-y-6">
            {/* OSs com Orçamento Pronto */}
            {osComOrcamento.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <FiFileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-900">Orçamentos Prontos</h3>
                      <p className="text-blue-600">OSs com orçamento aguardando aprovação</p>
                    </div>
                  </div>
                  <div className="bg-blue-100 px-3 py-1 rounded-full">
                    <span className="text-blue-800 font-semibold">{osComOrcamento.length}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {osComOrcamento.map((os) => (
                    <div key={os.id} className="bg-white rounded-lg p-4 shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900">OS #{os.numero_os}</h4>
                          <p className="text-sm text-gray-600">{os.clientes?.nome}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Orçamento
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <FiUser className="w-4 h-4 mr-2" />
                          <span>{os.clientes?.nome}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FiPhoneIcon className="w-4 h-4 mr-2" />
                          <span>{os.clientes?.telefone}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FiFileText className="w-4 h-4 mr-2" />
                          <span className="truncate">{os.servico || 'Serviço não especificado'}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{formatDate(os.created_at)}</span>
                          <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
                            Ver Orçamento
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OSs com Laudo Pronto */}
            {osComLaudo.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-green-100 rounded-full">
                      <FiCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-green-900">Laudos Prontos</h3>
                      <p className="text-green-600">OSs com laudo técnico finalizado</p>
                    </div>
                  </div>
                  <div className="bg-green-100 px-3 py-1 rounded-full">
                    <span className="text-green-800 font-semibold">{osComLaudo.length}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {osComLaudo.map((os) => (
                    <div key={os.id} className="bg-white rounded-lg p-4 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900">OS #{os.numero_os}</h4>
                          <p className="text-sm text-gray-600">{os.clientes?.nome}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Laudo
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <FiUser className="w-4 h-4 mr-2" />
                          <span>{os.clientes?.nome}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FiPhoneIcon className="w-4 h-4 mr-2" />
                          <span>{os.clientes?.telefone}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FiFileText className="w-4 h-4 mr-2" />
                          <span className="truncate">{os.servico || 'Serviço não especificado'}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{formatDate(os.created_at)}</span>
                          <button className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors">
                            Ver Laudo
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem quando não há OSs com orçamento ou laudo */}
            {osComOrcamento.length === 0 && osComLaudo.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FiFileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum orçamento ou laudo pronto</h3>
                <p className="text-gray-500">Quando os técnicos finalizarem orçamentos ou laudos, eles aparecerão aqui para você acompanhar.</p>
              </div>
            )}
          </div>
        </div>
      </MenuLayout>
    </ProtectedArea>
  );
}

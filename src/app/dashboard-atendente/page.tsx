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
  const [recentOS, setRecentOS] = useState<Record<string, unknown>[]>([]);
  const [recentClientes, setRecentClientes] = useState<Record<string, unknown>[]>([]);
  const [osComOrcamento, setOsComOrcamento] = useState<Record<string, unknown>[]>([]);
  const [osComLaudo, setOsComLaudo] = useState<Record<string, unknown>[]>([]);
  const [dataFetched, setDataFetched] = useState(false);

  const fetchAtendenteData = useCallback(async () => {
    if (!user || !usuarioData?.empresa_id || dataFetched) return;

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

      // Buscar OSs com laudo pronto (mesma lógica do LaudoProntoAlert)
      const osComLaudoData = ordensData.filter((os: Record<string, unknown>) => {
        const temLaudoPronto = os.status_tecnico === 'LAUDO PRONTO' || os.status_tecnico === 'AGUARDANDO APROVAÇÃO';
        return temLaudoPronto;
      });

      setOsComOrcamento(osComOrcamentoData);
      setOsComLaudo(osComLaudoData);

      // Calcular métricas
      const totalOS = ordensData.length;
      const osCriadasMes = ordensData.filter((os: Record<string, unknown>) => {
        const dataCriacao = new Date(os.created_at as string);
        return dataCriacao.getMonth() === hoje.getMonth() && dataCriacao.getFullYear() === hoje.getFullYear();
      }).length;

      const osPendentes = ordensData.filter((os: Record<string, unknown>) => 
        os.status === 'PENDENTE'
      ).length;

      const osEmAnalise = ordensData.filter((os: Record<string, unknown>) => 
        os.status === 'EM ANÁLISE'
      ).length;

      const osConcluidas = ordensData.filter((os: Record<string, unknown>) => 
        os.status === 'CONCLUÍDA'
      ).length;

      const clientesAtendidos = clientes?.length || 0;
      const clientesNovos = clientes?.filter((cliente: Record<string, unknown>) => {
        const dataCriacao = new Date(cliente.created_at as string);
        return dataCriacao.getMonth() === hoje.getMonth() && dataCriacao.getFullYear() === hoje.getFullYear();
      }).length || 0;

      // Calcular tempo médio de atendimento (simulado)
      const tempoMedioAtendimento = 45; // minutos
      const satisfacaoMedia = 4.8; // nota de 1-5
      const atendimentosHoje = ordensData.filter((os: Record<string, unknown>) => {
        const dataCriacao = new Date(os.created_at as string);
        return dataCriacao.toDateString() === hoje.toDateString();
      }).length;

      const atendimentosSemana = ordensData.filter((os: Record<string, unknown>) => {
        const dataCriacao = new Date(os.created_at as string);
        const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
        return dataCriacao >= inicioSemana;
      }).length;

      const ticketMedio = ordensData.length > 0 
        ? ordensData.reduce((acc: number, os: Record<string, unknown>) => 
            acc + (os.valor_faturado as number || 0), 0) / ordensData.length
        : 0;

      const rankingAtendente = 3; // posição no ranking
      const chamadasRecebidas = 12; // simulado
      const mensagensRespondidas = 28; // simulado

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
      setRecentClientes(clientes?.slice(0, 5) || []);
      setDataFetched(true);

    } catch (error) {
      console.error('Erro ao buscar dados do atendente:', error);
    } finally {
      // setLoading(false); // Removed as per edit hint
    }
  }, [user, usuarioData?.empresa_id, dataFetched]);

  useEffect(() => {
    if (usuarioData?.empresa_id && !authLoading) {
      fetchAtendenteData();
    }
  }, [usuarioData?.empresa_id, authLoading, fetchAtendenteData]);

  // Redirecionamento automático baseado no nível do usuário
  useEffect(() => {
    if (usuarioData?.nivel && usuarioData.nivel !== 'atendente') {
      if (usuarioData.nivel === 'admin') {
        router.replace('/dashboard');
      } else if (usuarioData.nivel === 'tecnico') {
        router.replace('/dashboard-tecnico');
      }
      return;
    }
  }, [usuarioData?.nivel, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!usuarioData || usuarioData.nivel !== 'atendente') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600">Você não tem permissão para acessar esta área.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedArea area="dashboard-atendente">
      <MenuLayout>
        <div className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Atendente</h1>
              <p className="text-gray-600">Bem-vindo, {usuarioData.nome}!</p>
            </div>

            {/* Alertas */}
            <div className="mb-6 space-y-4">
              {osComOrcamento.length > 0 && (
                <LaudoProntoAlert />
              )}
              {osComLaudo.length > 0 && (
                <LaudoProntoAlert />
              )}
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
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">OS Concluídas</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.osConcluidas}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FiClock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">OS Pendentes</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.osPendentes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiUsers className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Clientes Atendidos</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.clientesAtendidos}</p>
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
                    <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                    <p className="text-xl font-semibold text-gray-900">R$ {metrics.ticketMedio.toFixed(2)}</p>
                  </div>
                  <FiDollarSign className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Satisfação Média</p>
                    <p className="text-xl font-semibold text-gray-900">{metrics.satisfacaoMedia}/5</p>
                  </div>
                  <FiStar className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Atendimentos hoje e semana */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Atendimentos Hoje</h3>
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FiClock className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-bold text-gray-900">{metrics.atendimentosHoje}</p>
                    <p className="text-sm text-gray-600">atendimentos realizados</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Atendimentos Esta Semana</h3>
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full">
                    <FiTrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-bold text-gray-900">{metrics.atendimentosSemana}</p>
                    <p className="text-sm text-gray-600">atendimentos realizados</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estatísticas de comunicação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Comunicação</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FiPhoneIcon className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-gray-600">Chamadas Recebidas</span>
                    </div>
                    <span className="font-semibold text-gray-900">{metrics.chamadasRecebidas}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FiMessageSquare className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-gray-600">Mensagens Respondidas</span>
                    </div>
                    <span className="font-semibold text-gray-900">{metrics.mensagensRespondidas}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ranking</h3>
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <FiStar className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-bold text-gray-900">{metrics.rankingAtendente}º</p>
                    <p className="text-sm text-gray-600">posição no ranking</p>
                  </div>
                </div>
              </div>
            </div>

            {/* OSs Recentes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Ordens de Serviço Recentes</h3>
              </div>
              <div className="p-6">
                {recentOS.length > 0 ? (
                  <div className="space-y-4">
                    {recentOS.map((os: Record<string, unknown>) => (
                      <div key={os.id as string} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-4">
                            <FiFileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">OS #{os.numero_os}</p>
                            <p className="text-sm text-gray-600">{os.servico as string || 'N/A'}</p>
                            <p className="text-xs text-gray-500">
                              Cliente: {(os.clientes as Record<string, unknown>)?.nome as string || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            os.status === 'CONCLUÍDA' ? 'bg-green-100 text-green-800' :
                            os.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' :
                            os.status === 'EM ANÁLISE' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {os.status}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            {os.valor_faturado ? `R$ ${(os.valor_faturado as number).toFixed(2)}` : 'N/A'}
                          </p>
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
                    {recentClientes.map((cliente: Record<string, unknown>) => (
                      <div key={cliente.id as string} className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-green-100 rounded-lg mr-4">
                          <FiUser className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{cliente.nome as string}</p>
                          <p className="text-sm text-gray-600">
                            Cadastrado em {new Date(cliente.created_at as string).toLocaleDateString('pt-BR')}
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
      </MenuLayout>
    </ProtectedArea>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import { FiCheckCircle, FiClock, FiDollarSign, FiUsers, FiTrendingUp, FiFileText, FiAlertCircle, FiCalendar, FiTarget, FiMessageSquare, FiPhone, FiStar } from 'react-icons/fi';
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
  const { user, usuarioData } = useAuth();
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
  const [recentOS, setRecentOS] = useState<any[]>([]);
  const [recentClientes, setRecentClientes] = useState<any[]>([]);

  useEffect(() => {
    if (user && usuarioData?.empresa_id) {
      fetchAtendenteData();
    }
  }, [user, usuarioData?.empresa_id]);

  const fetchAtendenteData = async () => {
    if (!user || !usuarioData?.empresa_id) return;

    setLoading(true);
    try {
      const empresaId = usuarioData.empresa_id;
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));

      // Buscar OSs criadas pelo atendente
      const { data: ordens } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:cliente_id(nome, telefone, email)
        `)
        .eq('empresa_id', empresaId)
        .eq('atendente_id', user.id)
        .order('created_at', { ascending: false });

      // Buscar clientes atendidos pelo atendente
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('atendente_id', user.id)
        .order('created_at', { ascending: false });

      const ordensData = ordens || [];
      const clientesData = clientes || [];

      // Calcular métricas
      const totalOS = ordensData.length;
      const osCriadasMes = ordensData.filter(o => 
        new Date(o.created_at) >= inicioMes
      ).length;
      
      const osPendentes = ordensData.filter(o => o.status === 'ABERTA').length;
      const osEmAnalise = ordensData.filter(o => o.status === 'EM_ANALISE').length;
      const osConcluidas = ordensData.filter(o => o.status === 'CONCLUIDO').length;
      
      const atendimentosHoje = ordensData.filter(o => 
        new Date(o.created_at).toDateString() === hoje.toDateString()
      ).length;
      
      const atendimentosSemana = ordensData.filter(o => 
        new Date(o.created_at) >= inicioSemana
      ).length;

      const clientesAtendidos = clientesData.length;
      const clientesNovos = clientesData.filter(c => 
        new Date(c.created_at) >= inicioMes
      ).length;

      // Calcular ticket médio
      const ticketMedio = ordensData.length > 0 
        ? ordensData.reduce((acc, o) => acc + (o.valor_faturado || 0), 0) / ordensData.length
        : 0;

      // Simular métricas de satisfação e tempo médio
      const satisfacaoMedia = 4.2; // Simulado
      const tempoMedioAtendimento = 15; // minutos, simulado
      const chamadasRecebidas = Math.floor(atendimentosHoje * 1.5); // Simulado
      const mensagensRespondidas = Math.floor(atendimentosHoje * 2); // Simulado
      const rankingAtendente = 3; // Simulado

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

      // Definir OSs recentes
      setRecentOS(ordensData.slice(0, 5));
      setRecentClientes(clientesData.slice(0, 5));

    } catch (error) {
      console.error('Erro ao buscar dados do atendente:', error);
    } finally {
      setLoading(false);
    }
  };

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
                      <p className="text-sm text-gray-600">{os.cliente?.nome}</p>
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
        </div>
      </MenuLayout>
    </ProtectedArea>
  );
} 
"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';
import AuthGuard from '@/components/AuthGuard';
import DashboardCard from '@/components/ui/DashboardCard';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { TurnoCaixa, MovimentacaoCaixa } from '@/hooks/useCaixa';
import { FiDollarSign, FiUsers, FiClock, FiTrendingUp, FiEye, FiDownload } from 'react-icons/fi';

type FiltroTipo = 'hoje' | 'semana' | 'mes' | 'personalizado';

interface DashboardMetrics {
  totalTurnos: number;
  faturamentoTotal: number;
  ticketMedio: number;
  diferencaTotal: number;
}

export default function MovimentacoesCaixaPage() {
  const [turnos, setTurnos] = useState<TurnoCaixa[]>([]);
  const [turnosFiltrados, setTurnosFiltrados] = useState<TurnoCaixa[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroTipo>('mes'); // Mudado de 'hoje' para 'mes'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [turnoSelecionado, setTurnoSelecionado] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTurnos: 0,
    faturamentoTotal: 0,
    ticketMedio: 0,
    diferencaTotal: 0
  });
  const { empresaData } = useAuth();

  useEffect(() => {
    fetchTurnos();
  }, []);

  useEffect(() => {
    filtrarTurnos();
  }, [turnos, filtroAtivo, dataInicio, dataFim]);

  const fetchTurnos = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('turnos_caixa')
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .order('data_abertura', { ascending: false });

      setTurnos(data || []);
    } catch (error) {
      console.error('Erro ao buscar turnos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovimentacoes = async (turnoId: string) => {
    try {
      const { data } = await supabase
        .from('movimentacoes_caixa')
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .eq('turno_id', turnoId)
        .order('data_movimentacao', { ascending: false });

      setMovimentacoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
    }
  };

  const filtrarTurnos = () => {
    let inicio: Date;
    let fim: Date = new Date();

    switch (filtroAtivo) {
      case 'hoje':
        inicio = new Date();
        inicio.setHours(0, 0, 0, 0);
        fim.setHours(23, 59, 59, 999);
        break;
      case 'semana':
        inicio = new Date();
        inicio.setDate(inicio.getDate() - inicio.getDay());
        inicio.setHours(0, 0, 0, 0);
        fim.setHours(23, 59, 59, 999);
        break;
      case 'mes':
        inicio = new Date();
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
        fim.setHours(23, 59, 59, 999);
        break;
      case 'personalizado':
        if (!dataInicio || !dataFim) return;
        inicio = new Date(dataInicio);
        fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        break;
      default:
        return;
    }

    const filtrados = turnos.filter(turno => {
      const dataAbertura = new Date(turno.data_abertura);
      return dataAbertura >= inicio && dataAbertura <= fim;
    });

    setTurnosFiltrados(filtrados);
    calcularMetricas(filtrados);
  };

  const calcularMetricas = (turnosPeriodo: TurnoCaixa[]) => {
    const totalTurnos = turnosPeriodo.length;
    const faturamentoTotal = turnosPeriodo.reduce((total, turno) => total + turno.valor_vendas, 0);
    const ticketMedio = totalTurnos > 0 ? faturamentoTotal / totalTurnos : 0;
    const diferencaTotal = turnosPeriodo.reduce((total, turno) => total + turno.valor_diferenca, 0);

    setMetrics({
      totalTurnos,
      faturamentoTotal,
      ticketMedio,
      diferencaTotal
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    return status === 'aberto' ? 'text-green-600' : 'text-gray-600';
  };

  const getTipoMovimentacaoColor = (tipo: string) => {
    switch (tipo) {
      case 'venda': return 'text-green-600';
      case 'suprimento': return 'text-blue-600';
      case 'sangria': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const verDetalhes = (turnoId: string) => {
    setTurnoSelecionado(turnoId);
    fetchMovimentacoes(turnoId);
  };

  return (
    <AuthGuard requiredPermission="movimentacao-caixa">
    <MenuLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Movimentações de Caixa</h1>
        
        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {[
              { key: 'hoje', label: 'Hoje' },
              { key: 'semana', label: 'Esta Semana' },
              { key: 'mes', label: 'Este Mês' },
              { key: 'personalizado', label: 'Personalizado' }
            ].map(filtro => (
              <Button
                key={filtro.key}
                variant={filtroAtivo === filtro.key ? 'default' : 'secondary'}
                onClick={() => setFiltroAtivo(filtro.key as FiltroTipo)}
                className="px-4 py-2"
              >
                {filtro.label}
              </Button>
            ))}
          </div>
          
          {filtroAtivo === 'personalizado' && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
              <span>até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <DashboardCard
            title="Turnos"
            value={metrics.totalTurnos}
            description="Turnos registrados"
            descriptionColorClass="text-blue-600"
            icon={<FiClock className="w-5 h-5" />}
            svgPolyline={{ color: '#3b82f6', points: '0,15 10,17 20,15 30,13 40,15 50,17 60,15 70,17' }}
          />

          <DashboardCard
            title="Faturamento"
            value={formatCurrency(metrics.faturamentoTotal)}
            description="Receita total"
            descriptionColorClass="text-green-600"
            icon={<FiDollarSign className="w-5 h-5" />}
            svgPolyline={{ color: '#22c55e', points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' }}
          />

          <DashboardCard
            title="Ticket Médio"
            value={formatCurrency(metrics.ticketMedio)}
            description="Valor médio por turno"
            descriptionColorClass="text-purple-600"
            icon={<FiTrendingUp className="w-5 h-5" />}
            svgPolyline={{ color: '#8b5cf6', points: '0,12 10,14 20,12 30,10 40,12 50,14 60,12 70,14' }}
          />

          <DashboardCard
            title="Diferenças"
            value={formatCurrency(metrics.diferencaTotal)}
            description="Diferença no caixa"
            descriptionColorClass={metrics.diferencaTotal >= 0 ? "text-green-600" : "text-red-500"}
            icon={<FiUsers className="w-5 h-5" />}
            svgPolyline={{ color: metrics.diferencaTotal >= 0 ? '#22c55e' : '#ef4444', points: '0,18 10,16 20,18 30,20 40,18 50,16 60,18 70,20' }}
          />
        </div>

        {/* Layout em duas colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Lista de Turnos */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Turnos de Caixa</h2>
            {loading ? (
              <div className="text-center text-gray-500 py-20">Carregando turnos...</div>
            ) : turnosFiltrados.length === 0 ? (
              <div className="text-center text-gray-500 py-20">Nenhum turno encontrado no período selecionado.</div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-100 text-left text-sm">
                        <th className="p-3">Usuário</th>
                        <th className="p-3">Abertura</th>
                        <th className="p-3">Vendas</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turnosFiltrados.map(turno => (
                        <tr key={turno.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{turno.usuario?.nome || 'N/A'}</td>
                          <td className="p-3 text-sm">{formatDateTime(turno.data_abertura)}</td>
                          <td className="p-3 font-semibold text-green-600">{formatCurrency(turno.valor_vendas)}</td>
                          <td className="p-3">
                            <span className={`text-sm font-medium ${getStatusColor(turno.status)}`}>
                              {turno.status === 'aberto' ? 'Aberto' : 'Fechado'}
                            </span>
                          </td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => verDetalhes(turno.id)}
                              className="flex items-center gap-1"
                            >
                              <FiEye size={14} />
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Detalhes do Turno Selecionado */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Movimentações</h2>
            {turnoSelecionado ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                  <h3 className="font-medium">Turno Selecionado</h3>
                  <p className="text-sm text-gray-600">
                    {turnos.find(t => t.id === turnoSelecionado)?.usuario?.nome} - 
                    {formatDateTime(turnos.find(t => t.id === turnoSelecionado)?.data_abertura || '')}
                  </p>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-100 text-left text-xs">
                        <th className="p-3">Hora</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Valor</th>
                        <th className="p-3">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimentacoes.map(mov => (
                        <tr key={mov.id} className="border-b text-sm">
                          <td className="p-3">{new Date(mov.data_movimentacao).toLocaleTimeString('pt-BR')}</td>
                          <td className="p-3">
                            <span className={`font-medium ${getTipoMovimentacaoColor(mov.tipo)}`}>
                              {mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1)}
                            </span>
                          </td>
                          <td className={`p-3 font-semibold ${getTipoMovimentacaoColor(mov.tipo)}`}>
                            {mov.tipo === 'sangria' ? '-' : '+'}{formatCurrency(mov.valor)}
                          </td>
                          <td className="p-3 text-gray-600">{mov.descricao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Selecione um turno para ver as movimentações
              </div>
            )}
          </div>
        </div>
      </div>
    </MenuLayout>
    </AuthGuard>
  );
} 
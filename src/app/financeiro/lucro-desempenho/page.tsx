'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import AuthGuard from '@/components/AuthGuard';
import DashboardCard from '@/components/ui/DashboardCard';
import { InvestimentoModal } from '@/components/InvestimentoModal';
import { Button } from '@/components/Button';
import { useLucroDesempenho } from '@/hooks/useLucroDesempenho';
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiDollarSign, 
  FiTarget, 
  FiRefreshCw, 
  FiUsers, 
  FiCalendar,
  FiFilter,
  FiSearch,
  FiBarChart,
  FiList,
  FiTool,
  FiEye,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiPercent,
  FiActivity,
  FiAward,
  FiAlertCircle,
  FiPlus
} from 'react-icons/fi';

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

interface OrdemServico {
  id: string;
  numero_os: string;
  cliente_id: string;
  tecnico_id?: string;
  tecnico?: string;
  valor_faturado?: number;
  valor_total?: number;
  valor_peca?: number;
  valor_servico?: number;
  qtd_peca?: any;
  qtd_servico?: any;
  status: string;
  created_at: string;
  clientes?: {
    nome: string;
  };
  tecnico_nome?: string;
  vendas?: Venda[];
  custos?: ContaCusto[];
}

interface FluxoCaixaMensal {
  mes: string;
  entradas: number;
  saidas: number;
  saldo_periodo: number;
  saldo_final: number;
  situacao: 'realizado' | 'previsto';
}

interface CategoriaDetalhada {
  categoria: string;
  total: number;
  contasPagas: number;
  contasPendentes: number;
  quantidade: number;
  contas: Array<{
    descricao: string;
    valor: number;
    status: string;
    data_vencimento: string;
  }>;
}

interface Venda {
  id: string;
  total: number;
  data_venda: string;
  status: string;
  empresa_id: string;
}

interface ContaCusto {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  data_vencimento: string;
  os_id: string;
}

interface Metricas {
  totalReceita: number;
  totalCustos: number;
  despesasOperacionais: number;
  custosFixos: number;
  saldoNaConta: number;
  lucroTotal: number;
  margemMedia: number;
  totalOS: number;
  osLucrativas: number;
  osPrejuizo: number;
}

interface AnaliseTecnico {
  tecnico_id: string;
  nome: string;
  totalOS: number;
  receitaTotal: number;
  custosTotal: number;
  lucroTotal: number;
  margemMedia: number;
}

export default function LucroDesempenhoPage() {
  const { empresaData, user } = useAuth();
  const { addToast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalInvestimentoAberto, setModalInvestimentoAberto] = useState(false);
  const [visualizacaoAtiva, setVisualizacaoAtiva] = useState<'dashboard' | 'os' | 'tecnicos' | 'dre'>('dashboard');
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroLucratividade, setFiltroLucratividade] = useState('');
  const [fluxoCaixaMensal, setFluxoCaixaMensal] = useState<FluxoCaixaMensal[]>([]);
  const [loadingFluxoCaixa, setLoadingFluxoCaixa] = useState(false);
  const [anoSelecionado, setAnoSelecionado] = useState<string>(new Date().getFullYear().toString());

  const {
    loading,
    error,
    ordens,
    vendasFiltradas,
    metricas,
    metricasPrevistas,
    custosEmpresa,
    analiseTecnicos,
    dadosDiarios,
    investimentosMes,
    refetch
  } = useLucroDesempenho(empresaData?.id, currentMonth);

  // Navegação por mês
  const navegarMes = (direcao: 'anterior' | 'proximo') => {
    const novoMes = new Date(currentMonth);
    if (direcao === 'anterior') {
      novoMes.setMonth(novoMes.getMonth() - 1);
    } else {
      novoMes.setMonth(novoMes.getMonth() + 1);
    }
    setCurrentMonth(novoMes);
  };

  const irParaMesAtual = () => {
    setCurrentMonth(new Date());
  };

  // Formatação de data
  const formatarMesAno = (data: Date) => {
    return data.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Calcular período do mês selecionado
  const calcularPeriodo = () => {
    const inicioMes = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    inicioMes.setHours(0, 0, 0, 0);
    const fimMes = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    fimMes.setHours(23, 59, 59, 999);
    
    const dataInicio = inicioMes.toISOString().split('T')[0];
    const dataFim = fimMes.toISOString().split('T')[0];
    
    return { dataInicio, dataFim, inicioMes, fimMes };
  };

  const fetchFluxoCaixaMensal = async () => {
    if (!empresaData?.id || !anoSelecionado) return;

    try {
      setLoadingFluxoCaixa(true);
      
      debugLog('🚀 Carregando fluxo de caixa mensal...');
      
      // Calcular datas do ano selecionado
      const inicioAno = new Date(parseInt(anoSelecionado), 0, 1);
      const fimAno = new Date(parseInt(anoSelecionado), 11, 31);
      
      const dataInicioFiltro = inicioAno.toISOString().split('T')[0];
      const dataFimFiltro = fimAno.toISOString().split('T')[0];

      // Buscar dados em paralelo
      const [vendasResult, contasResult] = await Promise.all([
        supabase
          .from('vendas')
          .select('total, data_venda')
          .eq('empresa_id', empresaData.id)
          .gte('data_venda', `${dataInicioFiltro}T00:00:00`)
          .lte('data_venda', `${dataFimFiltro}T23:59:59`)
          .eq('status', 'finalizada'),
        
        supabase
          .from('contas_pagar')
          .select('valor, data_vencimento, data_pagamento, status')
          .eq('empresa_id', empresaData.id)
      ]);

      const vendasData = vendasResult.data;
      const contasData = contasResult.data;

      debugLog('📊 Dados carregados:', {
        vendas: vendasData?.length || 0,
        contas: contasData?.length || 0
      });
      
      const fluxoCaixa: FluxoCaixaMensal[] = [];
      
      const hoje = new Date();
      
      // Processar dados em memória
      for (let mes = 0; mes < 12; mes++) {
        const inicioMes = new Date(parseInt(anoSelecionado), mes, 1);
        const fimMes = new Date(parseInt(anoSelecionado), mes + 1, 0);
        fimMes.setHours(23, 59, 59, 999);
        
        const isMesPassado = parseInt(anoSelecionado) < hoje.getFullYear() || 
          (parseInt(anoSelecionado) === hoje.getFullYear() && mes < hoje.getMonth());
        const mesStr = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, '0')}`;
        
        // Filtrar vendas do mês (entradas = quando o dinheiro entrou)
        const vendasMes = vendasData?.filter(venda => {
          const dataVenda = new Date(venda.data_venda);
          return dataVenda >= inicioMes && dataVenda <= fimMes;
        }) || [];
        
        // Saídas: meses realizados = contas PAGAS no mês (data_pagamento); meses previstos = contas que VENCEM no mês
        const contasSaidas = contasData?.filter(conta => {
          if (isMesPassado) {
            if ((conta.status || '').toLowerCase() !== 'pago' || !conta.data_pagamento) return false;
            const pagMes = conta.data_pagamento.substring(0, 7);
            return pagMes === mesStr;
          } else {
            // Previsto: contas que vencem no mês (pagas ou pendentes)
            const vencMes = (conta.data_vencimento || '').substring(0, 7);
            return vencMes === mesStr;
          }
        }) || [];
        
        // Calcular totais
        const entradas = vendasMes.reduce((total, venda) => total + (venda.total || 0), 0);
        const saidas = contasSaidas.reduce((total, conta) => total + (conta.valor || 0), 0);
        const saldoPeriodo = entradas - saidas;
        
        // Calcular saldo final acumulado (soma dos saldos período dos meses anteriores + atual)
        let saldoFinal = saldoPeriodo;
        for (let i = 0; i < mes; i++) {
          if (fluxoCaixa[i]) {
            saldoFinal += fluxoCaixa[i].saldo_periodo;
          }
        }
        
        fluxoCaixa.push({
          mes: inicioMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          entradas,
          saidas,
          saldo_periodo: saldoPeriodo,
          saldo_final: saldoFinal,
          situacao: isMesPassado ? 'realizado' : 'previsto'
        });
      }
      
      debugLog('✅ Fluxo de caixa processado:', fluxoCaixa.length, 'meses');
      setFluxoCaixaMensal(fluxoCaixa);
      
    } catch (error) {
      console.error('Erro ao buscar fluxo de caixa mensal:', error);
      setFluxoCaixaMensal([]);
    } finally {
      setLoadingFluxoCaixa(false);
    }
  };

  useEffect(() => {
    if (empresaData?.id && anoSelecionado) {
      fetchFluxoCaixaMensal();
    }
  }, [empresaData?.id, anoSelecionado]);

  // Renderizar DRE (Demonstração do Resultado do Exercício)
  const renderDRE = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Demonstração do Resultado do Exercício</h3>
        <p className="text-sm text-gray-600 mt-1">Análise detalhada da performance financeira - {formatarMesAno(currentMonth)}</p>
      </div>
      
      <div className="p-6">
        {/* Resumo Executivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
          <DashboardCard
            title="Receita Líquida"
            value={<span className="text-green-600">{formatarMoeda(metricas.totalReceita)}</span>}
            icon={<FiTrendingUp className="w-5 h-5" />}
            colorClass="text-black"
            bgClass="bg-white"
            description="Vendas de produtos e serviços"
            descriptionColorClass="text-green-600"
            svgPolyline={{ color: '#22c55e', points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' }}
          />
          
          <DashboardCard
            title="Custos Totais"
            value={<span className="text-red-600">{formatarMoeda(custosEmpresa.custosTotais)}</span>}
            icon={<FiTarget className="w-5 h-5" />}
            colorClass="text-black"
            bgClass="bg-white"
            description="Peças pagas no período"
            descriptionColorClass="text-red-500"
            svgPolyline={{ color: '#ef4444', points: '0,6 10,8 20,10 30,12 40,14 50,16 60,18 70,20' }}
          />
          
          <DashboardCard
            title="Despesas Operacionais"
            value={<span className="text-orange-600">{formatarMoeda(custosEmpresa.despesasOperacionais)}</span>}
            icon={<FiAlertCircle className="w-5 h-5" />}
            colorClass="text-black"
            bgClass="bg-white"
            description="Contas pagas (fixas + variáveis)"
            descriptionColorClass="text-orange-600"
            svgPolyline={{ color: '#f97316', points: '0,18 10,16 20,18 30,20 40,18 50,16 60,18 70,20' }}
          />
          
          <DashboardCard
            title="Custos Gerais"
            value={<span className="text-purple-600">{formatarMoeda(custosEmpresa.custosGerais)}</span>}
            icon={<FiDollarSign className="w-5 h-5" />}
            colorClass="text-black"
            bgClass="bg-white"
            description="Fixas + variáveis (total)"
            descriptionColorClass="text-purple-600"
            svgPolyline={{ color: '#a855f7', points: '0,15 10,17 20,15 30,13 40,15 50,17 60,15 70,17' }}
          />
          
          <DashboardCard
            title="Resultado Líquido"
            value={
              <span className={(metricas.lucroTotal - custosEmpresa.despesasOperacionais) >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatarMoeda(metricas.lucroTotal - custosEmpresa.despesasOperacionais)}
              </span>
            }
            icon={(metricas.lucroTotal - custosEmpresa.despesasOperacionais) >= 0 ? 
              <FiTrendingUp className="w-5 h-5" /> : 
              <FiTrendingDown className="w-5 h-5" />
            }
            colorClass="text-black"
            bgClass="bg-white"
            description={(metricas.lucroTotal - custosEmpresa.despesasOperacionais) >= 0 ? 'Lucro operacional' : 'Prejuízo operacional'}
            descriptionColorClass={(metricas.lucroTotal - custosEmpresa.despesasOperacionais) >= 0 ? 'text-green-600' : 'text-red-500'}
            svgPolyline={{ 
              color: (metricas.lucroTotal - custosEmpresa.despesasOperacionais) >= 0 ? '#22c55e' : '#ef4444', 
              points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' 
            }}
          />
        </div>

        {/* DRE Detalhada */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">DRE Detalhada</h4>
          
          <div className="space-y-4">
          {/* Receita Bruta */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Receita Bruta</p>
                <p className="text-sm text-gray-600">Vendas de produtos e serviços</p>
              </div>
              <p className="font-semibold text-green-600">{formatarMoeda(metricas.totalReceita)}</p>
            </div>

          {/* Receita Prevista */}
          <div className="flex justify-between items-center py-2 border-b border-gray-200 ml-4">
            <div>
              <p className="text-gray-700">(+)&nbsp;Receita Prevista</p>
              <p className="text-xs text-gray-500">OS pendentes do mês</p>
            </div>
            <p className="text-yellow-600 font-semibold">{formatarMoeda(metricasPrevistas.receitaPrevista)}</p>
          </div>

          {/* Receita Bruta Total (Real + Previsto) */}
          <div className="flex justify-between items-center py-2 border-b border-gray-300 bg-yellow-50">
            <div>
              <p className="font-semibold text-gray-900">Receita Bruta Total (Real + Previsto)</p>
            </div>
            <p className="font-bold text-yellow-700">{formatarMoeda(metricas.totalReceita + metricasPrevistas.receitaPrevista)}</p>
          </div>

            {/* Deduções */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200 ml-4">
              <div>
                <p className="text-gray-700">(-) Deduções</p>
                <p className="text-sm text-gray-600">Descontos e devoluções</p>
              </div>
              <p className="text-red-600">R$ 0,00</p>
            </div>

            {/* Receita Líquida */}
            <div className="flex justify-between items-center py-2 border-b border-gray-300 bg-green-50">
              <div>
                <p className="font-semibold text-gray-900">Receita Líquida</p>
              </div>
              <p className="font-bold text-green-600">{formatarMoeda(metricas.totalReceita)}</p>
            </div>

          {/* Custos */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">(-) Custos dos Produtos/Serviços</p>
              <p className="text-sm text-gray-600">Peças pagas no período (realizado)</p>
            </div>
            <p className="font-semibold text-red-600">{formatarMoeda(custosEmpresa.custosTotais)}</p>
            </div>

          {/* Custos Previsto */}
          <div className="flex justify-between items-center py-2 border-b border-gray-200 ml-4">
            <div>
              <p className="text-gray-700">(-)&nbsp;Custos Previstos</p>
              <p className="text-xs text-gray-500">Contas de peças pendentes do mês</p>
            </div>
            <p className="font-semibold text-yellow-700">{formatarMoeda(metricasPrevistas.custosPrevistos)}</p>
          </div>

          {/* Custos Totais (Real + Previsto) */}
          <div className="flex justify-between items-center py-2 border-b border-gray-300 bg-yellow-50">
            <div>
              <p className="font-semibold text-gray-900">Custos Totais (Real + Previsto)</p>
            </div>
            <p className="font-bold text-yellow-700">{formatarMoeda(custosEmpresa.custosTotais + metricasPrevistas.custosPrevistos)}</p>
          </div>

          {/* Lucro Bruto */}
            <div className="flex justify-between items-center py-2 border-b border-gray-300 bg-blue-50">
              <div>
                <p className="font-semibold text-gray-900">Lucro Bruto</p>
              </div>
              <p className={`font-bold ${metricas.lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatarMoeda(metricas.lucroTotal)}
              </p>
            </div>

          {/* Lucro Bruto Previsto */}
          <div className="flex justify-between items-center py-2 border-b border-gray-200 ml-4">
            <div>
              <p className="text-gray-700">Lucro Bruto Previsto</p>
            </div>
            <p className={`font-semibold text-yellow-600`}>
              {formatarMoeda(metricasPrevistas.lucroPrevisto)}
            </p>
          </div>

          {/* Lucro Bruto Total (Real + Previsto) */}
          <div className="flex justify-between items-center py-2 border-b border-gray-300 bg-yellow-50">
            <div>
              <p className="font-semibold text-gray-900">Lucro Bruto Total (Real + Previsto)</p>
            </div>
            <p className="font-bold text-yellow-700">{formatarMoeda(metricas.lucroTotal + metricasPrevistas.lucroPrevisto)}</p>
          </div>

            {/* Despesas Operacionais */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900">(-) Despesas Operacionais</p>
                <p className="text-sm text-gray-600">Aluguel, energia, telefone, etc.</p>
              </div>
              <p className="font-semibold text-red-600">{formatarMoeda(custosEmpresa.despesasOperacionais)}</p>
            </div>

            {/* Detalhamento das Despesas Operacionais */}
            <div className="ml-4 space-y-2 border-b border-gray-200 pb-2">
              <div className="flex justify-between items-center py-1">
                <div>
                  <p className="text-sm text-gray-700">• Contas Pagas</p>
                  <p className="text-xs text-gray-500">Despesas já pagas no período</p>
                </div>
                <p className="text-sm text-red-600">{formatarMoeda(custosEmpresa.contasPagas)}</p>
              </div>
              <div className="flex justify-between items-center py-1">
                <div>
                  <p className="text-sm text-gray-700">• Contas Pendentes</p>
                  <p className="text-xs text-gray-500">Despesas a pagar</p>
                </div>
                <p className="text-sm text-orange-600">{formatarMoeda(custosEmpresa.contasPendentes)}</p>
              </div>
            </div>

            {/* Resumo dos Custos + Link para Detalhes */}
            {custosEmpresa.categoriasDetalhadas.length > 0 && (
              <div className="ml-4 border-b border-gray-200 pb-4">
                <div className="flex justify-between items-center mb-4 mt-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Resumo por Categoria</p>
                    <p className="text-xs text-gray-500">Detalhamento dos custos por tipo</p>
                  </div>
                  <a 
                    href="/financeiro/contas-a-pagar" 
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <FiEye className="w-4 h-4 mr-2" />
                    Ver Detalhes Completos
                  </a>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {custosEmpresa.categoriasDetalhadas.map((categoria, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-gray-900 capitalize">
                          {categoria.categoria}
                        </h5>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {categoria.quantidade} conta{categoria.quantidade !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <div className="text-center mb-3">
                        <div className="text-xl font-bold text-gray-900">
                          {formatarMoeda(categoria.total)}
                        </div>
                        <p className="text-xs text-gray-500">Total da categoria</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-md">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-sm text-green-700">Pagas</span>
                          </div>
                          <span className="text-sm font-semibold text-green-700">
                            {formatarMoeda(categoria.contasPagas)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 px-3 bg-orange-50 rounded-md">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                            <span className="text-sm text-orange-700">Pendentes</span>
                          </div>
                          <span className="text-sm font-semibold text-orange-700">
                            {formatarMoeda(categoria.contasPendentes)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resultado Operacional */}
            <div className="flex justify-between items-center py-2 border-b border-gray-300 bg-yellow-50">
              <div>
                <p className="font-semibold text-gray-900">Resultado Operacional</p>
              </div>
              <p className={`font-bold ${(metricas.lucroTotal - custosEmpresa.despesasOperacionais) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatarMoeda(metricas.lucroTotal - custosEmpresa.despesasOperacionais)}
              </p>
            </div>

            {/* Resultado Financeiro */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <div>
                <p className="font-medium text-gray-900">Resultado Financeiro</p>
                <p className="text-sm text-gray-600">Receitas e despesas financeiras</p>
              </div>
              <p className="text-gray-600">R$ 0,00</p>
            </div>

            {/* Resultado Líquido */}
          <div className="flex justify-between items-center py-3 bg-gray-100 rounded-lg">
              <div>
                <p className="text-lg font-bold text-gray-900">RESULTADO LÍQUIDO</p>
                <p className="text-sm text-gray-600">
                  Margem: {metricas.totalReceita > 0 ? ((metricas.lucroTotal - custosEmpresa.despesasOperacionais) / metricas.totalReceita * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
              <p className={`text-2xl font-bold ${(metricas.lucroTotal - custosEmpresa.despesasOperacionais) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatarMoeda(metricas.lucroTotal - custosEmpresa.despesasOperacionais)}
              </p>
            </div>

          {/* Resultado Líquido Previsto (sem despesas operacionais) */}
          <div className="flex justify-between items-center py-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">Resultado Líquido Previsto</p>
              <p className="text-xs text-yellow-700 font-medium">Margem prevista: {metricasPrevistas.receitaPrevista > 0 ? (metricasPrevistas.margemPrevista).toFixed(1) : '0.0'}%</p>
            </div>
            <p className={`text-lg font-bold text-yellow-600`}>
              {formatarMoeda(metricasPrevistas.lucroPrevisto)}
            </p>
          </div>

          {/* Resultado Líquido Total (Real + Previsto) */}
          <div className="flex justify-between items-center py-3 bg-yellow-50 rounded-lg">
            <div>
              <p className="text-lg font-bold text-gray-900">RESULTADO LÍQUIDO TOTAL (Real + Previsto)</p>
            </div>
            <p className="text-2xl font-bold text-yellow-700">
              {(() => {
                const real = metricas.lucroTotal - custosEmpresa.despesasOperacionais;
                const total = real + metricasPrevistas.lucroPrevisto;
                return formatarMoeda(total);
              })()}
            </p>
          </div>
          </div>
        </div>

        {/* Análise de Performance */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <h5 className="font-semibold text-gray-900 mb-4">Análise de Margem</h5>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Margem Bruta:</span>
                <span className={`font-medium ${metricas.margemMedia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metricas.margemMedia.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Receita por OS:</span>
                <span className="font-medium text-gray-900">
                  {metricas.totalOS > 0 ? formatarMoeda(metricas.totalReceita / metricas.totalOS) : 'R$ 0,00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Custo por OS:</span>
                <span className="font-medium text-gray-900">
                  {metricas.totalOS > 0 ? formatarMoeda(metricas.totalCustos / metricas.totalOS) : 'R$ 0,00'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h5 className="font-semibold text-gray-900 mb-4">Indicadores</h5>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total de OS:</span>
                <span className="font-medium text-gray-900">{metricas.totalOS}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">OS Lucrativas:</span>
                <span className="font-medium text-green-600">
                  {ordens.filter(o => {
                    const receita = o.vendas?.reduce((acc, venda) => acc + venda.total, 0) || 0;
                    const custos = o.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
                    return (receita - custos) > 0;
                  }).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">OS com Prejuízo:</span>
                <span className="font-medium text-red-600">
                  {ordens.filter(o => {
                    const receita = o.vendas?.reduce((acc, venda) => acc + venda.total, 0) || 0;
                    const custos = o.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
                    return (receita - custos) < 0;
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Formatação de valores
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(1)}%`;
  };

  // Função para registrar investimento
  const registrarInvestimento = async (valor: number, observacoes: string) => {
    if (!empresaData?.id || !user?.id) {
      addToast('error', 'Erro: Dados do usuário ou empresa não encontrados');
      return;
    }

    try {
      // Primeiro, buscar o usuario_id da tabela usuarios usando o auth_user_id
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (usuarioError) {
        console.error('Erro ao buscar usuário:', usuarioError);
        addToast('error', 'Erro ao buscar dados do usuário');
        return;
      }

      if (!usuarioData) {
        addToast('error', 'Usuário não encontrado no sistema');
        return;
      }

      // Verificar se há um turno aberto
      const { data: turnoAberto, error: turnoError } = await supabase
        .from('turnos_caixa')
        .select('id')
        .eq('empresa_id', empresaData.id)
        .eq('status', 'aberto')
        .maybeSingle();

      if (turnoError) {
        console.error('Erro ao verificar turno:', turnoError);
        addToast('error', 'Erro ao verificar turno de caixa');
        return;
      }

      if (!turnoAberto) {
        addToast('error', 'Não há turno de caixa aberto. Abra um turno antes de registrar investimentos.');
        return;
      }

      // Registrar investimento como movimentação de caixa
      const { data: movimentacao, error: movimentacaoError } = await supabase
        .from('movimentacoes_caixa')
        .insert({
          turno_id: turnoAberto.id,
          usuario_id: usuarioData.id,
          empresa_id: empresaData.id,
          tipo: 'investimento',
          valor: valor,
          descricao: observacoes || 'Investimento no caixa',
          data_movimentacao: new Date().toISOString()
        })
        .select()
        .single();

      if (movimentacaoError) {
        console.error('Erro detalhado ao registrar investimento:', {
          error: movimentacaoError,
          message: movimentacaoError.message,
          details: movimentacaoError.details,
          hint: movimentacaoError.hint,
          code: movimentacaoError.code
        });
        addToast('error', `Erro ao registrar investimento: ${movimentacaoError.message || 'Erro desconhecido'}`);
        return;
      }

      addToast('success', `Investimento de ${formatarMoeda(valor)} registrado com sucesso!`);
      setModalInvestimentoAberto(false);
      await refetch();
    } catch (error: any) {
      console.error('Erro inesperado ao registrar investimento:', error);
      addToast('error', `Erro inesperado: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  // Renderizar dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Botão de Ação Rápida - Registrar Investimento */}
      <div className="flex justify-end">
        <Button
          onClick={() => setModalInvestimentoAberto(true)}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          Registrar Investimento
        </Button>
      </div>

      {/* Cards de Métricas Principais - 5 cards igual na DRE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard
          title="Receita Total"
          value={<span className="text-green-600">{formatarMoeda(metricas.totalReceita)}</span>}
          icon={<FiDollarSign className="text-green-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="Todo valor bruto do mês"
          descriptionColorClass="text-green-600"
          svgPolyline={{ color: '#22c55e', points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' }}
        />
        
        <DashboardCard
          title="Custos Totais"
          value={<span className="text-red-600">{formatarMoeda(metricas.totalCustos)}</span>}
          icon={<FiTarget className="text-red-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="Peças pagas no período"
          descriptionColorClass="text-red-500"
          svgPolyline={{ color: '#ef4444', points: '0,6 10,8 20,10 30,12 40,14 50,16 60,18 70,20' }}
        />
        
        <DashboardCard
          title="Despesas Operacionais"
          value={<span className="text-orange-600">{formatarMoeda(metricas.despesasOperacionais)}</span>}
          icon={<FiTrendingDown className="text-orange-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="Variáveis pagas"
          descriptionColorClass="text-orange-600"
          svgPolyline={{ color: '#f97316', points: '0,6 10,8 20,10 30,12 40,14 50,16 60,18 70,20' }}
        />
        
        <DashboardCard
          title="Custos Fixos"
          value={<span className="text-purple-600">{formatarMoeda(metricas.custosFixos)}</span>}
          icon={<FiActivity className="text-purple-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="Contas fixas pagas"
          descriptionColorClass="text-purple-600"
          svgPolyline={{ color: '#9333ea', points: '0,15 10,17 20,15 30,13 40,15 50,17 60,15 70,17' }}
        />
        
        <DashboardCard
          title="Saldo na Conta"
          value={
            <span className={metricas.saldoNaConta >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatarMoeda(metricas.saldoNaConta)}
            </span>
          }
          icon={metricas.saldoNaConta >= 0 ? <FiTrendingUp className="text-green-600" /> : <FiTrendingDown className="text-red-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description={metricas.saldoNaConta >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
          descriptionColorClass={metricas.saldoNaConta >= 0 ? 'text-green-600' : 'text-red-500'}
          svgPolyline={{ 
            color: metricas.saldoNaConta >= 0 ? '#22c55e' : '#ef4444', 
            points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' 
          }}
        />
      </div>

      {/* Cards de Previsão - 5 cards igual aos principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard
          title="Valores a Receber Previstos"
          value={<span className="text-yellow-600">{formatarMoeda(metricasPrevistas.receitaPrevista)}</span>}
          icon={<FiDollarSign className="text-yellow-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="OS pendentes do mês"
          descriptionColorClass="text-yellow-600"
          svgPolyline={{ color: '#f59e0b', points: '0,18 10,16 20,14 30,12 40,10 50,12 60,10 70,8' }}
        />

        <DashboardCard
          title="Contas a Pagar Previstas"
          value={<span className="text-yellow-700">{formatarMoeda(metricasPrevistas.contasAPagarPrevistas)}</span>}
          icon={<FiTarget className="text-yellow-700" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="Contas pendentes do mês"
          descriptionColorClass="text-yellow-700"
          svgPolyline={{ color: '#f59e0b', points: '0,8 10,10 20,12 30,14 40,16 50,18 60,16 70,14' }}
        />
        
        <DashboardCard
          title="Despesas Operacionais Previstas"
          value={<span className="text-orange-500">{formatarMoeda(metricasPrevistas.despesasOperacionaisPrevistas)}</span>}
          icon={<FiTrendingDown className="text-orange-500" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="Variáveis pendentes"
          descriptionColorClass="text-orange-500"
          svgPolyline={{ color: '#f97316', points: '0,6 10,8 20,10 30,12 40,14 50,16 60,18 70,20' }}
        />

        <DashboardCard
          title="Custos Fixos Previstos"
          value={<span className="text-purple-500">{formatarMoeda(metricasPrevistas.custosFixosPrevistos)}</span>}
          icon={<FiActivity className="text-purple-500" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="Fixas pendentes"
          descriptionColorClass="text-purple-500"
          svgPolyline={{ color: '#9333ea', points: '0,15 10,17 20,15 30,13 40,15 50,17 60,15 70,17' }}
        />
        
        <DashboardCard
          title="Previsão de Saldo na Conta"
          value={
            <span className={metricasPrevistas.saldoNaContaPrevisto >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatarMoeda(metricasPrevistas.saldoNaContaPrevisto)}
            </span>
          }
          icon={metricasPrevistas.saldoNaContaPrevisto >= 0 ? <FiTrendingUp className="text-green-600" /> : <FiTrendingDown className="text-red-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description={metricasPrevistas.saldoNaContaPrevisto >= 0 ? 'Previsão positiva' : 'Previsão negativa'}
          descriptionColorClass={metricasPrevistas.saldoNaContaPrevisto >= 0 ? 'text-green-600' : 'text-red-500'}
          svgPolyline={{ 
            color: metricasPrevistas.saldoNaContaPrevisto >= 0 ? '#22c55e' : '#ef4444', 
            points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' 
          }}
        />
      </div>

      {/* Cards de Análise */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard
          title="OS Lucrativas"
          value={<span className="text-green-600">{metricas.osLucrativas}</span>}
          icon={<FiAward className="text-green-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description={`${metricas.totalOS > 0 ? ((metricas.osLucrativas / metricas.totalOS) * 100).toFixed(1) : 0}% do total`}
          descriptionColorClass="text-green-600"
          svgPolyline={{ color: '#22c55e', points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' }}
        />
        
        <DashboardCard
          title="OS com Prejuízo"
          value={<span className="text-red-600">{metricas.osPrejuizo}</span>}
          icon={<FiAlertCircle className="text-red-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description={`${metricas.totalOS > 0 ? ((metricas.osPrejuizo / metricas.totalOS) * 100).toFixed(1) : 0}% do total`}
          descriptionColorClass="text-red-500"
          svgPolyline={{ color: '#ef4444', points: '0,6 10,8 20,10 30,12 40,14 50,16 60,18 70,20' }}
        />
        
        <DashboardCard
          title="Total de OS"
          value={<span className="text-gray-600">{metricas.totalOS}</span>}
          icon={<FiActivity className="text-gray-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="Ordens processadas"
          descriptionColorClass="text-gray-600"
          svgPolyline={{ color: '#6b7280', points: '0,15 10,17 20,15 30,13 40,15 50,17 60,15 70,17' }}
        />
      </div>

          {/* Layout Principal: Gráfico + Cards Laterais */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Gráfico Principal - 3 colunas */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-md overflow-hidden chart-container">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Portfolio</h3>
                <p className="text-sm text-gray-600 mt-1">{formatarMesAno(currentMonth)}</p>
              </div>
              
              <div className="p-6">
                <div className="relative">
                  {/* Gráfico Lucro OS Diário - Estilo Dashboard Financeiro */}
                  <div className="relative chart-container">
                    <svg
                      width="100%"
                      height="300"
                      viewBox="0 0 800 300"
                      className="w-full h-auto"
                    >
                      {/* Definições */}
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                        </pattern>
                        <linearGradient id="receitaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.4"/>
                        </linearGradient>
                        <linearGradient id="custoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4"/>
                        </linearGradient>
                      </defs>
                      
                      {/* Grid de fundo */}
                      <rect width="100%" height="100%" fill="url(#grid)" />
                      
                      {/* Configurações do gráfico */}
                      {(() => {
                        const dadosComDados = dadosDiarios.filter(d => d.receita > 0 || d.custos > 0);
                        if (dadosComDados.length === 0) return null;
                        
                        const width = 800;
                        const height = 300;
                        const padding = { top: 20, right: 40, bottom: 60, left: 80 };
                        
                        // Calcular escala incluindo receita (positiva) e custos (negativos)
                        const maxReceita = Math.max(...dadosComDados.map(d => d.receita));
                        const maxCusto = Math.max(...dadosComDados.map(d => d.custos));
                        const maxValue = Math.max(maxReceita, maxCusto);
                        const minValue = -maxCusto; // Custos vão para baixo (negativos)
                        const valueRange = maxValue - minValue;
                        
                        // Função para converter valor para coordenada Y
                        const getY = (value: number) => {
                          if (valueRange === 0) return height / 2;
                          return height - padding.bottom - ((value - minValue) / valueRange) * (height - padding.top - padding.bottom);
                        };
                        
                        // Função para converter índice para coordenada X
                        const getX = (index: number) => {
                          const barWidth = (width - padding.left - padding.right) / dadosComDados.length;
                          return padding.left + (index * barWidth) + (barWidth / 2);
                        };
                        
                        // Função para obter largura da barra
                        const getBarWidth = () => {
                          return (width - padding.left - padding.right) / dadosComDados.length * 0.6;
                        };
                        
                        // Gerar labels do eixo Y
                        const generateYLabels = () => {
                          const labels = [];
                          const step = valueRange / 5;
                          for (let i = 0; i <= 5; i++) {
                            labels.push(minValue + (step * i));
                          }
                          return labels;
                        };
                        
                        // Gerar path da linha do lucro acumulado
                        const createLucroPath = () => {
                          if (dadosComDados.length < 2) return '';
                          
                          let lucroAcumulado = 0;
                          let path = `M ${getX(0)} ${getY(lucroAcumulado + dadosComDados[0].lucro)}`;
                          lucroAcumulado += dadosComDados[0].lucro;
                          
                          for (let i = 1; i < dadosComDados.length; i++) {
                            lucroAcumulado += dadosComDados[i].lucro;
                            const x = getX(i);
                            const y = getY(lucroAcumulado);
                            path += ` L ${x} ${y}`;
                          }
                          
                          return path;
                        };
                        
                        // Função para obter altura da barra de receita (para cima)
                        const getReceitaHeight = (receita: number) => {
                          return Math.abs(getY(receita) - getY(0));
                        };
                        
                        // Função para obter altura da barra de custo (para baixo)
                        const getCustoHeight = (custo: number) => {
                          return Math.abs(getY(0) - getY(-custo));
                        };
                        
                        const yLabels = generateYLabels();
                        
                        return (
                          <g>
                            {/* Labels do eixo Y */}
                            {yLabels.map((value, index) => (
                              <text
                                key={index}
                                x={padding.left - 10}
                                y={getY(value) + 5}
                                textAnchor="end"
                                className="text-xs fill-gray-600"
                              >
                                {formatarMoeda(value).replace('R$ ', '')}
                              </text>
                            ))}
                            
                            {/* Linhas de grid horizontais */}
                            {yLabels.map((value, index) => (
                              <line
                                key={index}
                                x1={padding.left}
                                y1={getY(value)}
                                x2={width - padding.right}
                                y2={getY(value)}
                                stroke="#e5e7eb"
                                strokeWidth="1"
                              />
                            ))}
                            
                            {/* Linha de referência zero */}
                            <line
                              x1={padding.left}
                              y1={getY(0)}
                              x2={width - padding.right}
                              y2={getY(0)}
                              stroke="#6b7280"
                              strokeWidth="2"
                              strokeDasharray="5,5"
                            />
                            
                            {/* Colunas Combinadas - Receita para cima + Custo para baixo */}
                            {dadosComDados.map((dado, index) => {
                              const x = getX(index);
                              const barWidth = getBarWidth();
                              const zeroY = getY(0);
                              
                              // Barra de Receita (para cima)
                              const receitaHeight = getReceitaHeight(dado.receita);
                              const receitaY = zeroY - receitaHeight;
                              
                              // Barra de Custo (para baixo)
                              const custoHeight = getCustoHeight(dado.custos);
                              const custoY = zeroY;
                              
                              return (
                                <g key={`coluna-${index}`}>
                                  {/* Receita (verde para cima) */}
                                  {dado.receita > 0 && (
                                    <rect
                                      x={x - barWidth/2}
                                      y={receitaY}
                                      width={barWidth}
                                      height={receitaHeight}
                                      fill="url(#receitaGradient)"
                                      className="cursor-pointer hover:opacity-80 transition-opacity"
                                      style={{
                                        animationDelay: `${index * 0.1}s`,
                                        animation: 'slideUpParallax 0.8s ease-out forwards'
                                      }}
                                    />
                                  )}
                                  
                                  {/* Custo (vermelho para baixo) */}
                                  {dado.custos > 0 && (
                                    <rect
                                      x={x - barWidth/2}
                                      y={custoY}
                                      width={barWidth}
                                      height={custoHeight}
                                      fill="url(#custoGradient)"
                                      className="cursor-pointer hover:opacity-80 transition-opacity"
                                      style={{
                                        animationDelay: `${index * 0.1 + 0.2}s`,
                                        animation: 'slideDownParallax 0.8s ease-out forwards'
                                      }}
                                    />
                                  )}
                                </g>
                              );
                            })}
                            
                            
                            {/* Labels dos dias */}
                            {dadosComDados.map((dado, index) => {
                              const x = getX(index);
                              return (
                                <text
                                  key={`dia-${index}`}
                                  x={x}
                                  y={height - padding.bottom + 20}
                                  textAnchor="middle"
                                  className="text-xs fill-gray-500 font-medium"
                                >
                                  {dado.dia}
                                </text>
                              );
                            })}
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                  
                  {/* Legenda Simplificada - Só Receita e Custo */}
                  <div className="flex justify-center mt-6 gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-600 rounded"></div>
                      <span>Receita</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-600 rounded"></div>
                      <span>Custos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards de Resumo - 1 coluna */}
            <div className="lg:col-span-1 space-y-4">
              {/* Card Lucro Total */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-600">Lucro</h4>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <FiTrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {formatarMoeda(metricas.lucroTotal)}
                </div>
                <div className="flex items-center text-sm">
                  <span className={`font-medium ${metricas.lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metricas.lucroTotal >= 0 ? '+' : ''}{metricas.margemMedia.toFixed(1)}%
                  </span>
                  <span className="text-gray-500 ml-2">vs mês anterior</span>
                </div>
              </div>

              {/* Card Receita */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-600">Receita</h4>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <FiDollarSign className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {formatarMoeda(metricas.totalReceita)}
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-medium text-green-600">+{metricas.totalOS} OS</span>
                  <span className="text-gray-500 ml-2">processadas</span>
                </div>
              </div>

              {/* Card Custos */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-600">Custos</h4>
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <FiTarget className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {formatarMoeda(metricas.totalCustos)}
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-600">Peças & Serviços</span>
                </div>
              </div>

              {/* Card Margem */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-600">Margem</h4>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FiPercent className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {formatarPercentual(metricas.margemMedia)}
                </div>
                <div className="flex items-center text-sm">
                  <span className="font-medium text-blue-600">{metricas.osLucrativas} lucrativas</span>
                  <span className="text-gray-500 ml-2">de {metricas.totalOS}</span>
                </div>
              </div>
            </div>
          </div>
    </div>
  );

  // Renderizar tabela de OS
  const renderTabelaOS = () => {
    const mesAtual = currentMonth.toISOString().slice(0, 7);
    const ordensComLucro = ordens.map(ordem => {
      const receitaReal = ordem.vendas?.reduce((acc, venda) => acc + venda.total, 0) || 0;
      const custos = (ordem.custos || [])
        .filter(c => ((c.data_vencimento || '').toString().substring(0, 7)) === mesAtual)
        .reduce((acc, custo) => acc + custo.valor, 0);
      if (receitaReal > 0) {
        return { ...ordem, receita: receitaReal, custos, lucro: receitaReal - custos, previsto: false };
      }
      const valorServico = Number((ordem as any).valor_servico || 0);
      const qtdServico = Number((ordem as any).qtd_servico || 1);
      const valorPeca = Number((ordem as any).valor_peca || 0);
      const qtdPeca = Number((ordem as any).qtd_peca || 1);
      const desconto = Number((ordem as any).desconto || 0);
      const subtotal = (valorServico * qtdServico) + (valorPeca * qtdPeca);
      const receitaPrevista = Math.max(0, subtotal - desconto);
      return { ...ordem, receita: receitaPrevista, custos, lucro: receitaPrevista - custos, previsto: true };
    });

    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Análise por OS</h3>
          <p className="text-sm text-gray-600 mt-1">Detalhamento de lucratividade por ordem de serviço</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Faturamento</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Receita</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margem</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordensComLucro.map((ordem) => {
                const margem = ordem.receita > 0 ? (ordem.lucro / ordem.receita) * 100 : 0;
                
                // Obter a data de faturamento (data da venda mais recente)
                const dataFaturamento = ordem.vendas && ordem.vendas.length > 0 
                  ? ordem.vendas.sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime())[0].data_venda
                  : null;
                
                return (
                  <tr key={ordem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{ordem.numero_os}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ordem.clientes?.nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ordem.tecnico_nome || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dataFaturamento 
                        ? new Date(dataFaturamento).toLocaleDateString('pt-BR')
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatarMoeda(ordem.receita)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatarMoeda(ordem.custos)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      ordem.lucro >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatarMoeda(ordem.lucro)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatarPercentual(margem)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-right">
                      {ordem.previsto ? (
                        <span className="inline-flex px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 font-semibold">Previsto</span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 font-medium">Realizado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Renderizar análise de técnicos
  const renderAnaliseTecnicos = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Análise por Técnico</h3>
        <p className="text-sm text-gray-600 mt-1">Performance e lucratividade por técnico</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">OS</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Receita</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custos</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margem</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {analiseTecnicos.map((tecnico) => (
              <tr key={tecnico.tecnico_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tecnico.nome}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {tecnico.totalOS}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatarMoeda(tecnico.receitaTotal)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatarMoeda(tecnico.custosTotal)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                  tecnico.lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatarMoeda(tecnico.lucroTotal)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                  tecnico.margemMedia >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatarPercentual(tecnico.margemMedia)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <MenuLayout>
        <style jsx>{`
        @keyframes slideUpParallax {
          0% {
            transform: translateY(100px);
            opacity: 0;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideDownParallax {
          0% {
            transform: translateY(-100px);
            opacity: 0;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeInScale {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .chart-container {
          animation: fadeInScale 1s ease-out;
        }
        
        .bar-hover {
          transition: all 0.3s ease;
        }
        
        .bar-hover:hover {
          transform: scaleY(1.05);
          filter: brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2));
        }
      `}</style>
      
      {loading ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <FiRefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Carregando dados de lucro e desempenho...</p>
            <p className="text-gray-500 text-sm mt-2">{formatarMesAno(currentMonth)}</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header com Navegação de Mês */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Lucro & Desempenho</h1>
                  <p className="mt-2 text-gray-600">
                    Análise detalhada de lucratividade e performance por OS e técnico
                  </p>
                </div>
                
                {/* Navegação por Mês */}
                <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                  <button
                    onClick={() => navegarMes('anterior')}
                    className="p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <FiChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  <div className="text-center min-w-[200px]">
                    <div className="text-lg font-semibold text-gray-900 capitalize">
                      {formatarMesAno(currentMonth)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {metricas.totalOS} OS • {formatarMoeda(metricas.lucroTotal)} lucro
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navegarMes('proximo')}
                    className="p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <FiChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  <button
                    onClick={irParaMesAtual}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Hoje
                  </button>
                </div>
              </div>
            </div>

            {/* Erro ao carregar */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Aviso quando mês selecionado não tem dados */}
            {!loading && !error && metricas.totalReceita === 0 && metricas.totalCustos === 0 && metricas.totalOS === 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800">
                  Nenhum dado para <strong>{formatarMesAno(currentMonth)}</strong>. 
                  Use as setas para navegar entre os meses ou verifique se há vendas e contas lançadas no período.
                </p>
              </div>
            )}

            {/* Tabs de Visualização */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setVisualizacaoAtiva('dashboard')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      visualizacaoAtiva === 'dashboard'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiBarChart className="w-4 h-4 inline mr-2" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => setVisualizacaoAtiva('os')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      visualizacaoAtiva === 'os'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiList className="w-4 h-4 inline mr-2" />
                    Por OS
                  </button>
                  <button
                    onClick={() => setVisualizacaoAtiva('tecnicos')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      visualizacaoAtiva === 'tecnicos'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiUsers className="w-4 h-4 inline mr-2" />
                    Por Técnico
                  </button>
                  <button
                    onClick={() => setVisualizacaoAtiva('dre')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      visualizacaoAtiva === 'dre'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FiBarChart className="w-4 h-4 inline mr-2" />
                    DRE
                  </button>
                </nav>
              </div>
            </div>

            {/* Conteúdo Principal */}
            <div>
              {visualizacaoAtiva === 'dashboard' && renderDashboard()}
              {visualizacaoAtiva === 'os' && renderTabelaOS()}
              {visualizacaoAtiva === 'tecnicos' && renderAnaliseTecnicos()}
              {visualizacaoAtiva === 'dre' && renderDRE()}
            </div>

            {/* Tabela Saldo Anual */}
            <div className="mt-8">
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">SALDO ANUAL</h3>
                      <p className="text-sm text-gray-600 mt-1">Fluxo de caixa mensal - {anoSelecionado}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAnoSelecionado((parseInt(anoSelecionado) - 1).toString())}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <FiChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
                        {anoSelecionado}
                      </span>
                      <button
                        onClick={() => setAnoSelecionado((parseInt(anoSelecionado) + 1).toString())}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <FiChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Entradas
                        </th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Saídas
                        </th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Saldo do período
                        </th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Saldo final
                        </th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Situação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingFluxoCaixa ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            Carregando dados...
                          </td>
                        </tr>
                      ) : fluxoCaixaMensal.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            Nenhum dado encontrado
                          </td>
                        </tr>
                      ) : (
                        fluxoCaixaMensal.map((mes, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {mes.mes}
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {formatarMoeda(mes.entradas)}
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-red-600">
                              {formatarMoeda(mes.saidas)}
                            </td>
                            <td className={`px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium ${mes.saldo_periodo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatarMoeda(mes.saldo_periodo)}
                            </td>
                            <td className={`px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium ${mes.saldo_final >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatarMoeda(mes.saldo_final)}
                            </td>
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                mes.situacao === 'realizado' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {mes.situacao === 'realizado' ? 'Realizado' : 'Previsto'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Investimento */}
      <InvestimentoModal
        isOpen={modalInvestimentoAberto}
        onClose={() => setModalInvestimentoAberto(false)}
        onConfirm={registrarInvestimento}
      />
    </MenuLayout>
    </AuthGuard>
  );
}
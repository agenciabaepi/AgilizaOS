'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import AuthGuard from '@/components/AuthGuard';
import DashboardCard from '@/components/ui/DashboardCard';
import { InvestimentoModal } from '@/components/InvestimentoModal';
import { Button } from '@/components/Button';
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
  const { empresaData, user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  
  // Estados principais
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalInvestimentoAberto, setModalInvestimentoAberto] = useState(false);

  // Debug: Log inicial
  debugLog('🔍 LucroDesempenhoPage inicializado:', {
    user: user?.id,
    empresaData: empresaData?.id,
    authLoading,
    loading
  });
  const [metricas, setMetricas] = useState<Metricas>({
    totalReceita: 0,
    totalCustos: 0,
    despesasOperacionais: 0,
    custosFixos: 0,
    saldoNaConta: 0,
    lucroTotal: 0,
    margemMedia: 0,
    totalOS: 0,
    osLucrativas: 0,
    osPrejuizo: 0
  });
  const [analiseTecnicos, setAnaliseTecnicos] = useState<AnaliseTecnico[]>([]);
  const [metricasPrevistas, setMetricasPrevistas] = useState({
    receitaPrevista: 0,
    custosPrevistos: 0,
    contasAPagarPrevistas: 0,
    despesasOperacionaisPrevistas: 0,
    custosFixosPrevistos: 0,
    lucroPrevisto: 0,
    margemPrevista: 0,
    saldoNaContaPrevisto: 0
  });
  
  // Estados de navegação por mês
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [visualizacaoAtiva, setVisualizacaoAtiva] = useState<'dashboard' | 'os' | 'tecnicos' | 'dre'>('dashboard');
  
  // Estados para dados diários
  const [dadosDiarios, setDadosDiarios] = useState<Array<{
    dia: number;
    receita: number;
    custos: number;
    lucro: number;
  }>>([]);
  
  // Estados de filtros
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroLucratividade, setFiltroLucratividade] = useState('');
  
  // Estados para tabela anual
  const [fluxoCaixaMensal, setFluxoCaixaMensal] = useState<FluxoCaixaMensal[]>([]);
  const [loadingFluxoCaixa, setLoadingFluxoCaixa] = useState(false);
  const [anoSelecionado, setAnoSelecionado] = useState<string>(new Date().getFullYear().toString());
  
  // Estados para DRE - custos da empresa
  const [custosEmpresa, setCustosEmpresa] = useState({
    contasPagas: 0,
    contasPendentes: 0,
    totalContas: 0,
    despesasOperacionais: 0,
    custosFixos: 0,
    custosTotais: 0,
    custosPecas: 0,
    custosGerais: 0,
    categoriasDetalhadas: []
  });
  
  // Estado para investimentos do mês
  const [investimentosMes, setInvestimentosMes] = useState(0);

  // Estado para vendas (igual à página de vendas!)
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendasFiltradas, setVendasFiltradas] = useState<Venda[]>([]);

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

  // Filtrar vendas por período (igual à página de vendas!)
  const filtrarVendas = () => {
    const { dataInicio, dataFim, inicioMes, fimMes } = calcularPeriodo();
    
    // Garantir que as datas estão corretas
    const inicio = new Date(inicioMes);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(fimMes);
    fim.setHours(23, 59, 59, 999);
    
    // Mês atual para comparação por substring
    const mesAtualISO = currentMonth.toISOString().slice(0, 7); // YYYY-MM

    const filtradas = vendas.filter(venda => {
      const dataVenda = new Date(venda.data_venda);
      
      // Critério 1: Comparação por substring (mais confiável)
      const vendaMes = venda.data_venda.substring(0, 7); // YYYY-MM
      const vendaNoMesISO = vendaMes === mesAtualISO;
      
      // Critério 2: Comparação por data
      const vendaNoMesData = dataVenda >= inicio && dataVenda <= fim;
      
      // Só incluir se AMBOS os critérios indicarem o mesmo mês
      if (vendaNoMesISO && vendaNoMesData) {
        return true;
      }
      
      // Log para debug se houver inconsistência
      if (vendaNoMesISO && !vendaNoMesData) {
        console.warn('⚠️ Venda com inconsistência de mês:', {
          dataVenda: venda.data_venda,
          vendaMes,
          mesAtualISO,
          inicio: inicio.toISOString(),
          fim: fim.toISOString()
        });
      }
      
      return false;
    });

    debugLog('📊 Vendas filtradas:', {
      periodo: `${dataInicio} a ${dataFim}`,
      mesAtualISO,
      totalVendas: vendas.length,
      vendasFiltradas: filtradas.length,
      amostra: filtradas.slice(0, 3).map(v => ({
        data: v.data_venda,
        total: v.total
      }))
    });

    setVendasFiltradas(filtradas);
  };

  // Carregar dados
  const loadData = async () => {
    if (!empresaData?.id) {
      debugLog('❌ empresaData.id não está disponível:', empresaData);
      return;
    }
    
    setLoading(true);
    
    try {
      const { dataInicio, dataFim } = calcularPeriodo();
      
      debugLog('📊 Carregando dados de lucro e desempenho...', {
        empresaId: empresaData.id,
        mes: formatarMesAno(currentMonth),
        periodo: `${dataInicio} a ${dataFim}`
      });

        // Buscar TODAS as ordens de serviço da empresa (sem filtro de data)
        const { data: ordensData, error: ordensError } = await supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            cliente_id,
            tecnico_id,
            tecnico,
            valor_faturado,
            valor_total,
            valor_peca,
            valor_servico,
            qtd_peca,
            qtd_servico,
            status,
            created_at
          `)
          .eq('empresa_id', empresaData.id)
          .order('created_at', { ascending: false })
          .limit(200);

      debugLog('📊 Resultado query completa:', {
        empresaId: empresaData.id,
        periodo: `${dataInicio} a ${dataFim}`,
        ordensCount: ordensData?.length || 0,
        hasError: !!ordensError,
        error: ordensError,
        sampleData: ordensData?.[0]
      });

      if (ordensError) {
        console.error('❌ Erro na query:', ordensError);
        addToast('error', `Erro ao carregar ordens de serviço: ${ordensError.message}`);
        return;
      }

      if (!ordensData || ordensData.length === 0) {
        debugLog('⚠️ Nenhuma ordem encontrada para este período');
        setOrdens([]);
        setLoading(false);
        return;
      }

      // Buscar dados relacionados separadamente
      const ordensIds = ordensData?.map(o => o.id) || [];
      const ordensNumeros = ordensData?.map(o => o.numero_os) || [];
      const clienteIds = [...new Set(ordensData?.map(o => o.cliente_id) || [])];

      debugLog('🔍 Buscando dados relacionados:', {
        ordensIds: ordensIds.slice(0, 3),
        ordensNumeros: ordensNumeros.slice(0, 3),
        clienteIds: clienteIds.slice(0, 3)
      });

      // Buscar clientes
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome')
        .in('id', clienteIds);

        // Buscar TODAS as vendas da empresa (sem filtro de período)
        const { data: todasVendas, error: errorVendas } = await supabase
          .from('vendas')
          .select('id, total, data_venda, status, empresa_id, observacoes')
          .eq('empresa_id', empresaData.id)
          .eq('status', 'finalizada')
          .order('data_venda', { ascending: false });

        debugLog('🔍 EMPRESA ATUAL:', empresaData.id);
        debugLog('🔍 TOTAL VENDAS ENCONTRADAS:', todasVendas?.length || 0);
        debugLog('🔍 ERRO VENDAS:', errorVendas);
        debugLog('🔍 NUMEROS DAS OS:', ordensNumeros.slice(0, 5));
        
        if (todasVendas && todasVendas.length > 0) {
          debugLog('🔍 PRIMEIRAS VENDAS:');
          todasVendas.slice(0, 3).forEach((venda, i) => {
            debugLog(`  ${i+1}. Total: R$ ${venda.total}, Pago: R$ ${venda.total} - "${venda.observacoes}"`);
          });
        }

        // Se não encontrou vendas para esta empresa, buscar em todas as empresas para debug
        if (!todasVendas || todasVendas.length === 0) {
          debugLog('⚠️ NENHUMA VENDA ENCONTRADA PARA ESTA EMPRESA');
          const { data: todasVendasGeral } = await supabase
            .from('vendas')
            .select('id, valor_total, total, data_venda, observacoes, empresa_id')
            .eq('status', 'finalizada')
            .limit(10);
          
          debugLog('🔍 TOTAL VENDAS GERAL (todas empresas):', todasVendasGeral?.length || 0);
          if (todasVendasGeral && todasVendasGeral.length > 0) {
            debugLog('🔍 PRIMEIRAS VENDAS GERAL:');
            todasVendasGeral.slice(0, 3).forEach((venda, i) => {
              debugLog(`  ${i+1}. Empresa: ${venda.empresa_id} - Total: R$ ${venda.valor_total}, Pago: R$ ${venda.total} - "${venda.observacoes}"`);
            });
          }
        }

        // Buscar TODAS as contas de peças da empresa (não apenas as vinculadas a OS)
        const { data: todosCustos } = await supabase
          .from('contas_pagar')
          .select('id, descricao, valor, tipo, data_vencimento, os_id, status, data_pagamento')
          .eq('empresa_id', empresaData.id)
          .eq('tipo', 'pecas');

        debugLog('💰 Dados encontrados:', {
          vendasCount: todasVendas?.length || 0,
          custosCount: todosCustos?.length || 0,
          sampleVenda: todasVendas?.[0],
          sampleCusto: todosCustos?.[0],
          todasVendas: todasVendas
        });

      // Log dos dados das OS para debug
      debugLog('📋 Dados das OS:', {
        primeiraOS: ordensData?.[0],
        todasOS: ordensData?.map(os => ({
          id: os.id,
          numero: os.numero_os,
          valor_faturado: os.valor_faturado,
          valor_total: os.valor_total,
          tecnico: os.tecnico
        }))
      });

      // Criar mapas para lookup rápido
      const clientesMap = new Map(clientes?.map(c => [c.id, c]) || []);

        // Mapear os dados relacionados
        const ordensCompletas = (ordensData || []).map(ordem => {
          const vendas = todasVendas?.filter(venda => {
            const obs = venda.observacoes || '';
            return obs.includes(`O.S. #${ordem.numero_os}`) || 
                   obs.includes(`OS #${ordem.numero_os}`) ||
                   obs.includes(`#${ordem.numero_os}`);
          }) || [];
          
          const custos = todosCustos?.filter(custo => 
            custo.os_id === ordem.id
          ) || [];

          return {
            ...ordem,
            clientes: clientesMap.get(ordem.cliente_id),
            tecnico_nome: ordem.tecnico || 'N/A',
            vendas,
            custos
          };
        });

        // Filtrar vendas por período (igual à página de vendas)
        const vendasDoPeriodo = todasVendas?.filter(venda => {
          const dataVenda = new Date(venda.data_venda);
          const inicio = new Date(dataInicio);
          const fim = new Date(dataFim);
          fim.setHours(23, 59, 59, 999);
          return dataVenda >= inicio && dataVenda <= fim;
        }) || [];

        // Filtrar apenas OS que tiveram vendas no período
        const ordensComVendasNoPeriodo = ordensCompletas.filter(ordem => {
          // Verificar se alguma venda desta OS está no período
          return ordem.vendas.some(venda => 
            vendasDoPeriodo.some(vendaPeriodo => vendaPeriodo.id === venda.id)
          );
        });

        // ====== PREVISÃO (Receita e Custos) para o mês selecionado ======
        const mesAtual = currentMonth.toISOString().slice(0, 7); // YYYY-MM
        // Receita Prevista: OS sem venda no período e não entregues/finalizadas
        const ordensSemVendaNoPeriodo = (ordensCompletas || []).filter(o => {
          const createdMes = (o.created_at || '').toString().slice(0, 7);
          const entregue = (o.status || '').toUpperCase() === 'ENTREGUE' || ((o as any).status_tecnico || '').toUpperCase() === 'FINALIZADA';
          const temVendaNoPeriodo = (o.vendas || []).some(v => vendasDoPeriodo.some(vp => vp.id === v.id));
          return createdMes === mesAtual && !entregue && !temVendaNoPeriodo;
        });

        const calcularValorFinalOS = (o: any) => {
          const valorServico = Number(o.valor_servico || 0);
          const qtdServico = Number(o.qtd_servico || 1);
          const valorPeca = Number(o.valor_peca || 0);
          const qtdPeca = Number(o.qtd_peca || 1);
          const desconto = Number(o.desconto || 0);
          const subtotal = (valorServico * qtdServico) + (valorPeca * qtdPeca);
          return Math.max(0, subtotal - desconto);
        };

        // Apenas O.S do mês com valor previsto > 0
        const ordensPrevistasComValor = ordensSemVendaNoPeriodo.filter(o => calcularValorFinalOS(o) > 0);
        const receitaPrevista = ordensPrevistasComValor.reduce((acc, o) => acc + calcularValorFinalOS(o), 0);

        // Buscar TODAS as contas da empresa para calcular previstos (não apenas peças)
        const { data: todasContasParaPrevistos } = await supabase
          .from('contas_pagar')
          .select('id, descricao, valor, tipo, data_vencimento, os_id, status, data_pagamento')
          .eq('empresa_id', empresaData.id);

        // Custos previstos: contas vinculadas ao mês selecionado e pendentes
        // IMPORTANTE: Usar TODAS as contas (pecas, fixa, variavel) que estão cadastradas mas não foram pagas
        // Usar a mesma lógica de filtro de data da função fetchCustosEmpresa
        const { dataInicio: dataInicioPrevisto, dataFim: dataFimPrevisto, inicioMes: inicioMesPrevisto, fimMes: fimMesPrevisto } = calcularPeriodo();
        const mesAtualISO = currentMonth.toISOString().slice(0, 7); // YYYY-MM
        
        const inicioPeriodoFiltroPrevisto = new Date(inicioMesPrevisto);
        inicioPeriodoFiltroPrevisto.setHours(0, 0, 0, 0);
        const fimPeriodoFiltroPrevisto = new Date(fimMesPrevisto);
        fimPeriodoFiltroPrevisto.setHours(23, 59, 59, 999);
        
        const contasMes = (todasContasParaPrevistos || []).filter(conta => {
          // Verificar pelo mês usando substring (mais confiável para evitar problemas de timezone)
          const vencMes = (conta.data_vencimento || '').toString().slice(0, 7); // YYYY-MM
          const venceNoMesISO = vencMes === mesAtualISO;
          
          // Verificar também com comparação de datas para garantir
          const dataVencimento = new Date(conta.data_vencimento + 'T00:00:00');
          const venceNoMesData = dataVencimento >= inicioPeriodoFiltroPrevisto && dataVencimento <= fimPeriodoFiltroPrevisto;
          
          // Só incluir se AMBOS os critérios indicarem que vence no mês
          return venceNoMesISO && venceNoMesData;
        });
        
        // Filtrar apenas contas que estão cadastradas mas NÃO foram pagas ainda
        const contasPendentes = contasMes.filter(c => 
          c.status === 'pendente' || c.status === 'pending' || c.status === 'Pendente' || c.status === 'vencido'
        );
        
        debugLog('📊 Contas previstas calculadas:', {
          totalContasMes: contasMes.length,
          totalContasPendentes: contasPendentes.length,
          contasPorTipo: {
            pecas: contasPendentes.filter(c => (c.tipo || '').toLowerCase() === 'pecas').length,
            variavel: contasPendentes.filter(c => (c.tipo || '').toLowerCase() === 'variavel').length,
            fixa: contasPendentes.filter(c => (c.tipo || '').toLowerCase() === 'fixa').length
          }
        });
        
        // Separar contas pendentes por tipo
        const contasPendentesPecas = contasPendentes.filter(c => {
          const tipo = (c.tipo || '').toLowerCase();
          return tipo === 'pecas';
        });
        const contasPendentesVariaveis = contasPendentes.filter(c => {
          const tipo = (c.tipo || '').toLowerCase();
          return tipo === 'variavel';
        });
        const contasPendentesFixas = contasPendentes.filter(c => {
          const tipo = (c.tipo || '').toLowerCase();
          return tipo === 'fixa';
        });
        
        const custosPrevistos = contasPendentesPecas.reduce((acc, c: any) => acc + Number(c.valor || 0), 0);
        const contasAPagarPrevistas = contasPendentes.reduce((acc, c: any) => acc + Number(c.valor || 0), 0);
        const despesasOperacionaisPrevistas = contasPendentesVariaveis.reduce((acc, c: any) => acc + Number(c.valor || 0), 0);
        const custosFixosPrevistos = contasPendentesFixas.reduce((acc, c: any) => acc + Number(c.valor || 0), 0);

        const lucroPrevisto = receitaPrevista - custosPrevistos;
        const margemPrevista = receitaPrevista > 0 ? (lucroPrevisto / receitaPrevista) * 100 : 0;
        
        // Calcular Previsão de Saldo na Conta
        // Calcular aqui também para ter um valor inicial, mas será recalculado pelo useEffect quando metricas.saldoNaConta estiver pronto
        const saldoAtualInicial = Number(metricas.saldoNaConta) || 0;
        const saldoNaContaPrevistoInicial = saldoAtualInicial + receitaPrevista - contasAPagarPrevistas;
        
        debugLog('💰 Calculando previsão inicial ao carregar dados:', {
          saldoAtualInicial,
          receitaPrevista,
          contasAPagarPrevistas,
          saldoNaContaPrevistoInicial
        });
        
        setMetricasPrevistas({
          receitaPrevista,
          custosPrevistos,
          contasAPagarPrevistas,
          despesasOperacionaisPrevistas,
          custosFixosPrevistos,
          lucroPrevisto,
          margemPrevista,
          saldoNaContaPrevisto: isNaN(saldoNaContaPrevistoInicial) || !isFinite(saldoNaContaPrevistoInicial) ? 0 : saldoNaContaPrevistoInicial
        });

        // Incluir também as OS sem venda (pendentes) na listagem Por OS
        const ordensCombinadas = [...ordensComVendasNoPeriodo, ...ordensPrevistasComValor];
        // Ordenar por data de criação mais recente
        ordensCombinadas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOrdens(ordensCombinadas);
      
        // Definir vendas no estado (igual à página de vendas!)
        setVendas(todasVendas || []);

        debugLog('✅ Dados carregados:', {
          totalOrdensEncontradas: ordensCompletas.length,
          totalVendasEncontradas: todasVendas?.length || 0,
          vendasDoPeriodo: vendasDoPeriodo.length,
          ordensComVendasNoPeriodo: ordensComVendasNoPeriodo.length,
          mes: formatarMesAno(currentMonth)
        });

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      addToast('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar fluxo de caixa mensal
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
      
      // Processar dados em memória
      for (let mes = 0; mes < 12; mes++) {
        const inicioMes = new Date(parseInt(anoSelecionado), mes, 1);
        const fimMes = new Date(parseInt(anoSelecionado), mes + 1, 0);
        
        // Filtrar vendas do mês
        const vendasMes = vendasData?.filter(venda => {
          const dataVenda = new Date(venda.data_venda);
          return dataVenda >= inicioMes && dataVenda <= fimMes;
        }) || [];
        
        // Filtrar contas do mês (baseado na data de vencimento)
        const contasMes = contasData?.filter(conta => {
          // Usar substring para evitar problemas de timezone
          const dataVencimento = conta.data_vencimento.substring(0, 7); // YYYY-MM
          const mesVencimento = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, '0')}`;
          return dataVencimento === mesVencimento;
        }) || [];
        
        // Calcular totais
        const entradas = vendasMes.reduce((total, venda) => total + (venda.total || 0), 0);
        const saidas = contasMes.reduce((total, conta) => total + (conta.valor || 0), 0);
        const saldoPeriodo = entradas - saidas;
        
        // Calcular saldo final acumulado
        let saldoFinal = saldoPeriodo;
        for (let i = 0; i < mes; i++) {
          if (fluxoCaixa[i]) {
            saldoFinal += fluxoCaixa[i].saldo_periodo;
          }
        }
        
        // Determinar se é realizado ou previsto
        const hoje = new Date();
        const isMesPassado = parseInt(anoSelecionado) < hoje.getFullYear() || 
          (parseInt(anoSelecionado) === hoje.getFullYear() && mes < hoje.getMonth());
        
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

  // Não precisa gerar contas virtuais - todas as parcelas já são criadas como contas reais no banco
  // Quando uma conta fixa é criada, todas as parcelas são salvas no banco de dados

  // Função para buscar investimentos do mês
  const fetchInvestimentosMes = async () => {
    if (!empresaData?.id) return;

    try {
      const { dataInicio, dataFim } = calcularPeriodo();
      
      // Buscar investimentos do mês selecionado
      const { data: investimentos, error } = await supabase
        .from('movimentacoes_caixa')
        .select('valor, data_movimentacao')
        .eq('empresa_id', empresaData.id)
        .eq('tipo', 'investimento')
        .gte('data_movimentacao', `${dataInicio}T00:00:00`)
        .lte('data_movimentacao', `${dataFim}T23:59:59`);

      if (error) {
        console.error('Erro ao buscar investimentos:', error);
        return;
      }

      const totalInvestimentos = investimentos?.reduce((acc, inv) => acc + (inv.valor || 0), 0) || 0;
      setInvestimentosMes(totalInvestimentos);

      debugLog('💰 Investimentos do mês:', {
        mes: formatarMesAno(currentMonth),
        totalInvestimentos,
        quantidade: investimentos?.length || 0
      });

    } catch (error) {
      console.error('Erro ao buscar investimentos:', error);
    }
  };

  // Função para buscar custos da empresa para DRE
  const fetchCustosEmpresa = async () => {
    if (!empresaData?.id) return;

    try {
      // Buscar TODAS as contas da empresa (como a página Contas a Pagar faz)
      debugLog('🔍 Buscando TODAS as contas da empresa...');
      const { data: todasContas, error: contasError } = await supabase
        .from('contas_pagar')
        .select('*') // Buscar todos os campos para incluir conta_fixa, parcelas_totais, etc.
        .eq('empresa_id', empresaData.id)
        .order('data_vencimento', { ascending: false });

      if (contasError) {
        console.error('❌ Erro ao buscar contas a pagar:', contasError);
        return;
      }

      debugLog('📊 Contas originais encontradas:', todasContas?.length || 0);
      
      // Não gerar contas virtuais - todas as parcelas já são criadas como contas reais no banco
      // Usar apenas as contas reais do banco
      const mesAtual = currentMonth.toISOString().slice(0, 7); // YYYY-MM
      debugLog('📅 Filtrando contas do mês:', mesAtual);
      
      // Filtrar contas pelo mês selecionado (apenas contas reais do banco)
      // Para DRE: considerar contas com vencimento no mês OU contas pagas no mês
      const { dataInicio, dataFim, inicioMes, fimMes } = calcularPeriodo();
      
      // Garantir que estamos usando o mês correto
      const mesAtualFormatado = formatarMesAno(currentMonth);
      const mesAtualISO = currentMonth.toISOString().slice(0, 7); // YYYY-MM
      
      debugLog('💰 Buscando custos da empresa para DRE...', {
        empresaId: empresaData.id,
        periodo: `${dataInicio} a ${dataFim}`,
        mesSelecionado: mesAtualFormatado,
        mesAtualISO: mesAtualISO,
        currentMonth: currentMonth.toISOString(),
        inicioMes: inicioMes.toISOString(),
        fimMes: fimMes.toISOString()
      });
      
      const inicioPeriodoFiltro = new Date(inicioMes);
      inicioPeriodoFiltro.setHours(0, 0, 0, 0);
      const fimPeriodoFiltro = new Date(fimMes);
      fimPeriodoFiltro.setHours(23, 59, 59, 999);
      
      debugLog('📅 Período de filtro:', {
        inicioPeriodoFiltro: inicioPeriodoFiltro.toISOString(),
        fimPeriodoFiltro: fimPeriodoFiltro.toISOString(),
        mesEsperado: mesAtualISO
      });
      
      // Filtrar contas do mês: apenas contas que VENCEM no mês selecionado
      // IMPORTANTE: Para DRE, consideramos contas que VENCEM no mês, independente de quando foram pagas
      const contasDoMes = (todasContas || []).filter(conta => {
        // Verificar pelo mês usando substring (mais confiável para evitar problemas de timezone)
        const vencMes = conta.data_vencimento.substring(0, 7); // YYYY-MM
        const venceNoMesISO = vencMes === mesAtualISO;
        
        // Verificar também com comparação de datas para garantir
        const dataVencimento = new Date(conta.data_vencimento + 'T00:00:00');
        const venceNoMesData = dataVencimento >= inicioPeriodoFiltro && dataVencimento <= fimPeriodoFiltro;
        
        // Só incluir se AMBOS os critérios indicarem que vence no mês
        return venceNoMesISO && venceNoMesData;
      });
      
      debugLog('📊 Contas do mês selecionado:', contasDoMes.length);
      
      // Log detalhado das contas do mês
      if (contasDoMes && contasDoMes.length > 0) {
        debugLog('📋 DETALHAMENTO DAS CONTAS DO MÊS:');
        contasDoMes.forEach((conta, i) => {
          debugLog(`  ${i+1}. R$ ${conta.valor} - ${conta.status} - ${conta.tipo} - "${conta.descricao}" - ${conta.data_vencimento}`);
        });
        
        const totalGeral = contasDoMes.reduce((acc, conta) => acc + (conta.valor || 0), 0);
        // Usar mesma lógica de filtro das contas pagas (verificar data_pagamento)
        const contasPagasLog = contasDoMes.filter(c => {
          const statusPago = c.status === 'pago';
          if (!statusPago) return false;
          if (c.data_pagamento) {
            const dataPagamento = new Date(c.data_pagamento);
            return dataPagamento >= inicioPeriodoFiltro && dataPagamento <= fimPeriodoFiltro;
          }
          // Conta paga sem data de pagamento - considerar como paga se vence no mês
          const dataVencimento = new Date(c.data_vencimento);
          return dataVencimento >= inicioPeriodoFiltro && dataVencimento <= fimPeriodoFiltro;
        });
        const contasPendentesLog = contasDoMes.filter(c => 
          c.status === 'pendente' || c.status === 'vencido'
        );
        const totalPagas = contasPagasLog.reduce((acc, conta) => acc + (conta.valor || 0), 0);
        const totalPendentes = contasPendentesLog.reduce((acc, conta) => acc + (conta.valor || 0), 0);
        
        debugLog('💰 RESUMO DO MÊS:');
        debugLog(`  Total Geral: R$ ${totalGeral.toFixed(2)}`);
        debugLog(`  Contas Pagas: R$ ${totalPagas.toFixed(2)} (${contasPagasLog.length} contas)`);
        debugLog(`  Contas Pendentes: R$ ${totalPendentes.toFixed(2)} (${contasPendentesLog.length} contas)`);
      }

      // Calcular custos por categoria usando as contas do mês
      debugLog('📊 Status únicos encontrados:', [...new Set(contasDoMes?.map(c => c.status) || [])]);
      
      // Filtrar contas pagas: verificar se foram pagas no mês selecionado (data_pagamento)
      // IMPORTANTE: Usar as mesmas datas do filtro de contasDoMes
      const inicioPeriodo = new Date(inicioPeriodoFiltro);
      const fimPeriodo = new Date(fimPeriodoFiltro);
      
      debugLog('📊 Filtrando contas pagas no período:', {
        inicioPeriodo: inicioPeriodo.toISOString(),
        fimPeriodo: fimPeriodo.toISOString(),
        totalContasDoMes: contasDoMes?.length || 0
      });
      
      // Filtrar contas PAGAS no mês: apenas contas que foram EFETIVAMENTE PAGAS no mês selecionado
      // IMPORTANTE: Para DRE, despesas operacionais = contas fixas/variáveis PAGAS no mês
      // Isso significa que só conta se foi efetivamente paga (saiu dinheiro do caixa) no mês
      const contasPagas = contasDoMes?.filter(conta => {
        // Verificar status
        if (conta.status !== 'pago') return false;
        
        // Se tem data_pagamento, verificar se foi paga no mês selecionado
        if (conta.data_pagamento) {
          // Critério 1: Comparação por substring (mais confiável)
          const pagMes = conta.data_pagamento.substring(0, 7); // YYYY-MM
          const foiPagaNoMesISO = pagMes === mesAtualISO;
          
          // Critério 2: Comparação por data
          const dataPagamento = new Date(conta.data_pagamento + 'T00:00:00');
          const foiPagaNoMesData = dataPagamento >= inicioPeriodo && dataPagamento <= fimPeriodo;
          
          // Só considerar como paga se AMBOS os critérios indicarem que foi paga no mês
          return foiPagaNoMesISO && foiPagaNoMesData;
        }
        
        // Se não tem data_pagamento mas status é pago, não considerar como paga no mês
        // (porque não sabemos quando foi paga)
        return false;
      }) || [];
      
      const contasPendentes = contasDoMes?.filter(conta => 
        conta.status === 'pendente' || conta.status === 'vencido'
      ) || [];
      
      debugLog('📊 Contas pagas encontradas:', contasPagas.length);
      debugLog('📊 Contas pendentes encontradas:', contasPendentes.length);
      
      // Separar custos por tipo usando as contas do mês
      // Custos de peças: todas as contas de peças do mês (vencimento no mês)
      const custosPecas = contasDoMes?.filter(conta => conta.tipo === 'pecas') || [];
      
      // Custos Totais: peças e serviços PAGAS no mês
      const custosTotaisPagas = contasPagas.filter(conta => {
        const tipo = (conta.tipo || '').toLowerCase();
        return tipo === 'pecas';
      }) || [];
      
      // Despesas Operacionais: variáveis PAGAS no mês
      const despesasOperacionais = contasPagas.filter(conta => {
        const tipo = (conta.tipo || '').toLowerCase();
        return tipo === 'variavel';
      }) || [];
      
      // Custos Fixos: contas fixas PAGAS no mês
      const custosFixosPagas = contasPagas.filter(conta => {
        const tipo = (conta.tipo || '').toLowerCase();
        return tipo === 'fixa';
      }) || [];
      
      // Custos gerais: todas as contas fixas e variáveis do mês (independente de status - pagas + pendentes)
      // Este é o total de contas fixas e variáveis que vencem no mês
      const custosGerais = contasDoMes?.filter(conta => {
        const tipo = (conta.tipo || '').toLowerCase();
        return tipo === 'fixa' || tipo === 'variavel';
      }) || [];
      
      debugLog('📊 Filtro de Despesas Operacionais:', {
        totalContasPagas: contasPagas.length,
        contasPagasDetalhes: contasPagas.map(c => ({
          descricao: c.descricao,
          tipo: c.tipo,
          valor: c.valor,
          status: c.status,
          data_pagamento: c.data_pagamento
        })),
        despesasOperacionaisFiltradas: despesasOperacionais.map(c => ({
          descricao: c.descricao,
          tipo: c.tipo,
          valor: c.valor
        }))
      });

      debugLog('💰 Cálculo de Despesas Operacionais:', {
        totalContasDoMes: contasDoMes?.length || 0,
        totalContasPagas: contasPagas.length,
        despesasOperacionaisCount: despesasOperacionais.length,
        despesasOperacionaisDetalhes: despesasOperacionais.map(c => ({
          descricao: c.descricao,
          tipo: c.tipo,
          valor: c.valor,
          status: c.status,
          data_pagamento: c.data_pagamento,
          data_vencimento: c.data_vencimento
        })),
        tiposEncontrados: [...new Set(contasPagas.map(c => c.tipo))]
      });

      const totalContasPagas = contasPagas.reduce((acc, conta) => acc + (conta.valor || 0), 0);
      const totalContasPendentes = contasPendentes.reduce((acc, conta) => acc + (conta.valor || 0), 0);
      
      // Calcular totais separados para os cards
      const totalCustosTotais = custosTotaisPagas.reduce((acc, conta) => acc + (conta.valor || 0), 0);
      const totalDespesasOperacionais = despesasOperacionais.reduce((acc, conta) => acc + (conta.valor || 0), 0);
      const totalCustosFixos = custosFixosPagas.reduce((acc, conta) => acc + (conta.valor || 0), 0);
      
      // Custos de peças: todas as contas de peças do mês (independente de status) - mantido para compatibilidade
      const totalCustosPecas = custosPecas.reduce((acc, conta) => acc + (conta.valor || 0), 0);
      // Custos gerais: todas as contas fixas e variáveis do mês (independente de status)
      const totalCustosGerais = custosGerais.reduce((acc, conta) => acc + (conta.valor || 0), 0);
      
      debugLog('💰 Totais calculados:', {
        totalContasPagas,
        totalContasPendentes,
        totalCustosTotais,
        totalDespesasOperacionais,
        totalCustosFixos,
        totalCustosPecas
      });

      // Calcular categorias detalhadas usando as contas do mês
      const categoriasMap = new Map<string, CategoriaDetalhada>();
      
      // Log para debug - verificar contas fixas
      const contasFixasDoMes = contasDoMes?.filter(c => c.conta_fixa || c.tipo === 'fixa') || [];
      debugLog('📊 Contas fixas do mês:', {
        total: contasFixasDoMes.length,
        detalhes: contasFixasDoMes.map(c => ({
          id: c.id,
          descricao: c.descricao,
          valor: c.valor,
          data_vencimento: c.data_vencimento,
          status: c.status,
          conta_fixa: c.conta_fixa,
          parcela_atual: c.parcela_atual,
          parcelas_totais: c.parcelas_totais,
          isVirtual: c.id?.includes('_virtual_')
        }))
      });
      
      contasDoMes?.forEach(conta => {
        // Usar tipo da conta para categorizar
        const categoria = conta.tipo || 'Outros';
        
        // Verificar se é uma conta virtual duplicada
        const isVirtual = conta.id?.includes('_virtual_');
        const contaOriginalId = isVirtual ? conta.id.split('_virtual_')[0] : conta.id;
        
        if (!categoriasMap.has(categoria)) {
          categoriasMap.set(categoria, {
            categoria,
            total: 0,
            contasPagas: 0,
            contasPendentes: 0,
            quantidade: 0,
            contas: []
          });
        }
        
        const categoriaData = categoriasMap.get(categoria)!;
        categoriaData.total += conta.valor || 0;
        categoriaData.quantidade += 1;
        
        // Adicionar à lista de contas (evitar duplicatas)
        const contaJaExiste = categoriaData.contas.some(c => c.descricao === conta.descricao && 
          c.data_vencimento === conta.data_vencimento && 
          c.valor === conta.valor);
        
        if (!contaJaExiste) {
        categoriaData.contas.push({
          descricao: conta.descricao || '',
          valor: conta.valor || 0,
          status: conta.status || '',
          data_vencimento: conta.data_vencimento || ''
        });
        }
        
        // Classificar contas pagas vs pendentes
        const isPaga = conta.status === 'pago';
        if (isPaga && conta.data_pagamento) {
          const dataPagamento = new Date(conta.data_pagamento);
          // Só conta como paga se foi paga no período do mês selecionado
          if (dataPagamento >= inicioPeriodo && dataPagamento <= fimPeriodo) {
          categoriaData.contasPagas += conta.valor || 0;
          } else {
            // Conta paga mas em outro mês - não contar como paga neste mês
            categoriaData.contasPendentes += conta.valor || 0;
          }
        } else if (isPaga && !conta.data_pagamento) {
          // Conta paga mas sem data de pagamento - considerar como paga no mês se vence no mês
          const dataVencimento = new Date(conta.data_vencimento);
          if (dataVencimento >= inicioPeriodo && dataVencimento <= fimPeriodo) {
            categoriaData.contasPagas += conta.valor || 0;
          } else {
            categoriaData.contasPendentes += conta.valor || 0;
          }
        } else {
          categoriaData.contasPendentes += conta.valor || 0;
        }
      });
      
      // Log final das categorias
      debugLog('📊 Categorias calculadas:', Array.from(categoriasMap.entries()).map(([cat, data]) => ({
        categoria: cat,
        total: data.total,
        quantidade: data.quantidade,
        contasPagas: data.contasPagas,
        contasPendentes: data.contasPendentes
      })));
      
      const categoriasDetalhadas = Array.from(categoriasMap.values())
        .sort((a, b) => b.total - a.total);

      setCustosEmpresa({
        contasPagas: totalContasPagas,
        contasPendentes: totalContasPendentes,
        totalContas: totalContasPagas + totalContasPendentes,
        despesasOperacionais: totalDespesasOperacionais,
        custosFixos: totalCustosFixos,
        custosTotais: totalCustosTotais,
        custosPecas: totalCustosPecas,
        custosGerais: totalCustosGerais,
        categoriasDetalhadas
      });

      debugLog('✅ Custos da empresa calculados:', {
        contasPagas: totalContasPagas,
        contasPendentes: totalContasPendentes,
        totalContas: totalContasPagas + totalContasPendentes,
        custosTotais: totalCustosTotais,
        despesasOperacionais: totalDespesasOperacionais,
        custosFixos: totalCustosFixos,
        custosPecas: custosPecas.length,
        custosPecasTotal: totalCustosPecas,
        despesasOperacionaisCount: despesasOperacionais.length
      });

    } catch (error) {
      console.error('❌ Erro ao buscar custos da empresa:', error);
    }
  };

  // Calcular métricas
  const calcularMetricas = () => {
    // Receita total = soma de todas as vendas filtradas (igual à página de vendas!)
    const totalReceita = vendasFiltradas.reduce((acc, venda) => acc + venda.total, 0);

    // Calcular custos igual à página de contas a pagar
    const mesAtual = currentMonth.toISOString().slice(0, 7); // YYYY-MM
    
    // Usar custosEmpresa que já foi calculado
    const totalCustos = Number(custosEmpresa.custosTotais) || 0; // Peças e serviços pagas
    const despesasOperacionais = Number(custosEmpresa.despesasOperacionais) || 0; // Variáveis pagas
    const custosFixos = Number(custosEmpresa.custosFixos) || 0; // Fixas pagas
    const investimentos = Number(investimentosMes) || 0;
    
    // Saldo na Conta = Receita + Investimentos - (Custos Totais + Despesas Operacionais + Custos Fixos)
    const saldoNaConta = totalReceita + investimentos - (totalCustos + despesasOperacionais + custosFixos);
    
    // Lucro Total = Receita - Custos Totais (mantido para compatibilidade)
    const lucroTotal = totalReceita - totalCustos;
    const margemMedia = totalReceita > 0 ? (lucroTotal / totalReceita) * 100 : 0;

    const ordensComLucro = ordens.map(ordem => {
      const receita = ordem.vendas?.reduce((acc, venda) => acc + venda.total, 0) || 0;
      
      // Filtrar custos pelo período selecionado (igual à página de contas a pagar)
      const custosDoPeriodo = ordem.custos?.filter(custo => {
        if (!custo.data_vencimento) return false;
        
        // Usar mesma lógica da página de contas a pagar
        const custoMes = new Date(custo.data_vencimento).toISOString().slice(0, 7); // YYYY-MM
        return custoMes === mesAtual;
      }) || [];
      
      const custos = custosDoPeriodo.reduce((acc, custo) => acc + custo.valor, 0);
      return { ...ordem, receita, custos, lucro: receita - custos };
    });

    const osLucrativas = ordensComLucro.filter(o => o.lucro > 0).length;
    const osPrejuizo = ordensComLucro.filter(o => o.lucro < 0).length;

    setMetricas({
      totalReceita,
      totalCustos,
      despesasOperacionais,
      custosFixos,
      saldoNaConta,
      lucroTotal,
      margemMedia,
      totalOS: ordens.length,
      osLucrativas,
      osPrejuizo
    });
    
    // Recalcular previsão de saldo imediatamente após atualizar metricas
    // Usar setTimeout para garantir que o estado foi atualizado
    setTimeout(() => {
      setMetricasPrevistas(prev => {
        const saldoAtual = saldoNaConta;
        const receitaPrevista = Number(prev.receitaPrevista) || 0;
        const contasAPagarPrevistas = Number(prev.contasAPagarPrevistas) || 0;
        const saldoNaContaPrevisto = saldoAtual + receitaPrevista - contasAPagarPrevistas;
        
        debugLog('💰 Recalculando previsão após calcularMetricas:', {
          saldoAtual,
          receitaPrevista,
          contasAPagarPrevistas,
          saldoNaContaPrevisto
        });
        
        if (isNaN(saldoNaContaPrevisto) || !isFinite(saldoNaContaPrevisto)) {
          return prev;
        }
        
        if (Math.abs(prev.saldoNaContaPrevisto - saldoNaContaPrevisto) < 0.01) {
          return prev;
        }
        
        return {
          ...prev,
          saldoNaContaPrevisto
        };
      });
    }, 0);
  };

  // Calcular dados diários do mês
  const calcularDadosDiarios = () => {
    // Criar mapa de dados por data do pagamento (não da OS)
    const dadosPorData = new Map();
    
    const mesAtual = currentMonth.toISOString().slice(0, 7); // YYYY-MM
    
    ordens.forEach(ordem => {
      // Filtrar custos pelo período selecionado (igual à página de contas a pagar)
      const custosDoPeriodo = ordem.custos?.filter(custo => {
        if (!custo.data_vencimento) return false;
        
        // Usar mesma lógica da página de contas a pagar
        const custoMes = new Date(custo.data_vencimento).toISOString().slice(0, 7); // YYYY-MM
        return custoMes === mesAtual;
      }) || [];
      
      const custosContas = custosDoPeriodo.reduce((acc, custo) => acc + custo.valor, 0);
      
      // Se há custos no período, adicionar na data de vencimento
      if (custosContas > 0) {
        // Usar a data de vencimento para agrupar no gráfico
        const primeiraConta = custosDoPeriodo[0];
        const dia = parseInt(primeiraConta.data_vencimento.split('-')[2]); // Extrair dia diretamente da string
        
        if (!dadosPorData.has(dia)) {
          dadosPorData.set(dia, {
            dia,
            receita: 0,
            custos: 0,
            lucro: 0
          });
        }
        
        const dadosDia = dadosPorData.get(dia);
        dadosDia.custos += custosContas;
      }
      
      // Calcular receita baseada na data do pagamento
      if (ordem.vendas && ordem.vendas.length > 0) {
        ordem.vendas.forEach(venda => {
          const dataPagamento = venda.data_venda.split('T')[0];
          const diaPagamento = parseInt(dataPagamento.split('-')[2]); // Extrair dia diretamente da string
          
          if (!dadosPorData.has(diaPagamento)) {
            dadosPorData.set(diaPagamento, {
              dia: diaPagamento,
              receita: 0,
              custos: 0,
              lucro: 0
            });
          }
          
          const dadosDia = dadosPorData.get(diaPagamento);
          dadosDia.receita += venda.total;
        });
      }
      // Removido: não considerar receita de OS sem pagamento efetivo
    });
    
    // Calcular lucro para cada dia
    dadosPorData.forEach(dadosDia => {
      dadosDia.lucro = dadosDia.receita - dadosDia.custos;
    });
    
    // Converter para array e ordenar por dia
    const dadosDiariosArray = Array.from(dadosPorData.values())
      .filter(d => d.receita > 0 || d.custos > 0)
      .sort((a, b) => a.dia - b.dia);
    
    debugLog('📊 Dados diários corrigidos:', {
      mes: formatarMesAno(currentMonth),
      totalOS: ordens.length,
      diasComDados: dadosDiariosArray.length,
      amostra: dadosDiariosArray.slice(0, 5)
    });
    
    setDadosDiarios(dadosDiariosArray);
  };

  // Calcular análise de técnicos
  const calcularAnaliseTecnicos = () => {
    const tecnicosMap = new Map<string, AnaliseTecnico>();
    const mesAtual = currentMonth.toISOString().slice(0, 7); // YYYY-MM

    ordens.forEach(ordem => {
      if (!ordem.tecnico_nome || ordem.tecnico_nome === 'N/A') return;

      const receita = ordem.vendas?.reduce((acc, venda) => acc + venda.total, 0) || 0;
      
      // Filtrar custos pelo período selecionado (igual à página de contas a pagar)
      const custosDoPeriodo = ordem.custos?.filter(custo => {
        if (!custo.data_vencimento) return false;
        
        // Usar mesma lógica da página de contas a pagar
        const custoMes = new Date(custo.data_vencimento).toISOString().slice(0, 7); // YYYY-MM
        return custoMes === mesAtual;
      }) || [];
      
      const custos = custosDoPeriodo.reduce((acc, custo) => acc + custo.valor, 0);
      let lucro = receita - custos;

      // Incluir previsão para OS sem venda: usar valor final da OS como receita prevista
      if (receita === 0) {
        const valorServico = Number((ordem as any).valor_servico || 0);
        const qtdServico = Number((ordem as any).qtd_servico || 1);
        const valorPeca = Number((ordem as any).valor_peca || 0);
        const qtdPeca = Number((ordem as any).qtd_peca || 1);
        const desconto = Number((ordem as any).desconto || 0);
        const subtotal = (valorServico * qtdServico) + (valorPeca * qtdPeca);
        const receitaPrevista = Math.max(0, subtotal - desconto);
        lucro = receitaPrevista - custos;
      }

      if (tecnicosMap.has(ordem.tecnico_nome)) {
        const tecnico = tecnicosMap.get(ordem.tecnico_nome)!;
        tecnico.totalOS += 1;
        tecnico.receitaTotal += receita;
        tecnico.custosTotal += custos;
        tecnico.lucroTotal += lucro;
        tecnico.margemMedia = tecnico.receitaTotal > 0 ? (tecnico.lucroTotal / tecnico.receitaTotal) * 100 : 0;
      } else {
        tecnicosMap.set(ordem.tecnico_nome, {
          tecnico_id: ordem.tecnico_nome,
          nome: ordem.tecnico_nome,
          totalOS: 1,
          receitaTotal: receita,
          custosTotal: custos,
          lucroTotal: lucro,
          margemMedia: receita > 0 ? (lucro / receita) * 100 : 0
        });
      }
    });

    const tecnicosArray = Array.from(tecnicosMap.values())
      .sort((a, b) => b.lucroTotal - a.lucroTotal);
    
    setAnaliseTecnicos(tecnicosArray);
  };

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
            value={<span className="text-red-600">{formatarMoeda(custosEmpresa.custosPecas)}</span>}
            icon={<FiTarget className="w-5 h-5" />}
            colorClass="text-black"
            bgClass="bg-white"
            description="Peças e serviços"
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
                <p className="text-sm text-gray-600">Peças, mão de obra e materiais</p>
              </div>
              <p className="font-semibold text-red-600">{formatarMoeda(custosEmpresa.custosPecas)}</p>
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
            <p className="font-bold text-yellow-700">{formatarMoeda(custosEmpresa.custosPecas + metricasPrevistas.custosPrevistos)}</p>
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

  // Efeitos
  useEffect(() => {
    debugLog('🔄 useEffect empresaData mudou:', {
      empresaId: empresaData?.id,
      currentMonth: formatarMesAno(currentMonth),
      willCallLoadData: !!empresaData?.id
    });
    
    if (empresaData?.id) {
      debugLog('✅ Chamando loadData...');
      loadData();
      fetchFluxoCaixaMensal();
      fetchCustosEmpresa();
      fetchInvestimentosMes();
    } else {
      debugLog('❌ empresaData.id não disponível, não chamando loadData');
    }
  }, [empresaData?.id, currentMonth, anoSelecionado]);

  // Recalcular quando o mês mudar ou quando investimentos forem registrados
  useEffect(() => {
    if (empresaData?.id) {
      fetchInvestimentosMes();
    }
  }, [empresaData?.id, currentMonth]);

  useEffect(() => {
    if (vendas.length > 0) {
      filtrarVendas();
    }
  }, [vendas, currentMonth]);

  useEffect(() => {
    if (ordens.length > 0 && vendasFiltradas.length >= 0) { // vendasFiltradas pode ser 0
      calcularMetricas();
      calcularAnaliseTecnicos();
      calcularDadosDiarios();
    }
  }, [ordens, vendasFiltradas]);

  // Recalcular métricas quando custosEmpresa ou investimentosMes mudar (pois o saldo depende dos custos e investimentos)
  useEffect(() => {
    if (vendasFiltradas.length >= 0 && custosEmpresa.custosTotais !== undefined) {
      calcularMetricas();
    }
  }, [custosEmpresa.custosTotais, custosEmpresa.despesasOperacionais, custosEmpresa.custosFixos, investimentosMes]);

  // Recalcular previsão de saldo quando as métricas atuais ou previstas mudarem
  useEffect(() => {
    // Só recalcular se não estiver carregando
    if (loading) {
      return;
    }
    
    // Verificar se os dados foram realmente carregados
    const dadosCarregados = ordens.length >= 0 && // ordens pode ser array vazio, mas foi processado
                            custosEmpresa.custosTotais !== undefined && // custos foram calculados
                            (metricasPrevistas.receitaPrevista !== undefined || metricasPrevistas.contasAPagarPrevistas !== undefined); // previstos foram calculados
    
    if (!dadosCarregados) {
      debugLog('⏳ Aguardando carregamento completo dos dados', {
        ordensLength: ordens.length,
        custosTotais: custosEmpresa.custosTotais,
        receitaPrevista: metricasPrevistas.receitaPrevista,
        contasAPagarPrevistas: metricasPrevistas.contasAPagarPrevistas
      });
      return;
    }
    
    // Calcular diretamente aqui para sempre usar os valores mais recentes
    // Previsão de Saldo na Conta = Saldo Atual (Real) + Valores Previstos a Receber - Contas a Pagar Previstas
    const saldoAtual = Number(metricas.saldoNaConta) || 0;
    const receitaPrevista = Number(metricasPrevistas.receitaPrevista) || 0;
    const contasAPagarPrevistas = Number(metricasPrevistas.contasAPagarPrevistas) || 0;
    
    const saldoNaContaPrevisto = saldoAtual + receitaPrevista - contasAPagarPrevistas;
    
    debugLog('💰 Recalculando Previsão de Saldo na Conta (useEffect):', {
      saldoAtual,
      receitaPrevista,
      contasAPagarPrevistas,
      saldoNaContaPrevisto,
      atualSaldoPrevisto: metricasPrevistas.saldoNaContaPrevisto,
      timestamp: new Date().toISOString()
    });
    
    // Só atualizar se o valor for válido (não NaN ou Infinity)
    if (isNaN(saldoNaContaPrevisto) || !isFinite(saldoNaContaPrevisto)) {
      console.warn('⚠️ Previsão de saldo inválida, mantendo valor anterior');
      return;
    }
    
    // Só atualizar se o valor mudou significativamente (mais de 0.01 para evitar flutuações de ponto flutuante)
    if (Math.abs(metricasPrevistas.saldoNaContaPrevisto - saldoNaContaPrevisto) < 0.01) {
      return;
      }
    
    setMetricasPrevistas(prev => ({
        ...prev,
        saldoNaContaPrevisto
    }));
  }, [metricas.saldoNaConta, ordens.length, custosEmpresa.custosTotais, metricasPrevistas.receitaPrevista, metricasPrevistas.contasAPagarPrevistas, loading]);

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
      
      // Recarregar investimentos para atualizar o saldo
      await fetchInvestimentosMes();
      // Recalcular métricas para atualizar o saldo na conta
      calcularMetricas();
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
          description="Peças e serviços pagas"
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
    const ordensComLucro = ordens.map(ordem => {
      const receitaReal = ordem.vendas?.reduce((acc, venda) => acc + venda.total, 0) || 0;
      const custos = ordem.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
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
    <AuthGuard requiredPermission="lucro-desempenho">
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
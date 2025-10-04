'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import DashboardCard from '@/components/ui/DashboardCard';
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
  FiAlertCircle
} from 'react-icons/fi';

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

interface Venda {
  id: string;
  valor_total: number;
  valor_pago: number;
  data_venda: string;
  observacoes?: string;
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

  // Debug: Log inicial
  console.log('🔍 LucroDesempenhoPage inicializado:', {
    user: user?.id,
    empresaData: empresaData?.id,
    authLoading,
    loading
  });
  const [metricas, setMetricas] = useState<Metricas>({
    totalReceita: 0,
    totalCustos: 0,
    lucroTotal: 0,
    margemMedia: 0,
    totalOS: 0,
    osLucrativas: 0,
    osPrejuizo: 0
  });
  const [analiseTecnicos, setAnaliseTecnicos] = useState<AnaliseTecnico[]>([]);
  
  // Estados de navegação por mês
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [visualizacaoAtiva, setVisualizacaoAtiva] = useState<'dashboard' | 'os' | 'tecnicos'>('dashboard');
  
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
    const fimMes = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const dataInicio = inicioMes.toISOString().split('T')[0];
    const dataFim = fimMes.toISOString().split('T')[0];
    
    return { dataInicio, dataFim };
  };

  // Carregar dados
  const loadData = async () => {
    if (!empresaData?.id) {
      console.log('❌ empresaData.id não está disponível:', empresaData);
      return;
    }
    
    setLoading(true);
    
    try {
      const { dataInicio, dataFim } = calcularPeriodo();
      
      console.log('📊 Carregando dados de lucro e desempenho...', {
        empresaId: empresaData.id,
        mes: formatarMesAno(currentMonth),
        periodo: `${dataInicio} a ${dataFim}`
      });

      // Buscar ordens de serviço - campos que realmente existem na tabela
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
        .gte('created_at', `${dataInicio}T00:00:00`)
        .lte('created_at', `${dataFim}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(200);

      console.log('📊 Resultado query completa:', {
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
        console.log('⚠️ Nenhuma ordem encontrada para este período');
        setOrdens([]);
        setLoading(false);
        return;
      }

      // Buscar dados relacionados separadamente
      const ordensIds = ordensData?.map(o => o.id) || [];
      const ordensNumeros = ordensData?.map(o => o.numero_os) || [];
      const clienteIds = [...new Set(ordensData?.map(o => o.cliente_id) || [])];

      console.log('🔍 Buscando dados relacionados:', {
        ordensIds: ordensIds.slice(0, 3),
        ordensNumeros: ordensNumeros.slice(0, 3),
        clienteIds: clienteIds.slice(0, 3)
      });

      // Buscar clientes
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome')
        .in('id', clienteIds);

        // Buscar vendas específicas das OS - campos corretos do schema
        const { data: todasVendas, error: errorVendas } = await supabase
          .from('vendas')
          .select('id, valor_total, valor_pago, data_venda, observacoes')
          .eq('empresa_id', empresaData.id)
          .eq('status', 'finalizada');

        console.log('🔍 EMPRESA ATUAL:', empresaData.id);
        console.log('🔍 TOTAL VENDAS ENCONTRADAS:', todasVendas?.length || 0);
        console.log('🔍 ERRO VENDAS:', errorVendas);
        console.log('🔍 NUMEROS DAS OS:', ordensNumeros.slice(0, 5));
        
        if (todasVendas && todasVendas.length > 0) {
          console.log('🔍 PRIMEIRAS VENDAS:');
          todasVendas.slice(0, 3).forEach((venda, i) => {
            console.log(`  ${i+1}. Total: R$ ${venda.valor_total}, Pago: R$ ${venda.valor_pago} - "${venda.observacoes}"`);
          });
        }

        // Se não encontrou vendas para esta empresa, buscar em todas as empresas para debug
        if (!todasVendas || todasVendas.length === 0) {
          console.log('⚠️ NENHUMA VENDA ENCONTRADA PARA ESTA EMPRESA');
          const { data: todasVendasGeral } = await supabase
            .from('vendas')
            .select('id, valor_total, valor_pago, data_venda, observacoes, empresa_id')
            .eq('status', 'finalizada')
            .limit(10);
          
          console.log('🔍 TOTAL VENDAS GERAL (todas empresas):', todasVendasGeral?.length || 0);
          if (todasVendasGeral && todasVendasGeral.length > 0) {
            console.log('🔍 PRIMEIRAS VENDAS GERAL:');
            todasVendasGeral.slice(0, 3).forEach((venda, i) => {
              console.log(`  ${i+1}. Empresa: ${venda.empresa_id} - Total: R$ ${venda.valor_total}, Pago: R$ ${venda.valor_pago} - "${venda.observacoes}"`);
            });
          }
        }

        const { data: todosCustos } = await supabase
          .from('contas_pagar')
          .select('id, descricao, valor, tipo, data_vencimento, os_id')
          .eq('empresa_id', empresaData.id)
          .in('os_id', ordensIds)
          .eq('tipo', 'pecas');

        console.log('💰 Dados encontrados:', {
          vendasCount: todasVendas?.length || 0,
          custosCount: todosCustos?.length || 0,
          sampleVenda: todasVendas?.[0],
          sampleCusto: todosCustos?.[0],
          todasVendas: todasVendas
        });

      // Log dos dados das OS para debug
      console.log('📋 Dados das OS:', {
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

      setOrdens(ordensCompletas);
      
      console.log('✅ Dados carregados:', {
        totalOrdens: ordensCompletas.length,
        ordensComVendas: ordensCompletas.filter(o => o.vendas?.length > 0).length,
        ordensComCustos: ordensCompletas.filter(o => o.custos?.length > 0).length,
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
      
      console.log('🚀 Carregando fluxo de caixa mensal...');
      
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

      console.log('📊 Dados carregados:', {
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
          const dataVencimento = new Date(conta.data_vencimento);
          return dataVencimento >= inicioMes && dataVencimento <= fimMes;
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
      
      console.log('✅ Fluxo de caixa processado:', fluxoCaixa.length, 'meses');
      setFluxoCaixaMensal(fluxoCaixa);
      
    } catch (error) {
      console.error('Erro ao buscar fluxo de caixa mensal:', error);
      setFluxoCaixaMensal([]);
    } finally {
      setLoadingFluxoCaixa(false);
    }
  };

  // Calcular métricas
  const calcularMetricas = () => {
    const totalReceita = ordens.reduce((acc, ordem) => {
      const receitaVendas = ordem.vendas?.reduce((vendaAcc, venda) => vendaAcc + venda.valor_pago, 0) || 0;
      const receitaOS = ordem.valor_faturado || ordem.valor_total || 0;
      return acc + receitaVendas + receitaOS;
    }, 0);

    const totalCustos = ordens.reduce((acc, ordem) => {
      const custosContas = ordem.custos?.reduce((custoAcc, custo) => custoAcc + custo.valor, 0) || 0;
      return acc + custosContas;
    }, 0);

    const lucroTotal = totalReceita - totalCustos;
    const margemMedia = totalReceita > 0 ? (lucroTotal / totalReceita) * 100 : 0;

    const ordensComLucro = ordens.map(ordem => {
      const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || ordem.valor_total || 0);
      const custos = ordem.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
      return { ...ordem, receita, custos, lucro: receita - custos };
    });

    const osLucrativas = ordensComLucro.filter(o => o.lucro > 0).length;
    const osPrejuizo = ordensComLucro.filter(o => o.lucro < 0).length;

    setMetricas({
      totalReceita,
      totalCustos,
      lucroTotal,
      margemMedia,
      totalOS: ordens.length,
      osLucrativas,
      osPrejuizo
    });
  };

  // Calcular dados diários do mês
  const calcularDadosDiarios = () => {
    // Criar mapa de dados por data real das OS
    const dadosPorData = new Map();
    
    ordens.forEach(ordem => {
      const dataOrdem = ordem.created_at.split('T')[0];
      const dia = new Date(dataOrdem).getDate();
      
      if (!dadosPorData.has(dia)) {
        dadosPorData.set(dia, {
          dia,
          receita: 0,
          custos: 0,
          lucro: 0
        });
      }
      
      const dadosDia = dadosPorData.get(dia);
      
      // Calcular receita
      const receitaVendas = ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0;
      const receitaOS = ordem.valor_faturado || ordem.valor_total || 0;
      dadosDia.receita += receitaVendas + receitaOS;
      
      // Calcular custos
      const custosContas = ordem.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
      dadosDia.custos += custosContas;
      
      // Calcular lucro
      dadosDia.lucro = dadosDia.receita - dadosDia.custos;
    });
    
    // Converter para array e ordenar por dia
    const dadosDiariosArray = Array.from(dadosPorData.values())
      .filter(d => d.receita > 0 || d.custos > 0)
      .sort((a, b) => a.dia - b.dia);
    
    console.log('📊 Dados diários corrigidos:', {
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

    ordens.forEach(ordem => {
      if (!ordem.tecnico_nome || ordem.tecnico_nome === 'N/A') return;

      const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || ordem.valor_total || 0);
      const custos = ordem.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
      const lucro = receita - custos;

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

  // Efeitos
  useEffect(() => {
    console.log('🔄 useEffect empresaData mudou:', {
      empresaId: empresaData?.id,
      currentMonth: formatarMesAno(currentMonth),
      willCallLoadData: !!empresaData?.id
    });
    
    if (empresaData?.id) {
      console.log('✅ Chamando loadData...');
      loadData();
      fetchFluxoCaixaMensal();
    } else {
      console.log('❌ empresaData.id não disponível, não chamando loadData');
    }
  }, [empresaData?.id, currentMonth, anoSelecionado]);

  useEffect(() => {
    if (ordens.length > 0) {
      calcularMetricas();
      calcularAnaliseTecnicos();
      calcularDadosDiarios();
    }
  }, [ordens]);

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

  // Renderizar dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Receita Total"
          value={<span className="text-green-600">{formatarMoeda(metricas.totalReceita)}</span>}
          icon={<FiDollarSign className="text-green-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description={`${metricas.totalOS} OS processadas`}
          svgPolyline={{ color: '#10B981', points: '0,20 20,10 40,15 60,5 80,12 100,8' }}
        />
        
        <DashboardCard
          title="Custos Totais"
          value={<span className="text-red-600">{formatarMoeda(metricas.totalCustos)}</span>}
          icon={<FiTarget className="text-red-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="Peças e serviços"
          svgPolyline={{ color: '#EF4444', points: '0,15 20,20 40,10 60,18 80,8 100,12' }}
        />
        
        <DashboardCard
          title="Lucro Total"
          value={
            <span className={metricas.lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatarMoeda(metricas.lucroTotal)}
            </span>
          }
          icon={metricas.lucroTotal >= 0 ? <FiTrendingUp className="text-green-600" /> : <FiTrendingDown className="text-red-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description={metricas.lucroTotal >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
          svgPolyline={{ 
            color: metricas.lucroTotal >= 0 ? '#10B981' : '#EF4444', 
            points: '0,20 20,15 40,10 60,5 80,8 100,3' 
          }}
        />
        
        <DashboardCard
          title="Margem Média"
          value={
            <span className={metricas.margemMedia >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatarPercentual(metricas.margemMedia)}
            </span>
          }
          icon={<FiPercent className={metricas.margemMedia >= 0 ? 'text-green-600' : 'text-red-600'} />}
          colorClass="text-black"
          bgClass="bg-white"
          description={`${metricas.osLucrativas} OS lucrativas`}
          svgPolyline={{ 
            color: metricas.margemMedia >= 0 ? '#10B981' : '#EF4444', 
            points: '0,18 20,12 40,16 60,8 80,14 100,6' 
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
        />
        
        <DashboardCard
          title="OS com Prejuízo"
          value={<span className="text-red-600">{metricas.osPrejuizo}</span>}
          icon={<FiAlertCircle className="text-red-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description={`${metricas.totalOS > 0 ? ((metricas.osPrejuizo / metricas.totalOS) * 100).toFixed(1) : 0}% do total`}
        />
        
        <DashboardCard
          title="Total de OS"
          value={<span className="text-gray-600">{metricas.totalOS}</span>}
          icon={<FiActivity className="text-gray-600" />}
          colorClass="text-black"
          bgClass="bg-white"
          description="Ordens processadas"
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
      const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || ordem.valor_total || 0);
      const custos = ordem.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
      return { ...ordem, receita, custos, lucro: receita - custos };
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Receita</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margem</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordensComLucro.map((ordem) => {
                const margem = ordem.receita > 0 ? (ordem.lucro / ordem.receita) * 100 : 0;
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
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      margem >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatarPercentual(margem)}
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
                </nav>
              </div>
            </div>

            {/* Conteúdo Principal */}
            <div>
              {visualizacaoAtiva === 'dashboard' && renderDashboard()}
              {visualizacaoAtiva === 'os' && renderTabelaOS()}
              {visualizacaoAtiva === 'tecnicos' && renderAnaliseTecnicos()}
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
    </MenuLayout>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardCard from '@/components/ui/DashboardCard';
import FluxoCaixaChart from '@/components/FluxoCaixaChart';
import { 
  FiDollarSign, 
  FiTrendingDown, 
  FiTrendingUp, 
  FiCalendar,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

interface DashboardFinanceiroData {
  receita: number;
  receita_bruta: number;
  descontos: number;
  acrescimos: number;
  total_vendas: number;
  despesas: number;
  despesas_pagas: number;
  despesas_pendentes: number;
  despesas_vencidas: number;
  total_contas: number;
  lucro: number;
  margem_percentual: number;
  // Novos campos para fluxo de caixa
  saldo_anterior: number;
  entradas: number;
  saidas: number;
  saldo_periodo: number;
  saldo_final: number;
}

interface FluxoCaixaMensal {
  mes: string;
  entradas: number;
  saidas: number;
  saldo_periodo: number;
  saldo_final: number;
  situacao: 'realizado' | 'previsto';
}


export default function DashboardFinanceiroPage() {
  const { empresaData } = useAuth();
  const [data, setData] = useState<DashboardFinanceiroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [anoSelecionado, setAnoSelecionado] = useState<string>('');
  
  // Novos estados para fluxo de caixa
  const [visualizacaoTipo, setVisualizacaoTipo] = useState<'diario' | 'mensal'>('mensal');
  const [fluxoCaixaMensal, setFluxoCaixaMensal] = useState<FluxoCaixaMensal[]>([]);
  const [loadingFluxoCaixa, setLoadingFluxoCaixa] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth()); // Mês atual como padrão
  const [dadosMesSelecionado, setDadosMesSelecionado] = useState<FluxoCaixaMensal | null>(null);
  const [loadingMesSelecionado, setLoadingMesSelecionado] = useState(false);
  
  // ✅ CACHE: Evitar recarregamentos desnecessários
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [cacheKey, setCacheKey] = useState<string>('');


  useEffect(() => {
    if (empresaData?.id && anoSelecionado) {
      const newCacheKey = `${empresaData.id}-${anoSelecionado}`;
      const now = Date.now();
      
      // ✅ CACHE: Só recarregar se mudou a chave ou passou mais de 5 minutos
      if (newCacheKey !== cacheKey || (now - lastFetchTime) > 300000) {
        console.log('🔄 Recarregando dados do dashboard...');
        setCacheKey(newCacheKey);
        setLastFetchTime(now);
        fetchData();
        fetchFluxoCaixaMensal();
      } else {
        console.log('✅ Usando cache dos dados do dashboard');
      }
    }
  }, [empresaData?.id, anoSelecionado, cacheKey, lastFetchTime]);

  // Carregar dados específicos do mês quando o fluxo de caixa mensal for carregado
  useEffect(() => {
    if (fluxoCaixaMensal.length > 0 && empresaData?.id && anoSelecionado) {
      // Limpar dados antigos quando o mês muda
      setDadosMesSelecionado(null);
      setLoadingMesSelecionado(true);
      
      // Carregar dados do novo mês
      fetchDadosMesEspecifico(mesSelecionado);
    }
  }, [fluxoCaixaMensal.length, mesSelecionado, empresaData?.id, anoSelecionado]);

  // ✅ INICIALIZAR: Definir ano atual como padrão
  useEffect(() => {
    if (!anoSelecionado) {
      const hoje = new Date();
      const anoAtual = hoje.getFullYear().toString();
      setAnoSelecionado(anoAtual);
    }
  }, [anoSelecionado]);

  const fetchData = async () => {
    if (!empresaData?.id || !anoSelecionado) return;

    try {
      setLoading(true);
      
      // ✅ CALCULAR DATAS DO ANO SELECIONADO
      const inicioAno = new Date(parseInt(anoSelecionado), 0, 1);
      const fimAno = new Date(parseInt(anoSelecionado), 11, 31);
      
      const dataInicioFiltro = inicioAno.toISOString().split('T')[0];
      const dataFimFiltro = fimAno.toISOString().split('T')[0];

      console.log('📅 Período selecionado:', {
        anoSelecionado,
        dataInicioFiltro,
        dataFimFiltro,
        periodo: `${dataInicioFiltro} até ${dataFimFiltro}`
      });

      // ✅ OTIMIZAÇÃO: Buscar dados em paralelo para melhor performance
      const [vendasResult, contasResult] = await Promise.all([
        supabase
          .from('vendas')
          .select('total, desconto, acrescimo, data_venda')
          .eq('empresa_id', empresaData.id)
          .gte('data_venda', `${dataInicioFiltro}T00:00:00`)
          .lte('data_venda', `${dataFimFiltro}T23:59:59`),
        
        supabase
          .from('contas_pagar')
          .select('valor, status, data_vencimento, data_pagamento')
          .eq('empresa_id', empresaData.id)
      ]);

      const vendasData = vendasResult.data;
      const contasData = contasResult.data;

      if (vendasResult.error) {
        console.error('Erro ao buscar vendas:', vendasResult.error);
        throw vendasResult.error;
      }

      if (contasResult.error) {
        console.warn('Erro ao buscar contas a pagar:', contasResult.error);
      }

      // ✅ CALCULAR RECEITAS REAIS das vendas
      const receitaBruta = vendasData?.reduce((total, venda) => total + (venda.total || 0), 0) || 0;
      const descontos = vendasData?.reduce((total, venda) => total + (venda.desconto || 0), 0) || 0;
      const acrescimos = vendasData?.reduce((total, venda) => total + (venda.acrescimo || 0), 0) || 0;
      const receitaLiquida = receitaBruta - descontos + acrescimos;
      const totalVendas = vendasData?.length || 0;

      // ✅ CALCULAR DESPESAS: Filtrar por período de vencimento do ano
      const despesasPeriodo = contasData?.filter(conta => {
        const dataVencimento = new Date(conta.data_vencimento);
        const dataInicioFiltroDate = new Date(dataInicioFiltro);
        const dataFimFiltroDate = new Date(dataFimFiltro);
        return dataVencimento >= dataInicioFiltroDate && dataVencimento <= dataFimFiltroDate;
      }) || [];

      const despesas = despesasPeriodo.reduce((total, conta) => total + (conta.valor || 0), 0);
      const despesasPagas = despesasPeriodo.filter(conta => conta.status === 'pago')
        .reduce((total, conta) => total + (conta.valor || 0), 0);
      const despesasPendentes = despesasPeriodo.filter(conta => conta.status === 'pendente')
        .reduce((total, conta) => total + (conta.valor || 0), 0);
      
      // Calcular despesas vencidas (todas as contas pendentes vencidas)
      const hoje = new Date();
      const hojeStr = hoje.toISOString().split('T')[0];
      const despesasVencidas = contasData?.filter(conta => 
        conta.status === 'pendente' && conta.data_vencimento < hojeStr
      ).reduce((total, conta) => total + (conta.valor || 0), 0) || 0;

      const totalContas = contasData?.length || 0;

      // Calcular lucro e margem
      const lucro = receitaLiquida - despesas;
      const margemPercentual = receitaLiquida > 0 ? (lucro / receitaLiquida) * 100 : 0;

      // Calcular saldo anterior (saldo do ano anterior)
      const saldoAnterior = 0; // TODO: Implementar cálculo do saldo anterior

      setData({
        receita: receitaLiquida,
        receita_bruta: receitaBruta,
        descontos: descontos,
        acrescimos: acrescimos,
        total_vendas: totalVendas,
        despesas: despesas,
        despesas_pagas: despesasPagas,
        despesas_pendentes: despesasPendentes,
        despesas_vencidas: despesasVencidas,
        total_contas: totalContas,
        lucro: lucro,
        margem_percentual: margemPercentual,
        // Novos campos para fluxo de caixa
        saldo_anterior: saldoAnterior,
        entradas: receitaLiquida,
        saidas: despesas,
        saldo_periodo: receitaLiquida - despesas,
        saldo_final: saldoAnterior + (receitaLiquida - despesas)
      });

      console.log('📊 Dashboard Financeiro - Dados carregados:', {
        periodo: `${dataInicioFiltro} até ${dataFimFiltro}`,
        vendasEncontradas: vendasData?.length || 0,
        contasEncontradas: contasData?.length || 0,
        despesasNoPeriodo: despesasPeriodo.length,
        receitaBruta,
        receitaLiquida,
        despesas,
        lucro
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      // Valores zerados em caso de erro
      setData({
        receita: 0,
        receita_bruta: 0,
        descontos: 0,
        acrescimos: 0,
        total_vendas: 0,
        despesas: 0,
        despesas_pagas: 0,
        despesas_pendentes: 0,
        despesas_vencidas: 0,
        total_contas: 0,
        lucro: 0,
        margem_percentual: 0,
        // Novos campos para fluxo de caixa
        saldo_anterior: 0,
        entradas: 0,
        saidas: 0,
        saldo_periodo: 0,
        saldo_final: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFluxoCaixaMensal = async () => {
    if (!empresaData?.id || !anoSelecionado) return;

    try {
      setLoadingFluxoCaixa(true);
      
      console.log('🚀 Otimizando consultas do fluxo de caixa...');
      
      // ✅ OTIMIZAÇÃO: Buscar todos os dados do ano de uma vez
      const inicioAno = new Date(parseInt(anoSelecionado), 0, 1);
      const fimAno = new Date(parseInt(anoSelecionado), 11, 31);
      
      const dataInicioAno = inicioAno.toISOString().split('T')[0];
      const dataFimAno = fimAno.toISOString().split('T')[0];
      
      // ✅ UMA CONSULTA para todas as vendas do ano
      const { data: vendasAno } = await supabase
        .from('vendas')
        .select('total, desconto, acrescimo, data_venda')
        .eq('empresa_id', empresaData.id)
        .gte('data_venda', `${dataInicioAno}T00:00:00`)
        .lte('data_venda', `${dataFimAno}T23:59:59`);
      
      // ✅ UMA CONSULTA para todas as contas do ano
      const { data: contasAno } = await supabase
        .from('contas_pagar')
        .select('valor, status, data_vencimento')
        .eq('empresa_id', empresaData.id)
        .gte('data_vencimento', dataInicioAno)
        .lte('data_vencimento', dataFimAno);
      
      console.log('📊 Dados carregados:', {
        vendas: vendasAno?.length || 0,
        contas: contasAno?.length || 0
      });
      
      const fluxoCaixa: FluxoCaixaMensal[] = [];
      
      // ✅ PROCESSAR dados em memória (muito mais rápido)
      for (let mes = 0; mes < 12; mes++) {
        const inicioMes = new Date(parseInt(anoSelecionado), mes, 1);
        const fimMes = new Date(parseInt(anoSelecionado), mes + 1, 0);
        
        // Filtrar vendas do mês
        const vendasMes = vendasAno?.filter(venda => {
          const dataVenda = new Date(venda.data_venda);
          return dataVenda >= inicioMes && dataVenda <= fimMes;
        }) || [];
        
        // Filtrar contas do mês
        const contasMes = contasAno?.filter(conta => {
          const dataVencimento = new Date(conta.data_vencimento);
          return dataVencimento >= inicioMes && dataVencimento <= fimMes;
        }) || [];
        
        const entradas = vendasMes.reduce((total, venda) => {
          const receitaBruta = venda.total || 0;
          const desconto = venda.desconto || 0;
          const acrescimo = venda.acrescimo || 0;
          return total + (receitaBruta - desconto + acrescimo);
        }, 0);
        
        const saidas = contasMes.reduce((total, conta) => total + (conta.valor || 0), 0);
        const saldoPeriodo = entradas - saidas;
        
        // Calcular saldo final acumulado
        const saldoFinal = mes === 0 ? saldoPeriodo : 
          fluxoCaixa[mes - 1].saldo_final + saldoPeriodo;
        
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const exportarRelatorio = () => {
    // TODO: Implementar exportação
    console.log('Exportar relatório');
  };

  const refreshData = () => {
    console.log('🔄 Forçando atualização dos dados...');
    setLastFetchTime(0); // Força recarregamento
    fetchData();
    fetchFluxoCaixaMensal();
  };

  // Função para gerar nomes dos meses abreviados
  const gerarNomesMeses = () => {
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return meses;
  };

  // Função para buscar dados específicos de um mês
  const fetchDadosMesEspecifico = async (mesIndex: number) => {
    if (!empresaData?.id || !anoSelecionado) {
      console.log('❌ Dados insuficientes para buscar mês específico:', { empresaData: !!empresaData?.id, anoSelecionado });
      return;
    }

    try {
      setLoadingMesSelecionado(true);
      
      const inicioMes = new Date(parseInt(anoSelecionado), mesIndex, 1);
      const fimMes = new Date(parseInt(anoSelecionado), mesIndex + 1, 0);
      
      const dataInicioMes = inicioMes.toISOString().split('T')[0];
      const dataFimMes = fimMes.toISOString().split('T')[0];
      
      console.log('📅 Buscando dados específicos do mês:', {
        mesIndex,
        mesNome: inicioMes.toLocaleDateString('pt-BR', { month: 'long' }),
        dataInicioMes,
        dataFimMes,
        empresaId: empresaData.id
      });

      // ✅ OTIMIZAÇÃO: Buscar dados do mês específico com consultas paralelas
      const [vendasResult, contasResult] = await Promise.all([
        supabase
          .from('vendas')
          .select('total, desconto, acrescimo, data_venda, cliente, tecnico')
          .eq('empresa_id', empresaData.id)
          .gte('data_venda', `${dataInicioMes}T00:00:00`)
          .lte('data_venda', `${dataFimMes}T23:59:59`),
        
        supabase
          .from('contas_pagar')
          .select('valor, status, data_vencimento, data_pagamento, descricao, categoria')
          .eq('empresa_id', empresaData.id)
          .gte('data_vencimento', dataInicioMes)
          .lte('data_vencimento', dataFimMes)
      ]);
      
      const vendasMes = vendasResult.data;
      const contasMes = contasResult.data;
      
      const entradas = vendasMes?.reduce((total, venda) => {
        const receitaBruta = venda.total || 0;
        const desconto = venda.desconto || 0;
        const acrescimo = venda.acrescimo || 0;
        return total + (receitaBruta - desconto + acrescimo);
      }, 0) || 0;
      
      const saidas = contasMes?.reduce((total, conta) => total + (conta.valor || 0), 0) || 0;
      const saldoPeriodo = entradas - saidas;
      
      // Calcular saldo final acumulado até este mês
      let saldoFinal = saldoPeriodo;
      for (let i = 0; i < mesIndex; i++) {
        if (fluxoCaixaMensal[i]) {
          saldoFinal += fluxoCaixaMensal[i].saldo_periodo;
        }
      }
      
    const hoje = new Date();
      const isMesPassado = parseInt(anoSelecionado) < hoje.getFullYear() || 
        (parseInt(anoSelecionado) === hoje.getFullYear() && mesIndex < hoje.getMonth());
      
      const dadosMes: FluxoCaixaMensal = {
        mes: inicioMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        entradas,
        saidas,
        saldo_periodo: saldoPeriodo,
        saldo_final: saldoFinal,
        situacao: isMesPassado ? 'realizado' : 'previsto'
      };

      // Adicionar dados detalhados
      (dadosMes as any).detalhes = {
        vendas: vendasMes || [],
        contas: contasMes || [],
        totalVendas: vendasMes?.length || 0,
        totalContas: contasMes?.length || 0
      };

      setDadosMesSelecionado(dadosMes);
      
      console.log('✅ Dados específicos do mês carregados:', {
        mes: dadosMes.mes,
        entradas: dadosMes.entradas,
        saidas: dadosMes.saidas,
        saldoPeriodo: dadosMes.saldo_periodo,
        saldoFinal: dadosMes.saldo_final,
        totalVendas: vendasMes?.length || 0,
        totalContas: contasMes?.length || 0
      });
      
    } catch (error) {
      console.error('Erro ao buscar dados específicos do mês:', error);
      setDadosMesSelecionado(null);
    } finally {
      setLoadingMesSelecionado(false);
    }
  };

  // Função para obter dados do mês selecionado
  const obterDadosMesSelecionado = () => {
    // Se temos dados específicos carregados para o mês selecionado, usar eles
    if (dadosMesSelecionado && dadosMesSelecionado.mes === gerarNomesMeses()[mesSelecionado]) {
      return dadosMesSelecionado;
    }
    
    // Caso contrário, usar dados do fluxo de caixa mensal
    return fluxoCaixaMensal[mesSelecionado] || null;
  };


  if (loading) {
    return (
      <MenuLayout>
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </MenuLayout>
    );
  }


  return (
    <MenuLayout>
      <div className="px-2 md:px-8 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Fluxo de Caixa</h1>
            <p className="text-sm text-gray-600 mt-1">
              {anoSelecionado && `Dados de ${anoSelecionado}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={refreshData}
              variant="outline"
              className="flex items-center gap-2 text-xs md:text-sm"
            >
              <FiRefreshCw className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden md:inline">Atualizar</span>
            </Button>
            <Button 
              onClick={exportarRelatorio}
              variant="outline"
              className="flex items-center gap-2 text-xs md:text-sm"
            >
              <FiDownload className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden md:inline">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Controles de Navegação */}
        <div className="bg-white rounded-lg shadow-sm border p-5 md:p-6 mb-6">
          {/* Primeira linha: Tipo, Ano e Filtros */}
          <div className="flex items-center justify-between mb-6">
            {/* Abas de Tipo */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVisualizacaoTipo('diario')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  visualizacaoTipo === 'diario'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Diário
              </button>
              <button
                onClick={() => setVisualizacaoTipo('mensal')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  visualizacaoTipo === 'mensal'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mensal
              </button>
          </div>
          
            {/* Navegação de Ano */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAnoSelecionado((parseInt(anoSelecionado) - 1).toString())}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-xl font-bold text-gray-900 px-2">
                {anoSelecionado}
              </span>
              <button
                onClick={() => setAnoSelecionado((parseInt(anoSelecionado) + 1).toString())}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Botão Mais Filtros e Status */}
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <FiFilter className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">Mais filtros</span>
              </button>
              <div className="text-sm text-gray-500 font-medium">
                {fluxoCaixaMensal.length > 0 && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                    {obterDadosMesSelecionado()?.situacao === 'realizado' ? 'Realizado' : 'Previsto'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Segunda linha: Abas dos Meses */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Mês</h3>
            
            {/* Abas dos Meses */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {gerarNomesMeses().map((mes, index) => {
                const dadosMes = fluxoCaixaMensal[index];
                const isSelecionado = mesSelecionado === index;
                const isMesAtual = index === new Date().getMonth();
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setMesSelecionado(index);
                      fetchDadosMesEspecifico(index);
                    }}
                    className={`flex-shrink-0 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 min-w-[80px] ${
                      isSelecionado
                        ? 'bg-gray-900 text-white shadow-lg'
                        : isMesAtual
                        ? 'bg-white text-gray-700 border-2 border-green-500 hover:bg-green-50 shadow-sm'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <span className="font-semibold">{mes}</span>
                      <span className="text-xs opacity-75">
                        {dadosMes ? formatCurrency(dadosMes.saldo_final).replace('R$', '').trim() : '0,00'}
                      </span>
                      {isMesAtual && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          atual
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resumo do Fluxo de Caixa */}
        <div className="mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Resumo - {gerarNomesMeses()[mesSelecionado]} {anoSelecionado}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
            <DashboardCard
              title="Saldo Anterior"
              value={formatCurrency(obterDadosMesSelecionado()?.saldo_final || 0)}
              description="Saldo do mês anterior"
              descriptionColorClass="text-gray-500"
              icon={<FiDollarSign className="w-5 h-5" />}
              svgPolyline={{ color: '#6b7280', points: '0,15 10,17 20,15 30,13 40,15 50,17 60,15 70,17' }}
            />

            <DashboardCard
              title="Entradas"
              value={formatCurrency(obterDadosMesSelecionado()?.entradas || 0)}
              description={`${(obterDadosMesSelecionado() as any)?.detalhes?.totalVendas || 0} vendas`}
              descriptionColorClass="text-green-600"
              icon={<FiTrendingUp className="w-5 h-5" />}
              svgPolyline={{ color: '#22c55e', points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' }}
            />

            <DashboardCard
              title="Saídas"
              value={formatCurrency(obterDadosMesSelecionado()?.saidas || 0)}
              description={`${(obterDadosMesSelecionado() as any)?.detalhes?.totalContas || 0} contas`}
              descriptionColorClass="text-red-500"
              icon={<FiTrendingDown className="w-5 h-5" />}
              svgPolyline={{ color: '#ef4444', points: '0,6 10,8 20,10 30,12 40,14 50,16 60,18 70,20' }}
            />

            <DashboardCard
              title="Saldo do Período"
              value={formatCurrency(obterDadosMesSelecionado()?.saldo_periodo || 0)}
              description="Diferença entre entradas e saídas"
              descriptionColorClass={(obterDadosMesSelecionado()?.saldo_periodo || 0) >= 0 ? "text-green-600" : "text-red-500"}
              icon={<FiCalendar className="w-5 h-5" />}
              svgPolyline={{ color: (obterDadosMesSelecionado()?.saldo_periodo || 0) >= 0 ? '#22c55e' : '#ef4444', points: '0,15 10,13 20,15 30,17 40,15 50,13 60,15 70,17' }}
            />

            <DashboardCard
              title="Saldo Final"
              value={formatCurrency(obterDadosMesSelecionado()?.saldo_final || 0)}
              description="Saldo acumulado até este mês"
              descriptionColorClass={(obterDadosMesSelecionado()?.saldo_final || 0) >= 0 ? "text-green-600" : "text-red-500"}
              icon={<FiDollarSign className="w-5 h-5" />}
              svgPolyline={{ color: (obterDadosMesSelecionado()?.saldo_final || 0) >= 0 ? '#22c55e' : '#ef4444', points: '0,12 10,14 20,12 30,10 40,12 50,14 60,12 70,14' }}
            />
          </div>
        </div>


        {/* Gráfico Moderno do Fluxo de Caixa */}
        <div className="mb-6">
          <FluxoCaixaChart 
            data={fluxoCaixaMensal}
            title={`Fluxo de Caixa - ${gerarNomesMeses()[mesSelecionado]} ${anoSelecionado}`}
            mesSelecionado={mesSelecionado}
          />
        </div>

        {/* Informações do Mês Selecionado */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
            <h3 className="text-sm md:text-base font-medium text-gray-700 mb-3">
              Detalhes do Mês: {gerarNomesMeses()[mesSelecionado]} {anoSelecionado}
            </h3>
            
            {loadingMesSelecionado ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                  <span className="text-gray-500 font-medium">Carregando dados do mês...</span>
                  <p className="text-sm text-gray-400 mt-1">
                    Buscando vendas e contas de {gerarNomesMeses()[mesSelecionado]} {anoSelecionado}
                  </p>
                </div>
              </div>
            ) : obterDadosMesSelecionado() ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500">Entradas</p>
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(obterDadosMesSelecionado()!.entradas)}
                  </p>
                  {(obterDadosMesSelecionado() as any)?.detalhes?.totalVendas && (
                    <p className="text-xs text-gray-400 mt-1">
                      {(obterDadosMesSelecionado() as any).detalhes.totalVendas} vendas
                    </p>
                  )}
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-gray-500">Saídas</p>
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(obterDadosMesSelecionado()!.saidas)}
                  </p>
                  {(obterDadosMesSelecionado() as any)?.detalhes?.totalContas && (
                    <p className="text-xs text-gray-400 mt-1">
                      {(obterDadosMesSelecionado() as any).detalhes.totalContas} contas
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${obterDadosMesSelecionado()!.saldo_periodo >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-xs text-gray-500">Saldo Período</p>
                  <p className={`text-sm font-semibold ${obterDadosMesSelecionado()!.saldo_periodo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(obterDadosMesSelecionado()!.saldo_periodo)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${obterDadosMesSelecionado()!.saldo_final >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-xs text-gray-500">Saldo Final</p>
                  <p className={`text-sm font-semibold ${obterDadosMesSelecionado()!.saldo_final >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(obterDadosMesSelecionado()!.saldo_final)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhum dado encontrado para este mês
              </div>
            )}
          </div>
        </div>

        {/* Tabela Detalhada dos Meses */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
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
                          {formatCurrency(mes.entradas)}
                        </td>
                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {formatCurrency(mes.saidas)}
                        </td>
                        <td className={`px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium ${mes.saldo_periodo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(mes.saldo_periodo)}
                        </td>
                        <td className={`px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium ${mes.saldo_final >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(mes.saldo_final)}
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
    </MenuLayout>
  );
}







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
  status: string;
  created_at: string;
  clientes?: {
    nome: string;
  };
  tecnico?: {
    nome: string;
  };
  vendas?: Venda[];
  custos?: ContaCusto[];
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

      // Buscar ordens de serviço - apenas campos que existem
      const { data: ordensData, error: ordensError } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          cliente_id,
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

        // Buscar todas as vendas do período primeiro para debug
        const { data: todasVendasPeriodo, error: errorVendasPeriodo } = await supabase
          .from('vendas')
          .select('id, valor_total, valor_pago, data_venda, observacoes')
          .eq('empresa_id', empresaData.id)
          .eq('status', 'finalizada')
          .gte('data_venda', `${dataInicio}T00:00:00`)
          .lte('data_venda', `${dataFim}T23:59:59`);

        console.log('🔍 Debug vendas período:', {
          periodo: `${dataInicio} a ${dataFim}`,
          totalVendasPeriodo: todasVendasPeriodo?.length || 0,
          errorVendasPeriodo: errorVendasPeriodo,
          sampleVendas: todasVendasPeriodo?.slice(0, 3),
          ordensNumeros: ordensNumeros.slice(0, 3)
        });

        // Buscar vendas específicas das OS - versão simplificada
        const { data: todasVendas, error: errorVendas } = await supabase
          .from('vendas')
          .select('id, valor_total, valor_pago, data_venda, observacoes')
          .eq('empresa_id', empresaData.id)
          .eq('status', 'finalizada');

        console.log('🔍 Debug todas vendas:', {
          totalVendas: todasVendas?.length || 0,
          errorVendas: errorVendas,
          sampleVendas: todasVendas?.slice(0, 5)
        });

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
          valor_peca: os.valor_peca,
          valor_servico: os.valor_servico,
          qtd_peca: os.qtd_peca,
          qtd_servico: os.qtd_servico
        }))
      });

      // Criar mapas para lookup rápido
      const clientesMap = new Map(clientes?.map(c => [c.id, c]) || []);

        // Mapear os dados relacionados
        const ordensCompletas = (ordensData || []).map(ordem => {
          const vendas = todasVendas?.filter(venda => 
            venda.observacoes?.includes(`O.S. #${ordem.numero_os}`) || 
            venda.observacoes?.includes(`OS #${ordem.numero_os}`)
          ) || [];
        
        const custos = todosCustos?.filter(custo => 
          custo.os_id === ordem.id
        ) || [];

        return {
          ...ordem,
          clientes: clientesMap.get(ordem.cliente_id),
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

  // Calcular métricas
  const calcularMetricas = () => {
    const totalReceita = ordens.reduce((acc, ordem) => {
      const receitaVendas = ordem.vendas?.reduce((vendaAcc, venda) => vendaAcc + venda.valor_pago, 0) || 0;
      const receitaOS = ordem.valor_faturado || 0;
      return acc + receitaVendas + receitaOS;
    }, 0);

    const totalCustos = ordens.reduce((acc, ordem) => {
      const custosContas = ordem.custos?.reduce((custoAcc, custo) => custoAcc + custo.valor, 0) || 0;
      return acc + custosContas;
    }, 0);

    const lucroTotal = totalReceita - totalCustos;
    const margemMedia = totalReceita > 0 ? (lucroTotal / totalReceita) * 100 : 0;

    const ordensComLucro = ordens.map(ordem => {
      const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || 0);
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
    const { dataInicio, dataFim } = calcularPeriodo();
    const diasNoMes = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    
    const dadosPorDia = Array.from({ length: diasNoMes }, (_, index) => {
      const dia = index + 1;
      const dataDia = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      
      const ordensDoDia = ordens.filter(ordem => {
        // Usar apenas created_at (data de criação da OS)
        const dataOrdem = ordem.created_at.split('T')[0];
        return dataOrdem === dataDia;
      });
      
      const receita = ordensDoDia.reduce((acc, ordem) => {
        const receitaVendas = ordem.vendas?.reduce((vendaAcc, venda) => vendaAcc + venda.valor_pago, 0) || 0;
        return acc + receitaVendas;
      }, 0);
      
      const custos = ordensDoDia.reduce((acc, ordem) => {
        const custosContas = ordem.custos?.reduce((custoAcc, custo) => custoAcc + custo.valor, 0) || 0;
        return acc + custosContas;
      }, 0);
      
      return {
        dia,
        receita,
        custos,
        lucro: receita - custos
      };
    });
    
    setDadosDiarios(dadosPorDia);
  };

  // Calcular análise de técnicos
  const calcularAnaliseTecnicos = () => {
    const tecnicosMap = new Map<string, AnaliseTecnico>();

    ordens.forEach(ordem => {
      if (!ordem.tecnico_id || !ordem.tecnico?.nome) return;

      const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || 0);
      const custos = ordem.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
      const lucro = receita - custos;

      if (tecnicosMap.has(ordem.tecnico_id)) {
        const tecnico = tecnicosMap.get(ordem.tecnico_id)!;
        tecnico.totalOS += 1;
        tecnico.receitaTotal += receita;
        tecnico.custosTotal += custos;
        tecnico.lucroTotal += lucro;
        tecnico.margemMedia = tecnico.receitaTotal > 0 ? (tecnico.lucroTotal / tecnico.receitaTotal) * 100 : 0;
      } else {
        tecnicosMap.set(ordem.tecnico_id, {
          tecnico_id: ordem.tecnico_id,
          nome: ordem.tecnico.nome,
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
    } else {
      console.log('❌ empresaData.id não disponível, não chamando loadData');
    }
  }, [empresaData?.id, currentMonth]);

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
                  {/* Gráfico SVG */}
                  <svg 
                    width="100%" 
                    height="400" 
                    viewBox="0 0 1000 400" 
                    className="overflow-visible"
                  >
                    <defs>
                      {/* Gradientes mais suaves */}
                      <linearGradient id="receitaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="1"/>
                        <stop offset="100%" stopColor="#059669" stopOpacity="0.9"/>
                      </linearGradient>
                      <linearGradient id="custosGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1E40AF" stopOpacity="1"/>
                        <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.9"/>
                      </linearGradient>
                      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#00000020"/>
                      </filter>
                    </defs>
                    
                    {/* Linhas de grid horizontais */}
                    <line x1="80" y1="50" x2="920" y2="50" stroke="#E5E7EB" strokeWidth="1"/>
                    <line x1="80" y1="125" x2="920" y2="125" stroke="#E5E7EB" strokeWidth="1"/>
                    <line x1="80" y1="200" x2="920" y2="200" stroke="#374151" strokeWidth="2"/>
                    <line x1="80" y1="275" x2="920" y2="275" stroke="#E5E7EB" strokeWidth="1"/>
                    <line x1="80" y1="350" x2="920" y2="350" stroke="#E5E7EB" strokeWidth="1"/>
                    
                    {/* Labels do eixo Y */}
                    <text x="70" y="55" textAnchor="end" className="text-sm fill-gray-600 font-medium">
                      R$ 5k
                    </text>
                    <text x="70" y="130" textAnchor="end" className="text-sm fill-gray-600 font-medium">
                      R$ 2.5k
                    </text>
                    <text x="70" y="205" textAnchor="end" className="text-sm fill-gray-700 font-semibold">
                      R$ 0
                    </text>
                    <text x="70" y="280" textAnchor="end" className="text-sm fill-gray-600 font-medium">
                      R$ 2.5k
                    </text>
                    <text x="70" y="355" textAnchor="end" className="text-sm fill-gray-600 font-medium">
                      R$ 5k
                    </text>
                    
                    {/* Bars */}
                    {dadosDiarios.filter(d => d.receita > 0 || d.custos > 0).map((dado, index) => {
                      const x = 100 + (index * 35);
                      const maxValor = 5000; // Escala fixa como na imagem
                      const escala = 175 / maxValor;
                      
                      const alturaReceita = Math.min(dado.receita * escala, 175);
                      const alturaCustos = Math.min(dado.custos * escala, 175);
                      
                      return (
                        <g key={dado.dia}>
                          {/* Receita bar (upward) */}
                          {dado.receita > 0 && (
                            <rect
                              x={x - 12}
                              y={200 - alturaReceita}
                              width="24"
                              height={alturaReceita}
                              fill="url(#receitaGradient)"
                              rx="6"
                              filter="url(#shadow)"
                              className="bar-hover transition-all duration-300 ease-out hover:scale-105"
                              style={{
                                transformOrigin: `${x}px 200px`,
                                animation: `slideUp 0.8s ease-out ${index * 0.03}s both`
                              }}
                            />
                          )}
                          
                          {/* Custos bar (downward) */}
                          {dado.custos > 0 && (
                            <rect
                              x={x - 12}
                              y={200}
                              width="24"
                              height={alturaCustos}
                              fill="url(#custosGradient)"
                              rx="6"
                              filter="url(#shadow)"
                              className="bar-hover transition-all duration-300 ease-out hover:scale-105"
                              style={{
                                transformOrigin: `${x}px 200px`,
                                animation: `slideDown 0.8s ease-out ${index * 0.03}s both`
                              }}
                            />
                          )}
                          
                          {/* Day label */}
                          <text
                            x={x}
                            y="380"
                            textAnchor="middle"
                            className="text-xs fill-gray-500 font-medium"
                          >
                            {dado.dia}
                          </text>
                          
                          {/* Tooltip data */}
                          <rect
                            x={x - 12}
                            y="0"
                            width="24"
                            height="400"
                            fill="transparent"
                            className="cursor-pointer"
                          >
                            <title>
                              Dia {dado.dia}:{'\n'}
                              Receita: {formatarMoeda(dado.receita)}{'\n'}
                              Custos: {formatarMoeda(dado.custos)}{'\n'}
                              Lucro: {formatarMoeda(dado.lucro)}
                            </title>
                          </rect>
                        </g>
                      );
                    })}
                  </svg>
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
      const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || 0);
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
                      {ordem.tecnico?.nome || 'N/A'}
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
        @keyframes slideUp {
          from {
            transform: scaleY(0);
            opacity: 0;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        
        @keyframes slideDown {
          from {
            transform: scaleY(0);
            opacity: 0;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .chart-container {
          animation: fadeInUp 0.6s ease-out;
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
          </div>
        </div>
      )}
    </MenuLayout>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiDollarSign, 
  FiTarget,
  FiUsers,
  FiCalendar,
  FiFilter,
  FiRefreshCw,
  FiEye,
  FiDownload
} from 'react-icons/fi';

interface OrdemServico {
  id: string;
  numero_os: string;
  cliente_id: string;
  tecnico_id: string;
  status: string;
  valor_faturado?: number;
  valor_peca?: number;
  valor_servico?: number;
  qtd_peca?: number;
  qtd_servico?: number;
  desconto?: number;
  created_at: string;
  data_entrega?: string;
  prazo_entrega?: string;
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
}

interface ContaCusto {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  data_vencimento: string;
}

interface MetricasLucro {
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

type FiltroPeriodo = 'hoje' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'personalizado';

export default function LucroDesempenhoPage() {
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  
  // Estados principais
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [metricas, setMetricas] = useState<MetricasLucro>({
    totalReceita: 0,
    totalCustos: 0,
    lucroTotal: 0,
    margemMedia: 0,
    totalOS: 0,
    osLucrativas: 0,
    osPrejuizo: 0
  });
  const [analiseTecnicos, setAnaliseTecnicos] = useState<AnaliseTecnico[]>([]);
  
  // Estados de filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroLucratividade, setFiltroLucratividade] = useState('');
  
  // Estados de visualização
  const [visualizacaoAtiva, setVisualizacaoAtiva] = useState<'dashboard' | 'os' | 'tecnicos'>('dashboard');
  const [ordenacao, setOrdenacao] = useState<{campo: string, direcao: 'asc' | 'desc'}>({
    campo: 'lucroTotal',
    direcao: 'desc'
  });

  useEffect(() => {
    if (empresaData?.id) {
      loadData();
    }
  }, [empresaData?.id]);

  useEffect(() => {
    if (ordens.length > 0) {
      calcularMetricas();
      calcularAnaliseTecnicos();
    }
  }, [ordens]);

  const loadData = async () => {
    if (!empresaData?.id) return;
    
    setLoading(true);
    const startTime = Date.now();
    
    try {
      // Calcular datas do período selecionado
      const { dataInicioFiltro, dataFimFiltro } = calcularPeriodo();
      
      console.log('📊 Carregando dados de lucro e desempenho...', {
        empresaId: empresaData.id,
        periodo: filtroPeriodo,
        dataInicio: dataInicioFiltro,
        dataFim: dataFimFiltro
      });

      // Buscar ordens de serviço com joins otimizados (1 query apenas)
      const { data: ordensData, error: ordensError } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          cliente_id,
          tecnico_id,
          status,
          valor_faturado,
          valor_peca,
          valor_servico,
          qtd_peca,
          qtd_servico,
          desconto,
          created_at,
          data_entrega,
          prazo_entrega,
          clientes!cliente_id(nome),
          tecnico:usuarios!tecnico_id(nome)
        `)
        .eq('empresa_id', empresaData.id)
        .gte('created_at', `${dataInicioFiltro}T00:00:00`)
        .lte('created_at', `${dataFimFiltro}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(100); // Limitar para melhor performance

      if (ordensError) {
        console.error('❌ Erro ao buscar ordens:', ordensError);
        console.error('❌ Detalhes do erro:', {
          message: ordensError.message,
          details: ordensError.details,
          hint: ordensError.hint,
          code: ordensError.code
        });
        addToast('error', `Erro ao carregar ordens de serviço: ${ordensError.message}`);
        return;
      }

      // Buscar vendas e custos em lote (2 queries apenas)
      const ordensIds = ordensData?.map(o => o.id) || [];
      const ordensNumeros = ordensData?.map(o => o.numero_os) || [];

      // Buscar todas as vendas relacionadas às OSs
      const { data: todasVendas } = await supabase
        .from('vendas')
        .select('id, valor_total, valor_pago, data_venda, observacoes')
        .eq('empresa_id', empresaData.id)
        .eq('status', 'finalizada')
        .in('observacoes', ordensNumeros.map(num => `OS: ${num}`));

      // Buscar todos os custos relacionados às OSs
      const { data: todosCustos } = await supabase
        .from('contas_pagar')
        .select('id, descricao, valor, tipo, data_vencimento, os_id')
        .eq('empresa_id', empresaData.id)
        .in('os_id', ordensIds)
        .eq('tipo', 'pecas');

      // Mapear os dados relacionados
      const ordensCompletas = (ordensData || []).map(ordem => {
        const vendas = todasVendas?.filter(venda => 
          venda.observacoes?.includes(`OS: ${ordem.numero_os}`)
        ) || [];
        
        const custos = todosCustos?.filter(custo => 
          custo.os_id === ordem.id
        ) || [];

        return {
          ...ordem,
          vendas,
          custos
        };
      });

      setOrdens(ordensCompletas);
      
      const loadTime = Date.now() - startTime;
      console.log('✅ Dados carregados:', {
        totalOrdens: ordensCompletas.length,
        ordensComVendas: ordensCompletas.filter(o => o.vendas?.length > 0).length,
        ordensComCustos: ordensCompletas.filter(o => o.custos?.length > 0).length,
        tempoCarregamento: `${loadTime}ms`
      });

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      addToast('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const calcularPeriodo = () => {
    const hoje = new Date();
    let dataInicioFiltro = '';
    let dataFimFiltro = '';

    switch (filtroPeriodo) {
      case 'hoje':
        dataInicioFiltro = hoje.toISOString().split('T')[0];
        dataFimFiltro = hoje.toISOString().split('T')[0];
        break;
      case 'semana':
        const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
        dataInicioFiltro = inicioSemana.toISOString().split('T')[0];
        dataFimFiltro = new Date().toISOString().split('T')[0];
        break;
      case 'mes':
        dataInicioFiltro = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        dataFimFiltro = new Date().toISOString().split('T')[0];
        break;
      case 'trimestre':
        const trimestre = Math.floor(hoje.getMonth() / 3);
        dataInicioFiltro = new Date(hoje.getFullYear(), trimestre * 3, 1).toISOString().split('T')[0];
        dataFimFiltro = new Date().toISOString().split('T')[0];
        break;
      case 'ano':
        dataInicioFiltro = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
        dataFimFiltro = new Date().toISOString().split('T')[0];
        break;
      case 'personalizado':
        dataInicioFiltro = dataInicio || new Date().toISOString().split('T')[0];
        dataFimFiltro = dataFim || new Date().toISOString().split('T')[0];
        break;
    }

    return { dataInicioFiltro, dataFimFiltro };
  };

  const calcularMetricas = () => {
    const totalReceita = ordens.reduce((acc, ordem) => {
      // Receita das vendas relacionadas + valor faturado da OS
      const receitaVendas = ordem.vendas?.reduce((vendaAcc, venda) => vendaAcc + venda.valor_pago, 0) || 0;
      const receitaOS = ordem.valor_faturado || 0;
      return acc + receitaVendas + receitaOS;
    }, 0);

    const totalCustos = ordens.reduce((acc, ordem) => {
      // APENAS custos reais das contas a pagar vinculadas à OS
      const custosContas = ordem.custos?.reduce((custoAcc, custo) => custoAcc + custo.valor, 0) || 0;
      
      // NÃO usar valores da OS como fallback - apenas custos reais
      return acc + custosContas;
    }, 0);

    const lucroTotal = totalReceita - totalCustos;
    const margemMedia = totalReceita > 0 ? (lucroTotal / totalReceita) * 100 : 0;

    const ordensComLucro = ordens.map(ordem => {
      const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || 0);
      
      // APENAS custos reais das contas a pagar vinculadas
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

  const calcularAnaliseTecnicos = () => {
    const tecnicosMap = new Map<string, AnaliseTecnico>();

    ordens.forEach(ordem => {
      if (!ordem.tecnico_id || !ordem.tecnico?.nome) return;

      const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || 0);
      
      // APENAS custos reais das contas a pagar vinculadas
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

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(1)}%`;
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiDollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatarMoeda(metricas.totalReceita)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiTrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Custos Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatarMoeda(metricas.totalCustos)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiTrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Lucro Total</p>
              <p className={`text-2xl font-bold ${metricas.lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatarMoeda(metricas.lucroTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiTarget className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Margem Média</p>
              <p className={`text-2xl font-bold ${metricas.margemMedia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatarPercentual(metricas.margemMedia)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo de OS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo de OS</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total de OS:</span>
              <span className="font-semibold">{metricas.totalOS}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">OS Lucrativas:</span>
              <span className="font-semibold text-green-600">{metricas.osLucrativas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">OS com Prejuízo:</span>
              <span className="font-semibold text-red-600">{metricas.osPrejuizo}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 OS Mais Lucrativas</h3>
          <div className="space-y-2">
            {ordens
              .map(ordem => {
                const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || 0);
                
                // APENAS custos reais das contas a pagar vinculadas
                const custos = ordem.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
                const lucro = receita - custos;
                return { ...ordem, receita, custos, lucro };
              })
              .sort((a, b) => b.lucro - a.lucro)
              .slice(0, 5)
              .map((ordem, index) => (
                <div key={ordem.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">#{ordem.numero_os}</span>
                  <span className={`font-semibold ${ordem.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatarMoeda(ordem.lucro)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Técnicos</h3>
          <div className="space-y-2">
            {analiseTecnicos.slice(0, 5).map((tecnico, index) => (
              <div key={tecnico.tecnico_id} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 truncate">{tecnico.nome}</span>
                <span className={`font-semibold ${tecnico.lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatarMoeda(tecnico.lucroTotal)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabelaOS = () => {
    const ordensFiltradas = ordens
      .filter(ordem => {
        if (filtroTecnico && ordem.tecnico_id !== filtroTecnico) return false;
        if (filtroStatus && ordem.status !== filtroStatus) return false;
        
        const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || 0);
        
        // APENAS custos reais das contas a pagar vinculadas
        const custos = ordem.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
        const lucro = receita - custos;
        
        if (filtroLucratividade === 'lucrativa' && lucro <= 0) return false;
        if (filtroLucratividade === 'prejuizo' && lucro >= 0) return false;
        if (filtroLucratividade === 'neutra' && lucro !== 0) return false;
        
        return true;
      })
      .sort((a, b) => {
        const aReceita = (a.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (a.valor_faturado || 0);
        const aCustos = a.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
        const aLucro = aReceita - aCustos;
        
        const bReceita = (b.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (b.valor_faturado || 0);
        const bCustos = b.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
        const bLucro = bReceita - bCustos;
        
        return ordenacao.direcao === 'asc' ? aLucro - bLucro : bLucro - aLucro;
      });

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Análise Detalhada por OS</h3>
          <p className="text-sm text-gray-600 mt-1">
            {ordensFiltradas.length} de {ordens.length} ordens de serviço
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Técnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receita
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lucro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordensFiltradas.map((ordem) => {
                const receita = (ordem.vendas?.reduce((acc, venda) => acc + venda.valor_pago, 0) || 0) + (ordem.valor_faturado || 0);
                
                // APENAS custos reais das contas a pagar vinculadas
                const custos = ordem.custos?.reduce((acc, custo) => acc + custo.valor, 0) || 0;
                const lucro = receita - custos;
                const margem = receita > 0 ? (lucro / receita) * 100 : 0;
                
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ordem.status === 'finalizada' ? 'bg-green-100 text-green-800' :
                        ordem.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ordem.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatarMoeda(receita)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatarMoeda(custos)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                      lucro >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatarMoeda(lucro)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                      margem >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatarPercentual(margem)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ordem.created_at).toLocaleDateString('pt-BR')}
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

  const renderAnaliseTecnicos = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Análise por Técnico</h3>
        <p className="text-sm text-gray-600 mt-1">
          Ranking de desempenho e lucratividade
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Técnico
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total OS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Receita
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Custos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lucro
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Margem
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {analiseTecnicos.map((tecnico, index) => (
              <tr key={tecnico.tecnico_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tecnico.nome}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tecnico.totalOS}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatarMoeda(tecnico.receitaTotal)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatarMoeda(tecnico.custosTotal)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                  tecnico.lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatarMoeda(tecnico.lucroTotal)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
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
          {loading ? (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <FiRefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Carregando dados de lucro e desempenho...</p>
                <p className="text-gray-500 text-sm mt-2">Otimizando consultas para melhor performance</p>
              </div>
            </div>
          ) : (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Lucro & Desempenho</h1>
              <p className="mt-2 text-gray-600">
                Análise detalhada de lucratividade e performance por OS e técnico
              </p>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Período
                  </label>
                  <select
                    value={filtroPeriodo}
                    onChange={(e) => setFiltroPeriodo(e.target.value as FiltroPeriodo)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hoje">Hoje</option>
                    <option value="semana">Esta Semana</option>
                    <option value="mes">Este Mês</option>
                    <option value="trimestre">Este Trimestre</option>
                    <option value="ano">Este Ano</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>

                {filtroPeriodo === 'personalizado' && (
                  <>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data Início
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data Fim
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={loadData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Atualizar
                  </button>
                </div>
              </div>

              {/* Filtros adicionais para visualizações específicas */}
              {(visualizacaoAtiva === 'os' || visualizacaoAtiva === 'tecnicos') && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-4 items-end">
                    {visualizacaoAtiva === 'os' && (
                      <>
                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Técnico
                          </label>
                          <select
                            value={filtroTecnico}
                            onChange={(e) => setFiltroTecnico(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Todos</option>
                            {Array.from(new Set(ordens.map(o => o.tecnico_id)))
                              .filter(Boolean)
                              .map(tecnicoId => {
                                const tecnico = ordens.find(o => o.tecnico_id === tecnicoId)?.tecnico;
                                return tecnico ? { id: tecnicoId, nome: tecnico.nome } : null;
                              })
                              .filter(Boolean)
                              .map(tecnico => (
                                <option key={tecnico!.id} value={tecnico!.id}>
                                  {tecnico!.nome}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                          </label>
                          <select
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Todos</option>
                            <option value="aberta">Aberta</option>
                            <option value="em_andamento">Em Andamento</option>
                            <option value="finalizada">Finalizada</option>
                            <option value="cancelada">Cancelada</option>
                          </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lucratividade
                          </label>
                          <select
                            value={filtroLucratividade}
                            onChange={(e) => setFiltroLucratividade(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Todas</option>
                            <option value="lucrativa">Lucrativa</option>
                            <option value="prejuizo">Prejuízo</option>
                            <option value="neutra">Neutra</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navegação de Visualização */}
            <div className="mb-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setVisualizacaoAtiva('dashboard')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    visualizacaoAtiva === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FiTarget className="w-4 h-4 inline mr-2" />
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
                  <FiEye className="w-4 h-4 inline mr-2" />
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

'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import { useToast } from '@/components/Toast';
import { FiDollarSign, FiUsers, FiTrendingUp, FiCalendar, FiFilter, FiDownload, FiX, FiUser, FiCheckCircle, FiClock, FiEye } from 'react-icons/fi';

interface ComissaoDetalhada {
  id: string;
  tecnico_id: string;
  tecnico_nome: string;
  ordem_servico_id: string;
  numero_os: string;
  cliente_nome: string;
  servico_nome: string;
  valor_servico: number;
  valor_peca: number;
  valor_total: number;
  tipo_comissao: 'porcentagem' | 'fixo';
  percentual_comissao?: number | null;
  valor_comissao_fixa?: number | null;
  valor_comissao: number;
  data_entrega: string;
  status: string;
  tipo_ordem: string;
  created_at: string;
}

interface TecnicoResumo {
  tecnico_id: string;
  nome: string;
  total_comissoes: number;
  total_comissao_valor: number;
  quantidade_os: number;
  media_comissao: number;
  status_paga: number;
  status_calculada: number;
  status_pendente: number;
}

interface Filtros {
  dataInicio: string;
  dataFim: string;
  tecnicoId: string;
  status: string;
  tipoOrdem: string;
}

export default function ComissoesTecnicosPage() {
  const { usuarioData } = useAuth();
  const { addToast } = useToast();
  
  const [comissoes, setComissoes] = useState<ComissaoDetalhada[]>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<Filtros>({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    tecnicoId: '',
    status: '',
    tipoOrdem: ''
  });

  // Resumo por técnico
  const resumoPorTecnico = useMemo(() => {
    const resumo = new Map<string, TecnicoResumo>();
    
    comissoes.forEach(comissao => {
      if (!resumo.has(comissao.tecnico_id)) {
        resumo.set(comissao.tecnico_id, {
          tecnico_id: comissao.tecnico_id,
          nome: comissao.tecnico_nome,
          total_comissoes: 0,
          total_comissao_valor: 0,
          quantidade_os: 0,
          media_comissao: 0,
          status_paga: 0,
          status_calculada: 0,
          status_pendente: 0
        });
      }
      
      const tecnico = resumo.get(comissao.tecnico_id)!;
      tecnico.quantidade_os += 1;
      tecnico.total_comissao_valor += comissao.valor_comissao;
      tecnico.total_comissoes += 1;
      
      if (comissao.status === 'PAGA') tecnico.status_paga += 1;
      else if (comissao.status === 'CALCULADA') tecnico.status_calculada += 1;
      else tecnico.status_pendente += 1;
    });
    
    // Calcular média
    resumo.forEach(tecnico => {
      tecnico.media_comissao = tecnico.quantidade_os > 0 
        ? tecnico.total_comissao_valor / tecnico.quantidade_os 
        : 0;
    });
    
    return Array.from(resumo.values()).sort((a, b) => b.total_comissao_valor - a.total_comissao_valor);
  }, [comissoes]);

  // Métricas gerais
  const metricas = useMemo(() => {
    const total = comissoes.reduce((acc, c) => acc + c.valor_comissao, 0);
    const totalOSs = comissoes.length;
    const mediaGeral = totalOSs > 0 ? total / totalOSs : 0;
    const totalTecnicos = resumoPorTecnico.length;
    const totalPago = comissoes.filter(c => c.status === 'PAGA').reduce((acc, c) => acc + c.valor_comissao, 0);
    const totalCalculado = comissoes.filter(c => c.status === 'CALCULADA').reduce((acc, c) => acc + c.valor_comissao, 0);
    
    return {
      totalComissao: total,
      totalOSs,
      mediaGeral,
      totalTecnicos,
      totalPago,
      totalCalculado
    };
  }, [comissoes, resumoPorTecnico]);

  // Filtrar comissões
  const comissoesFiltradas = useMemo(() => {
    return comissoes.filter(comissao => {
      const dataEntrega = new Date(comissao.data_entrega);
      const dataInicio = new Date(filtros.dataInicio);
      const dataFim = new Date(filtros.dataFim);
      dataFim.setHours(23, 59, 59, 999); // Incluir o dia inteiro
      
      const dentroPeriodo = dataEntrega >= dataInicio && dataEntrega <= dataFim;
      const tecnicoMatch = !filtros.tecnicoId || comissao.tecnico_id === filtros.tecnicoId;
      const statusMatch = !filtros.status || comissao.status === filtros.status;
      const tipoMatch = !filtros.tipoOrdem || comissao.tipo_ordem === filtros.tipoOrdem;
      
      return dentroPeriodo && tecnicoMatch && statusMatch && tipoMatch;
    });
  }, [comissoes, filtros]);

  useEffect(() => {
    if (usuarioData?.empresa_id) {
      fetchData();
    }
  }, [usuarioData]);

  const fetchData = async () => {
    if (!usuarioData?.empresa_id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Buscar técnicos da empresa
      const { data: tecnicosData, error: tecnicosError } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('nivel', 'tecnico')
        .order('nome');

      if (tecnicosError) {
        console.error('Erro ao buscar técnicos:', tecnicosError);
        addToast('error', 'Erro ao carregar técnicos');
      } else {
        setTecnicos(tecnicosData || []);
      }

      // Buscar comissões de todos os técnicos da empresa
      const { data: comissoesData, error } = await supabase
        .from('comissoes_historico')
        .select(`
          id,
          tecnico_id,
          ordem_servico_id,
          valor_servico,
          valor_peca,
          valor_total,
          tipo_comissao,
          percentual_comissao,
          valor_comissao_fixa,
          valor_comissao,
          data_entrega,
          status,
          tipo_ordem,
          created_at,
          tecnico:tecnico_id (
            nome
          ),
          ordens_servico:ordem_servico_id (
            numero_os,
            servico
          ),
          clientes:cliente_id (
            nome
          )
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('data_entrega', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar comissões:', error);
        addToast('error', 'Erro ao carregar comissões: ' + error.message);
        setComissoes([]);
        return;
      }

      // Formatar os dados
      const comissoesFormatadas = (comissoesData || []).map((comissao: any) => ({
        id: comissao.id,
        tecnico_id: comissao.tecnico_id,
        tecnico_nome: comissao.tecnico?.nome || 'Técnico não encontrado',
        ordem_servico_id: comissao.ordem_servico_id,
        numero_os: comissao.ordens_servico?.numero_os || 'N/A',
        cliente_nome: comissao.clientes?.nome || 'Cliente não encontrado',
        servico_nome: comissao.ordens_servico?.servico || 'Serviço não especificado',
        valor_servico: comissao.valor_servico || 0,
        valor_peca: comissao.valor_peca || 0,
        valor_total: comissao.valor_total || 0,
        tipo_comissao: comissao.tipo_comissao || 'porcentagem',
        percentual_comissao: comissao.percentual_comissao,
        valor_comissao_fixa: comissao.valor_comissao_fixa,
        valor_comissao: comissao.valor_comissao || 0,
        data_entrega: comissao.data_entrega,
        status: comissao.status || 'CALCULADA',
        tipo_ordem: comissao.tipo_ordem || 'normal',
        created_at: comissao.created_at
      }));

      setComissoes(comissoesFormatadas);

    } catch (error) {
      console.error('💥 Erro geral:', error);
      addToast('error', 'Erro ao carregar dados: ' + (error as Error).message);
      setComissoes([]);
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
    switch (status?.toUpperCase()) {
      case 'PAGA':
        return 'bg-green-100 text-green-800';
      case 'CALCULADA':
        return 'bg-blue-100 text-blue-800';
      case 'PENDENTE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportarCSV = () => {
    const headers = ['Técnico', 'OS', 'Cliente', 'Serviço', 'Data Entrega', 'Valor Total', 'Tipo', 'Percentual/Fixo', 'Comissão', 'Status'];
    const csvContent = [
      headers.join(','),
      ...comissoesFiltradas.map(c => [
        c.tecnico_nome,
        c.numero_os || 'N/A',
        c.cliente_nome || 'N/A',
        c.servico_nome || 'N/A',
        formatDate(c.data_entrega),
        c.valor_total.toFixed(2),
        c.tipo_comissao === 'fixo' ? 'Fixo' : 'Porcentagem',
        c.tipo_comissao === 'fixo' 
          ? `R$ ${c.valor_comissao_fixa?.toFixed(2) || '0,00'}` 
          : `${c.percentual_comissao || 0}%`,
        c.valor_comissao.toFixed(2),
        c.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comissoes_tecnicos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando comissões...</p>
          </div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiUsers className="text-blue-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Comissões dos Técnicos</h1>
              <p className="text-gray-600">Resumo e gestão de comissões de todos os técnicos</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FiFilter size={16} />
              Filtros
            </button>
            
            <button
              onClick={exportarCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiDownload size={16} />
              Exportar
            </button>
          </div>
        </div>

        {/* Filtros */}
        {mostrarFiltros && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              <button
                onClick={() => setMostrarFiltros(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                <input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Técnico</label>
                <select
                  value={filtros.tecnicoId}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tecnicoId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  {tecnicos.map(tecnico => (
                    <option key={tecnico.id} value={tecnico.id}>{tecnico.nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="CALCULADA">Calculada</option>
                  <option value="PAGA">Paga</option>
                  <option value="PENDENTE">Pendente</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={filtros.tipoOrdem}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipoOrdem: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="SERVICO">Serviço</option>
                  <option value="RETORNO">Retorno</option>
                  <option value="GARANTIA">Garantia</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Métricas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiDollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Comissões</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metricas.totalComissao)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiUsers className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Técnicos</p>
                <p className="text-2xl font-bold text-gray-900">{metricas.totalTecnicos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiTrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Média por OS</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metricas.mediaGeral)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FiCalendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total OSs</p>
                <p className="text-2xl font-bold text-gray-900">{metricas.totalOSs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo por Técnico */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Resumo por Técnico ({resumoPorTecnico.length} técnicos)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Técnico
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OSs
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Comissões
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Média por OS
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paga
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calculada
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pendente
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resumoPorTecnico.map((tecnico) => (
                  <tr key={tecnico.tecnico_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiUser className="text-gray-400 mr-2" size={16} />
                        <div className="text-sm font-medium text-gray-900">{tecnico.nome}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{tecnico.quantidade_os}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-green-600">
                        {formatCurrency(tecnico.total_comissao_valor)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(tecnico.media_comissao)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {tecnico.status_paga}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tecnico.status_calculada}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {tecnico.status_pendente}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resumoPorTecnico.length === 0 && (
            <div className="text-center py-12">
              <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum técnico encontrado</h3>
              <p className="text-gray-500">Não há comissões registradas para o período selecionado.</p>
            </div>
          )}
        </div>

        {/* Tabela Detalhada */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Histórico Detalhado ({comissoesFiltradas.length} registros)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Técnico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serviço
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo / Valor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comissoesFiltradas.map((comissao) => (
                  <tr key={comissao.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{comissao.tecnico_nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{comissao.numero_os || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{comissao.cliente_nome}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {comissao.servico_nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(comissao.valor_total)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {comissao.tipo_comissao === 'fixo' ? (
                          <span className="text-blue-600">
                            R$ {comissao.valor_comissao_fixa?.toFixed(2) || '0,00'} (fixo)
                          </span>
                        ) : (
                          <span>
                            {comissao.percentual_comissao || 0}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-green-600">
                        {formatCurrency(comissao.valor_comissao)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(comissao.status)}`}>
                        {comissao.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">
                        {formatDate(comissao.data_entrega)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comissoesFiltradas.length === 0 && (
            <div className="text-center py-12">
              <FiDollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma comissão encontrada</h3>
              <p className="text-gray-500">
                {comissoes.length === 0 
                  ? 'Não há comissões registradas.'
                  : 'Tente ajustar os filtros para ver mais resultados.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </MenuLayout>
  );
}


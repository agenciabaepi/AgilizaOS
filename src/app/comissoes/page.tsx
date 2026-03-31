'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
// Removido ProtectedArea - agora é responsabilidade do MenuLayout
import { useToast } from '@/components/Toast';
import { FiDollarSign, FiCalendar, FiTrendingUp, FiEye, FiDownload, FiFilter, FiX } from 'react-icons/fi';

interface ComissaoDetalhada {
  id: string;
  valor_servico: number;
  valor_peca: number;
  valor_total: number;
  tipo_comissao?: 'porcentagem' | 'fixo';
  percentual_comissao?: number | null;
  valor_comissao_fixa?: number | null;
  valor_comissao: number;
  data_entrega: string;
  status: string;
  tipo_ordem: string;
  ordem_servico_id: string;
  numero_os?: string;
  cliente_nome?: string;
  servico_nome?: string;
  created_at: string;
  ativa?: boolean;
  observacoes?: string | null;
  status_os?: string | null;
  status_tecnico_os?: string | null;
}

interface FiltrosPeriodo {
  dataInicio: string;
  dataFim: string;
  status: string;
  tipoOrdem: string;
}

export default function ComissoesPage() {
  const { usuarioData, session } = useAuth();
  const { addToast } = useToast();
  
  const [comissoes, setComissoes] = useState<ComissaoDetalhada[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Padrão: "Mês atual e pendentes" = mês atual (todas) + de outros meses só as não calculadas (PREVISTA/PENDENTE)
  const [exibirModo, setExibirModo] = useState<'padrao' | 'todas'>('padrao');
  const [filtros, setFiltros] = useState<FiltrosPeriodo>({
    dataInicio: '',
    dataFim: '',
    status: '',
    tipoOrdem: ''
  });

  const isCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return !isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  // Filtrar: padrão = mês atual + não calculadas de outros meses (PREVISTA/PENDENTE); depois aplica filtros manuais
  const comissoesFiltradas = useMemo(() => {
    let base = comissoes;
    if (exibirModo === 'padrao') {
      base = comissoes.filter(c => {
        const noMesAtual = isCurrentMonth(c.data_entrega);
        const naoCalculadaOuPendente =
          (c.status || '').toUpperCase() === 'PREVISTA' || (c.status || '').toUpperCase() === 'PENDENTE';
        return noMesAtual || naoCalculadaOuPendente;
      });
    }
    return base.filter(comissao => {
      const filtroPorData = filtros.dataInicio && filtros.dataFim;
      let dentroPeriodo = true;
      if (filtroPorData) {
        const dataEntrega = new Date(comissao.data_entrega);
        const dataInicio = new Date(filtros.dataInicio);
        const dataFim = new Date(filtros.dataFim);
        dentroPeriodo = !isNaN(dataEntrega.getTime()) && dataEntrega >= dataInicio && dataEntrega <= dataFim;
      }
      const statusMatch = !filtros.status || comissao.status === filtros.status;
      const tipoMatch = !filtros.tipoOrdem || comissao.tipo_ordem === filtros.tipoOrdem;
      return dentroPeriodo && statusMatch && tipoMatch;
    });
  }, [comissoes, filtros, exibirModo]);

// Métricas calculadas (apenas comissões ativas) COM OS MESMOS FILTROS da tabela
const metricas = useMemo(() => {
  const comissoesAtivasFiltradas = comissoesFiltradas.filter(c => c.ativa !== false);
  const total = comissoesAtivasFiltradas.reduce((acc, c) => acc + c.valor_comissao, 0);
  const totalPagas = comissoesAtivasFiltradas
    .filter(c => (c.status || '').toUpperCase() === 'PAGA')
    .reduce((acc, c) => acc + c.valor_comissao, 0);
  const totalPrevistas = comissoesAtivasFiltradas
    .filter(c => (c.status || '').toUpperCase() !== 'PAGA')
    .reduce((acc, c) => acc + c.valor_comissao, 0);
  const mediaComissao = comissoesAtivasFiltradas.length > 0 ? total / comissoesAtivasFiltradas.length : 0;
  const totalOSs = comissoesAtivasFiltradas.length;
  
  return {
    totalComissao: total,
    totalComissaoPaga: totalPagas,
    totalComissaoPrevista: totalPrevistas,
    mediaComissao,
    totalOSs
  };
}, [comissoesFiltradas]);

  useEffect(() => {
    fetchComissoes();
  }, [usuarioData, session]);

  const fetchComissoes = async () => {
    if (!usuarioData?.id || !usuarioData?.empresa_id) {
      setLoading(false);
      return;
    }
    // Só chama a API quando tiver token (evita 401 por sessão não estar nos cookies)
    if (!session?.access_token) {
      setLoading(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/comissoes/minhas', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        addToast('error', data.error || 'Erro ao carregar comissões');
        setComissoes([]);
        return;
      }

      setComissoes(data.comissoes || []);
    } catch (error) {
      console.error('💥 Comissões - Erro geral:', error);
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
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'calculada':
        return 'bg-blue-100 text-blue-800';
      case 'paga':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'prevista':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportarCSV = () => {
    const headers = ['OS', 'Cliente', 'Serviço', 'Data Entrega', 'Valor Serviço', 'Tipo', 'Percentual/Fixo', 'Comissão', 'Status OS', 'Status'];
    const csvContent = [
      headers.join(','),
      ...comissoesFiltradas.map(c => [
        c.numero_os || 'N/A',
        c.cliente_nome || 'N/A',
        c.servico_nome || 'N/A',
        formatDate(c.data_entrega),
        c.valor_servico.toFixed(2),
        c.tipo_comissao === 'fixo' ? 'Fixo' : 'Porcentagem',
        c.tipo_comissao === 'fixo' 
          ? `R$ ${c.valor_comissao_fixa?.toFixed(2) || '0,00'}` 
          : `${c.percentual_comissao || 0}%`,
        c.valor_comissao.toFixed(2),
        c.status_os || '—',
        c.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comissoes_${new Date().toISOString().split('T')[0]}.csv`;
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
              <FiDollarSign className="text-green-600" size={28} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Minhas Comissões</h1>
                <p className="text-gray-600">Relatório detalhado dos seus ganhos</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Exibir:</span>
              <select
                value={exibirModo}
                onChange={(e) => setExibirModo(e.target.value as 'padrao' | 'todas')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="padrao">Mês atual e pendentes</option>
                <option value="todas">Todas</option>
              </select>
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
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <option value="PREVISTA">Prevista</option>
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

          {/* Métricas - apenas valores do técnico (comissões e quantidade de OSs) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiDollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Comissões recebidas (pagas)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(metricas.totalComissaoPaga)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FiTrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Comissões previstas (a receber)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(metricas.totalComissaoPrevista)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FiCalendar className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total OSs</p>
                  <p className="text-2xl font-bold text-gray-900">{metricas.totalOSs}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Comissões */}
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
                      OS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Serviço
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Serviço
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo / Valor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comissão
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status OS
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
                    <tr key={comissao.id} className={`hover:bg-gray-50 ${comissao.ativa === false ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900">
                            #{comissao.numero_os || 'N/A'}
                          </div>
                          {comissao.ativa === false && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800" title="Esta comissão foi desativada pelo administrador">
                              Desativada
                            </span>
                          )}
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
                          {formatCurrency(comissao.valor_servico)}
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
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-sm font-bold text-green-600">
                            {formatCurrency(comissao.valor_comissao)}
                          </div>
                          {(comissao.status || '').toUpperCase() !== 'PAGA' && (
                            <span className="text-[11px] text-orange-600 font-medium">
                              Prevista (cliente ainda não pagou)
                            </span>
                          )}
                          {comissao.observacoes && (
                            <span className="text-xs text-gray-500 italic" title={comissao.observacoes}>
                              {comissao.observacoes.length > 30 ? `${comissao.observacoes.substring(0, 30)}...` : comissao.observacoes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-700" title={comissao.status_tecnico_os ? `Técnico: ${comissao.status_tecnico_os}` : undefined}>
                          {comissao.status_os || '—'}
                          {comissao.status_tecnico_os && comissao.status_tecnico_os !== comissao.status_os && (
                            <span className="block text-xs text-gray-500">{comissao.status_tecnico_os}</span>
                          )}
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
                    ? 'Você ainda não possui comissões registradas.'
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

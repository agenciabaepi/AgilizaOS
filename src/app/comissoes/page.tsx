'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
}

interface FiltrosPeriodo {
  dataInicio: string;
  dataFim: string;
  status: string;
  tipoOrdem: string;
}

export default function ComissoesPage() {
  const { user, usuarioData } = useAuth();
  const { addToast } = useToast();
  
  const [comissoes, setComissoes] = useState<ComissaoDetalhada[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<FiltrosPeriodo>({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    status: '',
    tipoOrdem: ''
  });

// Filtrar comissões
  const comissoesFiltradas = useMemo(() => {
    return comissoes.filter(comissao => {
      const dataEntrega = new Date(comissao.data_entrega);
      const dataInicio = new Date(filtros.dataInicio);
      const dataFim = new Date(filtros.dataFim);
      
      const dentroPerido = dataEntrega >= dataInicio && dataEntrega <= dataFim;
      const statusMatch = !filtros.status || comissao.status === filtros.status;
      const tipoMatch = !filtros.tipoOrdem || comissao.tipo_ordem === filtros.tipoOrdem;
      
      return dentroPerido && statusMatch && tipoMatch;
    });
  }, [comissoes, filtros]);

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
  }, [usuarioData]);

  const fetchComissoes = async () => {
    if (!usuarioData?.id || !usuarioData?.empresa_id) {
      console.log('⚠️ Comissões - dados do técnico/empresa não disponíveis:', usuarioData);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const tecnicoTabelaId = usuarioData.id;
      const tecnicoAuthId = user?.id;

      // Buscar comissões já registradas diretamente da tabela comissoes_historico usando o id do técnico
      // Tentar buscar com o campo 'ativa' primeiro, se não existir, buscar sem ele
      let comissoesData, error;
      
      try {
        const result = await supabase
          .from('comissoes_historico')
          .select(`
            id,
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
            ativa,
            observacoes,
            ordens_servico:ordem_servico_id (
              numero_os,
              servico
            ),
            clientes:cliente_id (
              nome
            )
          `)
          .eq('tecnico_id', tecnicoTabelaId)
          .order('data_entrega', { ascending: false })
          .order('created_at', { ascending: false });
        
        comissoesData = result.data;
        error = result.error;
      } catch (err: any) {
        // Se o campo 'ativa' não existir, buscar sem ele
        if (err.message?.includes('column "ativa" does not exist')) {
          const result = await supabase
            .from('comissoes_historico')
            .select(`
              id,
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
              ordens_servico:ordem_servico_id (
                numero_os,
                servico
              ),
              clientes:cliente_id (
                nome
              )
            `)
            .eq('tecnico_id', tecnicoTabelaId)
            .order('data_entrega', { ascending: false })
            .order('created_at', { ascending: false });
          
          comissoesData = result.data;
          error = result.error;
        } else {
          throw err;
        }
      }

      if (error) {
        console.error('❌ Erro ao buscar comissões:', error);
        addToast('error', 'Erro ao carregar comissões: ' + error.message);
        setComissoes([]);
        return;
      }

      // Formatar os dados para o formato esperado
      const comissoesFormatadas: ComissaoDetalhada[] = (comissoesData || []).map((comissao: any) => ({
        id: comissao.id,
        ordem_servico_id: comissao.ordem_servico_id,
        numero_os: comissao.ordens_servico?.numero_os || 'N/A',
        valor_servico: comissao.valor_servico || 0,
        valor_peca: comissao.valor_peca || 0,
        valor_total: comissao.valor_total || 0,
        tipo_comissao: comissao.tipo_comissao,
        percentual_comissao: comissao.percentual_comissao,
        valor_comissao_fixa: comissao.valor_comissao_fixa,
        valor_comissao: comissao.valor_comissao || 0,
        data_entrega: comissao.data_entrega,
        status: comissao.status || 'CALCULADA',
        tipo_ordem: comissao.tipo_ordem || 'normal',
        created_at: comissao.created_at,
        cliente_nome: comissao.clientes?.nome || 'Cliente não encontrado',
        servico_nome: comissao.ordens_servico?.servico || 'Serviço não especificado',
        ativa: comissao.ativa !== undefined ? comissao.ativa : true, // Default true se não existir o campo
        observacoes: comissao.observacoes || null
      }));

      // Criar um set com OS que já possuem comissão registrada para não duplicar nas previstas
      const osComComissao = new Set<string>(
        comissoesFormatadas
          .map((c) => c.ordem_servico_id)
          .filter((id): id is string => Boolean(id))
      );

      // ============================
      //  PREVISÃO DE COMISSÕES
      // ============================
      // 1) Buscar configuração de comissão do técnico / empresa
      let tipoComissao: 'porcentagem' | 'fixo' = 'porcentagem';
      let valorBaseComissao = 10; // fallback padrão (10%)

      try {
        const { data: tecnicoConfig } = await supabase
          .from('usuarios')
          .select('id, tipo_comissao, comissao_fixa, comissao_percentual, empresa_id, comissao_ativa')
          .eq('id', tecnicoTabelaId)
          .maybeSingle();

        const { data: configEmpresa } = await supabase
          .from('configuracoes_comissao')
          .select('tipo_comissao, comissao_fixa_padrao, comissao_padrao')
          .eq('empresa_id', usuarioData.empresa_id)
          .maybeSingle();

        if (tecnicoConfig?.tipo_comissao) {
          tipoComissao = tecnicoConfig.tipo_comissao as 'porcentagem' | 'fixo';
          if (tipoComissao === 'fixo') {
            valorBaseComissao = tecnicoConfig.comissao_fixa || 0;
          } else {
            valorBaseComissao = tecnicoConfig.comissao_percentual || 10;
          }
        } else if (configEmpresa?.tipo_comissao) {
          tipoComissao = configEmpresa.tipo_comissao as 'porcentagem' | 'fixo';
          if (tipoComissao === 'fixo') {
            valorBaseComissao = configEmpresa.comissao_fixa_padrao || 0;
          } else {
            valorBaseComissao = configEmpresa.comissao_padrao || 10;
          }
        }
      } catch (e) {
        console.warn('⚠️ Não foi possível carregar configuração de comissão, usando padrão.', e);
      }

      // 2) Buscar OS do técnico que ainda não geraram comissões_historico (para prever)
      //    Considera tanto o id da tabela usuarios quanto o auth_user_id, como no dashboard técnico.
      const filtroTecnico: string[] = [];
      if (tecnicoTabelaId) filtroTecnico.push(`tecnico_id.eq.${tecnicoTabelaId}`);
      if (tecnicoAuthId) filtroTecnico.push(`tecnico_id.eq.${tecnicoAuthId}`);
      const orClause = filtroTecnico.length > 0 ? filtroTecnico.join(',') : '';

      let comissoesPrevistas: ComissaoDetalhada[] = [];

      if (orClause) {
        const { data: ordensData, error: ordensError } = await supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            empresa_id,
            cliente_id,
            valor_faturado,
            valor_servico,
            valor_peca,
            status,
            status_tecnico,
            tipo,
            data_entrega,
            created_at,
            clientes:cliente_id ( nome ),
            servico
          `)
          .eq('empresa_id', usuarioData.empresa_id)
          .or(orClause)
          .order('created_at', { ascending: false });

        if (ordensError) {
          console.warn('⚠️ Erro ao buscar OS para previsões de comissão:', ordensError);
        } else if (ordensData && ordensData.length > 0) {
          const normalizeStatus = (s: string | null | undefined) =>
            (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

          comissoesPrevistas = ordensData
            // Filtrar: ainda não tem comissão registrada e tem algum valor
            .filter((os: any) => {
              if (osComComissao.has(os.id)) return false;

              const valorTotal =
                (os.valor_faturado as number | null) ??
                (os.valor_servico as number | null) ??
                0;
              if (!valorTotal || valorTotal <= 0) return false;

              const status = normalizeStatus(os.status);
              const statusTec = normalizeStatus(os.status_tecnico);

              // Já finalizadas/entregues vão gerar comissão real pelo backend; aqui queremos só "previstas"
              const finalizada =
                status === 'ENTREGUE' || statusTec === 'REPARO CONCLUIDO';
              if (finalizada) return false;

              return true;
            })
            .map((os: any) => {
              const valorTotal =
                (os.valor_faturado as number | null) ??
                (os.valor_servico as number | null) ??
                0;
              const valorServico = (os.valor_servico as number | null) ?? valorTotal ?? 0;

              let valorComissao = 0;
              if (tipoComissao === 'fixo') {
                valorComissao = valorBaseComissao;
              } else {
                // Comissão % sobre o valor do SERVIÇO (mesma base da coluna "VALOR SERVIÇO")
                valorComissao = (valorServico * valorBaseComissao) / 100;
              }

              const dataEntregaBase =
                os.data_entrega || os.created_at || new Date().toISOString();

              return {
                id: `prevista-${os.id}`,
                tecnico_id: tecnicoTabelaId,
                tecnico_nome: usuarioData.nome || 'Você',
                ordem_servico_id: os.id,
                numero_os: os.numero_os || 'N/A',
                cliente_nome: os.clientes?.nome || 'Cliente não encontrado',
                servico_nome: os.servico || 'Serviço não especificado',
                valor_servico: valorServico,
                valor_peca: os.valor_peca || 0,
                valor_total: valorTotal || 0,
                tipo_comissao: tipoComissao,
                percentual_comissao: tipoComissao === 'porcentagem' ? valorBaseComissao : 0,
                valor_comissao_fixa: tipoComissao === 'fixo' ? valorBaseComissao : null,
                valor_comissao: valorComissao,
                data_entrega: dataEntregaBase,
                status: 'PREVISTA',
                tipo_ordem: (os.tipo || 'normal').toLowerCase(),
                created_at: dataEntregaBase,
                ativa: true,
                observacoes: null
              } as ComissaoDetalhada;
            });
        }
      }

      // Mesclar comissões reais + previstas
      setComissoes([...comissoesFormatadas, ...comissoesPrevistas]);

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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportarCSV = () => {
    const headers = ['OS', 'Cliente', 'Serviço', 'Data Entrega', 'Valor Serviço', 'Tipo', 'Percentual/Fixo', 'Comissão', 'Status'];
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

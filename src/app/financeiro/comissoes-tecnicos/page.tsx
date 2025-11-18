'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import { useToast } from '@/components/Toast';
import { FiDollarSign, FiUsers, FiTrendingUp, FiCalendar, FiFilter, FiDownload, FiX, FiUser, FiEye, FiEdit, FiSave, FiPower, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { useConfirm } from '@/components/ConfirmDialog';

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
  ativa?: boolean;
  observacoes?: string | null;
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
  const { usuarioData, session } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  const [comissoes, setComissoes] = useState<ComissaoDetalhada[]>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [comissaoEditando, setComissaoEditando] = useState<ComissaoDetalhada | null>(null);
  const [comissaoDetalhes, setComissaoDetalhes] = useState<ComissaoDetalhada | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [valorEditado, setValorEditado] = useState<number>(0);
  const [observacoesEditadas, setObservacoesEditadas] = useState<string>('');
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<Filtros>({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    tecnicoId: '',
    status: '',
    tipoOrdem: ''
  });

  // Resumo por técnico (considerando apenas comissões ativas)
  const resumoPorTecnico = useMemo(() => {
    const resumo = new Map<string, TecnicoResumo>();
    
    comissoes.filter(c => c.ativa !== false).forEach(comissao => {
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

  // Métricas gerais (considerando apenas comissões ativas)
  const metricas = useMemo(() => {
    const comissoesAtivas = comissoes.filter(c => c.ativa !== false);
    const total = comissoesAtivas.reduce((acc, c) => acc + c.valor_comissao, 0);
    const totalOSs = comissoesAtivas.length;
    const mediaGeral = totalOSs > 0 ? total / totalOSs : 0;
    const totalTecnicos = resumoPorTecnico.length;
    const totalPago = comissoesAtivas.filter(c => c.status === 'PAGA').reduce((acc, c) => acc + c.valor_comissao, 0);
    const totalCalculado = comissoesAtivas.filter(c => c.status === 'CALCULADA').reduce((acc, c) => acc + c.valor_comissao, 0);
    
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
      // Tentar buscar com o campo ativa primeiro
      let query = supabase
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
          observacoes,
          ativa,
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

      let { data: comissoesData, error } = await query;

      // Se der erro por campo não existir, tentar sem o campo ativa
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        console.log('⚠️ Campo ativa não existe, buscando sem ele...');
        const { data: dataRetry, error: errorRetry } = await supabase
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
            observacoes,
            ativa,
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

        if (errorRetry) {
          console.error('❌ Erro ao buscar comissões:', errorRetry);
          addToast('error', 'Erro ao carregar comissões: ' + (errorRetry.message || 'Erro desconhecido'));
          setComissoes([]);
          return;
        }

        // Garantir que dataRetry tenha a propriedade ativa mesmo se a coluna não existir no banco
        comissoesData = (dataRetry || []).map((item: any) => ({
          ...item,
          ativa: item.ativa !== undefined ? item.ativa : true
        }));
        error = null;
      }

      if (error) {
        console.error('❌ Erro ao buscar comissões:', error);
        addToast('error', 'Erro ao carregar comissões: ' + (error.message || 'Erro desconhecido'));
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
        created_at: comissao.created_at,
        // Campo ativa pode não existir ainda - usar true como padrão
        ativa: comissao.ativa !== undefined && comissao.ativa !== null ? comissao.ativa : true,
        observacoes: comissao.observacoes || null
      }));

      setComissoes(comissoesFormatadas);

      // Verificar se o campo ativa existe fazendo uma query de teste
      // Se a query com o campo ativa funcionar, o campo existe
      if (comissoesFormatadas.length > 0) {
        const { error: testError } = await supabase
          .from('comissoes_historico')
          .select('ativa')
          .eq('id', comissoesFormatadas[0].id)
          .limit(1);
        
        setCampoAtivaExiste(!testError || !testError.message?.includes('column'));
      } else {
        // Se não há comissões, assumir que o campo não existe (será verificado na próxima vez)
        setCampoAtivaExiste(false);
      }

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

  // Verificar se é admin - considerar também usuarioteste como admin para funcionalidades
  const isAdmin = Boolean(usuarioData?.nivel === 'admin' || usuarioData?.nivel === 'usuarioteste');
  const [campoAtivaExiste, setCampoAtivaExiste] = useState<boolean | null>(null);

  // Debug: verificar nível do usuário
  useEffect(() => {
    if (usuarioData) {
      console.log('🔍 Debug Comissões - Nível do usuário:', usuarioData.nivel, 'isAdmin:', isAdmin, 'usuarioData completo:', usuarioData);
    } else {
      console.log('🔍 Debug Comissões - usuarioData ainda não carregou');
    }
  }, [usuarioData, isAdmin]);

  const handleEditarComissao = (comissao: ComissaoDetalhada) => {
    setComissaoEditando(comissao);
    setValorEditado(comissao.valor_comissao);
    setObservacoesEditadas(comissao.observacoes || '');
  };

  const handleSalvarEdicao = async () => {
    if (!comissaoEditando) return;

    setSalvando(true);
    try {
      // Obter token de autenticação da sessão
      const token = session?.access_token;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Adicionar token de autenticação se disponível
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/comissoes/atualizar', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          comissaoId: comissaoEditando.id,
          valorComissao: valorEditado,
          observacoes: observacoesEditadas,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        addToast('error', result.error || 'Erro ao atualizar comissão');
        return;
      }

      // Recarregar dados do banco para garantir sincronização
      await fetchData();

      addToast('success', 'Comissão atualizada com sucesso!');
      setComissaoEditando(null);
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      addToast('error', 'Erro inesperado ao atualizar comissão');
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleAtiva = async (comissao: ComissaoDetalhada) => {
    const confirmado = await confirm({
      title: comissao.ativa ? 'Desativar Comissão' : 'Ativar Comissão',
      message: comissao.ativa 
        ? `Tem certeza que deseja desativar esta comissão? Ela não será mais considerada nos cálculos.`
        : `Tem certeza que deseja ativar esta comissão?`,
      confirmText: comissao.ativa ? 'Desativar' : 'Ativar',
      cancelText: 'Cancelar',
    });

    if (!confirmado) return;

    setSalvando(true);
    try {
      // Debug: verificar se há cookies antes de fazer a requisição
      console.log('🔍 Debug - Fazendo requisição para atualizar comissão:', {
        comissaoId: comissao.id,
        ativa: !comissao.ativa,
        url: '/api/comissoes/atualizar'
      });

      // Obter token de autenticação da sessão
      const token = session?.access_token;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Adicionar token de autenticação se disponível
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/comissoes/atualizar', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          comissaoId: comissao.id,
          ativa: !comissao.ativa,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        addToast('error', result.error || 'Erro ao atualizar comissão');
        return;
      }

      // Mostrar mensagem de sucesso
      addToast('success', comissao.ativa 
        ? 'Comissão desativada com sucesso. Ela não será mais considerada nos cálculos.'
        : 'Comissão ativada com sucesso. Ela será considerada nos cálculos.'
      );

      // Recarregar dados do banco para garantir sincronização
      await fetchData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      addToast('error', 'Erro inesperado ao atualizar comissão');
    } finally {
      setSalvando(false);
    }
  };

  const handleVerDetalhes = (comissao: ComissaoDetalhada) => {
    setComissaoDetalhes(comissao);
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
      <div className="p-3 md:-m-8 md:p-4 lg:p-6 space-y-4 md:space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <FiUsers className="text-blue-600 flex-shrink-0" size={28} />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Comissões dos Técnicos</h1>
              <p className="text-sm md:text-base text-gray-600">
                Resumo e gestão de comissões de todos os técnicos
                {isAdmin && <span className="ml-2 text-xs text-green-600">(Modo Admin - Edição habilitada)</span>}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm md:text-base"
            >
              <FiFilter size={16} />
              <span className="hidden sm:inline">Filtros</span>
            </button>
            
            <button
              onClick={exportarCSV}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
            >
              <FiDownload size={16} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        {mostrarFiltros && (
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Filtros</h3>
              <button
                onClick={() => setMostrarFiltros(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <FiDollarSign className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600 truncate">Total de Comissões</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">{formatCurrency(metricas.totalComissao)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-green-100 rounded-lg flex-shrink-0">
                <FiUsers className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600 truncate">Técnicos</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{metricas.totalTecnicos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                <FiTrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600 truncate">Média por OS</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">{formatCurrency(metricas.mediaGeral)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <FiCalendar className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600 truncate">Total OSs</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{metricas.totalOSs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo por Técnico */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 md:p-6 border-b border-gray-200">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              Resumo por Técnico ({resumoPorTecnico.length} técnicos)
            </h3>
          </div>

          {/* Versão Mobile - Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {resumoPorTecnico.map((tecnico) => (
              <div key={tecnico.tecnico_id} className="p-3 md:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiUser className="text-gray-400 flex-shrink-0" size={18} />
                    <div className="text-sm font-semibold text-gray-900">{tecnico.nome}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">OSs</p>
                    <p className="text-sm font-medium text-gray-900">{tecnico.quantidade_os}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Comissões</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(tecnico.total_comissao_valor)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Média por OS</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(tecnico.media_comissao)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        P: {tecnico.status_paga}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        C: {tecnico.status_calculada}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pe: {tecnico.status_pendente}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {resumoPorTecnico.length === 0 && (
              <div className="text-center py-12">
                <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum técnico encontrado</h3>
                <p className="text-gray-500 text-sm">Não há comissões registradas para o período selecionado.</p>
              </div>
            )}
          </div>

          {/* Versão Desktop - Tabela */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Técnico
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    OSs
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Total Comissões
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell whitespace-nowrap">
                    Média por OS
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Paga
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Calculada
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell whitespace-nowrap">
                    Pendente
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resumoPorTecnico.map((tecnico) => (
                  <tr key={tecnico.tecnico_id} className="hover:bg-gray-50">
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiUser className="text-gray-400 mr-2 flex-shrink-0" size={16} />
                        <div className="text-sm font-medium text-gray-900 truncate">{tecnico.nome}</div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{tecnico.quantidade_os}</div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-green-600">
                        {formatCurrency(tecnico.total_comissao_valor)}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right hidden sm:table-cell">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(tecnico.media_comissao)}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {tecnico.status_paga}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tecnico.status_calculada}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center hidden md:table-cell">
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
            <div className="hidden md:block text-center py-12">
              <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum técnico encontrado</h3>
              <p className="text-gray-500">Não há comissões registradas para o período selecionado.</p>
            </div>
          )}
        </div>

        {/* Tabela Detalhada */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 md:p-6 border-b border-gray-200">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              Histórico Detalhado ({comissoesFiltradas.length} registros)
            </h3>
          </div>

          {/* Versão Mobile - Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {comissoesFiltradas.map((comissao) => (
              <div key={comissao.id} className={`p-3 md:p-4 space-y-3 ${!comissao.ativa ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-semibold text-gray-900">#{comissao.numero_os || 'N/A'}</div>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(comissao.status)}`}>
                        {comissao.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{comissao.tecnico_nome}</div>
                    <div className="text-xs text-gray-600 mt-1">{comissao.cliente_nome}</div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleVerDetalhes(comissao)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <FiEye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditarComissao(comissao)}
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Editar valor"
                      >
                        <FiEdit size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleAtiva(comissao)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          comissao.ativa
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-orange-600 hover:bg-orange-50'
                        } ${!campoAtivaExiste ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={comissao.ativa ? 'Desativar comissão' : 'Ativar comissão'}
                        disabled={salvando || !campoAtivaExiste}
                      >
                        {comissao.ativa ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Serviço</p>
                    <p className="text-xs text-gray-900 line-clamp-2">{comissao.servico_nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Data</p>
                    <p className="text-xs text-gray-900">{formatDate(comissao.data_entrega)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Valor Total</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(comissao.valor_total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Comissão</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(comissao.valor_comissao)}</p>
                  </div>
                  {comissao.tipo_comissao && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Tipo / Valor</p>
                      <p className="text-xs text-blue-600">
                        {comissao.tipo_comissao === 'fixo' 
                          ? `R$ ${comissao.valor_comissao_fixa?.toFixed(2) || '0,00'} (fixo)`
                          : `${comissao.percentual_comissao || 0}%`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {comissoesFiltradas.length === 0 && (
              <div className="text-center py-12">
                <FiDollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma comissão encontrada</h3>
                <p className="text-gray-500 text-sm">
                  {comissoes.length === 0 
                    ? 'Não há comissões registradas.'
                    : 'Tente ajustar os filtros para ver mais resultados.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Versão Desktop - Tabela */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Técnico
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    OS
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell whitespace-nowrap">
                    Cliente
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">
                    Serviço
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Valor Total
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell whitespace-nowrap">
                    Tipo / Valor
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Comissão
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">
                    Data
                  </th>
                  {isAdmin && (
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 whitespace-nowrap">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comissoesFiltradas.map((comissao) => (
                  <tr key={comissao.id} className={`hover:bg-gray-50 ${!comissao.ativa ? 'opacity-60' : ''}`}>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{comissao.tecnico_nome}</div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{comissao.numero_os || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="text-sm text-gray-900 truncate max-w-[150px]">{comissao.cliente_nome}</div>
                    </td>
                    <td className="px-3 md:px-6 py-4 hidden lg:table-cell">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {comissao.servico_nome}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(comissao.valor_total)}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center hidden md:table-cell">
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
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-green-600">
                        {formatCurrency(comissao.valor_comissao)}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(comissao.status)}`}>
                        {comissao.status}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center hidden lg:table-cell">
                      <div className="text-sm text-gray-900">
                        {formatDate(comissao.data_entrega)}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center sticky right-0 bg-white z-10">
                        <div className="flex items-center justify-center gap-1 md:gap-2">
                          <button
                            onClick={() => handleVerDetalhes(comissao)}
                            className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                            title="Ver detalhes"
                          >
                            <FiEye size={14} className="md:w-4 md:h-4" />
                          </button>
                          <button
                            onClick={() => handleEditarComissao(comissao)}
                            className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex-shrink-0"
                            title="Editar valor"
                          >
                            <FiEdit size={14} className="md:w-4 md:h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleAtiva(comissao)}
                            className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
                              comissao.ativa
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-orange-600 hover:bg-orange-50'
                            } ${!campoAtivaExiste ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={
                              !campoAtivaExiste 
                                ? 'Execute o SQL database/adicionar-campo-ativa-comissoes.sql para habilitar esta funcionalidade'
                                : comissao.ativa ? 'Desativar comissão' : 'Ativar comissão'
                            }
                            disabled={salvando || !campoAtivaExiste}
                          >
                            {comissao.ativa ? <FiToggleRight size={14} className="md:w-4 md:h-4" /> : <FiToggleLeft size={14} className="md:w-4 md:h-4" />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comissoesFiltradas.length === 0 && (
            <div className="hidden md:block text-center py-12">
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

        {/* Modal de Edição */}
        {comissaoEditando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Editar Comissão</h3>
                  <button
                    onClick={() => setComissaoEditando(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Técnico
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {comissaoEditando.tecnico_nome}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OS
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    #{comissaoEditando.numero_os}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Total da OS
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {formatCurrency(comissaoEditando.valor_total)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Comissão
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {comissaoEditando.tipo_comissao === 'fixo' 
                      ? `Fixo: ${formatCurrency(comissaoEditando.valor_comissao_fixa || 0)}`
                      : `Porcentagem: ${comissaoEditando.percentual_comissao || 0}%`
                    }
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor da Comissão *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorEditado}
                    onChange={(e) => setValorEditado(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={observacoesEditadas}
                    onChange={(e) => setObservacoesEditadas(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Adicione observações sobre esta comissão..."
                  />
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setComissaoEditando(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm md:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarEdicao}
                  disabled={salvando}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {salvando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FiSave size={16} />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes */}
        {comissaoDetalhes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Detalhes da Comissão</h3>
                  <button
                    onClick={() => setComissaoDetalhes(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
                    <div className="text-gray-900">{comissaoDetalhes.tecnico_nome}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">OS</label>
                    <div className="text-gray-900">#{comissaoDetalhes.numero_os}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <div className="text-gray-900">{comissaoDetalhes.cliente_nome}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Entrega</label>
                    <div className="text-gray-900">{formatDate(comissaoDetalhes.data_entrega)}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                  <div className="text-gray-900">{comissaoDetalhes.servico_nome}</div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Valores</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Valor do Serviço</label>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(comissaoDetalhes.valor_servico)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Valor das Peças</label>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(comissaoDetalhes.valor_peca)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Valor Total</label>
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(comissaoDetalhes.valor_total)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Comissão</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Tipo</label>
                      <div className="text-gray-900">
                        {comissaoDetalhes.tipo_comissao === 'fixo' ? 'Fixo' : 'Porcentagem'}
                      </div>
                    </div>
                    {comissaoDetalhes.tipo_comissao === 'fixo' ? (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Valor Fixo</label>
                        <div className="text-gray-900">
                          {formatCurrency(comissaoDetalhes.valor_comissao_fixa || 0)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Percentual</label>
                        <div className="text-gray-900">
                          {comissaoDetalhes.percentual_comissao || 0}%
                        </div>
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Valor da Comissão</label>
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(comissaoDetalhes.valor_comissao)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(comissaoDetalhes.status)}`}>
                        {comissaoDetalhes.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status Ativo</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        comissaoDetalhes.ativa 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {comissaoDetalhes.ativa ? 'Ativa' : 'Desativada'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ordem</label>
                      <div className="text-gray-900 capitalize">{comissaoDetalhes.tipo_ordem}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data de Cálculo</label>
                      <div className="text-gray-900">{formatDate(comissaoDetalhes.created_at)}</div>
                    </div>
                  </div>
                </div>

                {comissaoDetalhes.observacoes && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900 whitespace-pre-wrap">
                      {comissaoDetalhes.observacoes}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setComissaoDetalhes(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MenuLayout>
  );
}


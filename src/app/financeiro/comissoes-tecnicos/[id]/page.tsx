'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import AuthGuard from '@/components/AuthGuard';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { 
  FiArrowLeft, 
  FiUser, 
  FiDollarSign, 
  FiCalendar, 
  FiCheckCircle, 
  FiClock,
  FiAlertCircle,
  FiTrendingUp,
  FiFileText
} from 'react-icons/fi';

interface Comissao {
  id: string;
  ordem_servico_id: string;
  numero_os: string;
  cliente_nome: string;
  servico_nome: string;
  valor_servico: number;
  valor_comissao: number;
  tipo_comissao: 'porcentagem' | 'fixo';
  percentual_comissao?: number | null;
  valor_comissao_fixa?: number | null;
  data_entrega: string;
  status: string;
  created_at: string;
}

interface TecnicoInfo {
  id: string;
  nome: string;
  email: string;
  tipo_comissao: 'porcentagem' | 'fixo';
  comissao_fixa: number;
  comissao_percentual: number;
  comissao_ativa: boolean;
  auth_user_id?: string;
}

export default function TecnicoComissoesDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const tecnicoId = params.id as string;
  
  const { usuarioData } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [tecnico, setTecnico] = useState<TecnicoInfo | null>(null);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [processando, setProcessando] = useState(false);
  
  // Estado para saque parcial
  const [valorSaque, setValorSaque] = useState<string>('');
  const [mostrarSaqueParcial, setMostrarSaqueParcial] = useState(false);
  
  // Filtros
  const [mesSelecionado, setMesSelecionado] = useState<string>(() => {
    const hoje = new Date();
    return hoje.toISOString().slice(0, 7);
  });

  // Buscar dados
  useEffect(() => {
    if (usuarioData?.empresa_id && tecnicoId) {
      fetchData();
    }
  }, [usuarioData?.empresa_id, tecnicoId, mesSelecionado]);

  const fetchData = async () => {
    if (!usuarioData?.empresa_id) return;
    
    setLoading(true);
    try {
      // Buscar info do técnico (incluindo auth_user_id para buscar comissões)
      const { data: tecnicoData, error: tecnicoError } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo_comissao, comissao_fixa, comissao_percentual, comissao_ativa, auth_user_id')
        .eq('id', tecnicoId)
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (tecnicoError || !tecnicoData) {
        addToast('error', 'Técnico não encontrado');
        router.push('/financeiro/comissoes-tecnicos');
        return;
      }

      setTecnico(tecnicoData);

      // Buscar comissões do técnico (reais)
      // IMPORTANTE: Buscar por tecnico_id OU auth_user_id pois alguns registros podem usar um ou outro
      const authUserId = tecnicoData.auth_user_id;
      let comissoesQuery = supabase
        .from('comissoes_historico')
        .select(`
          id,
          ordem_servico_id,
          valor_servico,
          valor_comissao,
          tipo_comissao,
          percentual_comissao,
          valor_comissao_fixa,
          data_entrega,
          status,
          created_at,
          ordens_servico:ordem_servico_id ( numero_os, servico ),
          clientes:cliente_id ( nome )
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('data_entrega', { ascending: false });
      
      // Filtrar por tecnico_id ou auth_user_id
      if (authUserId && authUserId !== tecnicoId) {
        comissoesQuery = comissoesQuery.or(`tecnico_id.eq.${tecnicoId},tecnico_id.eq.${authUserId}`);
      } else {
        comissoesQuery = comissoesQuery.eq('tecnico_id', tecnicoId);
      }

      const { data: comissoesData, error: comissoesError } = await comissoesQuery;

      if (comissoesError) {
        console.error('Erro ao buscar comissões:', comissoesError);
      }

      const comissoesFormatadas: Comissao[] = (comissoesData || []).map((c: any) => ({
        id: c.id,
        ordem_servico_id: c.ordem_servico_id,
        numero_os: c.ordens_servico?.numero_os || 'N/A',
        cliente_nome: c.clientes?.nome || 'Cliente não encontrado',
        servico_nome: c.ordens_servico?.servico || 'Serviço não especificado',
        valor_servico: c.valor_servico || 0,
        valor_comissao: c.valor_comissao || 0,
        tipo_comissao: c.tipo_comissao || 'porcentagem',
        percentual_comissao: c.percentual_comissao,
        valor_comissao_fixa: c.valor_comissao_fixa,
        data_entrega: c.data_entrega,
        status: c.status || 'CALCULADA',
        created_at: c.created_at
      }));

      // Buscar comissões previstas (OS não finalizadas)
      const osComComissao = new Set(comissoesFormatadas.map(c => c.ordem_servico_id));
      
      // Construir filtro para buscar OS por tecnico_id ou auth_user_id
      let orFilter = `tecnico_id.eq.${tecnicoId}`;
      if (authUserId && authUserId !== tecnicoId) {
        orFilter += `,tecnico_id.eq.${authUserId}`;
      }
      
      const { data: ordensData, error: ordensError } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          valor_servico,
          valor_faturado,
          status,
          status_tecnico,
          servico,
          data_entrega,
          created_at,
          clientes:cliente_id ( nome ),
          tecnico:tecnico_id ( id, tipo_comissao, comissao_fixa, comissao_percentual )
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .or(orFilter)
        .not('tecnico_id', 'is', null);

      console.log('🔍 Busca de OS para comissões previstas:', {
        tecnicoId,
        authUserId,
        orFilter,
        totalOS: ordensData?.length || 0,
        osComComissao: Array.from(osComComissao),
        ordensError
      });

      const normalizeStatus = (s: string | null | undefined) =>
        (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

      const comissoesPrevistas: Comissao[] = (ordensData || [])
        .filter((os: any) => {
          // Ignorar se já tem comissão registrada
          if (osComComissao.has(os.id)) return false;
          
          // A query já filtra por tecnico_id, então todas as OS retornadas são deste técnico
          // Só precisamos verificar se tem valor de serviço e se não está finalizada
          
          const valorServico = os.valor_servico ?? 0;
          if (!valorServico || valorServico <= 0) return false;
          
          const status = normalizeStatus(os.status);
          const statusTec = normalizeStatus(os.status_tecnico);
          const finalizada = status === 'ENTREGUE' || statusTec === 'FINALIZADA';
          if (finalizada) return false;
          
          return true;
        })
        .map((os: any) => {
          const valorServico = os.valor_servico ?? 0;
          const tecConfig = os.tecnico || tecnicoData;
          
          let tipoComissao: 'porcentagem' | 'fixo' = tecConfig?.tipo_comissao || 'porcentagem';
          let valorBaseComissao = tipoComissao === 'fixo' 
            ? (tecConfig?.comissao_fixa || 0) 
            : (tecConfig?.comissao_percentual || 10);
          
          let valorComissao = tipoComissao === 'fixo' 
            ? valorBaseComissao 
            : (valorServico * valorBaseComissao) / 100;

          return {
            id: `prevista-${os.id}`,
            ordem_servico_id: os.id,
            numero_os: os.numero_os || 'N/A',
            cliente_nome: os.clientes?.nome || 'Cliente não encontrado',
            servico_nome: os.servico || 'Serviço não especificado',
            valor_servico: valorServico,
            valor_comissao: valorComissao,
            tipo_comissao: tipoComissao,
            percentual_comissao: tipoComissao === 'porcentagem' ? valorBaseComissao : null,
            valor_comissao_fixa: tipoComissao === 'fixo' ? valorBaseComissao : null,
            data_entrega: os.data_entrega || os.created_at,
            status: 'PREVISTA',
            created_at: os.created_at
          };
        });

      console.log('📊 Comissões encontradas:', {
        reais: comissoesFormatadas.length,
        previstas: comissoesPrevistas.length,
        total: comissoesFormatadas.length + comissoesPrevistas.length
      });

      setComissoes([...comissoesFormatadas, ...comissoesPrevistas]);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      addToast('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por mês
  const comissoesDoMes = useMemo(() => {
    if (!mesSelecionado || mesSelecionado === 'todos') return comissoes;
    
    return comissoes.filter(c => {
      try {
        const data = new Date(c.data_entrega);
        if (isNaN(data.getTime())) return false;
        return data.toISOString().slice(0, 7) === mesSelecionado;
      } catch {
        return false;
      }
    });
  }, [comissoes, mesSelecionado]);

  // Calcular totais
  const totais = useMemo(() => {
    const totalPago = comissoesDoMes
      .filter(c => c.status?.toUpperCase() === 'PAGA')
      .reduce((acc, c) => acc + c.valor_comissao, 0);
    
    const totalCalculado = comissoesDoMes
      .filter(c => c.status?.toUpperCase() === 'CALCULADA')
      .reduce((acc, c) => acc + c.valor_comissao, 0);
    
    const totalPrevisto = comissoesDoMes
      .filter(c => c.status?.toUpperCase() === 'PREVISTA')
      .reduce((acc, c) => acc + c.valor_comissao, 0);
    
    const totalPendente = comissoesDoMes
      .filter(c => !['PAGA', 'CALCULADA', 'PREVISTA'].includes(c.status?.toUpperCase() || ''))
      .reduce((acc, c) => acc + c.valor_comissao, 0);

    const comissoesCalculadas = comissoesDoMes.filter(c => c.status?.toUpperCase() === 'CALCULADA');
    
    return {
      pago: totalPago,
      liberado: totalCalculado, // Disponível para saque
      previsto: totalPrevisto,
      pendente: totalPendente,
      total: totalPago + totalCalculado + totalPrevisto + totalPendente,
      qtdPagas: comissoesDoMes.filter(c => c.status?.toUpperCase() === 'PAGA').length,
      qtdLiberadas: comissoesCalculadas.length,
      qtdPrevistas: comissoesDoMes.filter(c => c.status?.toUpperCase() === 'PREVISTA').length,
      comissoesLiberadas: comissoesCalculadas
    };
  }, [comissoesDoMes]);

  // Gerar opções de meses
  const mesesDisponiveis = useMemo(() => {
    const meses = new Set<string>();
    const hoje = new Date();
    
    // Adicionar últimos 12 meses
    for (let i = 0; i < 12; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.add(data.toISOString().slice(0, 7));
    }
    
    // Adicionar meses das comissões
    comissoes.forEach(c => {
      try {
        const data = new Date(c.data_entrega);
        if (!isNaN(data.getTime())) {
          meses.add(data.toISOString().slice(0, 7));
        }
      } catch {}
    });
    
    return Array.from(meses).sort().reverse();
  }, [comissoes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const formatMesLabel = (mes: string) => {
    try {
      const [ano, mesNum] = mes.split('-');
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${meses[parseInt(mesNum) - 1]}/${ano}`;
    } catch {
      return mes;
    }
  };

  // Processar saque total
  const handleSaqueTotal = async () => {
    if (totais.comissoesLiberadas.length === 0) {
      addToast('warning', 'Não há comissões liberadas para saque.');
      return;
    }

    const confirmado = await confirm({
      title: 'Confirmar Saque Total',
      message: `Deseja marcar ${totais.qtdLiberadas} comissão(ões) como PAGA(S)?\n\nValor total: ${formatCurrency(totais.liberado)}`,
      confirmText: 'Confirmar Saque',
      cancelText: 'Cancelar',
      variant: 'success'
    });

    if (!confirmado) return;
    await processarSaque(totais.comissoesLiberadas, totais.liberado);
  };

  // Processar saque parcial
  const handleSaqueParcial = async () => {
    const valor = parseFloat(valorSaque.replace(',', '.'));
    
    if (isNaN(valor) || valor <= 0) {
      addToast('error', 'Digite um valor válido para o saque.');
      return;
    }

    if (valor > totais.liberado) {
      addToast('error', `Valor máximo disponível: ${formatCurrency(totais.liberado)}`);
      return;
    }

    // Selecionar comissões para cobrir o valor do saque
    const comissoesParaSaque: Comissao[] = [];
    let valorAcumulado = 0;

    // Ordenar por valor (menores primeiro para maximizar quantidade de comissões pagas)
    const ordenadas = [...totais.comissoesLiberadas].sort((a, b) => a.valor_comissao - b.valor_comissao);

    for (const comissao of ordenadas) {
      if (valorAcumulado >= valor) break;
      comissoesParaSaque.push(comissao);
      valorAcumulado += comissao.valor_comissao;
    }

    // Se não conseguiu cobrir o valor exato, ajustar
    const valorReal = comissoesParaSaque.reduce((acc, c) => acc + c.valor_comissao, 0);

    const confirmado = await confirm({
      title: 'Confirmar Saque Parcial',
      message: `Serão marcadas ${comissoesParaSaque.length} comissão(ões) como PAGA(S).\n\nValor solicitado: ${formatCurrency(valor)}\nValor real do saque: ${formatCurrency(valorReal)}\n\n${valorReal !== valor ? '(Ajustado para incluir comissões completas)' : ''}`,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      variant: 'success'
    });

    if (!confirmado) return;
    await processarSaque(comissoesParaSaque, valorReal);
  };

  const processarSaque = async (comissoesParaSaque: Comissao[], valorTotal: number) => {
    setProcessando(true);
    try {
      let sucesso = 0;
      let erros = 0;

      for (const comissao of comissoesParaSaque) {
        // Ignorar comissões previstas
        if (comissao.id.startsWith('prevista-')) continue;

        const response = await fetch('/api/comissoes/atualizar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comissaoId: comissao.id,
            status: 'PAGA'
          })
        });

        if (response.ok) {
          sucesso++;
        } else {
          erros++;
        }
      }

      if (sucesso > 0) {
        addToast('success', `Saque de ${formatCurrency(valorTotal)} realizado! ${sucesso} comissão(ões) marcada(s) como paga(s).`);
        setValorSaque('');
        setMostrarSaqueParcial(false);
        fetchData(); // Recarregar dados
      }
      if (erros > 0) {
        addToast('error', `${erros} comissão(ões) não puderam ser atualizadas.`);
      }
    } catch (error) {
      console.error('Erro ao processar saque:', error);
      addToast('error', 'Erro ao processar saque.');
    } finally {
      setProcessando(false);
    }
  };

  // Reverter comissão para calculada
  const handleReverterComissao = async (comissao: Comissao) => {
    const confirmado = await confirm({
      title: 'Reverter Pagamento',
      message: `Deseja reverter o status da comissão da OS #${comissao.numero_os} de PAGA para CALCULADA?`,
      confirmText: 'Reverter',
      cancelText: 'Cancelar',
      variant: 'warning'
    });

    if (!confirmado) return;

    try {
      const response = await fetch('/api/comissoes/atualizar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comissaoId: comissao.id,
          status: 'CALCULADA'
        })
      });

      if (response.ok) {
        addToast('success', 'Comissão revertida para CALCULADA.');
        fetchData();
      } else {
        addToast('error', 'Erro ao reverter comissão.');
      }
    } catch (error) {
      addToast('error', 'Erro ao reverter comissão.');
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PAGA': return 'bg-green-100 text-green-800';
      case 'CALCULADA': return 'bg-blue-100 text-blue-800';
      case 'PREVISTA': return 'bg-orange-100 text-orange-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <MenuLayout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </MenuLayout>
      </AuthGuard>
    );
  }

  if (!tecnico) {
    return (
      <AuthGuard>
        <MenuLayout>
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-gray-500">Técnico não encontrado.</p>
          </div>
        </MenuLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <MenuLayout>
        <div className="min-h-screen bg-gray-50 py-4 md:py-8 px-3 md:px-6">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/financeiro/comissoes-tecnicos')}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <FiArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <FiUser className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">{tecnico.nome}</h1>
                    <p className="text-sm text-gray-500">
                      Comissão: {tecnico.tipo_comissao === 'fixo' 
                        ? formatCurrency(tecnico.comissao_fixa) + ' por OS'
                        : `${tecnico.comissao_percentual}% do serviço`
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Seletor de Mês */}
              <div className="flex items-center gap-2">
                <FiCalendar className="text-gray-400" />
                <select
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="todos">Todos os meses</option>
                  {mesesDisponiveis.map(mes => (
                    <option key={mes} value={mes}>{formatMesLabel(mes)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* Total Geral */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiTrendingUp className="text-gray-400" size={18} />
                  <span className="text-xs text-gray-500 uppercase">Total Geral</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{formatCurrency(totais.total)}</p>
                <p className="text-xs text-gray-500 mt-1">{comissoesDoMes.length} comissões</p>
              </div>

              {/* Já Pago */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="text-green-500" size={18} />
                  <span className="text-xs text-gray-500 uppercase">Já Pago</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-green-600">{formatCurrency(totais.pago)}</p>
                <p className="text-xs text-gray-500 mt-1">{totais.qtdPagas} comissões</p>
              </div>

              {/* Liberado para Saque */}
              <div className="rounded-xl shadow-sm border border-blue-200 p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <FiDollarSign className="text-blue-500" size={18} />
                  <span className="text-xs text-blue-600 uppercase font-medium">Disponível</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-blue-600">{formatCurrency(totais.liberado)}</p>
                <p className="text-xs text-blue-500 mt-1">{totais.qtdLiberadas} comissões liberadas</p>
              </div>

              {/* Previsto */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiClock className="text-orange-500" size={18} />
                  <span className="text-xs text-gray-500 uppercase">Previsto</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-orange-600">{formatCurrency(totais.previsto)}</p>
                <p className="text-xs text-gray-500 mt-1">{totais.qtdPrevistas} OS em andamento</p>
              </div>
            </div>

            {/* Seção de Saque */}
            {totais.liberado > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiDollarSign className="text-blue-600" />
                  Realizar Saque
                </h2>
                
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Saque Total */}
                  <div className="flex-1 bg-blue-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Saque Total</h3>
                    <p className="text-2xl font-bold text-blue-600 mb-3">{formatCurrency(totais.liberado)}</p>
                    <button
                      onClick={handleSaqueTotal}
                      disabled={processando}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {processando ? 'Processando...' : 'Sacar Tudo'}
                    </button>
                  </div>

                  {/* Saque Parcial */}
                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Saque Parcial</h3>
                    
                    {!mostrarSaqueParcial ? (
                      <button
                        onClick={() => setMostrarSaqueParcial(true)}
                        className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Sacar Valor Específico
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Valor do saque (máx: {formatCurrency(totais.liberado)})
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">R$</span>
                            <input
                              type="text"
                              value={valorSaque}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9,]/g, '');
                                setValorSaque(val);
                              }}
                              placeholder="0,00"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setMostrarSaqueParcial(false);
                              setValorSaque('');
                            }}
                            className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaqueParcial}
                            disabled={processando || !valorSaque}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          >
                            {processando ? '...' : 'Sacar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4 flex items-center gap-1">
                  <FiAlertCircle size={12} />
                  O saque marca as comissões como PAGA. Comissões previstas não podem ser sacadas até a OS ser finalizada.
                </p>
              </div>
            )}

            {/* Lista de Comissões */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiFileText className="text-gray-400" />
                  Histórico de Comissões ({comissoesDoMes.length})
                </h2>
              </div>

              {/* Tabela Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OS</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serviço</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Serv.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comissão</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comissoesDoMes.map((comissao) => (
                      <tr key={comissao.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">#{comissao.numero_os}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900 truncate max-w-[150px] block">{comissao.cliente_nome}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500 truncate max-w-[200px] block">{comissao.servico_nome}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-900">{formatCurrency(comissao.valor_servico)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-green-600">{formatCurrency(comissao.valor_comissao)}</span>
                          <span className="text-xs text-gray-400 block">
                            {comissao.tipo_comissao === 'fixo' ? 'Fixo' : `${comissao.percentual_comissao}%`}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-500">{formatDate(comissao.data_entrega)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(comissao.status)}`}>
                            {comissao.status || 'PENDENTE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {comissao.status?.toUpperCase() === 'PAGA' && !comissao.id.startsWith('prevista-') && (
                            <button
                              onClick={() => handleReverterComissao(comissao)}
                              className="text-xs text-orange-600 hover:text-orange-800 hover:underline"
                            >
                              Reverter
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards Mobile */}
              <div className="md:hidden divide-y divide-gray-200">
                {comissoesDoMes.map((comissao) => (
                  <div key={comissao.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">OS #{comissao.numero_os}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(comissao.status)}`}>
                        {comissao.status || 'PENDENTE'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{comissao.cliente_nome}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{formatDate(comissao.data_entrega)}</span>
                      <span className="text-sm font-bold text-green-600">{formatCurrency(comissao.valor_comissao)}</span>
                    </div>
                    {comissao.status?.toUpperCase() === 'PAGA' && !comissao.id.startsWith('prevista-') && (
                      <button
                        onClick={() => handleReverterComissao(comissao)}
                        className="text-xs text-orange-600 hover:text-orange-800"
                      >
                        Reverter pagamento
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {comissoesDoMes.length === 0 && (
                <div className="p-8 text-center">
                  <FiFileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma comissão encontrada</h3>
                  <p className="text-gray-500">Não há comissões registradas para o período selecionado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </MenuLayout>
    </AuthGuard>
  );
}

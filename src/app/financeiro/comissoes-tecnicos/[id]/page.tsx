'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, getAccessTokenForApi } from '@/lib/supabaseClient';
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
  FiFileText,
  FiEye,
  FiEdit,
  FiX,
  FiSave
} from 'react-icons/fi';
import { buildComissoesTecnicosPDFBlob } from '@/lib/pdfComissoesTecnicos';

interface Comissao {
  id: string;
  ordem_servico_id: string;
  numero_os: string;
  cliente_nome: string;
  servico_nome: string;
  valor_servico: number;
  valor_peca?: number;
  valor_total?: number;
  valor_comissao: number;
  tipo_comissao: 'porcentagem' | 'fixo';
  percentual_comissao?: number | null;
  valor_comissao_fixa?: number | null;
  data_entrega: string;
  status: string;
  created_at: string;
  status_os?: string | null;
  status_tecnico_os?: string | null;
  tipo_ordem?: string;
  ativa?: boolean;
  observacoes?: string | null;
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
  
  const { usuarioData, session, empresaData } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [tecnico, setTecnico] = useState<TecnicoInfo | null>(null);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [processando, setProcessando] = useState(false);
  
  // Estado para saque parcial
  const [valorSaque, setValorSaque] = useState<string>('');
  const [mostrarSaqueParcial, setMostrarSaqueParcial] = useState(false);
  
  // Padrão: mês atual (YYYY-MM, alinhado ao filtro por data_entrega em UTC)
  const [mesSelecionado, setMesSelecionado] = useState<string>(() => new Date().toISOString().slice(0, 7));
  /** Incluir linha de total + área para assinatura manual no PDF */
  const [pdfIncluirAssinatura, setPdfIncluirAssinatura] = useState(true);

  // Modal Ver detalhes / Editar
  const [comissaoDetalhes, setComissaoDetalhes] = useState<Comissao | null>(null);
  const [comissaoEditando, setComissaoEditando] = useState<Comissao | null>(null);
  const [valorEditado, setValorEditado] = useState<number>(0);
  const [observacoesEditadas, setObservacoesEditadas] = useState<string>('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Buscar dados
  useEffect(() => {
    if (usuarioData?.empresa_id && tecnicoId) {
      fetchData();
    }
  }, [usuarioData?.empresa_id, tecnicoId]);

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

      // Usar API (mesma lógica que Minhas Comissões). cache: 'no-store' + _t evita ver dados antigos após saque
      const token = await getAccessTokenForApi();
      if (!token) {
        addToast('error', 'Sessão expirada ou indisponível. Faça login novamente.');
        setComissoes([]);
        return;
      }
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      const url = `/api/comissoes/tecnicos/${tecnicoId}?_t=${Date.now()}`;
      const res = await fetch(url, { headers, cache: 'no-store', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast('error', data.error || 'Erro ao carregar comissões');
        setComissoes([]);
        return;
      }
      setComissoes((data.comissoes || []) as Comissao[]);
      
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

  const periodoLabelPdf = useMemo(() => {
    if (!mesSelecionado || mesSelecionado === 'todos') return 'Todos os meses';
    const [ano, mes] = mesSelecionado.split('-');
    if (!ano || !mes) return mesSelecionado;
    const data = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
    if (isNaN(data.getTime())) return mesSelecionado;
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [mesSelecionado]);

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

  // Marcar comissão como paga
  const handleMarcarComoPaga = async (comissao: Comissao) => {
    if (comissao.id.startsWith('prevista-')) {
      addToast('error', 'Comissões previstas só podem ser pagas após a OS ser finalizada.');
      return;
    }
    const confirmado = await confirm({
      title: 'Marcar como paga',
      message: `Confirmar pagamento da comissão de ${formatCurrency(comissao.valor_comissao)} (OS #${comissao.numero_os})?`,
      confirmText: 'Marcar como paga',
      cancelText: 'Cancelar',
      variant: 'success'
    });
    if (!confirmado) return;
    setProcessando(true);
    try {
      const response = await fetch('/api/comissoes/atualizar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comissaoId: comissao.id, status: 'PAGA' })
      });
      if (response.ok) {
        addToast('success', 'Comissão marcada como paga.');
        fetchData();
      } else {
        const result = await response.json().catch(() => ({}));
        addToast('error', result?.error || 'Erro ao atualizar comissão.');
      }
    } catch {
      addToast('error', 'Erro ao atualizar comissão.');
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

  const handleVerDetalhes = (comissao: Comissao) => {
    setComissaoDetalhes(comissao);
  };

  const handleEditarComissao = (comissao: Comissao) => {
    setComissaoEditando(comissao);
    setValorEditado(comissao.valor_comissao);
    setObservacoesEditadas(comissao.observacoes || '');
  };

  const handleSalvarEdicao = async () => {
    if (!comissaoEditando) return;
    setSalvandoEdicao(true);
    try {
      const response = await fetch('/api/comissoes/atualizar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comissaoId: comissaoEditando.id,
          valorComissao: valorEditado,
          observacoes: observacoesEditadas
        })
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        addToast('success', 'Comissão atualizada com sucesso.');
        setComissaoEditando(null);
        fetchData();
      } else {
        addToast('error', result?.error || 'Erro ao atualizar comissão.');
      }
    } catch {
      addToast('error', 'Erro ao atualizar comissão.');
    } finally {
      setSalvandoEdicao(false);
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

  const exportarPDF = async () => {
    if (!tecnico) return;
    if (comissoesDoMes.length === 0) {
      addToast('error', 'Não há comissões para exportar neste período.');
      return;
    }
    try {
      const filtrosLinhas = [
        `Configuração: ${
          tecnico.tipo_comissao === 'fixo'
            ? `${formatCurrency(tecnico.comissao_fixa)} por OS`
            : `${tecnico.comissao_percentual}% do serviço`
        }`,
      ];
      const rows = comissoesDoMes.map((c) => ({
        tecnico_nome: tecnico.nome,
        numero_os: c.numero_os,
        cliente_nome: c.cliente_nome,
        servico_nome: c.servico_nome,
        data_entrega: c.data_entrega,
        valor_total: c.valor_total ?? (Number(c.valor_servico) || 0) + (Number(c.valor_peca) || 0),
        tipo_comissao: c.tipo_comissao,
        percentual_comissao: c.percentual_comissao,
        valor_comissao_fixa: c.valor_comissao_fixa,
        valor_comissao: c.valor_comissao,
        status: c.status,
        status_os: c.status_os ?? null,
      }));
      const blob = await buildComissoesTecnicosPDFBlob({
        periodoLabel: periodoLabelPdf,
        filtrosLinhas,
        comissoes: rows,
        formatCurrency,
        formatDate,
        detalheTecnicoNome: tecnico.nome,
        notaRodape: 'Valores conforme o período (mês) selecionado na tela.',
        empresaNome: empresaData?.nome,
        logoUrl: empresaData?.logo_url,
        cnpj: empresaData?.cnpj,
        incluirAssinaturaTecnico: pdfIncluirAssinatura,
      });
      const safeName = tecnico.nome
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^\w\d-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 48) || 'tecnico';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comissoes_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      addToast('success', 'PDF exportado com sucesso.');
    } catch (e) {
      console.error('Erro ao gerar PDF de comissões:', e);
      addToast('error', 'Não foi possível gerar o PDF. Tente novamente.');
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
        <div className="min-h-screen bg-gray-50 py-4 md:py-8 px-3 md:px-4 lg:px-6 w-full max-w-full">
          <div className="w-full max-w-full space-y-6">
            
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
              
              {/* Seletor de Mês + opções PDF */}
              <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[280px]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FiCalendar className="text-gray-400 flex-shrink-0" />
                    <select
                      value={mesSelecionado}
                      onChange={(e) => setMesSelecionado(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="todos">Todos os meses</option>
                      {mesesDisponiveis.map(mes => (
                        <option key={mes} value={mes}>{formatMesLabel(mes)}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    title="Exportar relatório em PDF"
                    onClick={exportarPDF}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    <FiFileText size={16} />
                    PDF
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pdfIncluirAssinatura}
                    onChange={(e) => setPdfIncluirAssinatura(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Incluir total do período e campo para assinatura do técnico
                </label>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiFileText className="text-gray-400" />
                  Histórico de Comissões ({comissoesDoMes.length})
                </h2>
              </div>

              {/* Tabela Desktop - usa largura total e scroll horizontal se necessário */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full min-w-[800px] divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OS</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serviço</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Serv.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comissão</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status OS</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-[180px] min-w-[180px]">Ações</th>
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
                          <span className="text-sm text-gray-700" title={comissao.status_tecnico_os ? `Técnico: ${comissao.status_tecnico_os}` : undefined}>
                            {comissao.status_os || '—'}
                            {comissao.status_tecnico_os && comissao.status_tecnico_os !== comissao.status_os && (
                              <span className="block text-xs text-gray-500">{comissao.status_tecnico_os}</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(comissao.status)}`}>
                            {comissao.status || 'PENDENTE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center w-[180px] min-w-[180px]">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVerDetalhes(comissao); }}
                              className="p-1.5 rounded text-gray-600 hover:bg-gray-100"
                              title="Ver detalhes"
                            >
                              <FiEye size={16} />
                            </button>
                            {!comissao.id.startsWith('prevista-') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditarComissao(comissao); }}
                                className="p-1.5 rounded text-blue-600 hover:bg-blue-50"
                                title="Editar"
                              >
                                <FiEdit size={16} />
                              </button>
                            )}
                            {comissao.status?.toUpperCase() === 'CALCULADA' && !comissao.id.startsWith('prevista-') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarcarComoPaga(comissao); }}
                                className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 whitespace-nowrap"
                              >
                                Marcar paga
                              </button>
                            )}
                            {comissao.status?.toUpperCase() === 'PAGA' && !comissao.id.startsWith('prevista-') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReverterComissao(comissao); }}
                                className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 whitespace-nowrap"
                              >
                                Reverter
                              </button>
                            )}
                            {comissao.status?.toUpperCase() === 'PREVISTA' && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
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
                    {comissao.status_os && (
                      <p className="text-xs text-gray-500">Status OS: {comissao.status_os}{comissao.status_tecnico_os && comissao.status_tecnico_os !== comissao.status_os ? ` / ${comissao.status_tecnico_os}` : ''}</p>
                    )}
                    <p className="text-sm text-gray-500 truncate">{comissao.cliente_nome}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{formatDate(comissao.data_entrega)}</span>
                      <span className="text-sm font-bold text-green-600">{formatCurrency(comissao.valor_comissao)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleVerDetalhes(comissao)}
                        className="text-xs px-2 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                      >
                        <FiEye size={12} /> Ver detalhes
                      </button>
                      {!comissao.id.startsWith('prevista-') && (
                        <button
                          onClick={() => handleEditarComissao(comissao)}
                          className="text-xs px-2 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1"
                        >
                          <FiEdit size={12} /> Editar
                        </button>
                      )}
                      {comissao.status?.toUpperCase() === 'CALCULADA' && !comissao.id.startsWith('prevista-') && (
                        <button
                          onClick={() => handleMarcarComoPaga(comissao)}
                          className="text-xs px-2 py-1.5 rounded bg-green-600 text-white hover:bg-green-700"
                        >
                          Marcar como paga
                        </button>
                      )}
                      {comissao.status?.toUpperCase() === 'PAGA' && !comissao.id.startsWith('prevista-') && (
                        <button
                          onClick={() => handleReverterComissao(comissao)}
                          className="text-xs px-2 py-1.5 rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
                        >
                          Reverter pagamento
                        </button>
                      )}
                    </div>
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

            {/* Modal Ver detalhes */}
            {comissaoDetalhes && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setComissaoDetalhes(null)}>
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Detalhes da Comissão</h3>
                    <button onClick={() => setComissaoDetalhes(null)} className="p-1 text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div><span className="text-xs text-gray-500">Técnico</span><p className="font-medium">{tecnico?.nome}</p></div>
                    <div><span className="text-xs text-gray-500">OS</span><p className="font-medium">#{comissaoDetalhes.numero_os}</p></div>
                    <div><span className="text-xs text-gray-500">Cliente</span><p className="font-medium">{comissaoDetalhes.cliente_nome}</p></div>
                    <div><span className="text-xs text-gray-500">Serviço</span><p className="font-medium">{comissaoDetalhes.servico_nome}</p></div>
                    <div><span className="text-xs text-gray-500">Data entrega</span><p className="font-medium">{formatDate(comissaoDetalhes.data_entrega)}</p></div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div><span className="text-xs text-gray-500">Valor serviço</span><p className="font-medium">{formatCurrency(comissaoDetalhes.valor_servico)}</p></div>
                      <div><span className="text-xs text-gray-500">Valor peças</span><p className="font-medium">{formatCurrency(comissaoDetalhes.valor_peca ?? 0)}</p></div>
                      <div><span className="text-xs text-gray-500">Valor total</span><p className="font-bold">{formatCurrency(comissaoDetalhes.valor_total ?? comissaoDetalhes.valor_servico)}</p></div>
                      <div><span className="text-xs text-gray-500">Comissão</span><p className="font-bold text-green-600">{formatCurrency(comissaoDetalhes.valor_comissao)}</p></div>
                    </div>
                    <div><span className="text-xs text-gray-500">Status</span><p><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(comissaoDetalhes.status)}`}>{comissaoDetalhes.status}</span></p></div>
                    {comissaoDetalhes.observacoes && <div><span className="text-xs text-gray-500">Observações</span><p className="text-sm text-gray-700 whitespace-pre-wrap">{comissaoDetalhes.observacoes}</p></div>}
                  </div>
                  <div className="p-4 border-t flex justify-end">
                    <button onClick={() => setComissaoDetalhes(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Fechar</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Editar */}
            {comissaoEditando && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setComissaoEditando(null)}>
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Editar Comissão</h3>
                    <button onClick={() => setComissaoEditando(null)} className="p-1 text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div><label className="block text-sm text-gray-600 mb-1">OS</label><p className="font-medium">#{comissaoEditando.numero_os}</p></div>
                    <div><label className="block text-sm text-gray-600 mb-1">Valor total da OS</label><p className="font-medium">{formatCurrency(comissaoEditando.valor_total ?? comissaoEditando.valor_servico)}</p></div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor da comissão *</label>
                      <input type="number" step="0.01" min={0} value={valorEditado} onChange={e => setValorEditado(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                      <textarea value={observacoesEditadas} onChange={e => setObservacoesEditadas(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Observações sobre esta comissão..." />
                    </div>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={() => setComissaoEditando(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancelar</button>
                    <button onClick={handleSalvarEdicao} disabled={salvandoEdicao} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                      {salvandoEdicao ? <span>Salvando...</span> : <><FiSave size={16} /> Salvar</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </MenuLayout>
    </AuthGuard>
  );
}

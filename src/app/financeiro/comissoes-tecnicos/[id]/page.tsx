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
import { CurrencyInput } from '@/components/CurrencyInput';
import {
  formatDateBr,
  formatDateTimeBr,
  mesAtualLocal,
  mesKeyLocal,
} from '@/lib/calcularComissao';

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
  data_pagamento?: string | null;
  data_calculo?: string | null;
  status: string;
  created_at: string;
  status_os?: string | null;
  status_tecnico_os?: string | null;
  tipo_ordem?: string;
  ativa?: boolean;
  observacoes?: string | null;
  /** Comissão CALCULADA de mês anterior incluída no saque do mês atual */
  arrasto?: boolean;
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
  
  // Modal saque parcial: seleção de OS (evita digitar valor que não bate com as comissões)
  const [modalSaqueParcial, setModalSaqueParcial] = useState(false);
  const [osSelecionadasSaque, setOsSelecionadasSaque] = useState<Set<string>>(new Set());
  
  // Padrão: mês atual (YYYY-MM em America/Sao_Paulo)
  const [mesSelecionado, setMesSelecionado] = useState<string>(() => mesAtualLocal());
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

  // Lista do período: mês selecionado + CALCULADA de meses anteriores (arrasto para saque)
  const comissoesDoMes = useMemo(() => {
    if (!mesSelecionado || mesSelecionado === 'todos') {
      return comissoes.map((c) => ({ ...c, arrasto: false }));
    }

    return comissoes
      .filter((c) => {
        const mes = mesKeyLocal(c.data_entrega);
        if (!mes) return false;
        if (mes === mesSelecionado) return true;
        // Carry-over: não sacadas de meses anteriores entram no mês atual de saque
        const status = (c.status || '').toUpperCase();
        return status === 'CALCULADA' && mes < mesSelecionado;
      })
      .map((c) => ({
        ...c,
        arrasto: mesKeyLocal(c.data_entrega) < mesSelecionado,
      }));
  }, [comissoes, mesSelecionado]);

  const periodoLabelPdf = useMemo(() => {
    if (!mesSelecionado || mesSelecionado === 'todos') return 'Todos os meses';
    const [ano, mes] = mesSelecionado.split('-');
    if (!ano || !mes) return mesSelecionado;
    const data = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, 1);
    if (isNaN(data.getTime())) return mesSelecionado;
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [mesSelecionado]);

  // Calcular totais (disponível inclui arrasto + CALCULADA reais ou sintéticas de OS entregue)
  const totais = useMemo(() => {
    const statusOf = (c: Comissao) => (c.status || '').toUpperCase();
    const isPrevistaPura = (c: Comissao) =>
      String(c.id).startsWith('prevista-') && statusOf(c) === 'PREVISTA';
    // Liberada = CALCULADA (registro real OU sintética de OS já entregue)
    const isLiberada = (c: Comissao) => statusOf(c) === 'CALCULADA';

    // Já pago no período = baixas feitas no mês (data_pagamento)
    const pagasNoPeriodo = comissoes.filter((c) => {
      if (statusOf(c) !== 'PAGA' || String(c.id).startsWith('prevista-')) return false;
      if (!mesSelecionado || mesSelecionado === 'todos') return true;
      const mesPag = mesKeyLocal(c.data_pagamento || c.data_calculo || c.data_entrega);
      return mesPag === mesSelecionado;
    });
    const totalPago = pagasNoPeriodo.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);

    const comissoesCalculadas = comissoesDoMes.filter(isLiberada);
    const totalCalculado = comissoesCalculadas.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);
    const totalArrasto = comissoesCalculadas
      .filter((c) => c.arrasto)
      .reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);

    const previstasDoMes = comissoesDoMes.filter((c) => isPrevistaPura(c) && !c.arrasto);
    const totalPrevisto = previstasDoMes.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);

    const pendentesDoMes = comissoesDoMes.filter((c) => {
      const s = statusOf(c);
      return !['PAGA', 'CALCULADA', 'PREVISTA'].includes(s) && !c.arrasto;
    });
    const totalPendente = pendentesDoMes.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);

    // Total geral = soma de tudo que aparece na lista do período
    const totalGeral = comissoesDoMes.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);

    return {
      pago: totalPago,
      liberado: totalCalculado,
      arrasto: totalArrasto,
      previsto: totalPrevisto,
      pendente: totalPendente,
      total: totalGeral,
      qtdPagas: pagasNoPeriodo.length,
      qtdLiberadas: comissoesCalculadas.length,
      qtdArrasto: comissoesCalculadas.filter((c) => c.arrasto).length,
      qtdPrevistas: previstasDoMes.length,
      comissoesLiberadas: comissoesCalculadas,
    };
  }, [comissoes, comissoesDoMes, mesSelecionado]);

  // Histórico de saques: agrupa PAGA por data/hora de pagamento
  const historicoSaques = useMemo(() => {
    const pagas = comissoes.filter((c) => (c.status || '').toUpperCase() === 'PAGA' && !String(c.id).startsWith('prevista-'));
    const grupos = new Map<string, { dataPagamento: string; itens: Comissao[]; valor: number }>();

    for (const c of pagas) {
      const raw = c.data_pagamento || c.data_calculo || c.created_at || '';
      // Agrupa no mesmo minuto (lote de saque)
      const keyDate = raw ? new Date(raw) : null;
      const key =
        keyDate && !isNaN(keyDate.getTime())
          ? `${keyDate.getUTCFullYear()}-${String(keyDate.getUTCMonth() + 1).padStart(2, '0')}-${String(keyDate.getUTCDate()).padStart(2, '0')}T${String(keyDate.getUTCHours()).padStart(2, '0')}:${String(keyDate.getUTCMinutes()).padStart(2, '0')}`
          : 'sem-data';
      const existente = grupos.get(key);
      if (existente) {
        existente.itens.push(c);
        existente.valor += c.valor_comissao;
      } else {
        grupos.set(key, { dataPagamento: raw, itens: [c], valor: c.valor_comissao });
      }
    }

    return Array.from(grupos.values()).sort((a, b) => {
      const ta = a.dataPagamento ? new Date(a.dataPagamento).getTime() : 0;
      const tb = b.dataPagamento ? new Date(b.dataPagamento).getTime() : 0;
      return tb - ta;
    });
  }, [comissoes]);

  // Gerar opções de meses
  const mesesDisponiveis = useMemo(() => {
    const meses = new Set<string>();
    const hoje = new Date();
    
    // Adicionar últimos 12 meses (calendário local BR)
    for (let i = 0; i < 12; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.add(mesKeyLocal(data));
    }
    
    // Adicionar meses das comissões
    comissoes.forEach(c => {
      const mes = mesKeyLocal(c.data_entrega);
      if (mes) meses.add(mes);
    });
    
    return Array.from(meses).filter(Boolean).sort().reverse();
  }, [comissoes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => formatDateBr(dateString);
  const formatDateTime = (dateString: string | null | undefined) => formatDateTimeBr(dateString);

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

  const comissoesSelecionadasSaque = useMemo(
    () => totais.comissoesLiberadas.filter((c) => osSelecionadasSaque.has(c.id)),
    [totais.comissoesLiberadas, osSelecionadasSaque]
  );

  const totalSaqueParcial = useMemo(
    () => comissoesSelecionadasSaque.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0),
    [comissoesSelecionadasSaque]
  );

  const abrirModalSaqueParcial = () => {
    setOsSelecionadasSaque(new Set());
    setModalSaqueParcial(true);
  };

  const fecharModalSaqueParcial = () => {
    if (processando) return;
    setModalSaqueParcial(false);
    setOsSelecionadasSaque(new Set());
  };

  const toggleOsSaque = (id: string) => {
    setOsSelecionadasSaque((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodasOsSaque = () => {
    setOsSelecionadasSaque(new Set(totais.comissoesLiberadas.map((c) => c.id)));
  };

  const limparSelecaoOsSaque = () => {
    setOsSelecionadasSaque(new Set());
  };

  // Processar saque parcial pelas OS selecionadas (valor = soma exata das comissões)
  const handleSaqueParcial = async () => {
    if (comissoesSelecionadasSaque.length === 0) {
      addToast('warning', 'Selecione ao menos uma O.S. para sacar.');
      return;
    }

    const confirmado = await confirm({
      title: 'Confirmar Saque Parcial',
      message: `Marcar ${comissoesSelecionadasSaque.length} O.S. como PAGA(S)?\n\nTotal: ${formatCurrency(totalSaqueParcial)}`,
      confirmText: 'Confirmar saque',
      cancelText: 'Cancelar',
      variant: 'success',
    });

    if (!confirmado) return;
    await processarSaque(comissoesSelecionadasSaque, totalSaqueParcial);
  };

  const processarSaque = async (comissoesParaSaque: Comissao[], valorTotal: number) => {
    setProcessando(true);
    try {
      let sucesso = 0;
      let erros = 0;
      // Mesmo instante para todas as comissões do lote → histórico de saque agrupado
      const dataPagamentoLote = new Date().toISOString();
      const token = await getAccessTokenForApi();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      for (const comissao of comissoesParaSaque) {
        // Só bloqueia prevista ainda em andamento (não entregue)
        if (
          String(comissao.id).startsWith('prevista-') &&
          (comissao.status || '').toUpperCase() === 'PREVISTA'
        ) {
          continue;
        }

        const response = await fetch('/api/comissoes/atualizar', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            comissaoId: comissao.id,
            status: 'PAGA',
            dataPagamento: dataPagamentoLote,
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
        setModalSaqueParcial(false);
        setOsSelecionadasSaque(new Set());
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
    if (
      String(comissao.id).startsWith('prevista-') &&
      (comissao.status || '').toUpperCase() === 'PREVISTA'
    ) {
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
      const token = await getAccessTokenForApi();
      const response = await fetch('/api/comissoes/atualizar', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          comissaoId: comissao.id,
          status: 'PAGA',
          dataPagamento: new Date().toISOString(),
        })
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
      const token = await getAccessTokenForApi();
      const response = await fetch('/api/comissoes/atualizar', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => router.push('/financeiro/comissoes-tecnicos')}
                  className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
                  aria-label="Voltar"
                >
                  <FiArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <FiUser size={22} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl md:text-2xl font-bold text-gray-900">{tecnico.nome}</h1>
                    <p className="text-sm text-gray-500">
                      Comissão:{' '}
                      {tecnico.tipo_comissao === 'fixo'
                        ? `${formatCurrency(tecnico.comissao_fixa)} por OS`
                        : `${tecnico.comissao_percentual}% do serviço`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Seletor de Mês + PDF */}
              <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="flex flex-col xs:flex-row sm:flex-row gap-2">
                  <div className="relative flex-1 min-w-0">
                    <FiCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select
                      value={mesSelecionado}
                      onChange={(e) => setMesSelecionado(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-9 text-sm font-medium text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="todos">Todos os meses</option>
                      {mesesDisponiveis.map((mes) => (
                        <option key={mes} value={mes}>{formatMesLabel(mes)}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    title="Exportar relatório em PDF"
                    onClick={exportarPDF}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98] sm:min-w-[108px]"
                  >
                    <FiFileText size={16} />
                    PDF
                  </button>
                </div>
                <label className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pdfIncluirAssinatura}
                    onChange={(e) => setPdfIncluirAssinatura(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Incluir total do período e campo para assinatura do técnico</span>
                </label>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <FiTrendingUp className="text-gray-400 shrink-0" size={16} />
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-500">Total</span>
                </div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-gray-900 leading-tight">{formatCurrency(totais.total)}</p>
                <p className="mt-1 text-[11px] sm:text-xs text-gray-500">
                  {comissoesDoMes.length} {comissoesDoMes.length === 1 ? 'comissão' : 'comissões'}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <FiCheckCircle className="text-green-500 shrink-0" size={16} />
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-500">Já pago</span>
                </div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-green-600 leading-tight">{formatCurrency(totais.pago)}</p>
                <p className="mt-1 text-[11px] sm:text-xs text-gray-500">
                  {totais.qtdPagas} {totais.qtdPagas === 1 ? 'comissão' : 'comissões'}
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-4 shadow-sm">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <FiDollarSign className="text-blue-500 shrink-0" size={16} />
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-blue-600">Disponível</span>
                </div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-blue-600 leading-tight">{formatCurrency(totais.liberado)}</p>
                <p className="mt-1 text-[11px] sm:text-xs text-blue-600/80">
                  {totais.qtdLiberadas} {totais.qtdLiberadas === 1 ? 'liberada' : 'liberadas'}
                  {totais.arrasto > 0 ? ` · +${formatCurrency(totais.arrasto)} arrasto` : ''}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <FiClock className="text-orange-500 shrink-0" size={16} />
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-500">Previsto</span>
                </div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-orange-600 leading-tight">{formatCurrency(totais.previsto)}</p>
                <p className="mt-1 text-[11px] sm:text-xs text-gray-500">
                  {totais.qtdPrevistas} OS em andamento
                </p>
              </div>
            </div>

            {/* Seção de Saque */}
            {totais.liberado > 0 && (
              <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                <div className="border-b border-blue-50 bg-gradient-to-r from-blue-50 to-white px-4 py-3.5 sm:px-6 sm:py-4">
                  <h2 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <FiDollarSign size={16} />
                    </span>
                    Realizar Saque
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 sm:pl-10">
                    Disponível agora: <span className="font-semibold text-blue-600">{formatCurrency(totais.liberado)}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 p-4 sm:gap-4 sm:p-6 md:grid-cols-2">
                  {/* Saque Total */}
                  <div className="flex flex-col rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/80">Saque total</p>
                    <p className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums text-blue-700">{formatCurrency(totais.liberado)}</p>
                    <p className="mt-1 text-xs text-blue-700/70">
                      {totais.qtdLiberadas} {totais.qtdLiberadas === 1 ? 'comissão' : 'comissões'}
                    </p>
                    <button
                      type="button"
                      onClick={handleSaqueTotal}
                      disabled={processando}
                      className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiCheckCircle size={18} />
                      {processando ? 'Processando...' : 'Sacar tudo'}
                    </button>
                  </div>

                  {/* Saque Parcial */}
                  <div className="flex flex-col rounded-2xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Saque parcial</p>
                    <p className="mt-1 text-sm text-gray-600">Escolha as O.S. que deseja baixar</p>
                    <button
                      type="button"
                      onClick={abrirModalSaqueParcial}
                      disabled={processando || totais.qtdLiberadas === 0}
                      className="mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiEdit size={16} />
                      Selecionar O.S.
                    </button>
                  </div>
                </div>

                <p className="flex items-start gap-2 border-t border-gray-100 px-4 py-3 text-[11px] sm:text-xs text-gray-500 sm:px-6">
                  <FiAlertCircle size={14} className="mt-0.5 shrink-0 text-gray-400" />
                  <span>
                    No saque parcial você escolhe as O.S. — o total é a soma exata delas. O saque marca como PAGA e registra data/hora. Arrasto de meses anteriores entra no disponível.
                  </span>
                </p>
              </div>
            )}

            {/* Histórico de Saques */}
            {historicoSaques.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
                <div className="p-4 md:p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FiCheckCircle className="text-green-500" />
                    Histórico de Saques ({historicoSaques.length})
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Data e horário de cada baixa de comissão</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {historicoSaques.map((saque, idx) => (
                    <div key={`${saque.dataPagamento}-${idx}`} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDateTime(saque.dataPagamento)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {saque.itens.length} comissão(ões) — OS{' '}
                          {saque.itens.map((i) => `#${i.numero_os}`).join(', ')}
                        </p>
                      </div>
                      <p className="text-base font-bold text-green-600">{formatCurrency(saque.valor)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de Comissões */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiFileText className="text-gray-400" />
                  Histórico de Comissões ({comissoesDoMes.length})
                </h2>
                {totais.qtdArrasto > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    Inclui {totais.qtdArrasto} comissão(ões) não sacada(s) de meses anteriores.
                  </p>
                )}
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
                          {comissao.arrasto && (
                            <span className="block text-[10px] text-blue-600 font-medium">mês anterior</span>
                          )}
                          {comissao.status?.toUpperCase() === 'PAGA' && (comissao.data_pagamento || comissao.data_calculo) && (
                            <span className="block text-[10px] text-green-700" title="Data/hora do saque">
                              Saque: {formatDateTime(comissao.data_pagamento || comissao.data_calculo)}
                            </span>
                          )}
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
                          {comissao.arrasto && (
                            <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                              Arrasto
                            </span>
                          )}
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
                            {!String(comissao.id).startsWith('prevista-') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditarComissao(comissao); }}
                                className="p-1.5 rounded text-blue-600 hover:bg-blue-50"
                                title="Editar"
                              >
                                <FiEdit size={16} />
                              </button>
                            )}
                            {comissao.status?.toUpperCase() === 'CALCULADA' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarcarComoPaga(comissao); }}
                                className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 whitespace-nowrap"
                              >
                                Marcar paga
                              </button>
                            )}
                            {comissao.status?.toUpperCase() === 'PAGA' && !String(comissao.id).startsWith('prevista-') && (
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
                      {!String(comissao.id).startsWith('prevista-') && (
                        <button
                          onClick={() => handleEditarComissao(comissao)}
                          className="text-xs px-2 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1"
                        >
                          <FiEdit size={12} /> Editar
                        </button>
                      )}
                      {comissao.status?.toUpperCase() === 'CALCULADA' && (
                        <button
                          onClick={() => handleMarcarComoPaga(comissao)}
                          className="text-xs px-2 py-1.5 rounded bg-green-600 text-white hover:bg-green-700"
                        >
                          Marcar como paga
                        </button>
                      )}
                      {comissao.status?.toUpperCase() === 'PAGA' && !String(comissao.id).startsWith('prevista-') && (
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

            {/* Modal Saque Parcial — seleção de O.S. */}
            {modalSaqueParcial && (
              <div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
                onClick={fecharModalSaqueParcial}
              >
                <div
                  className="flex w-full max-w-lg flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[92vh] sm:max-h-[85vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Saque parcial</h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Selecione as O.S. disponíveis. O total atualiza na hora.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fecharModalSaqueParcial}
                      disabled={processando}
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                      aria-label="Fechar"
                    >
                      <FiX size={20} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-gray-50 px-4 py-2 sm:px-5">
                    <p className="text-xs text-gray-500">
                      {osSelecionadasSaque.size} de {totais.qtdLiberadas} selecionada(s)
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selecionarTodasOsSaque}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Todas
                      </button>
                      <span className="text-gray-300">·</span>
                      <button
                        type="button"
                        onClick={limparSelecaoOsSaque}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3">
                    {totais.comissoesLiberadas.length === 0 ? (
                      <p className="px-3 py-8 text-center text-sm text-gray-500">Nenhuma O.S. liberada para saque.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {totais.comissoesLiberadas.map((c) => {
                          const selecionada = osSelecionadasSaque.has(c.id);
                          return (
                            <li key={c.id}>
                              <label
                                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                                  selecionada
                                    ? 'border-blue-300 bg-blue-50/80'
                                    : 'border-transparent bg-gray-50 hover:border-gray-200 hover:bg-white'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selecionada}
                                  onChange={() => toggleOsSaque(c.id)}
                                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className="text-sm font-semibold text-gray-900">OS #{c.numero_os}</span>
                                    {c.arrasto && (
                                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                        Arrasto
                                      </span>
                                    )}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-gray-500">
                                    {c.cliente_nome}
                                    {c.servico_nome ? ` · ${c.servico_nome}` : ''}
                                  </span>
                                  <span className="mt-0.5 block text-[11px] text-gray-400">
                                    Entrega {formatDate(c.data_entrega)}
                                  </span>
                                </span>
                                <span className="shrink-0 text-sm font-bold tabular-nums text-blue-700">
                                  {formatCurrency(Number(c.valor_comissao || 0))}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-5 safe-area-pb">
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total do saque</p>
                        <p className="text-2xl font-bold tabular-nums text-emerald-600">
                          {formatCurrency(totalSaqueParcial)}
                        </p>
                      </div>
                      <p className="pb-1 text-xs text-gray-500 text-right">
                        Disponível: {formatCurrency(totais.liberado)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={fecharModalSaqueParcial}
                        disabled={processando}
                        className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaqueParcial}
                        disabled={processando || osSelecionadasSaque.size === 0}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiCheckCircle size={18} />
                        {processando ? 'Processando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                      <CurrencyInput value={valorEditado} onValueChange={setValorEditado} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
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

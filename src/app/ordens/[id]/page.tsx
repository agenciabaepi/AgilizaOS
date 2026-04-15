'use client';

import React, { useEffect, useRef, useState } from 'react';
import MenuLayout from '@/components/MenuLayout';

import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FiArrowLeft, FiEdit, FiPrinter, FiChevronDown, FiChevronRight, FiDollarSign, FiMessageCircle, FiUser, FiSmartphone, FiFileText, FiCalendar, FiShield, FiTool, FiPackage, FiCheckCircle, FiClock, FiRefreshCw, FiExternalLink, FiAlertTriangle, FiPlus, FiTrash2, FiPercent, FiCreditCard } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import ImagensOS from '@/components/ImagensOS';
import VideosOS from '@/components/VideosOS';
import ChecklistViewer from '@/components/ChecklistViewer';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import { useHistoricoOS } from '@/hooks/useHistoricoOS';
import HistoricoOSTimeline from '@/components/HistoricoOSTimeline';
import LaudoRenderer from '@/components/LaudoRenderer';
import { getStatusTecnicoLabel } from '@/utils/statusLabels';

type LinhaPagamentoEntrega = { id: string; forma: string; valor: string };

const FORMAS_PAGAMENTO_OS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'transferencia', label: 'Transferência' },
] as const;

function novoIdLinhaPagamento() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `pg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Parse valor em pt-BR ou simples (ex.: "1.234,56" ou "100.50") */
function parseValorMontario(input: string): number {
  const s = String(input ?? '').trim();
  if (!s) return 0;
  const normalized = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

const VisualizarOrdemServicoPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { addToast } = useToast();
  const { empresaData } = useAuth();
  const { historico, loading: loadingHistorico, buscarHistoricoOS, registrarHistorico } = useHistoricoOS();
  const [ordem, setOrdem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [custosOS, setCustosOS] = useState<number>(0);
  
  // Estados para edição do relato
  const [editandoRelato, setEditandoRelato] = useState(false);
  const [relatoEditavel, setRelatoEditavel] = useState('');
  const [salvandoRelato, setSalvandoRelato] = useState(false);
  

  // Estados para sistema de entrega
  const [modalEntrega, setModalEntrega] = useState(false);
  const [termoGarantiaSelecionado, setTermoGarantiaSelecionado] = useState<any>(null);
  const [linhasPagamento, setLinhasPagamento] = useState<LinhaPagamentoEntrega[]>([
    { id: novoIdLinhaPagamento(), forma: '', valor: '' },
  ]);
  const [descontoEntregaStr, setDescontoEntregaStr] = useState('');
  const [processandoEntrega, setProcessandoEntrega] = useState(false);
  const [termosGarantia, setTermosGarantia] = useState<any[]>([]);
  const [clienteRecusou, setClienteRecusou] = useState(false); // Nova opção
  const [aparelhoSemConserto, setAparelhoSemConserto] = useState(false); // Aparelho não teve conserto
  const [acoesMenuOpen, setAcoesMenuOpen] = useState(false);
  const [imprimirSubOpen, setImprimirSubOpen] = useState(false);
  const acoesMenuRef = useRef<HTMLDivElement>(null);
  const [linkPublicoAtivo, setLinkPublicoAtivo] = useState<boolean>(true);

  useEffect(() => {
    if (!acoesMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (acoesMenuRef.current && !acoesMenuRef.current.contains(e.target as Node)) {
        setAcoesMenuOpen(false);
        setImprimirSubOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [acoesMenuOpen]);

  useEffect(() => {
    if (!modalEntrega) return;
    setLinhasPagamento([{ id: novoIdLinhaPagamento(), forma: '', valor: '' }]);
    setDescontoEntregaStr('');
  }, [modalEntrega]);

  useEffect(() => {
    const fetchOrdem = async () => {
      setLoading(true);
      try {
        // Na consulta do banco (linha 23), adicionar o campo prazo_entrega:
        const { data, error } = await supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            empresa_id,
            cliente_id,
            created_at,
            prazo_entrega,
            data_entrega,
            cliente:cliente_id (
              nome,
              telefone,
              cpf,
              endereco
            ),
            tecnico:tecnico_id (
              nome
            ),
            modelo,
            cor,
            marca,
            numero_serie,
            status,
            status_tecnico,
            observacao,
            qtd_peca,
            peca,
            valor_peca,
            qtd_servico,
            servico,
            valor_servico,
            valor_faturado,
            desconto,
            acessorios,
            condicoes_equipamento,
            equipamento,
            problema_relatado,
            senha_aparelho,
            senha_padrao,
            senha_acesso,
            laudo,
            vencimento_garantia,
            termo_garantia_id,
            tipo,
            imagens,
            imagens_tecnico,
            videos_tecnico,
            checklist_entrada,
            termo_garantia:termo_garantia_id (
              id,
              nome,
              conteudo
            )
          `)
          .eq('id', String(id))
          .single();

        if (error) {
          const errMsg = error?.message || error?.code || JSON.stringify(error);
          console.error('Erro ao carregar OS:', errMsg, error);
        } else {
          // Mapear campos para compatibilidade com a interface
          const ordemMapeada = {
            ...data,
            relato: data.problema_relatado, // Mapear problema_relatado para relato
            observacao: data.observacao // Manter observacao como está
          };
          
          setOrdem(ordemMapeada);
          setRelatoEditavel(data.problema_relatado || '');
          setLinkPublicoAtivo(true); // padrão ao trocar de OS
          // Buscar link_publico_ativo da empresa em consulta separada (evita quebrar se a coluna não existir)
          if (data.empresa_id) {
            void Promise.resolve(supabase.from('empresas').select('link_publico_ativo').eq('id', data.empresa_id).single())
              .then(({ data: emp }) => { if (typeof emp?.link_publico_ativo === 'boolean') setLinkPublicoAtivo(emp.link_publico_ativo); })
              .catch(() => { /* mantém true se coluna não existir ou der erro */ });
          }
          // Buscar custos vinculados à OS (contas_pagar por os_id)
          try {
            const { data: contas } = await supabase
              .from('contas_pagar')
              .select('valor, tipo, status')
              .eq('empresa_id', data.empresa_id)
              .eq('os_id', String(id));
            const totalCustos = (contas || [])
              .filter((c: any) => c.tipo === 'pecas' || c.tipo === 'servicos')
              .reduce((acc: number, c: any) => acc + Number(c.valor || 0), 0);
            setCustosOS(totalCustos);
          } catch (e) {
            setCustosOS(0);
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Erro ao carregar OS:', errMsg, error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrdem();
  }, [id]);

  useEffect(() => {
    fetchTermosGarantia();
  }, []);

  // Carregar histórico quando a OS for carregada
  useEffect(() => {
    if (id) {
      buscarHistoricoOS(id as string);
    }
  }, [id, buscarHistoricoOS]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '---';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const normalized = String(status || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/_/g, ' ');

    if (normalized.includes('SEM REPARO') || normalized.includes('SEM_REPARO') || normalized.includes('CLIENTE RECUSOU')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (normalized.includes('ENTREGUE') || normalized.includes('CONCLUIDO')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (normalized.includes('ORCAMENTO') || normalized.includes('AGUARDANDO')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    if (normalized.includes('EM ANALISE')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (normalized.includes('APROVADO') || normalized.includes('EM EXECUCAO')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }

    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusTecnicoColor = (statusTecnico: string) => {
    const normalized = String(statusTecnico || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/_/g, ' ');

    if (normalized.includes('SEM REPARO') || normalized.includes('SEM_REPARO')) {
      return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
    }

    return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
  };

  const isRetorno = (ordem: any) => {
    const tipo = ordem?.tipo?.toLowerCase();
    return tipo === 'retorno' || tipo === 'Retorno';
  };

  // Função para salvar o relato do cliente
  const salvarRelato = async () => {
    if (!ordem?.id) return;
    if (ordem?.status === 'ENTREGUE') {
      addToast('O.S. entregue está bloqueada para edição.', 'error');
      return;
    }
    
    setSalvandoRelato(true);
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({ problema_relatado: relatoEditavel })
        .eq('id', ordem.id);

      if (error) {
        throw error;
      }

      // Atualizar o estado local
      setOrdem((prev: any) => ({
        ...prev,
        problema_relatado: relatoEditavel,
        relato: relatoEditavel
      }));

      setEditandoRelato(false);
      addToast('Relato do cliente atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar relato:', error);
      addToast('Erro ao salvar relato do cliente', 'error');
    } finally {
      setSalvandoRelato(false);
    }
  };


  const fetchTermosGarantia = async () => {
    if (!empresaData?.id) {
      console.warn('Empresa não encontrada para carregar termos de garantia');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('termos_garantia')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .order('nome');
      
      if (error) {
        console.error('Erro ao carregar termos de garantia:', error);
        return;
      }
      
      setTermosGarantia(data || []);
    } catch (error) {
      console.error('Erro ao carregar termos de garantia:', error);
    }
  };

  // Função para processar entrega da O.S.
  const processarEntrega = async () => {
    if (!termoGarantiaSelecionado) {
      addToast('Selecione um termo de garantia', 'error');
      return;
    }

    if (!clienteRecusou && !aparelhoSemConserto) {
      const valorOS = calcularValores().valorFinal;
      const descontoExtra = parseValorMontario(descontoEntregaStr);
      if (descontoExtra > valorOS + 0.001) {
        addToast('O desconto na entrega não pode ser maior que o total da O.S.', 'error');
        return;
      }
      const totalLiquido = Math.max(0, valorOS - descontoExtra);

      if (totalLiquido > 0) {
        const linhasAtivas = linhasPagamento.filter(
          (l) => l.forma || parseValorMontario(l.valor) > 0
        );
        if (linhasAtivas.length === 0) {
          addToast('Informe ao menos uma forma de pagamento com valor.', 'error');
          return;
        }
        for (const l of linhasAtivas) {
          if (!l.forma || parseValorMontario(l.valor) <= 0) {
            addToast('Preencha forma e valor em cada linha de pagamento utilizada.', 'error');
            return;
          }
        }
        const soma = linhasAtivas.reduce((acc, l) => acc + parseValorMontario(l.valor), 0);
        if (soma + 0.009 < totalLiquido) {
          addToast(
            `A soma dos pagamentos (R$ ${soma.toFixed(2)}) deve cobrir o total a receber (R$ ${totalLiquido.toFixed(2)}).`,
            'error'
          );
          return;
        }
      }
    }

    setProcessandoEntrega(true);

    try {
      const statusTecnicoAtual = String(ordem?.status_tecnico || '').toUpperCase().trim();
      const tecnicoJaMarcouSemReparo =
        statusTecnicoAtual === 'SEM REPARO' || statusTecnicoAtual === 'SEM_REPARO';

      // 1. Atualizar O.S. para ENTREGUE usando nosso endpoint
      // Passar flags clienteRecusou e aparelhoSemConserto para a API não registrar comissão
      const response = await fetch('/api/ordens/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          osId: id,
          newStatus: 'ENTREGUE',
          newStatusTecnico: tecnicoJaMarcouSemReparo ? 'SEM REPARO' : 'REPARO CONCLUÍDO',
          termo_garantia_id: termoGarantiaSelecionado.id,
          data_entrega: new Date().toISOString().split('T')[0],
          vencimento_garantia: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cliente_recusou: clienteRecusou, // Flag para não registrar comissão
          aparelho_sem_conserto: aparelhoSemConserto // Flag para aparelho sem conserto
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        addToast('Erro ao atualizar O.S.: ' + (errorData.error || 'Erro desconhecido'), 'error');
        return;
      }

      const result = await response.json();

      // 2. Se houver valor líquido E cliente não recusou E aparelho teve conserto, criar venda
      if (!clienteRecusou && !aparelhoSemConserto) {
        const valorOS = calcularValores().valorFinal;
        const descExtra = parseValorMontario(descontoEntregaStr);
        const totalVendaLiquido = Math.max(0, valorOS - descExtra);
        if (valorOS > 0 && totalVendaLiquido > 0) {
          const numeroVenda = await criarVenda();
          if (!numeroVenda) {
            addToast('Erro ao criar venda', 'error');
            return;
          }
          addToast(`✅ Venda #${numeroVenda} criada com sucesso!`, 'success');
        } else if (valorOS > 0 && totalVendaLiquido <= 0) {
          addToast('✅ O.S. entregue — total zerado pelo desconto (nenhuma venda registrada).', 'success');
        } else {
          addToast('✅ O.S. entregue sem valores (desistência ou sem serviços)', 'success');
        }
      } else if (clienteRecusou) {
        addToast('✅ O.S. finalizada (cliente recusou - valores mantidos para histórico)', 'success');
      } else if (aparelhoSemConserto) {
        addToast('✅ O.S. finalizada (aparelho sem conserto)', 'success');
      }

      addToast('✅ O.S. entregue com sucesso!', 'success');
      setModalEntrega(false);
      router.push('/ordens');

    } catch (error) {
      console.error('Erro ao processar entrega:', error);
      addToast('Erro inesperado ao processar entrega', 'error');
    } finally {
      setProcessandoEntrega(false);
    }
  };

  // Função para criar venda
  const criarVenda = async () => {
    try {
      const valores = calcularValores();
      const descontoExtra = parseValorMontario(descontoEntregaStr);
      const totalVenda = Math.max(0, valores.valorFinal - descontoExtra);
      const labelForma = (v: string) =>
        FORMAS_PAGAMENTO_OS.find((f) => f.value === v)?.label ?? v;
      const formaPagamentoStr = linhasPagamento
        .filter((l) => l.forma && parseValorMontario(l.valor) > 0)
        .map((l) => `${labelForma(l.forma)} ${formatCurrency(parseValorMontario(l.valor))}`)
        .join(' · ');
      
      // Buscar próximo número de venda
      const { data: ultimaVenda, error: errorUltimaVenda } = await supabase
        .from('vendas')
        .select('numero_venda')
        .eq('empresa_id', empresaData?.id)
        .order('numero_venda', { ascending: false })
        .limit(1)
        .single();

      if (errorUltimaVenda && errorUltimaVenda.code !== 'PGRST116') {
        console.error('Erro ao buscar última venda:', errorUltimaVenda);
        return null;
      }

      const proximoNumero = (ultimaVenda?.numero_venda || 0) + 1;
      // Criar venda
      const payload = {
        numero_venda: proximoNumero,
        data_venda: new Date().toISOString(),
        cliente_id: ordem?.cliente_id,
        total: totalVenda,
        forma_pagamento: formaPagamentoStr || '—',
        status: 'finalizada',
        desconto: descontoExtra,
        acrescimo: 0,
        tipo_pedido: 'Ordem de Serviço',
        observacoes: `O.S. #${ordem?.numero_os} - ${ordem?.clientes?.nome}`,
        produtos: [], // Campo obrigatório para vendas
        usuario_id: null, // Campo obrigatório para vendas
        empresa_id: ordem?.empresa_id || '550e8400-e29b-41d4-a716-446655440001' // Campo obrigatório para vendas
      };

      // Tentar inserir sem select primeiro para ver se há erro na inserção
      const { error: insertError } = await supabase
        .from('vendas')
        .insert([payload]);

      if (insertError) {
        console.error('Erro detalhado ao criar venda:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          fullError: insertError
        });
        return null;
      }

      // Se inserção funcionou, buscar a venda criada
      const { data: vendaCriada, error: selectError } = await supabase
        .from('vendas')
        .select('*')
        .eq('numero_venda', proximoNumero)
        .eq('empresa_id', empresaData?.id)
        .single();

      if (selectError) {
        console.error('Erro ao buscar venda criada:', selectError);
        // Mesmo com erro na busca, a venda foi criada
        return proximoNumero;
      }

      return proximoNumero;

    } catch (error) {
      console.error('Erro inesperado ao criar venda:', error);
      return null;
    }
  };

  // Calcular valores
  const calcularValores = () => {
    if (!ordem) return { valorTotal: 0, valorFinal: 0 };
    
    // Converter para números e garantir valores válidos
    const valorServico = Number(ordem.valor_servico || 0);
    const qtdServico = Number(ordem.qtd_servico || 1);
    const valorPeca = Number(ordem.valor_peca || 0);
    const qtdPeca = Number(ordem.qtd_peca || 1);
    const desconto = Number(ordem.desconto || 0);
    
    const totalServico = valorServico * qtdServico;
    const totalPeca = valorPeca * qtdPeca;
    const valorTotal = totalServico + totalPeca;
    const valorFinal = valorTotal - desconto;
    
    return { valorTotal, valorFinal };
  };

  const calcularPrevisao = () => {
    const { valorFinal } = calcularValores();
    const custoPrevisto = Number(custosOS || 0);
    const lucroPrevisto = valorFinal - custoPrevisto;
    const margemPrevista = valorFinal > 0 ? (lucroPrevisto / valorFinal) * 100 : 0;
    return { valorPrevisto: valorFinal, custoPrevisto, lucroPrevisto, margemPrevista };
  };

  const atualizarLinhaPagamento = (id: string, patch: Partial<LinhaPagamentoEntrega>) => {
    setLinhasPagamento((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };
  const adicionarLinhaPagamento = () => {
    setLinhasPagamento((prev) => [...prev, { id: novoIdLinhaPagamento(), forma: '', valor: '' }]);
  };
  const removerLinhaPagamento = (id: string) => {
    setLinhasPagamento((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const abrirWhatsApp = () => {
    const raw = (ordem?.cliente?.telefone || '').replace(/\D/g, '');
    if (raw.length < 10) {
      addToast('Telefone do cliente não informado ou inválido', 'error');
      return;
    }
    const numero = !raw.startsWith('55') ? '55' + raw : raw;
    window.open(`https://wa.me/${numero}`, '_blank');
  };

  const enviarOSPorWhatsApp = () => {
    const raw = (ordem?.cliente?.telefone || '').replace(/\D/g, '');
    if (raw.length < 10) {
      addToast('Telefone do cliente não informado ou inválido', 'error');
      return;
    }
    const numero = !raw.startsWith('55') ? '55' + raw : raw;
    const origem = typeof window !== 'undefined' ? window.location.origin : '';
    const linkAcompanhar = `${origem}/os/${ordem?.id}/status`;
    const senha = ordem?.senha_acesso ? String(ordem.senha_acesso).trim() : '';
    const clienteNome = ordem?.cliente?.nome || 'Cliente';
    const equipamento = [ordem?.equipamento, ordem?.marca, ordem?.modelo].filter(Boolean).join(' ') || '—';
    const statusLabel = getStatusTecnicoLabel(ordem?.status, ordem?.status_tecnico) || ordem?.status || '—';
    const texto = [
      `*Resumo da OS #${ordem?.numero_os ?? ordem?.id}*`,
      '',
      `Olá, ${clienteNome}!`,
      '',
      `*Equipamento:* ${equipamento}`,
      ordem?.problema_relatado ? `*Problema relatado:* ${String(ordem.problema_relatado).slice(0, 200)}${String(ordem.problema_relatado).length > 200 ? '...' : ''}` : '',
      `*Status:* ${statusLabel}`,
      ordem?.prazo_entrega ? `*Previsão de entrega:* ${formatDate(ordem.prazo_entrega)}` : '',
      '',
      '*Acompanhe sua OS pelo link abaixo (use a senha do recibo para acessar):*',
      linkAcompanhar,
      senha ? `*Senha de acesso:* ${senha}` : '',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const entregaValorBruto = calcularValores().valorFinal;
  const entregaDescontoExtra = parseValorMontario(descontoEntregaStr);
  const entregaTotalLiquido = Math.max(0, entregaValorBruto - entregaDescontoExtra);
  const entregaSomaPagamentos = linhasPagamento
    .filter((l) => l.forma && parseValorMontario(l.valor) > 0)
    .reduce((a, l) => a + parseValorMontario(l.valor), 0);
  const entregaLinhasValidas = linhasPagamento.every((l) => {
    const v = parseValorMontario(l.valor);
    if (!(l.forma || v > 0)) return true;
    return !!(l.forma && v > 0);
  });
  const entregaPrecisaPagamento =
    !clienteRecusou && !aparelhoSemConserto && entregaTotalLiquido > 0;
  const entregaPagamentoOk =
    !entregaPrecisaPagamento ||
    (entregaLinhasValidas &&
      entregaSomaPagamentos + 0.009 >= entregaTotalLiquido &&
      entregaSomaPagamentos > 0);
  const entregaDescontoInvalido = entregaDescontoExtra > entregaValorBruto + 0.001;

  if (loading) {
    return (
      <MenuLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-zinc-100 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-zinc-400">Carregando ordem de serviço...</p>
          </div>
        </div>
      </MenuLayout>
    );
  }

  if (!ordem) {
    return (
      <MenuLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ordem não encontrada</h2>
            <p className="text-gray-600 mb-4">A ordem de serviço solicitada não foi encontrada.</p>
            <button
              onClick={() => router.push('/ordens')}
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Voltar para Ordens
            </button>
          </div>
        </div>
      </MenuLayout>
    );
  }

  return (
    
      <MenuLayout>
        <div className="p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-center gap-4 sm:gap-6 mb-8">
            {/* Voltar + Título (esquerda) */}
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => router.push('/ordens')}
                className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors shrink-0"
              >
                <FiArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-zinc-600 hidden sm:block" />
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-zinc-100">
                    OS #{ordem.numero_os}
                  </h1>
                  {isRetorno(ordem) && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-full">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">Retorno</span>
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-zinc-400 mt-0.5 text-sm sm:text-base">
                  Criada em {formatDate(ordem.created_at)}
                </p>
              </div>
            </div>

            {/* Ações — menu cascata */}
            <div className="flex justify-end shrink-0" ref={acoesMenuRef}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAcoesMenuOpen((prev) => {
                      const next = !prev;
                      if (next) setImprimirSubOpen(false);
                      return next;
                    });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-sm"
                  aria-expanded={acoesMenuOpen}
                  aria-haspopup="true"
                >
                  Ações
                  <FiChevronDown className={`w-4 h-4 shrink-0 transition-transform ${acoesMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {acoesMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[14rem] w-max max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setAcoesMenuOpen(false);
                        if (ordem.status !== 'ENTREGUE') router.push(`/ordens/${id}/editar`);
                      }}
                      disabled={ordem.status === 'ENTREGUE'}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-800 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <FiEdit className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      Editar
                    </button>

                    <div className="border-t border-gray-100 dark:border-zinc-700 my-0.5" />
                    <button
                      type="button"
                      onClick={() => setImprimirSubOpen((s) => !s)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-gray-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/80"
                    >
                      <span className="flex items-center gap-2">
                        <FiPrinter className="w-4 h-4 shrink-0 text-gray-600 dark:text-zinc-400" />
                        Imprimir
                      </span>
                      <FiChevronRight className={`w-4 h-4 shrink-0 transition-transform text-gray-400 ${imprimirSubOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {imprimirSubOpen && (
                      <div className="border-t border-gray-100 dark:border-zinc-700 bg-gray-50/80 dark:bg-zinc-900/50 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            window.open(`/ordens/${id}/imprimir`, '_blank');
                            setAcoesMenuOpen(false);
                            setImprimirSubOpen(false);
                          }}
                          className="w-full px-3 py-2 pl-9 text-left text-sm text-gray-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800"
                        >
                          Padrão (A4 completo)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            window.open(`/ordens/${id}/imprimir/cupom`, '_blank');
                            setAcoesMenuOpen(false);
                            setImprimirSubOpen(false);
                          }}
                          className="w-full px-3 py-2 pl-9 text-left text-sm text-gray-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800"
                        >
                          Cupom (receituário)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            window.open(`/ordens/${id}/imprimir/2vias`, '_blank');
                            setAcoesMenuOpen(false);
                            setImprimirSubOpen(false);
                          }}
                          className="w-full px-3 py-2 pl-9 text-left text-sm text-gray-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800"
                        >
                          2 Vias (meia folha A4)
                        </button>
                      </div>
                    )}

                    <div className="border-t border-gray-100 dark:border-zinc-700 my-0.5" />
                    <button
                      type="button"
                      onClick={() => {
                        abrirWhatsApp();
                        setAcoesMenuOpen(false);
                        setImprimirSubOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-800 dark:text-zinc-200 hover:bg-green-50 dark:hover:bg-green-900/25"
                      title="Abrir conversa com o cliente no WhatsApp"
                    >
                      <FaWhatsapp className="w-4 h-4 shrink-0 text-green-600" />
                      Conversar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        enviarOSPorWhatsApp();
                        setAcoesMenuOpen(false);
                        setImprimirSubOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-800 dark:text-zinc-200 hover:bg-green-50 dark:hover:bg-green-900/25"
                      title="Enviar resumo da OS + link e senha para o cliente no WhatsApp"
                    >
                      <FaWhatsapp className="w-4 h-4 shrink-0 text-green-700 dark:text-green-500" />
                      Enviar OS
                    </button>

                    {linkPublicoAtivo && (
                      <>
                        <div className="border-t border-gray-100 dark:border-zinc-700 my-0.5" />
                        <button
                          type="button"
                          onClick={() => {
                            window.open(`/os/${ordem?.id}/status`, '_blank');
                            setAcoesMenuOpen(false);
                            setImprimirSubOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-800 dark:text-zinc-200 hover:bg-purple-50 dark:hover:bg-purple-900/25"
                          title="Abrir página de acompanhamento para o cliente"
                        >
                          <FiExternalLink className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                          Ver Status
                        </button>
                      </>
                    )}

                    {ordem.status !== 'ENTREGUE' && (
                      <>
                        <div className="border-t border-gray-100 dark:border-zinc-700 my-0.5" />
                        <button
                          type="button"
                          onClick={() => {
                            setModalEntrega(true);
                            setAcoesMenuOpen(false);
                            setImprimirSubOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-800 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/25"
                        >
                          <FiPackage className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          Entregar O.S.
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {ordem.status === 'ENTREGUE' && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800">
                <strong>O.S. entregue e bloqueada:</strong> esta ordem foi finalizada e nao pode mais ser editada.
              </p>
            </div>
          )}

          {/* Status */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(ordem.status)}`}>
                <FiCheckCircle className="w-4 h-4 mr-2" />
                {getStatusTecnicoLabel(ordem.status, null) || 'Status não definido'}
              </span>
              {ordem.status_tecnico && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusTecnicoColor(ordem.status_tecnico)}`}>
                  <FiTool className="w-4 h-4 mr-2" />
                  {getStatusTecnicoLabel(ordem.status, ordem.status_tecnico)}
                </span>
              )}
              {isRetorno(ordem) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700 animate-pulse">
                  <FiRefreshCw className="w-4 h-4 mr-2" />
                  Retorno
                </span>
              )}
            </div>
          </div>

          {/* Grid Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                         {/* Coluna Esquerda - Informações Principais */}
             <div className="lg:col-span-2 space-y-4 sm:space-y-6">
               {/* Cliente */}
               <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border p-4 sm:p-6 ${
                 isRetorno(ordem)
                   ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/20' 
                   : 'border-gray-200 dark:border-zinc-600'
               }`}>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
                    <FiUser className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Cliente</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-zinc-100">{ordem.cliente?.nome || 'Nome não informado'}</p>
                  </div>
                  <div className="text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-zinc-400">Telefone:</span>
                      <p className="font-medium text-gray-900 dark:text-zinc-100">{ordem.cliente?.telefone || '---'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aparelho */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg flex-shrink-0">
                    <FiSmartphone className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-300" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-zinc-100">Aparelho</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-zinc-400">Tipo de Equipamento:</span>
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{ordem.equipamento || '---'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-zinc-400">Marca:</span>
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{ordem.marca || '---'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-zinc-400">Modelo:</span>
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{ordem.modelo || '---'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-zinc-400">Cor:</span>
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{ordem.cor || '---'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-zinc-400">Número de Série:</span>
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{ordem.numero_serie || '---'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-zinc-400">Acessórios:</span>
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{ordem.acessorios || '---'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-gray-600 dark:text-zinc-400">Condições do Equipamento:</span>
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{ordem.condicoes_equipamento || '---'}</p>
                  </div>
                </div>
              </div>

              {/* Checklist de Entrada */}
              {ordem.checklist_entrada && (
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                      <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Checklist de Entrada</h2>
                      {ordem.equipamento && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 rounded-full text-xs font-medium">
                          Categoria: {ordem.equipamento}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChecklistViewer 
                    checklistData={ordem.checklist_entrada} 
                    equipamentoCategoria={ordem.equipamento || undefined}
                  />
                </div>
              )}
              {(ordem.senha_aparelho || ordem.senha_padrao || (linkPublicoAtivo && ordem.senha_acesso)) && (
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                      <FiShield className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Informações de Acesso</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {linkPublicoAtivo && ordem.senha_acesso && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="p-1.5 bg-blue-100 rounded">
                          <FiExternalLink className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Senha para Acompanhamento Público:</span>
                          <p className="font-mono text-blue-800 dark:text-blue-200 bg-white dark:bg-zinc-800 px-3 py-2 rounded text-lg font-bold mt-1 border border-blue-200 dark:border-blue-700 text-center">
                            {ordem.senha_acesso}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                            O cliente pode usar esta senha para acompanhar a OS em: <br/>
                            <span className="font-mono bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded text-xs">
                              {typeof window !== 'undefined' ? window.location.origin : ''}/os/{ordem.id}/login
                            </span>
                          </p>
                        </div>
                      </div>
                    )}

                    {ordem.senha_aparelho && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                        <div className="p-1.5 bg-gray-100 dark:bg-zinc-600 rounded">
                          <FiShield className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Senha do Aparelho:</span>
                          <p className="font-mono text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 px-2 py-1 rounded text-sm mt-1 border dark:border-zinc-600">
                            {ordem.senha_aparelho}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {ordem.senha_padrao && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                        <div className="p-1.5 bg-gray-100 dark:bg-zinc-600 rounded">
                          <FiSmartphone className="w-4 h-4 text-gray-600 dark:text-zinc-300" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Padrão de Desenho:</span>
                          <div className="mt-2">
                            <div className="grid grid-cols-3 gap-1 w-24 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded p-2">
                              {Array.from({ length: 9 }, (_, index) => {
                                const pattern = JSON.parse(ordem.senha_padrao);
                                const isSelected = pattern.includes(index);
                                const sequenceNumber = isSelected ? pattern.indexOf(index) + 1 : null;
                                return (
                                  <div
                                    key={index}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-gray-800 dark:bg-zinc-600 border-gray-800 dark:border-zinc-500'
                                        : 'bg-gray-100 dark:bg-zinc-700 border-gray-300 dark:border-zinc-600'
                                    }`}
                                  >
                                    {isSelected && (
                                      <span className="text-xs font-medium text-white">
                                        {sequenceNumber}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Relato e Observações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                        <FiMessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Relato do Cliente</h2>
                    </div>
                    <button
                      onClick={() => setEditandoRelato(!editandoRelato)}
                      disabled={ordem.status === 'ENTREGUE'}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      {editandoRelato ? 'Cancelar' : 'Editar'}
                    </button>
                  </div>
                  
                  {editandoRelato ? (
                    <div className="space-y-3">
                      <textarea
                        value={relatoEditavel}
                        onChange={(e) => setRelatoEditavel(e.target.value)}
                        placeholder="Descreva o problema relatado pelo cliente..."
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-100 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={salvarRelato}
                          disabled={salvandoRelato}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {salvandoRelato ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => {
                            setEditandoRelato(false);
                            setRelatoEditavel(ordem?.problema_relatado || '');
                          }}
                          className="bg-gray-200 dark:bg-zinc-600 text-gray-700 dark:text-zinc-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-500 text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 dark:text-zinc-300 whitespace-pre-line">
                      {ordem.relato || 'Nenhum relato registrado.'}
                    </p>
                  )}
                  
                </div>

                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                      <FiFileText className="w-5 h-5 text-orange-600 dark:text-orange-300" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Observações</h2>
                  </div>
                  <p className="text-gray-700 dark:text-zinc-300 whitespace-pre-line">
                    {ordem.observacao || 'Nenhuma observação registrada.'}
                  </p>
                </div>
              </div>

                             {/* Laudo Técnico */}
               {ordem.laudo && (
                 <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-blue-200 dark:border-blue-800 p-6">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                       <FiTool className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                     </div>
                     <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Laudo Técnico</h2>
                   </div>
                   <LaudoRenderer content={ordem.laudo} className="text-gray-700 dark:text-zinc-300" />
                 </div>
               )}

               {/* Informações do Retorno */}
               {isRetorno(ordem) && (
                 <div className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-sm dark:shadow-none border border-red-200 dark:border-red-800 p-6">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                       <FiRefreshCw className="w-5 h-5 text-red-600 dark:text-red-300" />
                     </div>
                     <h2 className="text-xl font-semibold text-red-900 dark:text-red-200">Informações do Retorno</h2>
                   </div>
                   <div className="space-y-3 text-sm">
                     <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-red-200 dark:border-red-800">
                       <p className="text-red-800 dark:text-red-200 font-medium mb-2">⚠️ Esta é uma ordem de retorno</p>
                       <p className="text-red-700 dark:text-red-300">
                         O equipamento foi devolvido pelo cliente para correção ou ajuste. 
                         Verifique o relato do cliente e o laudo técnico para entender o motivo do retorno.
                       </p>
                     </div>
                     {ordem.relato && (
                       <div>
                         <span className="text-red-700 dark:text-red-300 font-medium">Motivo do retorno:</span>
                         <p className="text-red-700 dark:text-red-300 mt-1 whitespace-pre-line">{ordem.relato}</p>
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>

            {/* Coluna Direita - Valores e Informações Técnicas */}
            <div className="space-y-6">
              {/* Informações da OS */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                    <FiFileText className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Informações da OS</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-zinc-400">Técnico:</span>
                    <span className="font-medium text-gray-900 dark:text-zinc-100">{ordem.tecnico?.nome || '---'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-zinc-400">Garantia:</span>
                    <span className="font-medium text-gray-900 dark:text-zinc-100">{ordem.termo_garantia?.nome || '---'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-zinc-400">Venc. Garantia:</span>
                    <span className="font-medium text-gray-900">{formatDate(ordem.vencimento_garantia)}</span>
                  </div>
                </div>
              </div>

              {/* Datas Importantes - Versão Compacta */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Prazos</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* Prazo de Entrega */}
                  <div>
                    <span className="text-gray-600 dark:text-zinc-400 block mb-1">Prazo:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-zinc-100">
                        {ordem.prazo_entrega ? formatDate(ordem.prazo_entrega) : 'Não definido'}
                      </span>
                      {ordem.prazo_entrega && !ordem.data_entrega && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          new Date(ordem.prazo_entrega) < new Date()
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200'
                            : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200'
                        }`}>
                          {new Date(ordem.prazo_entrega) < new Date() ? 'Vencido' : 'No prazo'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Data de Retirada */}
                  <div>
                    <span className="text-gray-600 dark:text-zinc-400 block mb-1">Retirada:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-zinc-100">
                        {ordem.data_entrega ? formatDate(ordem.data_entrega) : 'Aguardando'}
                      </span>
                      {ordem.data_entrega && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200">
                          Entregue
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Valores */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <FiDollarSign className="w-5 h-5 text-green-600 dark:text-green-300" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Valores</h2>
                </div>
                
                {/* Serviços */}
                {ordem.servico && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Serviços</h3>
                    <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-3">
                      <div className="flex justify-between text-sm">
                        <span>{ordem.servico}</span>
                        <span className="font-medium">{formatCurrency(ordem.valor_servico)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Qtd: {ordem.qtd_servico || 1}</span>
                        <span>Subtotal: {formatCurrency((ordem.valor_servico || 0) * (ordem.qtd_servico || 1))}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Peças */}
                {ordem.peca && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Peças</h3>
                    <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-3">
                      <div className="flex justify-between text-sm">
                        <span>{ordem.peca}</span>
                        <span className="font-medium">{formatCurrency(ordem.valor_peca)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400 mt-1">
                        <span>Qtd: {ordem.qtd_peca || 1}</span>
                        <span>Subtotal: {formatCurrency((ordem.valor_peca || 0) * (ordem.qtd_peca || 1))}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumo dos Valores */}
                {(ordem.servico || ordem.peca) && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Resumo</h3>
                    <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                      {ordem.servico && (
                        <div className="flex justify-between text-sm">
                          <span>Serviços:</span>
                          <span className="font-medium">{formatCurrency(Number(ordem.valor_servico || 0) * Number(ordem.qtd_servico || 1))}</span>
                        </div>
                      )}
                      {ordem.peca && (
                        <div className="flex justify-between text-sm">
                          <span>Peças:</span>
                          <span className="font-medium">{formatCurrency(Number(ordem.valor_peca || 0) * Number(ordem.qtd_peca || 1))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Resumo Final */}
                {(() => {
                  const { valorTotal, valorFinal } = calcularValores();
                  return (
                    <div className="border-t dark:border-zinc-600 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="dark:text-zinc-400">Subtotal:</span>
                        <span className="font-medium dark:text-zinc-100">{formatCurrency(valorTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="dark:text-zinc-400">Desconto:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(ordem.desconto || 0)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t dark:border-zinc-600 pt-2">
                        <span className="dark:text-zinc-100">Total:</span>
                        <span className="text-green-600 dark:text-green-400">{formatCurrency(valorFinal)}</span>
                      </div>
                      {ordem.valor_faturado && Math.abs(ordem.valor_faturado - valorFinal) > 0.01 && (
                        <div className="flex justify-between text-sm bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                          <span>Faturado:</span>
                          <span className="font-medium">{formatCurrency(ordem.valor_faturado)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Previsão Financeira (quando ainda não entregue/faturada) */}
              {ordem.status !== 'ENTREGUE' && (
                <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FiDollarSign className="w-5 h-5 text-yellow-700" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Previsão Financeira</h2>
                  </div>
                  {(() => {
                    const { valorPrevisto, custoPrevisto, lucroPrevisto, margemPrevista } = calcularPrevisao();
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700 dark:text-zinc-300">Receita prevista:</span>
                          <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(valorPrevisto)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700 dark:text-zinc-300">Custos previstos (peças/serviços):</span>
                          <span className="font-semibold text-red-700 dark:text-red-400">{formatCurrency(custoPrevisto)}</span>
                        </div>
                        <div className="flex justify-between border-t dark:border-zinc-600 pt-2">
                          <span className="text-gray-900 dark:text-zinc-100 font-medium">Lucro previsto:</span>
                          <span className={`font-bold ${lucroPrevisto >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{formatCurrency(lucroPrevisto)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700 dark:text-zinc-300">Margem prevista:</span>
                          <span className={`font-medium ${margemPrevista >= 0 ? 'text-green-700' : 'text-red-700'}`}>{margemPrevista.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Garantia */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                    <FiShield className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Garantia</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-zinc-400">Termo:</span>
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{ordem.termo_garantia?.nome || 'Nenhum termo selecionado'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-zinc-400">Vencimento:</span>
                    <p className="font-medium text-gray-900 dark:text-zinc-100">{formatDate(ordem.vencimento_garantia)}</p>
                  </div>
                  {ordem.vencimento_garantia && (
                    <div className="flex items-center gap-2">
                      <FiClock className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                      <span className="text-xs text-gray-500 dark:text-zinc-400">
                        {new Date(ordem.vencimento_garantia) > new Date() ? 'Garantia válida' : 'Garantia expirada'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Seção de Imagens e Vídeos - Full Width */}
          {(ordem.imagens || ordem.imagens_tecnico || (ordem as any).videos_tecnico) && (
            <div className="mt-6 sm:mt-8 space-y-6">
              {/* Grid de 2 colunas para imagens em telas maiores */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Imagens do Equipamento */}
                {ordem.imagens && (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                    <ImagensOS 
                      imagens={ordem.imagens || ''} 
                      ordemId={ordem.numero_os || ordem.id}
                      titulo="Imagens do Equipamento"
                    />
                  </div>
                )}

                {/* Imagens do Técnico */}
                {ordem.imagens_tecnico && (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                    <ImagensOS 
                      imagens={ordem.imagens_tecnico || ''} 
                      ordemId={ordem.numero_os || ordem.id}
                      titulo="Imagens do Técnico"
                    />
                  </div>
                )}
              </div>

              {/* Vídeos do Técnico - linha separada */}
              {(ordem as any).videos_tecnico && (
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
                  <VideosOS 
                    videos={(ordem as any).videos_tecnico || ''} 
                    ordemId={ordem.numero_os || ordem.id}
                    titulo="Vídeos do Técnico"
                  />
                </div>
              )}
            </div>
          )}

          {/* Histórico - Por último */}
          <div className="mt-6 sm:mt-8">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-zinc-600 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <FiClock className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Histórico</h2>
              </div>
              
              <div className="max-h-96 overflow-y-auto pr-1">
                <HistoricoOSTimeline 
                  historico={historico} 
                  loading={loadingHistorico}
                  compact={false}
                  showMetrics={false}
                />
              </div>
            </div>
          </div>

          {/* Modal de Entrega */}
          {modalEntrega && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
              <div
                className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl dark:shadow-none border border-gray-200/90 dark:border-zinc-600 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-entrega-titulo"
              >
                <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 dark:border-zinc-700 bg-gradient-to-r from-emerald-50/95 via-white to-white dark:from-emerald-950/40 dark:via-zinc-800 dark:to-zinc-800">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 shadow-sm">
                      <FiPackage className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 id="modal-entrega-titulo" className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                        Entregar O.S.
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
                        Termo de garantia, valores e formas de pagamento
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
                  {entregaDescontoInvalido && (
                    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-sm text-red-800 dark:text-red-200">
                      O desconto não pode ser maior que o total da O.S. ({formatCurrency(entregaValorBruto)}).
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 dark:border-zinc-600 bg-gray-50/80 dark:bg-zinc-900/40 p-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-2">
                      Termo de garantia *
                    </label>
                    <select
                      value={termoGarantiaSelecionado?.id || ''}
                      onChange={(e) => {
                        const termo = termosGarantia.find((t) => t.id === e.target.value);
                        setTermoGarantiaSelecionado(termo || null);
                      }}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    >
                      <option value="">Selecione um termo...</option>
                      {termosGarantia.map((termo) => (
                        <option key={termo.id} value={termo.id}>
                          {termo.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {entregaValorBruto === 0 && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/25 p-4">
                      <div className="flex items-start gap-3">
                        <FiAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                            OS sem valores lançados
                          </span>
                          <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                            Você pode entregar mesmo assim (ex.: desistência). Não será gerada venda.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clienteRecusou}
                        onChange={(e) => {
                          setClienteRecusou(e.target.checked);
                          if (e.target.checked) {
                            setAparelhoSemConserto(false);
                            setLinhasPagamento([{ id: novoIdLinhaPagamento(), forma: '', valor: '' }]);
                            setDescontoEntregaStr('');
                          }
                        }}
                        className="w-5 h-5 mt-0.5 text-red-600 border-red-300 rounded focus:ring-red-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-red-900 dark:text-red-200">
                          Cliente recusou o serviço
                        </span>
                        <p className="text-xs text-red-800/90 dark:text-red-300/90 mt-1 leading-relaxed">
                          Valores da OS serão zerados; nenhuma venda ou comissão será registrada.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/60 dark:bg-orange-950/20 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aparelhoSemConserto}
                        onChange={(e) => {
                          setAparelhoSemConserto(e.target.checked);
                          if (e.target.checked) {
                            setClienteRecusou(false);
                            setLinhasPagamento([{ id: novoIdLinhaPagamento(), forma: '', valor: '' }]);
                            setDescontoEntregaStr('');
                          }
                        }}
                        className="w-5 h-5 mt-0.5 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-orange-900 dark:text-orange-200">
                          Aparelho sem conserto
                        </span>
                        <p className="text-xs text-orange-800/90 dark:text-orange-300/90 mt-1 leading-relaxed">
                          Sem reparo possível. Não haverá cobrança nem venda.
                        </p>
                      </div>
                    </label>
                  </div>

                  {!clienteRecusou && !aparelhoSemConserto && entregaValorBruto > 0 && (
                    <>
                      <div className="rounded-xl border border-gray-200 dark:border-zinc-600 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-gray-800 dark:text-zinc-200">
                          <FiPercent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-semibold">Desconto na entrega</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          Opcional: desconto adicional (R$) sobre o total já calculado na OS. Será lançado na venda.
                        </p>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={descontoEntregaStr}
                          onChange={(e) => setDescontoEntregaStr(e.target.value)}
                          placeholder="0,00"
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                        />
                      </div>

                      {entregaTotalLiquido <= 0 && entregaValorBruto > 0 && (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25 px-3 py-2.5 text-sm text-emerald-900 dark:text-emerald-200">
                          Total a receber zerado após desconto. Não é necessário informar pagamentos.
                        </div>
                      )}

                      {entregaTotalLiquido > 0 && (
                        <div className="rounded-xl border border-gray-200 dark:border-zinc-600 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-gray-800 dark:text-zinc-200">
                              <FiCreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-sm font-semibold">Formas de pagamento</span>
                            </div>
                            <button
                              type="button"
                              onClick={adicionarLinhaPagamento}
                              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              <FiPlus className="w-4 h-4" />
                              Adicionar
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-zinc-400">
                            Informe uma ou mais formas. A soma deve ser pelo menos{' '}
                            <strong className="text-gray-700 dark:text-zinc-300">{formatCurrency(entregaTotalLiquido)}</strong>.
                          </p>
                          <div className="space-y-2">
                            {linhasPagamento.map((linha, idx) => (
                              <div
                                key={linha.id}
                                className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-700/80"
                              >
                                <div className="flex-1 min-w-0">
                                  <label className="sr-only">Forma {idx + 1}</label>
                                  <select
                                    value={linha.forma}
                                    onChange={(e) => atualizarLinhaPagamento(linha.id, { forma: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                                  >
                                    <option value="">Forma...</option>
                                    {FORMAS_PAGAMENTO_OS.map((f) => (
                                      <option key={f.value} value={f.value}>
                                        {f.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex gap-2 flex-1 min-w-0">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={linha.valor}
                                    onChange={(e) => atualizarLinhaPagamento(linha.id, { valor: e.target.value })}
                                    placeholder="Valor R$"
                                    className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removerLinhaPagamento(linha.id)}
                                    disabled={linhasPagamento.length <= 1}
                                    className="shrink-0 p-2 rounded-lg border border-gray-200 dark:border-zinc-600 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 disabled:opacity-40 disabled:pointer-events-none"
                                    title="Remover linha"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          {entregaSomaPagamentos > entregaTotalLiquido + 0.01 && (
                            <p className="text-xs text-amber-700 dark:text-amber-300/90">
                              Soma maior que o total: diferença pode ser tratada como troco no caixa.
                            </p>
                          )}
                          {entregaPrecisaPagamento && entregaSomaPagamentos + 0.009 < entregaTotalLiquido && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              Faltam {formatCurrency(Math.max(0, entregaTotalLiquido - entregaSomaPagamentos))} para cobrir o total.
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div
                    className={`rounded-xl p-4 border ${
                      clienteRecusou
                        ? 'bg-red-50/90 border-red-200 dark:bg-red-950/25 dark:border-red-900/50'
                        : aparelhoSemConserto
                          ? 'bg-orange-50/90 border-orange-200 dark:bg-orange-950/25 dark:border-orange-900/50'
                          : 'bg-gray-50 dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-600'
                    }`}
                  >
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">Resumo</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-zinc-300">
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500 dark:text-zinc-400">Cliente</span>
                        <span className="font-medium text-right truncate max-w-[60%]">{ordem?.cliente?.nome ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-zinc-400">O.S.</span>
                        <span className="font-medium">#{ordem?.numero_os}</span>
                      </div>
                      {clienteRecusou ? (
                        <p className="text-red-700 dark:text-red-300 pt-1 text-xs leading-relaxed">
                          Cliente recusou — sem venda registrada.
                        </p>
                      ) : aparelhoSemConserto ? (
                        <p className="text-orange-800 dark:text-orange-300 pt-1 text-xs leading-relaxed">
                          Sem conserto — sem cobrança.
                        </p>
                      ) : entregaValorBruto === 0 ? (
                        <p className="text-amber-800 dark:text-amber-300 pt-1 text-xs leading-relaxed">
                          Entrega sem valores na OS.
                        </p>
                      ) : (
                        <>
                          <div className="flex justify-between border-t border-gray-200/80 dark:border-zinc-600 pt-2 mt-2">
                            <span>Total da OS</span>
                            <span className="font-medium tabular-nums">{formatCurrency(entregaValorBruto)}</span>
                          </div>
                          {entregaDescontoExtra > 0 && (
                            <div className="flex justify-between text-emerald-800 dark:text-emerald-300">
                              <span>Desconto na entrega</span>
                              <span className="tabular-nums">− {formatCurrency(entregaDescontoExtra)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-gray-900 dark:text-zinc-100 pt-1">
                            <span>A receber</span>
                            <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(entregaTotalLiquido)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex gap-3 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-zinc-700 bg-gray-50/80 dark:bg-zinc-900/50">
                  <button
                    type="button"
                    onClick={() => {
                      setModalEntrega(false);
                      setClienteRecusou(false);
                      setAparelhoSemConserto(false);
                      setLinhasPagamento([{ id: novoIdLinhaPagamento(), forma: '', valor: '' }]);
                      setDescontoEntregaStr('');
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-200 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={processarEntrega}
                    disabled={
                      processandoEntrega ||
                      !termoGarantiaSelecionado ||
                      entregaDescontoInvalido ||
                      !entregaPagamentoOk
                    }
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      clienteRecusou
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : aparelhoSemConserto
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {processandoEntrega
                      ? 'Processando...'
                      : clienteRecusou
                        ? 'Finalizar (cliente recusou)'
                        : aparelhoSemConserto
                          ? 'Finalizar (sem conserto)'
                          : entregaValorBruto === 0
                            ? 'Confirmar entrega (sem valores)'
                            : 'Confirmar entrega'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </MenuLayout>
    
  );
};

export default VisualizarOrdemServicoPage;

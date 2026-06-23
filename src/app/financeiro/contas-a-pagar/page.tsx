'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import AuthGuard from '@/components/AuthGuard';
import { useContasAPagar } from '@/hooks/useContasAPagar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { FiPlus, FiEdit, FiTrash2, FiCheck, FiX, FiFilter, FiDownload, FiEye, FiChevronLeft, FiChevronRight, FiCalendar, FiPaperclip, FiDollarSign } from 'react-icons/fi';
import DashboardCard from '@/components/ui/DashboardCard';
import { useRouter, useSearchParams } from 'next/navigation';
import AnexosManager from '@/components/AnexosManager';
import { Dialog } from '@/components/Dialog';

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

interface Categoria {
  id: string;
  nome: string;
  tipo: 'fixa' | 'variavel' | 'pecas';
  cor: string;
}


interface ContaPagar {
  id: string;
  descricao: string;
  categoria_id: string;
  categoria: Categoria;
  tipo: 'fixa' | 'variavel' | 'pecas';
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'vencido';
  fornecedor?: string;
  observacoes?: string;
  os_id?: string;
  peca_nome?: string;
  peca_quantidade?: number;
  anexos_url?: string[]; // URLs dos anexos (comprovantes, etc.)
  // Novos campos para contas fixas
  conta_fixa?: boolean;
  parcelas_totais?: number;
  parcela_atual?: number;
  data_fixa_mes?: number; // Dia do mês (1-31)
  proxima_geracao?: string; // Data da próxima geração automática
}

interface OrdemServico {
  id: string;
  numero_os: string;
  cliente_id: string;
  cliente: {
    nome: string;
  };
}

const PARCELA_SUFFIX_REGEX = /\s*\(\d+\/\d+\)$/;

function extrairDescricaoBase(descricao: string): string {
  return descricao.replace(PARCELA_SUFFIX_REGEX, '').trim();
}

function formatarDescricaoParcela(base: string, parcela: number, total: number): string {
  return total > 1 ? `${base} (${parcela}/${total})` : base;
}

function isContaComParcelas(conta: ContaPagar): boolean {
  return !!(conta.conta_fixa && conta.parcelas_totais && conta.parcelas_totais > 1);
}

function getParcelasRelacionadas(conta: ContaPagar, todasContas: ContaPagar[]): ContaPagar[] {
  if (!isContaComParcelas(conta)) {
    return [conta];
  }

  const descricaoBase = extrairDescricaoBase(conta.descricao);

  return todasContas
    .filter(c =>
      c.conta_fixa &&
      c.parcelas_totais === conta.parcelas_totais &&
      c.categoria_id === conta.categoria_id &&
      c.data_fixa_mes === conta.data_fixa_mes &&
      extrairDescricaoBase(c.descricao) === descricaoBase &&
      (c.fornecedor || '') === (conta.fornecedor || '')
    )
    .sort((a, b) => (a.parcela_atual || 0) - (b.parcela_atual || 0));
}

function ContasAPagarPageContent() {
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Filtro de mês - declarado antes do hook para evitar erro de referência
  const [filtroMes, setFiltroMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const {
    loading,
    error,
    contas,
    contasDoMes,
    categorias,
    ordensServico,
    contasPorTipo,
    refetch
  } = useContasAPagar(empresaData?.id, filtroMes);

  const [activeTab, setActiveTab] = useState<'todas' | 'fixas' | 'variaveis' | 'pecas'>('todas');
  const [showModal, setShowModal] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [editarTodasParcelas, setEditarTodasParcelas] = useState(false);
  const [parcelasRelacionadasEdicao, setParcelasRelacionadasEdicao] = useState<ContaPagar[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    conta: ContaPagar;
    parcelasRelacionadas: ContaPagar[];
  } | null>(null);
  const [parcelasSelecionadasExclusao, setParcelasSelecionadasExclusao] = useState<Set<string>>(new Set());
  const [contaFocus, setContaFocus] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  
  // Funções para navegação entre meses
  const navegarMes = (direcao: 'anterior' | 'proximo') => {
    if (!filtroMes) {
      // Se não há filtro, usar mês atual
      const hoje = new Date();
      const mesAtual = hoje.toISOString().slice(0, 7);
      setFiltroMes(mesAtual);
      return;
    }
    
    const [ano, mes] = filtroMes.split('-');
    const dataAtual = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    
    if (direcao === 'anterior') {
      dataAtual.setMonth(dataAtual.getMonth() - 1);
    } else {
      dataAtual.setMonth(dataAtual.getMonth() + 1);
    }
    
    const novoMesString = dataAtual.toISOString().slice(0, 7);
    setFiltroMes(novoMesString);
  };
  
  const irParaMesAtual = () => {
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);
    setFiltroMes(mesAtual);
  };
  
  const limparFiltroMes = () => {
    setFiltroMes('');
  };

  useEffect(() => {
    const focusId = searchParams.get('focus');
    const mesParam = searchParams.get('mes');

    if (focusId) {
      setContaFocus(focusId);
    }

    if (mesParam) {
      setFiltroMes(prev => (prev === mesParam ? prev : mesParam));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!contaFocus || contas.length === 0) {
      return;
    }

    const contaSelecionada = contas.find(c => c.id === contaFocus);
    if (contaSelecionada?.data_vencimento) {
      const mesConta = contaSelecionada.data_vencimento.substring(0, 7);
      setFiltroMes(prev => (prev === mesConta ? prev : mesConta));
    }

    const row = rowRefs.current[contaFocus];
    if (row) {
      window.setTimeout(() => {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }, [contaFocus, contas]);

  useEffect(() => {
    if (!contaFocus) {
      return;
    }

    const timer = window.setTimeout(() => {
      setContaFocus(null);
      router.replace('/financeiro/contas-a-pagar', { scroll: false });
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [contaFocus, router]);
  
  // Formatar mês para exibição
  const formatarMes = (mes: string) => {
    if (!mes) return 'Todos os meses';
    
    const [ano, mesNumero] = mes.split('-');
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return `${meses[parseInt(mesNumero) - 1]} de ${ano}`;
  };

  // Não precisa gerar contas virtuais - todas as parcelas já são criadas como contas reais no banco
  
  // Formulário
  const [formData, setFormData] = useState({
    descricao: '',
    categoria_id: '',
    tipo: 'fixa' as 'fixa' | 'variavel' | 'pecas',
    valor: '',
    data_vencimento: '',
    fornecedor: '',
    observacoes: '',
    os_id: '',
    peca_nome: '',
    peca_quantidade: 1,
    // Novos campos para contas fixas
    conta_fixa: false,
    parcelas_totais: 1,
    parcela_atual: 1,
    data_fixa_mes: 1
  });

  const atualizarDataVencimento = (data: string) => {
    const dia = data ? parseInt(data.split('-')[2], 10) : NaN;
    setFormData(prev => ({
      ...prev,
      data_vencimento: data,
      ...(prev.conta_fixa && !isNaN(dia) ? { data_fixa_mes: dia } : {}),
    }));
  };

  const ativarContaFixa = (ativa: boolean) => {
    setFormData(prev => {
      const dia = prev.data_vencimento ? parseInt(prev.data_vencimento.split('-')[2], 10) : prev.data_fixa_mes;
      return {
        ...prev,
        conta_fixa: ativa,
        parcela_atual: 1,
        parcelas_totais: ativa ? Math.max(prev.parcelas_totais || 1, 1) : 1,
        ...(ativa && !isNaN(dia) ? { data_fixa_mes: dia } : {}),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {

      // Garantir que a data esteja no formato correto (YYYY-MM-DD) sem problemas de fuso horário
      const dataFormatada = formData.data_vencimento ? 
        formData.data_vencimento : // Usar diretamente o formato YYYY-MM-DD do input
        formData.data_vencimento;

      const contaData = {
        empresa_id: empresaData.id,
        categoria_id: formData.categoria_id || null,
        tipo: formData.tipo,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        data_vencimento: dataFormatada,
        fornecedor: formData.fornecedor || null,
        observacoes: formData.observacoes || null,
        os_id: formData.os_id || null,
        peca_nome: formData.peca_nome || null,
        peca_quantidade: formData.peca_quantidade || 1,
        // Novos campos para contas fixas
        conta_fixa: formData.conta_fixa,
        parcelas_totais: formData.conta_fixa ? formData.parcelas_totais : null,
        parcela_atual: formData.conta_fixa ? formData.parcela_atual : null,
        data_fixa_mes: formData.conta_fixa ? formData.data_fixa_mes : null,
        proxima_geracao: formData.conta_fixa ? calcularProximaGeracao(formData.data_vencimento, formData.data_fixa_mes) : null
      };


      if (editingConta) {
        const parcelasRelacionadas = getParcelasRelacionadas(editingConta, contas);
        const aplicarEmTodas = editarTodasParcelas && parcelasRelacionadas.length > 1;

        if (aplicarEmTodas) {
          const descricaoBase = extrairDescricaoBase(formData.descricao);
          const updates = parcelasRelacionadas.map(parcela => ({
            id: parcela.id,
            categoria_id: formData.categoria_id || null,
            tipo: formData.tipo,
            descricao: formatarDescricaoParcela(
              descricaoBase,
              parcela.parcela_atual || 1,
              parcela.parcelas_totais || 1
            ),
            valor: parseFloat(formData.valor),
            fornecedor: formData.fornecedor || null,
            observacoes: formData.observacoes || null,
          }));

          const results = await Promise.all(
            updates.map(update =>
              supabase
                .from('contas_pagar')
                .update({
                  categoria_id: update.categoria_id,
                  tipo: update.tipo,
                  descricao: update.descricao,
                  valor: update.valor,
                  fornecedor: update.fornecedor,
                  observacoes: update.observacoes,
                })
                .eq('id', update.id)
            )
          );

          const error = results.find(r => r.error)?.error;
          if (error) throw error;

          addToast('success', `${parcelasRelacionadas.length} parcelas atualizadas com sucesso!`);
        } else {
          const { error } = await supabase
            .from('contas_pagar')
            .update(contaData)
            .eq('id', editingConta.id);

          if (error) throw error;
          addToast('success', 'Conta atualizada com sucesso!');
        }
      } else {
        // Se é conta fixa com parcelas, criar todas as parcelas como contas reais
        if (formData.conta_fixa && formData.parcelas_totais && formData.parcelas_totais > 1) {
          const contasParaCriar = [];
          
          // Criar todas as parcelas
          for (let parcela = 1; parcela <= formData.parcelas_totais; parcela++) {
            const dataBase = new Date(formData.data_vencimento);
            
            // Calcular data de vencimento para cada parcela
            if (parcela > 1) {
              dataBase.setMonth(dataBase.getMonth() + (parcela - 1));
              
              // Ajustar para o dia fixo do mês se especificado
              if (formData.data_fixa_mes) {
                const diaFixo = Math.min(formData.data_fixa_mes, new Date(dataBase.getFullYear(), dataBase.getMonth() + 1, 0).getDate());
                dataBase.setDate(diaFixo);
              }
            }
            
            const contaParcela = {
              ...contaData,
              data_vencimento: dataBase.toISOString().split('T')[0],
              parcela_atual: parcela,
              descricao: `${formData.descricao} (${parcela}/${formData.parcelas_totais})`,
              proxima_geracao: null // Não precisamos mais deste campo
            };
            
            contasParaCriar.push(contaParcela);
          }
          
          
          const { data, error } = await supabase
            .from('contas_pagar')
            .insert(contasParaCriar);
          
          if (error) throw error;
          addToast('success', `${formData.parcelas_totais} parcelas da conta fixa cadastradas com sucesso!`);
          
        } else {
          // Conta normal (não fixa ou fixa sem parcelas)
          const { data, error } = await supabase
          .from('contas_pagar')
          .insert(contaData);
        
        if (error) throw error;
        addToast('success', 'Conta cadastrada com sucesso!');
        }
      }
      
      setShowModal(false);
      setEditingConta(null);
      setEditarTodasParcelas(false);
      setParcelasRelacionadasEdicao([]);
      resetForm();
      refetch();
      
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      addToast('error', 'Erro ao salvar conta');
    }
  };

  // Função para calcular próxima geração de conta fixa
  const calcularProximaGeracao = (dataVencimento: string, diaMes: number) => {
    const hoje = new Date();
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaMes);
    return proximoMes.toISOString().split('T')[0];
  };

  const handleEdit = (conta: ContaPagar) => {
    const relacionadas = getParcelasRelacionadas(conta, contas);
    setEditingConta(conta);
    setParcelasRelacionadasEdicao(relacionadas);
    setEditarTodasParcelas(false);

    setFormData({
      descricao: conta.descricao,
      categoria_id: conta.categoria_id,
      tipo: conta.tipo,
      valor: conta.valor.toString(),
      data_vencimento: conta.data_vencimento,
      fornecedor: conta.fornecedor || '',
      observacoes: conta.observacoes || '',
      os_id: conta.os_id || '',
      peca_nome: conta.peca_nome || '',
      peca_quantidade: conta.peca_quantidade || 1,
      conta_fixa: conta.conta_fixa || false,
      parcelas_totais: conta.parcelas_totais || 1,
      parcela_atual: conta.parcela_atual || 1,
      data_fixa_mes: conta.data_fixa_mes || (conta.data_vencimento ? parseInt(conta.data_vencimento.split('-')[2], 10) : 1)
    });
    setShowModal(true);
  };

  const fecharModalExclusao = () => {
    setDeleteModal(null);
    setParcelasSelecionadasExclusao(new Set());
  };

  const handleDeleteClick = (conta: ContaPagar) => {
    const relacionadas = getParcelasRelacionadas(conta, contas);

    if (relacionadas.length > 1) {
      setParcelasSelecionadasExclusao(new Set([conta.id]));
      setDeleteModal({ conta, parcelasRelacionadas: relacionadas });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    void executarExclusao([conta.id]);
  };

  const toggleParcelaExclusao = (id: string) => {
    setParcelasSelecionadasExclusao(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelecionarTodasExclusao = () => {
    if (!deleteModal) return;
    const todasIds = deleteModal.parcelasRelacionadas.map(p => p.id);
    const todasMarcadas = todasIds.every(id => parcelasSelecionadasExclusao.has(id));
    setParcelasSelecionadasExclusao(todasMarcadas ? new Set() : new Set(todasIds));
  };

  const executarExclusao = async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      const { error } = await supabase
        .from('contas_pagar')
        .delete()
        .in('id', ids);

      if (error) throw error;

      addToast(
        'success',
        ids.length === 1
          ? 'Conta excluída com sucesso!'
          : `${ids.length} parcelas excluídas com sucesso!`
      );
      refetch();
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      addToast('error', 'Erro ao excluir conta');
    } finally {
      fecharModalExclusao();
    }
  };

  const handleStatusChange = async (id: string, status: 'pendente' | 'pago') => {
    // Encontrar a conta
    const conta = contas.find(c => c.id === id);
    
    // Verificação básica para contas fixas já pagas no mesmo mês
    if (conta?.conta_fixa) {
      const hoje = new Date();
      const mesAtual = hoje.toISOString().slice(0, 7);
      const dataVencimento = new Date(conta.data_vencimento);
      const mesVencimento = dataVencimento.toISOString().slice(0, 7);
      
      // Se a conta fixa já foi paga e estamos tentando marcar como pago novamente no mesmo mês
      if (conta.status === 'pago' && status === 'pago' && mesVencimento === mesAtual) {
        addToast('info', 'Esta conta fixa já foi paga neste mês.');
        return;
      }
    }
    
    try {
      const updateData: any = { status };
      if (status === 'pago') {
        updateData.data_pagamento = new Date().toISOString().split('T')[0];
      } else {
        updateData.data_pagamento = null;
      }
      
      const { data, error } = await supabase
        .from('contas_pagar')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      addToast('success', `Conta marcada como ${status}!`);
      refetch();
      
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      addToast('error', 'Erro ao alterar status');
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      categoria_id: '',
      tipo: 'fixa',
      valor: '',
      data_vencimento: '',
      fornecedor: '',
      observacoes: '',
      os_id: '',
      peca_nome: '',
      peca_quantidade: 1,
      // Novos campos
      conta_fixa: false,
      parcelas_totais: 1,
      parcela_atual: 1,
      data_fixa_mes: 1
    });
  };

  const openModal = () => {
    setEditingConta(null);
    setEditarTodasParcelas(false);
    setParcelasRelacionadasEdicao([]);
    resetForm();
    setShowModal(true);
  };

  // contasDoMes já vem filtrado por mês do hook; aplicar tab, categoria e status
  const filteredContas = useMemo(() => {
    return contasDoMes.filter(conta => {
      const tipoNorm = (conta.tipo || '').toLowerCase();
      const statusNorm = (conta.status || '').toLowerCase();
      let matchesTab = activeTab === 'todas';
      if (activeTab === 'fixas') matchesTab = tipoNorm === 'fixa';
      if (activeTab === 'variaveis') matchesTab = tipoNorm === 'variavel';
      if (activeTab === 'pecas') matchesTab = tipoNorm === 'pecas';
      const matchesCategoria = !filtroCategoria || conta.categoria_id === filtroCategoria;
      const matchesStatus = !filtroStatus || statusNorm === filtroStatus.toLowerCase();
      return matchesTab && matchesCategoria && matchesStatus;
    });
  }, [contasDoMes, activeTab, filtroCategoria, filtroStatus]);
  

  // Agrupar contas por mês - APENAS se há filtro de mês ativo
  const contasPorMes = filtroMes ? 
    { [filtroMes]: filteredContas } :
    filteredContas.reduce<Record<string, ContaPagar[]>>((acc, conta) => {
    const mes = (conta.data_vencimento || '').toString().substring(0, 7);
    if (!acc[mes]) {
      acc[mes] = [];
    }
    acc[mes].push(conta as ContaPagar);
    return acc;
  }, {});

  // Ordenar meses
  const mesesOrdenados = Object.keys(contasPorMes).sort();

  // Calcular totais baseado nas contas filtradas (com filtro de mês aplicado)
  const totalPendente = filteredContas
    .filter(c => ['pendente', 'vencido'].includes((c.status || '').toLowerCase()))
    .reduce((sum, c) => sum + c.valor, 0);
  const totalPago = filteredContas
    .filter(c => (c.status || '').toLowerCase() === 'pago')
    .reduce((sum, c) => sum + c.valor, 0);


  if (loading) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando contas a pagar...</p>
          </div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
            <p className="text-gray-600">Gerencie todas as contas da empresa</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/financeiro/contas-a-pagar/categorias')}
              variant="outline"
              size="sm"
            >
              <FiFilter className="w-4 h-4 mr-2" />
              Categorias
            </Button>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="mr-2"
            >
              🔄 Recarregar
            </Button>
            <Button
              onClick={openModal}
              size="sm"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        </div>



        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <DashboardCard
            title="Total Pendente"
            value={`R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            description="Contas em aberto"
            descriptionColorClass="text-red-500"
            icon={<FiX className="w-5 h-5" />}
            svgPolyline={{ color: '#ef4444', points: '0,18 10,16 20,18 30,20 40,18 50,20 60,18 70,20' }}
          />
          
          <DashboardCard
            title="Total Pago"
            value={`R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            description="Contas quitadas"
            descriptionColorClass="text-green-600"
            icon={<FiCheck className="w-5 h-5" />}
            svgPolyline={{ color: '#22c55e', points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' }}
          />
          
          <DashboardCard
            title="Total das Despesas"
            value={`R$ ${(totalPendente + totalPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            description="Valor total geral"
            descriptionColorClass="text-blue-600"
            icon={<FiDollarSign className="w-5 h-5" />}
            svgPolyline={{ color: '#3b82f6', points: '0,15 10,17 20,15 30,13 40,15 50,17 60,15 70,17' }}
          />
          
          <DashboardCard
            title="Total de Contas"
            value={filteredContas.length}
            description="Contas cadastradas"
            descriptionColorClass="text-purple-600"
            icon={<FiEye className="w-5 h-5" />}
            svgPolyline={{ color: '#8b5cf6', points: '0,12 10,14 20,12 30,10 40,12 50,14 60,12 70,14' }}
          />
        </div>

        {/* Abas */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { key: 'todas', label: 'Todas', count: contasPorTipo.todas },
              { key: 'fixas', label: 'Fixas', count: contasPorTipo.fixas },
              { key: 'variaveis', label: 'Variáveis', count: contasPorTipo.variaveis },
              { key: 'pecas', label: 'Peças', count: contasPorTipo.pecas }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 space-y-4">
          {/* Navegação de Mês */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex w-full sm:w-auto items-center justify-between gap-1 border border-gray-300 rounded-lg px-2 py-2 bg-white">
              <button
                onClick={() => navegarMes('anterior')}
                className="p-2 hover:bg-gray-100 rounded transition-colors shrink-0"
                title="Mês anterior"
                type="button"
              >
                <FiChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              <div className="flex items-center justify-center gap-2 min-w-0 flex-1 px-1">
                <FiCalendar className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-sm font-medium text-gray-700 text-center truncate">
                  {formatarMes(filtroMes)}
                </span>
              </div>

              <button
                onClick={() => navegarMes('proximo')}
                className="p-2 hover:bg-gray-100 rounded transition-colors shrink-0"
                title="Próximo mês"
                type="button"
              >
                <FiChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={irParaMesAtual}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Hoje
              </Button>

              {filtroMes && (
                <Button
                  onClick={limparFiltroMes}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Todos
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="">Todas as categorias</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </Select>

            <Select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="vencido">Vencido</option>
            </Select>
          </div>
        </div>

        {/* Aviso quando filtro de mês não retorna resultados mas existem contas */}
        {filtroMes && filteredContas.length === 0 && contas.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <p className="text-amber-800">
              Nenhuma conta em <strong>{formatarMes(filtroMes)}</strong>. 
              Você tem {contas.length} conta(s) em outros meses.
            </p>
            <Button onClick={limparFiltroMes} variant="outline" size="sm" className="shrink-0">
              Ver todas as contas
            </Button>
          </div>
        )}

        {/* Lista de Contas Agrupadas por Mês */}
        {mesesOrdenados.length > 0 ? (
          <div className="space-y-6">
            {mesesOrdenados.map((mes) => {
              const contasDoMes = contasPorMes[mes];
              const totalMes = contasDoMes.reduce((sum, conta) => sum + conta.valor, 0);
              const totalPendenteMes = contasDoMes
                .filter(c => (c.status || '').toLowerCase() === 'pendente')
                .reduce((sum, c) => sum + c.valor, 0);
              
              
              return (
                <div key={mes} className="bg-white rounded-lg border border-gray-200">
                  
                  {/* Tabela de Contas do Mês */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Descrição
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoria
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vencimento
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Anexos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contasDoMes.map((conta) => {
                          const isFocused = conta.id === contaFocus;
                          return (
                          <tr
                            key={conta.id}
                            ref={(el) => {
                              if (el) {
                                rowRefs.current[conta.id] = el;
                              } else {
                                delete rowRefs.current[conta.id];
                              }
                            }}
                            className={`transition-colors ${
                              isFocused ? 'bg-rose-50/70 shadow-inner shadow-rose-200/40' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {conta.descricao}
                                </div>
                                {conta.peca_nome && (
                                  <div className="text-sm text-gray-500">
                                    Peça: {conta.peca_nome}
                                  </div>
                                )}
                                {conta.os_id && (
                                  <div className="text-sm text-gray-500">
                                    OS: {ordensServico.find(os => os.id === conta.os_id)?.numero_os || conta.os_id}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {conta.categoria ? (
                                <span 
                                  className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                                  style={{ 
                                    backgroundColor: (conta.categoria?.cor || '#6b7280') + '20',
                                    color: conta.categoria?.cor || '#6b7280'
                                  }}
                                >
                                  {conta.categoria.nome}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-500">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {conta.data_vencimento ? conta.data_vencimento.split('-').reverse().join('/') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                (conta.status || '').toLowerCase() === 'pago' 
                                  ? 'bg-green-100 text-green-800'
                                  : conta.status === 'vencido'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {(conta.status || '').toLowerCase() === 'pago' ? 'Pago' : 
                                 (conta.status || '').toLowerCase() === 'vencido' ? 'Vencido' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  (conta.tipo || '').toLowerCase() === 'fixa' 
                                    ? conta.id.includes('_virtual_') 
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-blue-100 text-blue-800'
                                    : (conta.tipo || '').toLowerCase() === 'variavel'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {(conta.tipo || '').toLowerCase() === 'fixa' ? 'Fixa'
                                   : (conta.tipo || '').toLowerCase() === 'variavel' ? 'Variável' : 'Peças'}
                                </span>
                                {conta.conta_fixa && (
                                  <div className="text-xs text-gray-500">
                                    {conta.parcela_atual}/{conta.parcelas_totais} • Dia {conta.data_fixa_mes}
                                  </div>
                                    )}
                                  </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-1">
                                {conta.anexos_url && conta.anexos_url.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <FiPaperclip className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      {conta.anexos_url.length}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2">
                                {(conta.status || '').toLowerCase() === 'pendente' ? (
                                  <button
                                    onClick={() => handleStatusChange(conta.id, 'pago')}
                                    className="text-green-600 hover:text-green-900"
                                    title="Marcar como pago"
                                  >
                                    <FiCheck className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleStatusChange(conta.id, 'pendente')}
                                    className="text-yellow-600 hover:text-yellow-900"
                                    title="Marcar como pendente"
                                  >
                                    <FiX className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEdit(conta)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Editar"
                                >
                                  <FiEdit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(conta)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Excluir"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiEye className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma conta encontrada
            </h3>
            <p className="text-gray-600 mb-4">
              Tente ajustar os filtros ou cadastre uma nova conta
            </p>
            <Button onClick={openModal}>
              <FiPlus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        )}

        {/* Modal de Cadastro/Edição */}
        {showModal && (
          <Dialog
            onClose={() => {
              setShowModal(false);
              setEditingConta(null);
              setEditarTodasParcelas(false);
              setParcelasRelacionadasEdicao([]);
            }}
            className="w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-3rem)] max-w-5xl"
          >
            <div className="p-5 sm:p-6 pt-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-5 pr-8">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingConta ? 'Editar Conta' : 'Nova Conta'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {editingConta ? 'Atualize os dados da conta selecionada.' : 'Preencha os dados para cadastrar uma nova conta.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
                  {/* Coluna esquerda — dados gerais */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dados gerais</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                      <Input
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        required
                        placeholder="Ex: Aluguel do escritório"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                        <Select
                          value={formData.categoria_id}
                          onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                          required
                        >
                          <option value="">Selecione</option>
                          {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <Select
                          value={formData.tipo}
                          onChange={(e) => setFormData({...formData, tipo: e.target.value as ContaPagar['tipo']})}
                        >
                          <option value="fixa">Fixa</option>
                          <option value="variavel">Variável</option>
                          <option value="pecas">Peças</option>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.valor || ''}
                          onChange={(e) => setFormData({...formData, valor: e.target.value})}
                          required
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                        <Input
                          value={formData.fornecedor}
                          onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                          placeholder="Opcional"
                        />
                      </div>
                    </div>

                    {editingConta && parcelasRelacionadasEdicao.length > 1 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                        <p className="text-sm font-medium text-amber-900">
                          Série de {parcelasRelacionadasEdicao.length} parcelas
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className="flex items-start gap-2 cursor-pointer p-2 rounded-md border border-transparent has-[:checked]:border-amber-300 has-[:checked]:bg-white">
                            <input
                              type="radio"
                              name="escopo_edicao"
                              checked={!editarTodasParcelas}
                              onChange={() => setEditarTodasParcelas(false)}
                              className="mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 leading-snug">
                              Só esta ({editingConta.parcela_atual}/{editingConta.parcelas_totais})
                            </span>
                          </label>
                          <label className="flex items-start gap-2 cursor-pointer p-2 rounded-md border border-transparent has-[:checked]:border-amber-300 has-[:checked]:bg-white">
                            <input
                              type="radio"
                              name="escopo_edicao"
                              checked={editarTodasParcelas}
                              onChange={() => setEditarTodasParcelas(true)}
                              className="mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 leading-snug">
                              Todas as {parcelasRelacionadasEdicao.length} parcelas
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {formData.tipo === 'pecas' && (
                      <div className="space-y-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <h4 className="text-sm font-medium text-gray-900">Peça vinculada</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da peça</label>
                            <Input
                              value={formData.peca_nome}
                              onChange={(e) => setFormData({...formData, peca_nome: e.target.value})}
                              placeholder="Ex: Tela iPhone 12"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                            <Input
                              type="number"
                              value={formData.peca_quantidade || ''}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                setFormData({...formData, peca_quantidade: isNaN(value) ? 1 : value});
                              }}
                              min="1"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vincular à OS</label>
                          <Select
                            value={formData.os_id}
                            onChange={(e) => setFormData({...formData, os_id: e.target.value})}
                          >
                            <option value="">Nenhuma</option>
                            {ordensServico.map(os => (
                              <option key={os.id} value={os.id}>
                                OS #{os.numero_os} - {os.cliente?.nome || 'Cliente não informado'}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coluna direita — vencimento e parcelas */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {formData.tipo === 'fixa' ? 'Vencimento e parcelas' : 'Vencimento'}
                    </h3>

                    {formData.tipo === 'fixa' ? (
                      <div className="h-full p-4 bg-blue-50/80 rounded-xl border border-blue-200 space-y-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="conta_fixa"
                            checked={formData.conta_fixa}
                            onChange={(e) => ativarContaFixa(e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div>
                            <label htmlFor="conta_fixa" className="text-sm font-medium text-gray-900 cursor-pointer">
                              Conta fixa mensal com parcelas
                            </label>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Vencimento no mesmo dia de cada mês.
                            </p>
                          </div>
                        </div>

                        {formData.conta_fixa ? (
                          <div className="space-y-3 pt-3 border-t border-blue-200">
                            {editingConta && (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                                Parcela {editingConta.parcela_atual}/{editingConta.parcelas_totais}
                                {formData.data_fixa_mes ? ` · Dia ${formData.data_fixa_mes}` : ''}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              {!editingConta ? (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Primeiro vencimento *
                                  </label>
                                  <Input
                                    type="date"
                                    value={formData.data_vencimento}
                                    onChange={(e) => atualizarDataVencimento(e.target.value)}
                                    required
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data de vencimento *
                                  </label>
                                  <Input
                                    type="date"
                                    value={formData.data_vencimento}
                                    onChange={(e) => atualizarDataVencimento(e.target.value)}
                                    required
                                  />
                                </div>
                              )}

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {editingConta ? 'Total de parcelas' : 'Quantidade *'}
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={formData.parcelas_totais || ''}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    setFormData({...formData, parcelas_totais: isNaN(value) ? 1 : value});
                                  }}
                                  disabled={!!editingConta}
                                  required={!editingConta}
                                />
                              </div>
                            </div>

                            {!editingConta && formData.data_vencimento && formData.parcelas_totais > 1 && (
                              <p className="text-xs text-blue-700">
                                {formData.parcelas_totais} parcelas, vencendo todo dia {formData.data_fixa_mes} de cada mês
                              </p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Data de vencimento *
                            </label>
                            <Input
                              type="date"
                              value={formData.data_vencimento}
                              onChange={(e) => atualizarDataVencimento(e.target.value)}
                              required
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data de vencimento *
                        </label>
                        <Input
                          type="date"
                          value={formData.data_vencimento}
                          onChange={(e) => atualizarDataVencimento(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações e anexos lado a lado */}
                <div className={`grid grid-cols-1 gap-5 ${editingConta ? 'lg:grid-cols-2' : ''}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      rows={editingConta ? 4 : 2}
                      placeholder="Observações adicionais..."
                    />
                  </div>

                  {editingConta && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                      <div className="flex items-center gap-2 mb-3">
                        <FiPaperclip className="w-4 h-4 text-gray-600" />
                        <h3 className="text-sm font-medium text-gray-900">Anexos</h3>
                      </div>
                      <AnexosManager
                        contaId={editingConta.id}
                        anexos={editingConta.anexos_url || []}
                        onAnexosChange={(anexos) => {
                          setEditingConta({...editingConta, anexos_url: anexos});
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingConta(null);
                      setEditarTodasParcelas(false);
                      setParcelasRelacionadasEdicao([]);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingConta ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </div>
          </Dialog>
        )}

        {/* Modal de exclusão de parcelas */}
        {deleteModal && (() => {
          const parcelas = deleteModal.parcelasRelacionadas;
          const totalSelecionadas = parcelasSelecionadasExclusao.size;
          const todasMarcadas = parcelas.every(p => parcelasSelecionadasExclusao.has(p.id));
          const algumasMarcadas = !todasMarcadas && parcelas.some(p => parcelasSelecionadasExclusao.has(p.id));
          const descricaoBase = extrairDescricaoBase(deleteModal.conta.descricao);

          return (
            <Dialog onClose={fecharModalExclusao} mobileBottomSheet className="w-full max-w-lg">
              <div className="p-6 pt-8">
                <div className="flex items-start gap-3 mb-5 pr-8">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <FiTrash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900">Excluir parcelas</h2>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{descricaoBase}</p>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 mb-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={todasMarcadas}
                    ref={el => {
                      if (el) el.indeterminate = algumasMarcadas;
                    }}
                    onChange={toggleSelecionarTodasExclusao}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Selecionar todas ({parcelas.length} parcelas)
                  </span>
                </label>

                <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {parcelas.map(parcela => {
                    const selecionada = parcelasSelecionadasExclusao.has(parcela.id);
                    const statusNorm = (parcela.status || '').toLowerCase();
                    const statusLabel = statusNorm === 'pago' ? 'Pago' : statusNorm === 'vencido' ? 'Vencido' : 'Pendente';
                    const statusClass =
                      statusNorm === 'pago'
                        ? 'bg-green-100 text-green-700'
                        : statusNorm === 'vencido'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700';

                    return (
                      <label
                        key={parcela.id}
                        className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                          selecionada ? 'bg-red-50' : 'hover:bg-gray-50'
                        } ${parcela.id === deleteModal.conta.id ? 'ring-1 ring-inset ring-red-200' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selecionada}
                          onChange={() => toggleParcelaExclusao(parcela.id)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              Parcela {parcela.parcela_atual}/{parcela.parcelas_totais}
                              {parcela.id === deleteModal.conta.id && (
                                <span className="ml-2 text-xs font-normal text-red-600">(selecionada)</span>
                              )}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 shrink-0">
                              R$ {parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              Vencimento:{' '}
                              {parcela.data_vencimento
                                ? parcela.data_vencimento.split('-').reverse().join('/')
                                : '-'}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {totalSelecionadas > 0 && (
                  <p className="text-sm text-gray-600 mt-3">
                    {totalSelecionadas === 1
                      ? '1 parcela será excluída permanentemente.'
                      : `${totalSelecionadas} parcelas serão excluídas permanentemente.`}
                  </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={fecharModalExclusao}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={totalSelecionadas === 0}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => void executarExclusao([...parcelasSelecionadasExclusao])}
                  >
                    Excluir{totalSelecionadas > 0 ? ` (${totalSelecionadas})` : ''}
                  </Button>
                </div>
              </div>
            </Dialog>
          );
        })()}
      </div>
    </MenuLayout>
  );
}

export default function ContasAPagarPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <MenuLayout>
          <div className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </div>
        </MenuLayout>
      }>
        <ContasAPagarPageContent />
      </Suspense>
    </AuthGuard>
  );
}
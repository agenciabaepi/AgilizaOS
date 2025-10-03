'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { FiPlus, FiEdit, FiTrash2, FiCheck, FiX, FiFilter, FiDownload, FiEye, FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

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

export default function ContasAPagarPage() {
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  
  // Estados
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'todas' | 'fixas' | 'variaveis' | 'pecas'>('todas');
  const [showModal, setShowModal] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  
  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroMes, setFiltroMes] = useState(() => {
    // ✅ SEMPRE usar mês atual como padrão
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);
    console.log('🗓️ Inicializando filtroMes com mês atual:', mesAtual);
    return mesAtual;
  });
  
  // Funções para navegação entre meses
  const navegarMes = (direcao: 'anterior' | 'proximo') => {
    // ✅ SEMPRE garantir que há um mês selecionado
    const mesBase = filtroMes || new Date().toISOString().slice(0, 7);
    
    const [ano, mes] = mesBase.split('-');
    const dataAtual = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    
    if (direcao === 'anterior') {
      dataAtual.setMonth(dataAtual.getMonth() - 1);
    } else {
      dataAtual.setMonth(dataAtual.getMonth() + 1);
    }
    
    const novoMesString = dataAtual.toISOString().slice(0, 7);
    console.log('🔄 Navegando para:', novoMesString);
    setFiltroMes(novoMesString);
  };
  
  const irParaMesAtual = () => {
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);
    console.log('🏠 Voltando para mês atual:', mesAtual);
    setFiltroMes(mesAtual);
  };
  
  const limparFiltroMes = () => {
    console.log('🗑️ Limpando filtro de mês - voltando para mês atual');
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);
    setFiltroMes(mesAtual); // ✅ Sempre voltar para mês atual, não limpar
  };
  
  // Formatar mês para exibição
  const formatarMes = (mes: string) => {
    if (!mes) {
      // ✅ Se não há mês, usar mês atual
      const hoje = new Date();
      const mesAtual = hoje.toISOString().slice(0, 7);
      const [ano, mesNumero] = mesAtual.split('-');
      const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      return `${meses[parseInt(mesNumero) - 1]} de ${ano}`;
    }
    
    const [ano, mesNumero] = mes.split('-');
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return `${meses[parseInt(mesNumero) - 1]} de ${ano}`;
  };

  // Gerar contas fixas virtuais para todos os meses relevantes
  const gerarContasFixasVirtuais = (contasOriginais: ContaPagar[], mesSelecionado: string): ContaPagar[] => {
    const contasFixas = contasOriginais.filter(conta => conta.conta_fixa);
    const contasVirtuais: ContaPagar[] = [];
    
    console.log('🔍 Gerando contas fixas virtuais para:', mesSelecionado);
    console.log('📋 Total de contas originais:', contasOriginais.length);
    console.log('📋 Contas fixas encontradas:', contasFixas.length);
    console.log('📋 Contas fixas:', contasFixas.map(c => ({ descricao: c.descricao, data_vencimento: c.data_vencimento, parcelas_totais: c.parcelas_totais })));
    
    contasFixas.forEach(conta => {
      if (!conta.data_fixa_mes || !conta.parcelas_totais) return;
      
      console.log('💳 Processando conta fixa:', conta.descricao, {
        parcelaAtual: conta.parcela_atual,
        parcelasTotais: conta.parcelas_totais,
        dataFixaMes: conta.data_fixa_mes,
        dataVencimento: conta.data_vencimento
      });
      
      // Para contas fixas, gerar todas as parcelas desde a primeira
      const parcelasTotais = conta.parcelas_totais;
      
      // Gerar todas as parcelas (da 1 até a total)
      for (let parcela = 1; parcela <= parcelasTotais; parcela++) {
        // Calcular quantos meses adicionar baseado na parcela (parcela 1 = 0 meses, parcela 2 = 1 mês, etc.)
        const mesesAdicionais = parcela - 1;
        
        // Usar a data de vencimento original como base
        const dataBase = new Date(conta.data_vencimento);
        const novaData = new Date(dataBase);
        
        // Adicionar os meses necessários
        novaData.setMonth(novaData.getMonth() + mesesAdicionais);
        
        // Ajustar para o dia fixo do mês
        const diaFixo = Math.min(conta.data_fixa_mes, new Date(novaData.getFullYear(), novaData.getMonth() + 1, 0).getDate());
        novaData.setDate(diaFixo);
        
        const mesConta = novaData.toISOString().slice(0, 7);
        
        console.log(`📅 Parcela ${parcela}/${parcelasTotais}: ${mesConta} (meses adicionais: ${mesesAdicionais})`);
        
        // Gerar conta virtual para esta parcela
        const contaVirtual: ContaPagar = {
          ...conta,
          id: `${conta.id}_virtual_${parcela}`,
          data_vencimento: novaData.toISOString().split('T')[0],
          parcela_atual: parcela,
          status: 'pendente' as const,
          // Marcar como virtual para identificação
          observacoes: `${conta.observacoes || ''} [Conta Fixa - Parcela ${parcela}/${parcelasTotais}]`.trim()
        };
        
        contasVirtuais.push(contaVirtual);
        console.log('✅ Conta virtual adicionada:', contaVirtual.descricao, contaVirtual.data_vencimento, 'para o mês:', mesConta);
      }
    });
    
    console.log('🎯 Total de contas virtuais geradas:', contasVirtuais.length);
    
    // Combinar contas originais com virtuais
    const contasCombinadas = [...contasOriginais, ...contasVirtuais];
    
    // Remover duplicatas (se uma conta original já está no mês selecionado)
    const contasUnicas = contasCombinadas.filter((conta, index, array) => {
      if (conta.conta_fixa) {
        const mesConta = new Date(conta.data_vencimento).toISOString().slice(0, 7);
        if (mesConta === mesSelecionado) {
          // Se é uma conta fixa no mês selecionado, manter apenas a original
          const isOriginal = !conta.id.includes('_virtual_');
          console.log(`🔍 Conta fixa no mês ${mesSelecionado}: ${conta.descricao} - ${isOriginal ? 'ORIGINAL' : 'VIRTUAL'} - ${isOriginal ? 'MANTIDA' : 'REMOVIDA'}`);
          return isOriginal;
        }
      }
      return true;
    });
    
    console.log('📊 Contas finais:', contasUnicas.length);
    console.log('📊 Contas por mês:', contasUnicas.map(c => ({ 
      descricao: c.descricao, 
      mes: new Date(c.data_vencimento).toISOString().slice(0, 7),
      tipo: c.id.includes('_virtual_') ? 'VIRTUAL' : 'ORIGINAL'
    })));
    
    return contasUnicas;
  };
  
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

  // Carregar dados
  useEffect(() => {
    if (empresaData?.id) {
      console.log('🏢 Carregando dados para empresa:', empresaData.id);
      loadData();
    }
  }, [empresaData?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar categorias
      const { data: categoriasData } = await supabase
        .from('categorias_contas')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .eq('ativo', true)
        .order('nome');
      
      setCategorias(categoriasData || []);
      
      // Carregar ordens de serviço
      const { data: ordensData } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          cliente_id,
          cliente:clientes(nome)
        `)
        .eq('empresa_id', empresaData.id)
        .order('numero_os', { ascending: false });
      
      setOrdensServico(ordensData || []);
      
      // Carregar contas
      const { data: contasData } = await supabase
        .from('contas_pagar')
        .select(`
          *,
          categoria:categorias_contas(*)
        `)
        .eq('empresa_id', empresaData.id)
        .order('data_vencimento', { ascending: false });
      
      console.log('📊 Dados carregados:', {
        categorias: categoriasData?.length || 0,
        ordens: ordensData?.length || 0,
        contas: contasData?.length || 0,
        contasFixas: contasData?.filter(c => c.conta_fixa)?.length || 0
      });
      
      if (contasData && contasData.length > 0) {
        console.log('📋 Contas carregadas:', contasData.map(c => ({
          id: c.id,
          descricao: c.descricao,
          tipo: c.tipo,
          conta_fixa: c.conta_fixa,
          parcelas_totais: c.parcelas_totais,
          data_vencimento: c.data_vencimento
        })));
      }
      
      setContas(contasData || []);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      addToast('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const contaData = {
        empresa_id: empresaData.id,
        categoria_id: formData.categoria_id,
        tipo: formData.tipo,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        data_vencimento: formData.data_vencimento,
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
        const { error } = await supabase
          .from('contas_pagar')
          .update(contaData)
          .eq('id', editingConta.id);
        
        if (error) throw error;
        addToast('success', 'Conta atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('contas_pagar')
          .insert(contaData);
        
        if (error) throw error;
        addToast('success', 'Conta cadastrada com sucesso!');
      }
      
      setShowModal(false);
      setEditingConta(null);
      resetForm();
      loadData();
      
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
    setEditingConta(conta);
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
      // Novos campos
      conta_fixa: conta.conta_fixa || false,
      parcelas_totais: conta.parcelas_totais || 1,
      parcela_atual: conta.parcela_atual || 1,
      data_fixa_mes: conta.data_fixa_mes || 1
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    
    try {
      const { error } = await supabase
        .from('contas_pagar')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      addToast('success', 'Conta excluída com sucesso!');
      loadData();
      
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      addToast('error', 'Erro ao excluir conta');
    }
  };

  const handleStatusChange = async (id: string, status: 'pendente' | 'pago') => {
    try {
      const updateData: any = { status };
      if (status === 'pago') {
        updateData.data_pagamento = new Date().toISOString().split('T')[0];
      } else {
        updateData.data_pagamento = null;
      }
      
      const { error } = await supabase
        .from('contas_pagar')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      addToast('success', `Conta marcada como ${status}!`);
      loadData();
      
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
    resetForm();
    setShowModal(true);
  };

  // Gerar contas com fixas virtuais
  console.log('🔄 ANTES da geração:', { 
    contasOriginais: contas.length, 
    filtroMes, 
    contasFixas: contas.filter(c => c.conta_fixa).length 
  });
  
  const contasComFixasVirtuais = gerarContasFixasVirtuais(contas, filtroMes);
  
  console.log('🔄 DEPOIS da geração:', { 
    contasComFixasVirtuais: contasComFixasVirtuais.length,
    contasFixas: contasComFixasVirtuais.filter(c => c.conta_fixa).length
  });

  // Filtrar contas
  const filteredContas = contasComFixasVirtuais.filter(conta => {
    let matchesTab = activeTab === 'todas';
    if (activeTab === 'fixas') matchesTab = conta.tipo === 'fixa';
    if (activeTab === 'variaveis') matchesTab = conta.tipo === 'variavel';
    if (activeTab === 'pecas') matchesTab = conta.tipo === 'pecas';
    
    const matchesCategoria = !filtroCategoria || conta.categoria_id === filtroCategoria;
    const matchesStatus = !filtroStatus || conta.status === filtroStatus;
    
    // ✅ Filtro por mês - SEMPRE aplicar filtro
    const mesParaFiltrar = filtroMes || new Date().toISOString().slice(0, 7);
    const contaMes = new Date(conta.data_vencimento).toISOString().slice(0, 7); // YYYY-MM
    const matchesMes = contaMes === mesParaFiltrar;
    
    const matches = matchesTab && matchesCategoria && matchesStatus && matchesMes;
    
    if (conta.conta_fixa) {
      console.log(`🔍 Filtro conta fixa: ${conta.descricao}`, {
        matchesTab,
        matchesCategoria,
        matchesStatus,
        matchesMes,
        contaMes: new Date(conta.data_vencimento).toISOString().slice(0, 7),
        filtroMes: mesParaFiltrar,
        matches,
        activeTab,
        tipo: conta.tipo
      });
    }
    
    return matches;
  });
  
  console.log('🎯 RESULTADO FINAL:', {
    filteredContas: filteredContas.length,
    activeTab,
    filtroMes: filtroMes || new Date().toISOString().slice(0, 7),
    contasFixas: filteredContas.filter(c => c.conta_fixa).length
  });

  // Agrupar contas por mês
  const contasPorMes = filteredContas.reduce((acc, conta) => {
    const mes = new Date(conta.data_vencimento).toISOString().slice(0, 7); // YYYY-MM
    if (!acc[mes]) {
      acc[mes] = [];
    }
    acc[mes].push(conta);
    return acc;
  }, {} as Record<string, ContaPagar[]>);

  // Ordenar meses
  const mesesOrdenados = Object.keys(contasPorMes).sort();

  // ✅ Calcular totais baseados no mês atual
  const mesParaTotais = filtroMes || new Date().toISOString().slice(0, 7);
  
  const totalPendente = contas
    .filter(c => {
      const contaMes = new Date(c.data_vencimento).toISOString().slice(0, 7);
      return c.status === 'pendente' && contaMes === mesParaTotais;
    })
    .reduce((sum, c) => sum + c.valor, 0);
  
  const totalPago = contas
    .filter(c => {
      const contaMes = new Date(c.data_vencimento).toISOString().slice(0, 7);
      return c.status === 'pago' && contaMes === mesParaTotais;
    })
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
            <h1 className="text-2xl font-bold text-gray-900">
              Contas a Pagar - {formatarMes(filtroMes || new Date().toISOString().slice(0, 7))}
            </h1>
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
              onClick={openModal}
              size="sm"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        </div>

        {/* Resumo Mensal */}
        {filtroMes && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FiCalendar className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">
                    Resumo de {formatarMes(filtroMes)}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Controle mensal das despesas
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-blue-900">
                    {filteredContas.length}
                  </div>
                  <div className="text-blue-700">Contas</div>
                </div>
                
                <div className="text-center">
                  <div className="font-semibold text-green-600">
                    R$ {filteredContas
                      .filter(c => c.status === 'pago')
                      .reduce((acc, c) => acc + c.valor, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-blue-700">Pagas</div>
                </div>
                
                <div className="text-center">
                  <div className="font-semibold text-orange-600">
                    R$ {filteredContas
                      .filter(c => c.status === 'pendente')
                      .reduce((acc, c) => acc + c.valor, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-blue-700">Pendentes</div>
                </div>
                
                <div className="text-center">
                  <div className="font-semibold text-red-600">
                    R$ {filteredContas
                      .filter(c => c.status === 'vencido')
                      .reduce((acc, c) => acc + c.valor, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-blue-700">Vencidas</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pendente</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FiX className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pago</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Contas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(() => {
                    const mesParaContagens = filtroMes || new Date().toISOString().slice(0, 7);
                    return contas.filter(c => {
                      const contaMes = new Date(c.data_vencimento).toISOString().slice(0, 7);
                      return contaMes === mesParaContagens;
                    }).length;
                  })()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FiEye className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {(() => {
              // ✅ Calcular contagens baseadas no mês atual
              const mesParaContagens = filtroMes || new Date().toISOString().slice(0, 7);
              
              const contasDoMes = contas.filter(c => {
                const contaMes = new Date(c.data_vencimento).toISOString().slice(0, 7);
                return contaMes === mesParaContagens;
              });
              
              console.log('📊 Contagens das abas para o mês:', mesParaContagens, {
                total: contasDoMes.length,
                fixas: contasDoMes.filter(c => c.tipo === 'fixa').length,
                variaveis: contasDoMes.filter(c => c.tipo === 'variavel').length,
                pecas: contasDoMes.filter(c => c.tipo === 'pecas').length
              });
              
              return [
                { key: 'todas', label: 'Todas', count: contasDoMes.length },
                { key: 'fixas', label: 'Fixas', count: contasDoMes.filter(c => c.tipo === 'fixa').length },
                { key: 'variaveis', label: 'Variáveis', count: contasDoMes.filter(c => c.tipo === 'variavel').length },
                { key: 'pecas', label: 'Peças', count: contasDoMes.filter(c => c.tipo === 'pecas').length }
              ];
            })()}.map(tab => (
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
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            
            {/* Navegação de Mês */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                <button
                  onClick={() => navegarMes('anterior')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Mês anterior"
                >
                  <FiChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                
                <div className="flex items-center space-x-2 px-3">
                  <FiCalendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
                    {formatarMes(filtroMes)}
                  </span>
                </div>
                
                <button
                  onClick={() => navegarMes('proximo')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Próximo mês"
                >
                  <FiChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              <Button
                onClick={irParaMesAtual}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Hoje
              </Button>
              
              <Button
                onClick={limparFiltroMes}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Mês Atual
              </Button>
            </div>
            
            <Input
              type="date"
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              placeholder="Filtrar por período"
            />
          </div>
        </div>

        {/* Lista de Contas do Mês Selecionado */}
        {filteredContas.length > 0 ? (
          (() => {
            // ✅ Mostrar apenas o mês selecionado
            const mesSelecionado = filtroMes || new Date().toISOString().slice(0, 7);
            const contasDoMesSelecionado = filteredContas;
            const totalMes = contasDoMesSelecionado.reduce((sum, conta) => sum + conta.valor, 0);
            const totalPendenteMes = contasDoMesSelecionado
              .filter(c => c.status === 'pendente')
              .reduce((sum, c) => sum + c.valor, 0);
            
            return (
              <div className="bg-white rounded-lg border border-gray-200">
                {/* Cabeçalho do Mês Selecionado */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatarMes(mesSelecionado)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {contasDoMesSelecionado.length} conta{contasDoMesSelecionado.length !== 1 ? 's' : ''} • 
                        Total: R$ {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • 
                        Pendente: R$ {totalPendenteMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                
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
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contasDoMesSelecionado.map((conta) => (
                          <tr key={conta.id} className="hover:bg-gray-50">
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
                              <span 
                                className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                                style={{ 
                                  backgroundColor: conta.categoria.cor + '20',
                                  color: conta.categoria.cor 
                                }}
                              >
                                {conta.categoria.nome}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                conta.status === 'pago' 
                                  ? 'bg-green-100 text-green-800'
                                  : conta.status === 'vencido'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {conta.status === 'pago' ? 'Pago' : 
                                 conta.status === 'vencido' ? 'Vencido' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  conta.tipo === 'fixa' 
                                    ? conta.id.includes('_virtual_') 
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-blue-100 text-blue-800'
                                    : conta.tipo === 'variavel'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {conta.tipo === 'fixa' ? 
                                    conta.id.includes('_virtual_') ? 'Fixa (Virtual)' : 'Fixa'
                                   : conta.tipo === 'variavel' ? 'Variável' : 'Peças'}
                                </span>
                                {conta.conta_fixa && (
                                  <div className="text-xs text-gray-500">
                                    {conta.parcela_atual}/{conta.parcelas_totais} • Dia {conta.data_fixa_mes}
                                    {conta.id.includes('_virtual_') && (
                                      <span className="text-purple-600 font-medium"> • Gerada automaticamente</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2">
                                {conta.status === 'pendente' ? (
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
                                  onClick={() => handleDelete(conta.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Excluir"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </div>
            );
          })()}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingConta ? 'Editar Conta' : 'Nova Conta'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição *
                    </label>
                    <Input
                      value={formData.descricao}
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                      required
                      placeholder="Ex: Aluguel do escritório"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria *
                    </label>
                    <Select
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                      ))}
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo
                    </label>
                    <Select
                      value={formData.tipo}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value as any})}
                    >
                      <option value="fixa">Fixa</option>
                      <option value="variavel">Variável</option>
                      <option value="pecas">Peças</option>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: e.target.value})}
                      required
                      placeholder="0,00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Vencimento *
                    </label>
                    <Input
                      type="date"
                      value={formData.data_vencimento}
                      onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fornecedor
                    </label>
                    <Input
                      value={formData.fornecedor}
                      onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                      placeholder="Nome do fornecedor"
                    />
                  </div>
                </div>
                
                {/* Seção para Contas Fixas */}
                {formData.tipo === 'fixa' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-medium text-blue-900">Configurações de Conta Fixa</h3>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="conta_fixa"
                        checked={formData.conta_fixa}
                        onChange={(e) => setFormData({...formData, conta_fixa: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="conta_fixa" className="text-sm font-medium text-gray-700">
                        Esta é uma conta fixa mensal
                      </label>
                    </div>
                    
                    {formData.conta_fixa && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dia do Mês *
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={formData.data_fixa_mes}
                            onChange={(e) => setFormData({...formData, data_fixa_mes: parseInt(e.target.value)})}
                            placeholder="Ex: 15"
                          />
                          <p className="text-xs text-gray-500 mt-1">Dia do mês para vencimento</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Parcela Atual
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.parcela_atual}
                            onChange={(e) => setFormData({...formData, parcela_atual: parseInt(e.target.value)})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total de Parcelas
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.parcelas_totais}
                            onChange={(e) => setFormData({...formData, parcelas_totais: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formData.tipo === 'pecas' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome da Peça
                        </label>
                        <Input
                          value={formData.peca_nome}
                          onChange={(e) => setFormData({...formData, peca_nome: e.target.value})}
                          placeholder="Ex: Tela iPhone 12"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantidade
                        </label>
                        <Input
                          type="number"
                          value={formData.peca_quantidade}
                          onChange={(e) => setFormData({...formData, peca_quantidade: parseInt(e.target.value)})}
                          min="1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vincular à OS (Opcional)
                      </label>
                      <Select
                        value={formData.os_id}
                        onChange={(e) => setFormData({...formData, os_id: e.target.value})}
                      >
                        <option value="">Selecione uma OS</option>
                        {ordensServico.map(os => (
                          <option key={os.id} value={os.id}>
                            OS #{os.numero_os} - {os.cliente?.nome || 'Cliente não informado'}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Observações adicionais..."
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingConta ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MenuLayout>
  );
}
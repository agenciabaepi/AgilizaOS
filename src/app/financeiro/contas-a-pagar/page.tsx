'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { FiPlus, FiEdit, FiTrash2, FiCheck, FiX, FiFilter, FiDownload, FiEye, FiChevronLeft, FiChevronRight, FiCalendar, FiPaperclip, FiDollarSign } from 'react-icons/fi';
import DashboardCard from '@/components/ui/DashboardCard';
import { useRouter } from 'next/navigation';
import AnexosManager from '@/components/AnexosManager';

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
    // Definir mês atual como padrão
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);
    return mesAtual;
  });
  
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

  // Como agora todas as parcelas são contas reais, não precisamos mais gerar contas virtuais
  const gerarContasFixasVirtuais = (contasOriginais: ContaPagar[], mesSelecionado: string): ContaPagar[] => {
    return contasOriginais;
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
    console.log('🔄 useEffect executado - empresaData:', empresaData);
    console.log('🔄 empresaData?.id:', empresaData?.id);
    
    if (empresaData?.id) {
      console.log('🏢 Carregando dados para empresa:', empresaData.id);
      loadData();
    } else {
      console.log('⚠️ empresaData.id não disponível, não carregando dados');
      console.log('📊 Estado atual:', { empresaData, loading });
    }
  }, [empresaData?.id]);

  const loadData = async () => {
    if (!empresaData?.id) {
      console.log('⚠️ EmpresaData não disponível:', empresaData);
      return;
    }
    
    console.log('🔄 Iniciando carregamento de dados para empresa:', empresaData.id);
    try {
      setLoading(true);
      
      // Carregar categorias
      console.log('📂 Carregando categorias...');
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias_contas')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .eq('ativo', true)
        .order('nome');
      
      if (categoriasError) {
        console.error('❌ Erro ao carregar categorias:', categoriasError);
      } else {
        console.log('✅ Categorias carregadas:', categoriasData?.length || 0);
      }
      
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
      
      setOrdensServico((ordensData || []).map((ordem: any) => ({
        ...ordem,
        cliente: Array.isArray(ordem.cliente) ? ordem.cliente[0] : ordem.cliente
      })));
      
      // Carregar contas
      console.log('💰 Carregando contas...');
      const { data: contasData, error: contasError } = await supabase
        .from('contas_pagar')
        .select(`
          *,
          categoria:categorias_contas(*)
        `)
        .eq('empresa_id', empresaData.id)
        .order('data_vencimento', { ascending: false });
      
      if (contasError) {
        console.error('❌ Erro ao carregar contas:', contasError);
        addToast('error', 'Erro ao carregar contas: ' + contasError.message);
        setContas([]);
        return;
      } else {
        console.log('✅ Contas carregadas com sucesso:', contasData?.length || 0);
        if (contasData && contasData.length > 0) {
          console.log('📋 Primeiras 3 contas:', contasData.slice(0, 3).map(c => ({
            id: c.id,
            descricao: c.descricao,
            tipo: c.tipo,
            valor: c.valor
          })));
        }
      }
      
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

      // Garantir que a data esteja no formato correto (YYYY-MM-DD) sem problemas de fuso horário
      const dataFormatada = formData.data_vencimento ? 
        formData.data_vencimento : // Usar diretamente o formato YYYY-MM-DD do input
        formData.data_vencimento;

      const contaData = {
        empresa_id: empresaData.id,
        categoria_id: formData.categoria_id,
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
        const { data, error } = await supabase
          .from('contas_pagar')
          .update(contaData)
          .eq('id', editingConta.id);
        
        if (error) throw error;
        addToast('success', 'Conta atualizada com sucesso!');
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
    // Agora todas as contas são reais, pode editar qualquer uma
    
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
    // Agora todas as contas são reais, pode excluir qualquer uma
    
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    
    try {
      const { data, error } = await supabase
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
  
  const contasComFixasVirtuais = gerarContasFixasVirtuais(contas, filtroMes);
  
  // Debug: verificar IDs das contas
  console.log('🔍 Contas processadas:', contasComFixasVirtuais.map(c => ({
    id: c.id,
    descricao: c.descricao,
    conta_fixa: c.conta_fixa,
    isVirtual: c.id.includes('_virtual_')
  })));
  

  // Filtrar contas
  const filteredContas = contasComFixasVirtuais.filter(conta => {
    let matchesTab = activeTab === 'todas';
    if (activeTab === 'fixas') matchesTab = conta.tipo === 'fixa';
    if (activeTab === 'variaveis') matchesTab = conta.tipo === 'variavel';
    if (activeTab === 'pecas') matchesTab = conta.tipo === 'pecas';
    
    const matchesCategoria = !filtroCategoria || conta.categoria_id === filtroCategoria;
    const matchesStatus = !filtroStatus || conta.status === filtroStatus;
    
    // Filtro por mês
    let matchesMes = true;
    if (filtroMes) {
      const contaMes = new Date(conta.data_vencimento).toISOString().slice(0, 7); // YYYY-MM
      matchesMes = contaMes === filtroMes;
      
    }
    
    const matches = matchesTab && matchesCategoria && matchesStatus && matchesMes;
    
    
    return matches;
  });
  

  // Agrupar contas por mês - APENAS se há filtro de mês ativo
  const contasPorMes = filtroMes ? 
    // Se há filtro de mês, mostrar apenas contas do mês selecionado
    { [filtroMes]: filteredContas } :
    // Se não há filtro, agrupar por mês normalmente
    filteredContas.reduce((acc, conta) => {
    const mes = new Date(conta.data_vencimento).toISOString().slice(0, 7); // YYYY-MM
    if (!acc[mes]) {
      acc[mes] = [];
    }
    acc[mes].push(conta);
    return acc;
  }, {} as Record<string, ContaPagar[]>);

  // Ordenar meses
  const mesesOrdenados = Object.keys(contasPorMes).sort();

  // Calcular totais baseado nas contas filtradas (com filtro de mês aplicado)
  const totalPendente = filteredContas
    .filter(c => c.status === 'pendente')
    .reduce((sum, c) => sum + c.valor, 0);
  
  const totalPago = filteredContas
    .filter(c => c.status === 'pago')
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
            {/* Debug info */}
            <div className="text-xs text-gray-500 mt-1">
              Debug: empresaData.id = {empresaData?.id || 'NÃO DISPONÍVEL'} | contas = {contas.length}
            </div>
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
              onClick={() => loadData()}
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
            {(() => {
              const mesParaContagens = filtroMes || new Date().toISOString().slice(0, 7);
              const contasDoMes = contas.filter(c => {
                const contaMes = new Date(c.data_vencimento).toISOString().slice(0, 7);
                return contaMes === mesParaContagens;
              });
              
              return [
                { key: 'todas', label: 'Todas', count: contasDoMes.length },
                { key: 'fixas', label: 'Fixas', count: contasDoMes.filter(c => c.tipo === 'fixa').length },
                { key: 'variaveis', label: 'Variáveis', count: contasDoMes.filter(c => c.tipo === 'variavel').length },
                { key: 'pecas', label: 'Peças', count: contasDoMes.filter(c => c.tipo === 'pecas').length }
              ];
            })().map(tab => (
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            
            <Input
              type="date"
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              placeholder="Filtrar por período"
            />
          </div>
        </div>

        {/* Lista de Contas Agrupadas por Mês */}
        {mesesOrdenados.length > 0 ? (
          <div className="space-y-6">
            {mesesOrdenados.map((mes) => {
              const contasDoMes = contasPorMes[mes];
              const totalMes = contasDoMes.reduce((sum, conta) => sum + conta.valor, 0);
              const totalPendenteMes = contasDoMes
                .filter(c => c.status === 'pendente')
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
                        {contasDoMes.map((conta) => (
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
                              {conta.data_vencimento ? conta.data_vencimento.split('-').reverse().join('/') : '-'}
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
                                }`}
                              >
                                {conta.tipo === 'fixa' ? 'Fixa'
                                   : conta.tipo === 'variavel' ? 'Variável' : 'Peças'}
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

                {/* Seção de Anexos - apenas para edição */}
                {editingConta && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FiPaperclip className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg font-medium text-gray-900">Anexos</h3>
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
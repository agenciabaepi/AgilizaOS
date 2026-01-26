"use client";

import MenuLayout from "@/components/MenuLayout";

import { Button } from '@/components/Button';
import ReactSelect from 'react-select';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { interceptSupabaseQuery } from '@/utils/supabaseInterceptor';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Suspense } from 'react';
import { useToast } from '@/components/Toast';
import PatternLock from '@/components/PatternLock';
import { FiSmartphone, FiCheckCircle, FiPackage, FiKey, FiList, FiEye, FiEyeOff } from 'react-icons/fi';
import EquipamentoSelector from '@/components/EquipamentoSelector';
import DynamicChecklist from '@/components/DynamicChecklist';

const etapas = ["Cliente", "Aparelho", "Checklist", "Técnico", "Status", "Imagens"];

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  celular: string;
  email?: string;
  documento?: string;
  numero_cliente: number;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  nivel: string;
  auth_user_id: string;
  tecnico_id?: string;
}

interface Status {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  tipo: string;
  empresa_id?: string;
}

interface ProdutoServico {
  id: string;
  nome: string;
  tipo: string;
  preco: number;
  unidade: string;
  ativo?: boolean;
  codigo?: string;
}

interface Termo {
  id: string;
  nome: string;
  conteudo: string;
  ativo: boolean;
  ordem: number;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

function NovaOS2Content() {
  const { usuarioData, empresaData } = useAuth();
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [showCadastroCliente, setShowCadastroCliente] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const [hasTecnicos, setHasTecnicos] = useState(false);
  const [loadingTecnicos, setLoadingTecnicos] = useState(true);

  // Estado para etapa 2 - Aparelho
  const [dadosEquipamento, setDadosEquipamento] = useState({
    tipo: '',
    marca: '',
    modelo: '',
    cor: '', // NOVO
    numero_serie: '',
    descricao_problema: '',
    senha: '',
    senha_padrao: [] as number[]
  });
  
  // Estado para equipamento selecionado do seletor
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<any>(null);

  // Função para lidar com seleção de equipamento
  const handleEquipamentoSelecionado = (equipamento: any) => {
    setEquipamentoSelecionado(equipamento);
    if (equipamento) {
      // Preencher apenas o tipo (categoria) do equipamento
      setDadosEquipamento(prev => ({
        ...prev,
        tipo: equipamento.nome, // Usar o nome como tipo (ex: CELULAR, NOTEBOOK)
        marca: prev.marca, // Manter marca manual
        modelo: prev.modelo, // Manter modelo manual
        cor: prev.cor, // Manter cor manual
        numero_serie: prev.numero_serie // Manter número de série manual
      }));
    } else {
      // Limpar apenas o tipo se nenhum equipamento selecionado
      setDadosEquipamento(prev => ({
        ...prev,
        tipo: ''
      }));
    }
  };

  // Estado para acessórios
  const [acessorios, setAcessorios] = useState('');

  // Estado para mostrar/ocultar senha no campo de acesso
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Estado para checklist de entrada (etapa 3 - conforme equipamento da etapa 2)
  const [checklistEntrada, setChecklistEntrada] = useState<Record<string, boolean>>({});

  // Verificar se há técnicos cadastrados
  useEffect(() => {
    async function checkTecnicos() {
      if (!empresaData?.id) return;
      
      try {
        const { data: tecnicos } = await supabase
          .from('usuarios')
          .select('id')
          .eq('nivel', 'tecnico')
          .eq('empresa_id', empresaData.id);
        
        setHasTecnicos(!!(tecnicos && tecnicos.length > 0));
      } catch (error) {
        console.error('Erro ao verificar técnicos:', error);
        setHasTecnicos(false);
      } finally {
        setLoadingTecnicos(false);
      }
    }
    
    checkTecnicos();
  }, [empresaData?.id]);

  // Estado para etapa 3 - Técnico Responsável
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [tecnicoResponsavel, setTecnicoResponsavel] = useState<string | null>(null);
  
  // Estado para etapa 4 - Status
  const [statusOS, setStatusOS] = useState<Status[]>([]);
  const [statusSelecionado, setStatusSelecionado] = useState<string | null>(null);
  // Estado para retorno de garantia
  const [isRetornoGarantia, setIsRetornoGarantia] = useState(false);
  const [tipoEntrada, setTipoEntrada] = useState<'nova' | 'garantia'>('nova');
  const [osGarantiaBusca, setOsGarantiaBusca] = useState('');
  const [osGarantiaResultados, setOsGarantiaResultados] = useState<Record<string, unknown>[]>([]);
  const [osGarantiaSelecionada, setOsGarantiaSelecionada] = useState<Record<string, unknown> | null>(null);
  const [buscandoOsGarantia, setBuscandoOsGarantia] = useState(false);
  
  // Estado para prazo de entrega
  const [prazoEntrega, setPrazoEntrega] = useState<string>('');
  
  // Estado para produtos e serviços aprovados
  const [produtosServicos, setProdutosServicos] = useState<ProdutoServico[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [produtosSelecionados, setProdutosSelecionados] = useState<ProdutoServico[]>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<ProdutoServico[]>([]);
  
  // Estado para termos de garantia
  const [termos, setTermos] = useState<Termo[]>([]);
  const [loadingTermos, setLoadingTermos] = useState(false);
  const [termoSelecionado, setTermoSelecionado] = useState<string | null>(null);
  
  // Estado para cadastro rápido de produtos/serviços
  const [showCadastroRapidoProduto, setShowCadastroRapidoProduto] = useState(false);
  const [showCadastroRapidoServico, setShowCadastroRapidoServico] = useState(false);
  const [cadastrandoRapido, setCadastrandoRapido] = useState(false);
  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    tipo: 'produto' as 'produto' | 'servico',
    preco: 0,
    unidade: 'un'
  });
  
  // Dados de teste para produtos e serviços
  const produtosTeste: ProdutoServico[] = [];
  
  const servicosTeste: ProdutoServico[] = [];
  
  // Estado para etapa 5 - Observações
  const [observacoes, setObservacoes] = useState('');
  const [condicoesEquipamento, setCondicoesEquipamento] = useState('');
  
  // Estado para etapa 6 - Imagens
  const [imagens, setImagens] = useState<File[]>([]);
  const [previewImagens, setPreviewImagens] = useState<string[]>([]);
  
  // Estado de loading
  const [salvando, setSalvando] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ nome: string; whatsapp: string; cpf: string; numero_reserva?: string; email?: string }>();

  // Controlar hidratação
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function fetchClientes() {
      if (!empresaData?.id) return;
      setLoadingClientes(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, celular, email, documento, numero_cliente')
        .eq('empresa_id', empresaData.id);
      if (!error && data) {
        setClientes(data);
        
        // Verificar se há clienteId na URL para selecionar automaticamente
        const clienteIdFromURL = searchParams.get('clienteId');
        if (clienteIdFromURL && clienteIdFromURL !== 'null' && data.find((c: any) => c.id === clienteIdFromURL)) {
          setClienteSelecionado(clienteIdFromURL);
        }
      }
      setLoadingClientes(false);
    }
    fetchClientes();
  }, [empresaData?.id, searchParams]);

  useEffect(() => {
    async function fetchUsuarios() {
      if (!empresaData?.id) return;
      setLoadingUsuarios(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, nivel, auth_user_id, tecnico_id')
        .eq('empresa_id', empresaData.id)
        .order('nome', { ascending: true });
      
      if (!error && data) {
        setUsuarios(data);
        setTecnicos(data.filter((u: any) => u.nivel === 'tecnico'));
        
        // Auto-atribuir baseado no usuário logado
        if (usuarioData) {
          const usuarioLogado = data.find((u: any) => u.auth_user_id === usuarioData.auth_user_id);
          if (usuarioLogado && usuarioLogado.nivel === 'tecnico') {
            setTecnicoResponsavel(usuarioLogado.tecnico_id || usuarioLogado.auth_user_id);
          }
        }
      }
      setLoadingUsuarios(false);
    }
    fetchUsuarios();
  }, [empresaData?.id, usuarioData]);

  useEffect(() => {
    async function fetchStatus() {
      if (!empresaData?.id) return;
      
      // Status fixos para criação de OS
      const statusPadrao = [
        {
          id: 'orcamento',
          nome: 'ORÇAMENTO',
          cor: '#f59e0b',
          ordem: 1,
          tipo: 'os'
        },
        {
          id: 'aprovado',
          nome: 'APROVADO',
          cor: '#10b981',
          ordem: 2,
          tipo: 'os'
        },
        {
          id: 'retorno_garantia',
          nome: 'RETORNO GARANTIA',
          cor: '#ef4444',
          ordem: 3,
          tipo: 'os'
        }
      ];
      
      setStatusOS(statusPadrao);
      setStatusSelecionado('orcamento'); // Padrão: ORÇAMENTO
    }
    fetchStatus();
  }, [empresaData?.id]);

  // Auto-selecionar status para retorno de garantia
  useEffect(() => {
    if (tipoEntrada === 'garantia' && statusOS.length > 0) {
      const statusRetornoGarantia = statusOS.find(s => s.id === 'retorno_garantia');
      if (statusRetornoGarantia) {
        setStatusSelecionado('retorno_garantia');
      }
    } else if (tipoEntrada === 'nova' && statusOS.length > 0) {
      setStatusSelecionado('orcamento');
    }
  }, [tipoEntrada, statusOS]);

  useEffect(() => {
    fetchProdutosServicos();
  }, [empresaData?.id]);

  useEffect(() => {
    fetchTermos();
  }, [empresaData?.id]);

  async function fetchProdutosServicos() {
    if (!empresaData?.id) return;
    setLoadingProdutos(true);
    
    const { data, error } = await interceptSupabaseQuery('produtos_servicos', async () => {
      return await supabase
        .from('produtos_servicos')
        .select('id, nome, tipo, preco, unidade, ativo, codigo')
        .eq('empresa_id', empresaData.id)
        .eq('ativo', true)
        .order('nome', { ascending: true });
    });
    
    if (error && error.code === 'TABLE_NOT_EXISTS') {
      // Usar dados de teste se a tabela não existir
      setProdutosServicos([...produtosTeste, ...servicosTeste]);
    } else if (error) {
      handleSupabaseError(error, 'NovaOS - fetchProdutosServicos');
      setProdutosServicos([...produtosTeste, ...servicosTeste]);
    } else if (data && (data as any[])?.length > 0) {
      setProdutosServicos(data as any[]);
    } else {
      // Usar dados de teste se não houver dados no banco
      setProdutosServicos([...produtosTeste, ...servicosTeste]);
    }
    setLoadingProdutos(false);
  }

  async function fetchTermos() {
    if (!empresaData?.id) return;
    setLoadingTermos(true);
    
    const { data, error } = await supabase
      .from('termos_garantia')
      .select('*')
      .eq('empresa_id', empresaData.id)
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    
    if (!error && data) {
      setTermos(data);
      
      // Selecionar automaticamente o primeiro termo ativo como padrão
      if (data.length > 0) {
        // Se não há termo selecionado OU se o termo selecionado não existe mais na lista
        if (!termoSelecionado || !data.find((t: any) => t.id === termoSelecionado)) {
          setTermoSelecionado(data[0].id);
          }
      }
    }
    setLoadingTermos(false);
  }

  useEffect(() => {
    fetchProdutosServicos();
  }, [empresaData?.id]);

  async function onCadastrarProdutoRapido() {
    if (!empresaData?.id || !novoProduto.nome || novoProduto.preco <= 0) {
      addToast('error', 'Preencha todos os campos obrigatórios!');
      return;
    }

    setCadastrandoRapido(true);

    try {
      const produtoPayload = {
        empresa_id: empresaData.id,
        nome: novoProduto.nome,
        tipo: novoProduto.tipo,
        preco: novoProduto.preco,
        unidade: novoProduto.unidade,
        ativo: true // Sempre ativo por padrão
      };

      // Usar API route para contornar RLS
      const response = await fetch('/api/produtos/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(produtoPayload)
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Erro da API route:', result);
        const errorMessage = result.error?.message || result.error || 'Erro desconhecido';
        addToast('error', `Erro ao cadastrar produto/serviço: ${errorMessage}`);
        return;
      }

      const novo = result.data;

      if (!novo) {
        console.error('Nenhum dado retornado da API');
        addToast('error', 'Erro: Nenhum dado retornado do servidor');
        return;
      }

      // Recarregar lista de produtos/serviços para garantir que está atualizada
      await fetchProdutosServicos();
      
      // Selecionar automaticamente o novo item
      if (novo.tipo === 'produto') {
        setProdutosSelecionados(prev => [...prev, novo]);
      } else {
        setServicosSelecionados(prev => [...prev, novo]);
      }

      // Limpar formulário
      setNovoProduto({
        nome: '',
        tipo: novo.tipo,
        preco: 0,
        unidade: 'un'
      });

      // Fechar modal
      setShowCadastroRapidoProduto(false);
      setShowCadastroRapidoServico(false);

      addToast('success', `${novo.tipo === 'produto' ? 'Produto' : 'Serviço'} cadastrado com sucesso! Código: ${novo.codigo || 'N/A'}`);

    } catch (error) {
      console.error('Erro ao cadastrar produto/serviço:', error);
      addToast('error', 'Erro inesperado ao cadastrar produto/serviço!');
    } finally {
      setCadastrandoRapido(false);
    }
  }

  async function onCadastrarCliente(data: { nome: string; whatsapp: string; cpf: string; numero_reserva?: string; email?: string }) {
    if (!empresaData?.id) {
      addToast('error', 'Empresa não encontrada!');
      return;
    }

    setCadastrando(true);
    
    // Buscar próximo número de cliente
    const { data: maxResult } = await supabase
      .from('clientes')
      .select('numero_cliente')
      .eq('empresa_id', empresaData.id)
      .order('numero_cliente', { ascending: false })
      .limit(1)
      .single();

    const proximoNumero = maxResult?.numero_cliente ? maxResult.numero_cliente + 1 : 1;

    const clientePayload = {
      empresa_id: empresaData.id,
      nome: data.nome,
      telefone: data.whatsapp,
      celular: data.whatsapp,
      email: data.email || '',
      documento: data.cpf,
      numero_cliente: proximoNumero,
      data_cadastro: new Date().toISOString(),
      status: 'ativo',
      tipo: 'pf'
    };

    const { data: novo, error } = await supabase.from('clientes').insert(clientePayload).select().single();
    setCadastrando(false);
    
    if (error || !novo) {
      console.error('Erro ao cadastrar:', error);
      addToast('error', 'Erro ao cadastrar cliente!');
      return;
    }
    
    setClientes(prev => [...prev, novo]);
    setClienteSelecionado(novo.id);
    setShowCadastroCliente(false);
    reset();
  }

  function proximaEtapa() {
    if (etapaAtual < etapas.length) {
      setEtapaAtual(etapaAtual + 1);
    }
  }

  function etapaAnterior() {
    if (etapaAtual > 1) {
      setEtapaAtual(etapaAtual - 1);
    }
  }

  // Função para verificar se o formulário está completo
  function formularioCompleto() {
    const camposBasicos = clienteSelecionado && 
                          dadosEquipamento.tipo && 
                          dadosEquipamento.marca && 
                          dadosEquipamento.modelo &&
                          tecnicoResponsavel &&
                          statusSelecionado;
    
    // Se for APROVADO, verificar se há produtos/serviços selecionados COM VALORES
    if (statusSelecionado === 'aprovado') {
      const temProdutosComValor = produtosSelecionados.length > 0 && 
        produtosSelecionados.some(p => p.preco > 0);
      const temServicosComValor = servicosSelecionados.length > 0 && 
        servicosSelecionados.some(s => s.preco > 0);
      
      return camposBasicos && (temProdutosComValor || temServicosComValor);
    }
    
    return camposBasicos;
  }

  // Função para verificar se há produtos/serviços com valores para OS aprovada
  function validarProdutosServicosAprovados() {
    if (statusSelecionado !== 'aprovado') return { valido: true, mensagem: '' };
    
    const produtosComValor = produtosSelecionados.filter(p => p.preco > 0);
    const servicosComValor = servicosSelecionados.filter(s => s.preco > 0);
    
    if (produtosComValor.length === 0 && servicosComValor.length === 0) {
      return { 
        valido: false, 
        mensagem: 'Para OS aprovada, é obrigatório selecionar pelo menos um produto ou serviço com valor maior que zero.' 
      };
    }
    
    // Verificar se todos os produtos/serviços selecionados têm valores
    const todosProdutosTemValor = produtosSelecionados.every(p => p.preco > 0);
    const todosServicosTemValor = servicosSelecionados.every(s => s.preco > 0);
    
    if (!todosProdutosTemValor || !todosServicosTemValor) {
      return { 
        valido: false, 
        mensagem: 'Todos os produtos e serviços selecionados para OS aprovada devem ter valores maiores que zero.' 
      };
    }
    
    return { valido: true, mensagem: '' };
  }

  // Função para gerar tooltip do botão finalizar
  function getTooltipFinalizar() {
    if (statusSelecionado !== 'aprovado') return 'Finalizar OS';
    
    const validacao = validarProdutosServicosAprovados();
    if (validacao.valido) {
      const totalProdutos = produtosSelecionados.length;
      const totalServicos = servicosSelecionados.length;
      const valorTotal = produtosSelecionados.reduce((sum, p) => sum + p.preco, 0) + 
                        servicosSelecionados.reduce((sum, s) => sum + s.preco, 0);
      
      return `OS aprovada com ${totalProdutos} produto(s) e ${totalServicos} serviço(s) - Total: R$ ${valorTotal.toFixed(2)}`;
    }
    
    return validacao.mensagem;
  }

  async function finalizarOS() {
    // Validar se todos os campos obrigatórios estão preenchidos
    if (!clienteSelecionado) {
      addToast('error', 'Selecione um cliente');
      return;
    }
    
    if (!dadosEquipamento.tipo || !dadosEquipamento.marca || !dadosEquipamento.modelo) {
      addToast('error', 'Preencha os dados do equipamento');
      return;
    }
    
    if (!tecnicoResponsavel) {
      addToast('error', 'Selecione um técnico responsável');
      return;
    }
    
    if (!statusSelecionado) {
      addToast('error', 'Selecione um status');
      return;
    }

    if (!empresaData?.id) {
      addToast('error', 'Erro: Dados da empresa não encontrados. Faça login novamente.');
      return;
    }

    // Se for APROVADO, verificar se há produtos/serviços selecionados COM VALORES
    const validacaoProdutosServicos = validarProdutosServicosAprovados();
    if (!validacaoProdutosServicos.valido) {
      addToast('error', validacaoProdutosServicos.mensagem);
      return;
    }

    setSalvando(true);

    try {
      // Buscar dados do técnico selecionado
      const tecnicoSelecionado = tecnicos.find(t => t.tecnico_id === tecnicoResponsavel);
      
      // Buscar o status selecionado para obter o nome
      const statusSelecionadoObj = statusOS.find(s => s.id === statusSelecionado);
      const nomeStatus = statusSelecionadoObj?.nome || 'ABERTA';

      // Preparar dados da OS para salvar no banco
      const dadosOS = {
        cliente_id: clienteSelecionado,
        tecnico_id: tecnicoResponsavel,  // ✅ Usar tecnico_id (campo que existe na tabela)
        status: nomeStatus,
        equipamento: dadosEquipamento.tipo?.toUpperCase() || '', // ✅ Campo para contador
        categoria: dadosEquipamento.tipo?.toUpperCase() || '',
        marca: dadosEquipamento.marca?.toUpperCase() || '',
        modelo: dadosEquipamento.modelo?.toUpperCase() || '',
        cor: dadosEquipamento.cor?.toUpperCase() || '',
        numero_serie: dadosEquipamento.numero_serie?.toUpperCase() || '',
        problema_relatado: dadosEquipamento.descricao_problema?.toUpperCase() || '',  // ✅ Campo correto
        observacao: observacoes?.toUpperCase() || '',
        empresa_id: empresaData?.id,
        atendente: usuarioData?.nome?.toUpperCase() || 'ATENDENTE',
        tecnico: tecnicoSelecionado?.nome?.toUpperCase() || 'TÉCNICO',
        acessorios: acessorios?.toUpperCase() || '',
        condicoes_equipamento: condicoesEquipamento?.toUpperCase() || '',
        data_cadastro: new Date().toISOString(),
        os_garantia_id: tipoEntrada === 'garantia' && osGarantiaSelecionada ? osGarantiaSelecionada.id : null,
        termo_garantia_id: termoSelecionado || null,
        tipo: tipoEntrada === 'garantia' ? 'Retorno' : 'Normal',
        // Campos de senha
        senha_aparelho: dadosEquipamento.senha || null,
        senha_padrao: dadosEquipamento.senha_padrao.length > 0 ? JSON.stringify(dadosEquipamento.senha_padrao) : null,
        checklist_entrada: Object.keys(checklistEntrada).length > 0 ? JSON.stringify(checklistEntrada) : null,
        // Adicionar campo de prazo de entrega
        prazo_entrega: prazoEntrega ? new Date(prazoEntrega).toISOString() : (() => {
          // Se não foi definido, criar prazo automático (7 dias)
          const prazoAutomatico = new Date();
          prazoAutomatico.setDate(prazoAutomatico.getDate() + 7);
          return prazoAutomatico.toISOString();
        })()
        // Agora usando os nomes corretos das colunas da tabela
      };

      // Salvar a OS usando a API route (contorna RLS)
      const response = await fetch('/api/ordens/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosOS)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Erro ao salvar OS:', result.error);
        addToast('error', 'Erro ao criar a Ordem de Serviço: ' + result.error);
        return;
      }

      const osData = result.data;

      // Se há produtos/serviços selecionados, atualizar a OS com os dados
      if (statusSelecionado === 'aprovado' && (produtosSelecionados.length > 0 || servicosSelecionados.length > 0)) {
        const servicos = servicosSelecionados.map(s => s.nome).join(', ');
        const pecas = produtosSelecionados.map(p => p.nome).join(', ');
        const qtdServico = servicosSelecionados.length;
        const qtdPeca = produtosSelecionados.length;
        const valorServico = servicosSelecionados.reduce((total, s) => total + s.preco, 0);
        const valorPeca = produtosSelecionados.reduce((total, p) => total + p.preco, 0);
        const valorFaturado = valorServico + valorPeca;

        // Atualizar a OS com os dados dos produtos/serviços
        const { error: updateError } = await supabase
          .from('ordens_servico')
          .update({
            servico: servicos || null,
            qtd_servico: qtdServico,
            peca: pecas || null,
            qtd_peca: qtdPeca,
            valor_servico: valorServico,
            valor_peca: valorPeca,
            valor_faturado: valorFaturado
          })
          .eq('id', osData.id);

        if (updateError) {
          console.error('Erro ao atualizar dados dos produtos/serviços:', updateError);
        }
      }

      // Upload das imagens (se houver)
      if (imagens.length > 0) {
        try {
          const formData = new FormData();
          formData.append('ordemId', osData.id);
          
          imagens.forEach((file) => {
            formData.append('files', file);
          });

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });

          const uploadResult = await uploadResponse.json();

          if (!uploadResponse.ok) {
            console.error('Erro no upload das imagens:', uploadResult.error);
            // Não falhar a criação da OS por erro no upload
          } else {
            // Salvar URLs das imagens na OS
            const urlsImagens = uploadResult.files.map((file: any) => file.url).join(',');
            
            const { error: updateError } = await supabase
              .from('ordens_servico')
              .update({ 
                imagens: urlsImagens 
              })
              .eq('id', osData.id);

            if (updateError) {
              console.error('Erro ao salvar URLs das imagens:', updateError);
            }
          }
        } catch (uploadError) {
          console.error('Erro no upload das imagens:', uploadError);
          // Não falhar a criação da OS por erro no upload
        }
      }

      // Mostrar toast de sucesso
      addToast('success', 'Ordem de Serviço criada com sucesso!');
      
      // Redirecionar para visualizar a OS criada
      router.push(`/ordens/${osData.id}`);

    } catch (error) {
      console.error('Erro geral ao finalizar OS:', error);
      addToast('error', 'Erro inesperado ao criar a Ordem de Serviço');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <MenuLayout>
      <div className="w-full min-h-screen bg-gray-50/50">
        {/* Barra fixa só com Voltar - no lugar do header */}
        <div className="sticky top-0 z-20 w-full bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center">
          <button
            type="button"
            onClick={() => router.push('/ordens')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para Ordens
          </button>
        </div>

        <div className="w-full max-w-[1800px] mx-auto py-6 px-4 md:px-8 lg:px-10 xl:px-12">
          {/* Cabeçalho */}
          <div className="w-full text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Nova Ordem de Serviço</h1>
            <div className="text-gray-500 text-base font-medium">
              Etapa {etapaAtual} de {etapas.length} — <span className="font-semibold">{etapas[etapaAtual-1]}</span>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div className="bg-black h-2 rounded-full transition-all duration-300" style={{ width: `${(etapaAtual/etapas.length)*100}%` }} />
          </div>

          {/* Etapas */}
          <div className="flex items-center justify-between w-full mb-6 gap-4">
            {etapas.map((label, idx) => (
              <div key={label} className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 ${
                  etapaAtual === idx+1 ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                } font-bold`}>
                  {idx + 1}
                </div>
                <span className="text-xs mt-2 text-center font-medium text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          {/* Card/Container da etapa - items-stretch para o conteúdo usar toda a largura */}
          <div className="bg-white rounded-xl border border-gray-200 shadow p-6 md:p-8 mb-6 min-h-[200px] flex flex-col items-stretch w-full">
            {etapaAtual === 1 && (
              <div className="w-full flex flex-col gap-6">
                {/* Tipo de entrada: Nova ou Retorno Garantia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Tipo de Entrada</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${tipoEntrada === 'nova' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                      onClick={() => {
                        setTipoEntrada('nova');
                        setOsGarantiaBusca('');
                        setOsGarantiaResultados([]);
                        setOsGarantiaSelecionada(null);
                      }}
                    >
                      <span className="font-bold text-lg">Nova OS</span>
                    </div>
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${tipoEntrada === 'garantia' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                      onClick={() => setTipoEntrada('garantia')}
                    >
                      <span className="font-bold text-lg">Retorno para Garantia</span>
                    </div>
                  </div>
                </div>
                {/* Busca OS original para garantia */}
                {tipoEntrada === 'garantia' && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Buscar OS original</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Digite número da OS, nome do cliente ou modelo..."
                      value={osGarantiaBusca}
                      onChange={async (e) => {
                        setOsGarantiaBusca(e.target.value);
                        setBuscandoOsGarantia(true);
                        let resultados: Record<string, unknown>[] = [];
                        if (e.target.value.length > 0) {
                          // 1. Buscar clientes pelo nome
                          const { data: clientesBusca } = await supabase
                            .from('clientes')
                            .select('id')
                            .ilike('nome', `%${e.target.value}%`);
                          const clienteIds = clientesBusca?.map((c: any) => c.id) || [];

                          // 2. Se for número, buscar por numero_os exato
                          let osPorNumero: Record<string, unknown>[] = [];
                          if (/^\d+$/.test(e.target.value)) {
                            const numero = parseInt(e.target.value, 10);
                            const { data } = await supabase
                              .from('ordens_servico')
                              .select('id, numero_os, cliente_id, modelo, numero_serie, marca, categoria, clientes:cliente_id(nome)')
                              .eq('empresa_id', empresaData?.id)
                              .eq('numero_os', numero)
                              .limit(10);
                            osPorNumero = data || [];
                          }

                          // 3. Buscar OS por modelo
                          const { data: osPorModelo } = await supabase
                            .from('ordens_servico')
                            .select('id, numero_os, cliente_id, modelo, numero_serie, marca, categoria, clientes:cliente_id(nome)')
                            .eq('empresa_id', empresaData?.id)
                            .ilike('modelo', `%${e.target.value}%`)
                            .limit(10);

                          // 4. Buscar OS por cliente_id
                          let osPorCliente: Record<string, unknown>[] = [];
                          if (clienteIds.length > 0) {
                            const { data } = await supabase
                              .from('ordens_servico')
                              .select('id, numero_os, cliente_id, modelo, numero_serie, marca, categoria, clientes:cliente_id(nome)')
                              .eq('empresa_id', empresaData?.id)
                              .in('cliente_id', clienteIds)
                              .limit(10);
                            osPorCliente = data || [];
                          }

                          // 5. Buscar OS por id se termo for UUID válido
                          let osPorId: Record<string, unknown>[] = [];
                          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                          if (uuidRegex.test(e.target.value)) {
                            const { data } = await supabase
                              .from('ordens_servico')
                              .select('id, numero_os, cliente_id, modelo, numero_serie, marca, categoria, clientes:cliente_id(nome)')
                              .eq('empresa_id', empresaData?.id)
                              .eq('id', e.target.value)
                              .limit(1);
                            osPorId = data || [];
                          }

                          // Unir resultados e remover duplicados
                          const todos = [...osPorNumero, ...(osPorModelo || []), ...osPorCliente, ...osPorId];
                          const vistos = new Set();
                          resultados = todos.filter(os => {
                            if (vistos.has(os.id)) return false;
                            vistos.add(os.id);
                            return true;
                          });
                        }
                        // 3) Garantir que todos tenham numero_os preenchido
                        if (resultados.length > 0) {
                          const faltandoNumero = resultados.filter(r => r.numero_os === null || r.numero_os === undefined);
                          if (faltandoNumero.length > 0) {
                            const preenchidos = await Promise.all(
                              faltandoNumero.map(async (r) => {
                                const { data: d } = await supabase
                                  .from('ordens_servico')
                                  .select('numero_os')
                                  .eq('id', r.id)
                                  .single();
                                return { id: r.id, numero_os: d?.numero_os };
                              })
                            );
                            resultados = resultados.map(r => {
                              const p = preenchidos.find(x => x.id === r.id);
                              return p && (p as any).numero_os ? { ...r, numero_os: (p as any).numero_os } : r;
                            });
                          }
                        }

                        setOsGarantiaResultados(resultados);
                        setBuscandoOsGarantia(false);
                      }}
                    />
                    {buscandoOsGarantia && <div className="text-xs text-gray-500">Buscando...</div>}
                    {osGarantiaResultados.length > 0 && (
                      <ul className="bg-white border rounded shadow max-h-48 overflow-auto mt-1">
                        {osGarantiaResultados.map(os => {
                          const osTyped = os as { id: string; cliente_id: string; modelo: string; numero_serie: string; marca: string; categoria: string; clientes?: { nome?: string } };
                          return (
                            <li
                              key={osTyped.id}
                              className={`px-4 py-2 cursor-pointer hover:bg-lime-100 ${osGarantiaSelecionada && (osGarantiaSelecionada as { id: string }).id === osTyped.id ? 'bg-lime-200' : ''}`}
                              onClick={() => {
                                setOsGarantiaSelecionada(osTyped);
                                setClienteSelecionado(osTyped.cliente_id);
                                setDadosEquipamento({
                                  tipo: osTyped.categoria,
                                  marca: osTyped.marca,
                                  modelo: osTyped.modelo,
                                  cor: '',
                                  numero_serie: osTyped.numero_serie,
                                  descricao_problema: '',
                                  senha: '',
                                  senha_padrao: []
                                });
                                // Fechar a lista ao selecionar
                                setOsGarantiaResultados([]);
                                // Preencher o campo com o número da OS selecionada
                                setOsGarantiaBusca(String((os as any).numero_os ?? ''));
                              }}
                            >
                              <span className="font-semibold">OS #{String((os as any).numero_os ?? 'sem número')}</span> — {osTyped.clientes?.nome || 'Cliente'} — {osTyped.modelo}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {osGarantiaSelecionada && (
                      <div className="mt-2 text-xs text-green-700">OS original selecionada: <span className="font-bold">#{(osGarantiaSelecionada as { numero_os?: number; id: string }).numero_os ?? (osGarantiaSelecionada as { id: string }).id}</span></div>
                    )}
                  </div>
                )}
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Selecione o cliente</label>
                {isMounted ? (
                <ReactSelect
                  options={(clientes || []).map(c => ({ value: c.id, label: c.nome }))}
                  value={(() => {
                    const cliente = (clientes || []).find(c => c.id === clienteSelecionado);
                    return cliente ? { value: clienteSelecionado, label: cliente.nome } : null;
                  })()}
                  onChange={opt => setClienteSelecionado(opt?.value || null)}
                  isLoading={loadingClientes}
                  placeholder={loadingClientes ? "Carregando clientes..." : "Buscar cliente..."}
                  className="mb-4"
                  styles={{
                    control: (provided) => ({
                      ...provided,
                      borderRadius: '0.5rem',
                      borderColor: '#e5e7eb',
                      minHeight: '44px',
                      fontSize: '1rem',
                      boxShadow: 'none',
                      ':hover': { borderColor: '#3b82f6' }
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isSelected
                        ? '#111827'
                        : state.isFocused
                        ? '#e0e7ef'
                        : 'white',
                      color: state.isSelected ? 'white' : '#111827',
                      fontSize: '1rem',
                    }),
                  }}
                  isDisabled={tipoEntrada === 'garantia' && !!osGarantiaSelecionada}
                />
                ) : (
                  <div className="mb-4 h-11 bg-gray-100 rounded-lg animate-pulse flex items-center px-3">
                    <span className="text-gray-400">Carregando...</span>
                  </div>
                )}
                <Button variant="secondary" className="w-full" onClick={() => setShowCadastroCliente(true)}>Cadastrar novo cliente</Button>
                {showCadastroCliente && (
                  <form className="bg-gray-50 border border-gray-200 rounded-xl p-6 mt-4 flex flex-col gap-4 w-full" onSubmit={handleSubmit(onCadastrarCliente)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 text-left">Nome completo</label>
                        <input
                          type="text"
                          placeholder="Nome completo"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
                          {...register("nome", { required: true })}
                        />
                        {errors.nome && <span className="text-red-500 text-xs">Nome obrigatório</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 text-left">WhatsApp</label>
                        <input
                          type="text"
                          placeholder="WhatsApp"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
                          {...register("whatsapp", { required: true })}
                        />
                        {errors.whatsapp && <span className="text-red-500 text-xs">WhatsApp obrigatório</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 text-left">CPF</label>
                        <input
                          type="text"
                          placeholder="CPF"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
                          {...register("cpf", { required: true })}
                        />
                        {errors.cpf && <span className="text-red-500 text-xs">CPF obrigatório</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 text-left">Número reserva (opcional)</label>
                        <input
                          type="text"
                          placeholder="Número reserva (opcional)"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
                          {...register("numero_reserva")}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 text-left">E-mail (opcional)</label>
                      <input
                        type="email"
                        placeholder="E-mail (opcional)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
                        {...register("email")}
                      />
                    </div>
                    <div className="flex gap-2 justify-between mt-2">
                      <Button type="button" variant="secondary" onClick={() => { setShowCadastroCliente(false); reset(); }}>Cancelar</Button>
                      <Button type="button" variant="ghost" onClick={() => router.push('/clientes/novo?returnToOS=true')}>Cadastro completo</Button>
                      <Button type="submit" variant="default" disabled={cadastrando}>{cadastrando ? 'Salvando...' : 'Salvar'}</Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {etapaAtual === 2 && (
              <div className="w-full flex flex-col gap-6">
                <h3 className="text-lg font-semibold text-gray-800 text-left">Dados do Aparelho</h3>

                {/* 1. Tipo de equipamento */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 text-left">
                    <FiPackage className="text-amber-600" />
                    Tipo de equipamento
                  </label>
                  <EquipamentoSelector
                    empresaId={empresaData?.id || ''}
                    value={equipamentoSelecionado?.nome}
                    onChange={handleEquipamentoSelecionado}
                    placeholder="Ex: CELULAR, NOTEBOOK, IMPRESSORA..."
                    className="w-full"
                  />
                </div>

                {/* 2. Identificação do aparelho - 4 colunas em telas grandes */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 text-left">
                    <FiSmartphone className="text-gray-500" />
                    Identificação
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 text-left">Marca</label>
                      <input
                        type="text"
                        placeholder="Samsung, Apple..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        value={dadosEquipamento.marca}
                        onChange={(e) => setDadosEquipamento(prev => ({ ...prev, marca: e.target.value.toUpperCase() }))}
                        readOnly={tipoEntrada === 'garantia' && !!osGarantiaSelecionada}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 text-left">Modelo</label>
                      <input
                        type="text"
                        placeholder="Galaxy S21, iPhone 13..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        value={dadosEquipamento.modelo}
                        onChange={(e) => setDadosEquipamento(prev => ({ ...prev, modelo: e.target.value.toUpperCase() }))}
                        readOnly={tipoEntrada === 'garantia' && !!osGarantiaSelecionada}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 text-left">Cor</label>
                      <input
                        type="text"
                        placeholder="Preto, Prata..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        value={dadosEquipamento.cor}
                        onChange={(e) => setDadosEquipamento(prev => ({ ...prev, cor: e.target.value.toUpperCase() }))}
                        readOnly={tipoEntrada === 'garantia' && !!osGarantiaSelecionada}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 text-left">Nº de série</label>
                      <input
                        type="text"
                        placeholder="Opcional"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                        value={dadosEquipamento.numero_serie}
                        onChange={(e) => setDadosEquipamento(prev => ({ ...prev, numero_serie: e.target.value.toUpperCase() }))}
                        readOnly={tipoEntrada === 'garantia' && !!osGarantiaSelecionada}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Problema relatado */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 text-left">Problema relatado</label>
                  <textarea
                    placeholder="Descreva o problema apresentado pelo equipamento..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                    value={dadosEquipamento.descricao_problema}
                    onChange={(e) => setDadosEquipamento(prev => ({ ...prev, descricao_problema: e.target.value.toUpperCase() }))}
                  />
                </div>

                {/* 4 e 5. Acesso + Itens que acompanham - lado a lado em telas grandes */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* 4. Acesso ao aparelho (opcional) */}
                  <div className="rounded-xl border border-gray-200 bg-slate-50/50 p-5 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 text-left">
                        <FiKey className="text-slate-600" />
                        Acesso ao aparelho
                        <span className="text-xs font-normal text-gray-500">(opcional)</span>
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 text-left">
                        Informe a senha, PIN ou desenhe o padrão de desbloqueio, caso o cliente tenha informado.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Senha / PIN */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-600 mb-1 text-left">Senha / PIN</label>
                        <div className="relative">
                          <input
                            type={mostrarSenha ? "text" : "password"}
                            placeholder="Ex: 1234 ou senha do cliente"
                            autoComplete="off"
                            className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                            value={dadosEquipamento.senha}
                            onChange={(e) => setDadosEquipamento(prev => ({ ...prev, senha: e.target.value }))}
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarSenha(s => !s)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                            title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {mostrarSenha ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 text-left">PIN ou senha para desbloqueio</p>
                      </div>
                      {/* Padrão Android */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-600 mb-1 text-left">Padrão Android</label>
                        <PatternLock
                          onPatternComplete={(p) => setDadosEquipamento(prev => ({ ...prev, senha_padrao: p }))}
                          onPatternClear={() => setDadosEquipamento(prev => ({ ...prev, senha_padrao: [] }))}
                          value={dadosEquipamento.senha_padrao}
                          className="w-full lg:max-w-[220px]"
                          showCoordinates={false}
                        />
                      </div>
                    </div>
                    {(dadosEquipamento.senha || dadosEquipamento.senha_padrao.length > 0) && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                        <FiCheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Acesso registrado
                      </div>
                    )}
                  </div>

                  {/* 5. Acessórios e estado */}
                  <div className="rounded-xl border border-gray-200 bg-amber-50/30 p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 text-left">
                      <FiList className="text-amber-600" />
                      Itens que acompanham
                      <span className="text-xs font-normal text-gray-500">(opcional)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 text-left">Acessórios</label>
                        <textarea
                          placeholder="Carregador, cabo, capa..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                          rows={2}
                          value={acessorios}
                          onChange={(e) => setAcessorios(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1 text-left">Estado físico</label>
                        <textarea
                          placeholder="Riscos, amassados..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                          rows={2}
                          value={condicoesEquipamento}
                          onChange={(e) => setCondicoesEquipamento(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {etapaAtual === 3 && (
              <div className="w-full flex flex-col gap-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 text-left">
                  <FiList className="text-blue-600" />
                  Checklist de entrada
                </h3>
                <p className="text-sm text-gray-600 text-left">
                  {dadosEquipamento.tipo
                    ? <>Checklist para <strong>{dadosEquipamento.tipo}</strong>. Marque o que foi verificado na recepção.</>
                    : 'Selecione o tipo de equipamento na etapa anterior para ver o checklist específico.'}
                </p>
                {dadosEquipamento.tipo ? (
                  <DynamicChecklist
                    equipamentoCategoria={dadosEquipamento.tipo}
                    value={checklistEntrada}
                    onChange={setChecklistEntrada}
                    showAparelhoNaoLiga={true}
                  />
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                    <FiPackage className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <p className="text-amber-800 font-medium">Volte à etapa Aparelho</p>
                    <p className="text-amber-700 text-sm mt-1">Selecione o tipo de equipamento para carregar o checklist correspondente.</p>
                  </div>
                )}
              </div>
            )}

            {etapaAtual === 4 && (
              <div className="w-full flex flex-col gap-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4 text-left">Técnico Responsável</h3>
                
                <div className="space-y-4 w-full">
                  <label className="block text-sm font-medium text-gray-700 text-left">Selecione o Técnico Responsável</label>
                  {isMounted ? (
                  <ReactSelect
                    options={(tecnicos || []).map(tecnico => ({ 
                      value: tecnico.tecnico_id || tecnico.auth_user_id, 
                      label: tecnico.nome 
                    }))}
                    value={(() => {
                      const tecnico = (tecnicos || []).find(t => (t.tecnico_id || t.auth_user_id) === tecnicoResponsavel);
                      return tecnicoResponsavel && tecnico ? { 
                        value: tecnicoResponsavel, 
                        label: tecnico.nome 
                      } : null;
                    })()}
                    onChange={(option) => setTecnicoResponsavel(option?.value || null)}
                    isLoading={loadingUsuarios}
                    placeholder={loadingUsuarios ? "Carregando técnicos..." : "Selecione o técnico..."}
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        borderRadius: '0.5rem',
                        borderColor: '#e5e7eb',
                        minHeight: '44px',
                        fontSize: '1rem',
                        boxShadow: 'none',
                        ':hover': { borderColor: '#3b82f6' }
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isSelected
                          ? '#111827'
                          : state.isFocused
                          ? '#e0e7ef'
                          : 'white',
                        color: state.isSelected ? 'white' : '#111827',
                        fontSize: '1rem',
                      }),
                    }}
                  />
                  ) : (
                    <div className="h-11 bg-gray-100 rounded-lg animate-pulse flex items-center px-3">
                      <span className="text-gray-400">Carregando...</span>
                    </div>
                  )}
                </div>

                {tecnicoResponsavel && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 text-left">Técnico Selecionado</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {(() => {
                          const tecnico = (tecnicos || []).find(t => (t.tecnico_id || t.auth_user_id) === tecnicoResponsavel);
                          return tecnico ? tecnico.nome.charAt(0).toUpperCase() : '';
                        })()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {(() => {
                            const tecnico = (tecnicos || []).find(t => (t.tecnico_id || t.auth_user_id) === tecnicoResponsavel);
                            return tecnico ? tecnico.nome : '';
                          })()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Técnico responsável pela execução
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {etapaAtual === 5 && (
              <div className="w-full flex flex-col gap-6">
                <h3 className="text-lg font-medium text-gray-700">Tipo de Entrada</h3>
                
                {/* Seleção de Status - 3 cards alinhados em linha em telas maiores */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 text-left">Como o cliente deixou o aparelho?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {statusOS.map((status) => (
                      <div 
                        key={status.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          statusSelecionado === status.id 
                            ? 'border-black bg-gray-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setStatusSelecionado(status.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: status.cor || '#6b7280' }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-700">{status.nome}</p>
                            <p className="text-xs text-gray-500">
                              {status.nome === 'ORÇAMENTO' 
                                ? 'Cliente deixou para orçamento - será necessário fazer orçamento posteriormente'
                                : status.nome === 'RETORNO GARANTIA'
                                ? 'Aparelho retornou para garantia - reparo sem custo adicional'
                                : 'Cliente já aprovou o valor - OS pode prosseguir para execução'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Informações do Status Selecionado */}
                {statusSelecionado && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 text-left">Tipo de Entrada Selecionado</h4>
                    {(() => {
                      const status = statusOS.find(s => s.id === statusSelecionado);
                      if (!status) return null;
                      return (
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: status.cor }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-700">{status.nome}</p>
                            <p className="text-xs text-gray-500">
                              {status.nome === 'ORÇAMENTO' 
                                ? 'Será necessário fazer orçamento posteriormente' 
                                : status.nome === 'RETORNO GARANTIA'
                                ? 'Reparo sem custo adicional - aparelho em garantia'
                                : 'OS pode prosseguir para execução'
                              }
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Busca OS original para retorno de garantia */}
                {statusSelecionado === 'retorno_garantia' && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Buscar OS original</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Digite número da OS, nome do cliente ou modelo..."
                      value={osGarantiaBusca}
                      onChange={async (e) => {
                        setOsGarantiaBusca(e.target.value);
                        setBuscandoOsGarantia(true);
                        const termo = e.target.value.trim();
                        let resultados: any[] = [];

                        // 1) Se for numérico, buscar por numero_os exato
                        if (/^\d+$/.test(termo)) {
                          const numero = parseInt(termo, 10);
                          const { data } = await supabase
                          .from('ordens_servico')
                            .select('id, numero_os, cliente_id, modelo, numero_serie, clientes:cliente_id(nome)')
                          .eq('empresa_id', empresaData?.id)
                          .neq('status', 'retorno_garantia')
                            .eq('numero_os', numero)
                          .limit(10);
                          resultados = data || [];
                        }

                        // 2) Se não encontrou e o termo é textual, buscar por cliente e modelo
                        if (resultados.length === 0 && termo.length > 2) {
                          const { data: porCliente } = await supabase
                            .from('ordens_servico')
                            .select('id, numero_os, cliente_id, modelo, numero_serie, clientes:cliente_id(nome)')
                            .eq('empresa_id', empresaData?.id)
                            .neq('status', 'retorno_garantia')
                            .ilike('clientes.nome', `%${termo}%`)
                            .limit(10);
                          if (porCliente && porCliente.length > 0) {
                            resultados = porCliente;
                          }
                        }

                        if (resultados.length === 0 && termo.length > 2) {
                          const { data: porModelo } = await supabase
                            .from('ordens_servico')
                            .select('id, numero_os, cliente_id, modelo, numero_serie, clientes:cliente_id(nome)')
                            .eq('empresa_id', empresaData?.id)
                            .neq('status', 'retorno_garantia')
                            .ilike('modelo', `%${termo}%`)
                            .limit(10);
                          if (porModelo) resultados = porModelo;
                        }
                        setOsGarantiaResultados(resultados);
                        setBuscandoOsGarantia(false);
                      }}
                    />
                    {buscandoOsGarantia && <div className="text-xs text-gray-500">Buscando...</div>}
                    {osGarantiaResultados.length > 0 && (
                      <ul className="bg-white border rounded shadow max-h-48 overflow-auto mt-1">
                        {osGarantiaResultados.map(os => (
                          <li
                            key={os.id as string}
                            className={`px-4 py-2 cursor-pointer hover:bg-lime-100 ${osGarantiaSelecionada?.id === os.id ? 'bg-lime-200' : ''}`}
                            onClick={() => setOsGarantiaSelecionada(os)}
                          >
                            <span className="font-semibold">OS #{String((os as any).numero_os ?? 'sem número')}</span> — {(os as any)?.clientes?.nome as string} — {os.modelo as string}
                          </li>
                        ))}
                      </ul>
                    )}
                    {osGarantiaSelecionada && (
                      <div className="mt-2 text-xs text-green-700">OS original selecionada: <span className="font-bold">#{(osGarantiaSelecionada.numero_os as string) || (osGarantiaSelecionada.id as string)}</span></div>
                    )}
                  </div>
                )}

                {/* Observações Gerais - largura total */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Observações Gerais</label>
                  <textarea
                    placeholder="Digite observações importantes sobre o atendimento, contexto, observações do cliente, etc..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-left">
                    Descreva detalhes importantes como: contexto do atendimento, observações do cliente, 
                    informações adicionais relevantes para o técnico, urgência, etc.
                  </p>
                </div>

                {/* Prazo de Entrega e Termo de Garantia - lado a lado em telas grandes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Prazo de Entrega</label>
                    <input
                      type="datetime-local"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
                      value={prazoEntrega}
                      onChange={(e) => setPrazoEntrega(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1 text-left">
                      Defina quando o aparelho deve ser entregue ao cliente. Este prazo será usado para controle pelos técnicos e atendentes.
                    </p>
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Termo de Garantia</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent"
                      value={termoSelecionado || ''}
                      onChange={(e) => setTermoSelecionado(e.target.value || null)}
                    >
                      <option value="">Selecione um termo de garantia (opcional)</option>
                      {termos.map((termo, index) => (
                        <option key={termo.id} value={termo.id}>
                          {index === 0 ? `${termo.nome} (Padrão)` : termo.nome}
                        </option>
                      ))}
                    </select>
                    {loadingTermos && <p className="text-xs text-gray-500 mt-1 text-left">Carregando termos...</p>}
                    {termos.length > 0 && termoSelecionado && !loadingTermos && (
                      <p className="text-xs text-green-600 mt-1 text-left">
                        ✅ Termo padrão selecionado automaticamente
                      </p>
                    )}
                    {termos.length === 0 && !loadingTermos && (
                      <p className="text-xs text-gray-500 mt-1 text-left">
                        Nenhum termo de garantia cadastrado.{' '}
                        <a href="/configuracoes?tab=2" className="text-blue-600 hover:underline">
                          Cadastrar termos
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                {/* Campos para produtos e serviços quando valor aprovado */}
                {statusSelecionado === 'aprovado' && (
                  <div className="space-y-6 w-full">
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-4 text-left">Produtos e Serviços Aprovados</h4>
                      
                      {/* Validação visual */}
                      {(() => {
                        const validacao = validarProdutosServicosAprovados();
                        if (!validacao.valido) {
                          return (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                              <p className="text-sm text-red-700">
                                ⚠️ <strong>Atenção:</strong> {validacao.mensagem}
                              </p>
                            </div>
                          );
                        }
                        
                        const totalProdutos = produtosSelecionados.length;
                        const totalServicos = servicosSelecionados.length;
                        const valorTotal = produtosSelecionados.reduce((sum, p) => sum + p.preco, 0) + 
                                          servicosSelecionados.reduce((sum, s) => sum + s.preco, 0);
                        
                        return (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-green-700">
                              ✅ <strong>OS Aprovada:</strong> {totalProdutos} produto(s) e {totalServicos} serviço(s) selecionados - Total: R$ {valorTotal.toFixed(2)}
                            </p>
                          </div>
                        );
                      })()}
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-700">
                          💡 <strong>Dica:</strong> Não encontrou o produto ou serviço? Use os botões "+" para cadastrar rapidamente!
                        </p>
                      </div>
                      
                                            {/* Seleção de Produtos */}
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-700">Produtos</label>
                          <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm"
                            onClick={() => {
                              setNovoProduto(prev => ({ ...prev, tipo: 'produto' }));
                              setShowCadastroRapidoProduto(true);
                            }}
                          >
                            + Cadastrar Produto
                          </Button>
                        </div>
                        {isMounted ? (
                        <ReactSelect
                          isMulti
                          options={(produtosServicos || []).filter(p => p.tipo === 'produto').map(p => ({ 
                            value: p.id, 
                            label: `${p.codigo || 'N/A'} - ${p.nome} - R$ ${p.preco.toFixed(2)}/${p.unidade}`,
                            data: p 
                          }))}
                          value={produtosSelecionados.map(p => ({ 
                            value: p.id, 
                            label: `${p.codigo || 'N/A'} - ${p.nome} - R$ ${p.preco.toFixed(2)}/${p.unidade}`,
                            data: p 
                          }))}
                          onChange={(options) => {
                            const selected = options ? options.map(opt => opt.data) : [];
                            setProdutosSelecionados(selected);
                            
                            // Validação em tempo real para produtos sem valor
                            if (statusSelecionado === 'aprovado' && selected.length > 0) {
                              const produtosSemValor = selected.filter(p => p.preco <= 0);
                              if (produtosSemValor.length > 0) {
                                console.warn('Produtos selecionados sem valor:', produtosSemValor);
                              }
                            }
                          }}
                          isLoading={loadingProdutos}
                          placeholder={loadingProdutos ? "Carregando produtos..." : "Selecione os produtos..."}
                          styles={{
                            control: (provided) => ({
                              ...provided,
                              borderRadius: '0.5rem',
                              borderColor: '#e5e7eb',
                              minHeight: '44px',
                              fontSize: '1rem',
                              boxShadow: 'none',
                              ':hover': { borderColor: '#3b82f6' }
                            }),
                            option: (provided, state) => ({
                              ...provided,
                              backgroundColor: state.isSelected
                                ? '#111827'
                                : state.isFocused
                                ? '#e0e7ef'
                                : 'white',
                              color: state.isSelected ? 'white' : '#111827',
                              fontSize: '1rem',
                            }),
                          }}
                        />
                        ) : (
                          <div className="h-11 bg-gray-100 rounded-lg animate-pulse flex items-center px-3">
                            <span className="text-gray-400">Carregando produtos...</span>
                          </div>
                        )}
                      </div>

                      {/* Seleção de Serviços */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-700">Serviços</label>
                          <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm"
                            onClick={() => {
                              setNovoProduto(prev => ({ ...prev, tipo: 'servico' }));
                              setShowCadastroRapidoServico(true);
                            }}
                          >
                            + Cadastrar Serviço
                          </Button>
                        </div>
                        {isMounted ? (
                        <ReactSelect
                          isMulti
                          options={(produtosServicos || []).filter(s => s.tipo === 'servico').map(s => ({ 
                            value: s.id, 
                            label: `${s.codigo || 'N/A'} - ${s.nome} - R$ ${s.preco.toFixed(2)}`,
                            data: s 
                          }))}
                          value={servicosSelecionados.map(s => ({ 
                            value: s.id, 
                            label: `${s.codigo || 'N/A'} - ${s.nome} - R$ ${s.preco.toFixed(2)}`,
                            data: s 
                          }))}
                          onChange={(options) => {
                            const selected = options ? options.map(opt => opt.data) : [];
                            setServicosSelecionados(selected);
                            
                            // Validação em tempo real para serviços sem valor
                            if (statusSelecionado === 'aprovado' && selected.length > 0) {
                              const servicosSemValor = selected.filter(s => s.preco <= 0);
                              if (servicosSemValor.length > 0) {
                                console.warn('Serviços selecionados sem valor:', servicosSemValor);
                              }
                            }
                          }}
                          isLoading={loadingProdutos}
                          placeholder={loadingProdutos ? "Carregando serviços..." : "Selecione os serviços..."}
                          styles={{
                            control: (provided) => ({
                              ...provided,
                              borderRadius: '0.5rem',
                              borderColor: '#e5e7eb',
                              minHeight: '44px',
                              fontSize: '1rem',
                              boxShadow: 'none',
                              ':hover': { borderColor: '#3b82f6' }
                            }),
                            option: (provided, state) => ({
                              ...provided,
                              backgroundColor: state.isSelected
                                ? '#111827'
                                : state.isFocused
                                ? '#e0e7ef'
                                : 'white',
                              color: state.isSelected ? 'white' : '#111827',
                              fontSize: '1rem',
                            }),
                          }}
                        />
                        ) : (
                          <div className="h-11 bg-gray-100 rounded-lg animate-pulse flex items-center px-3">
                            <span className="text-gray-400">Carregando serviços...</span>
                          </div>
                        )}
                      </div>

                      {/* Resumo dos itens selecionados */}
                      {(produtosSelecionados.length > 0 || servicosSelecionados.length > 0) && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h5 className="text-sm font-medium text-blue-700 mb-2">Itens Selecionados</h5>
                          <div className="space-y-2">
                            {produtosSelecionados.map(produto => (
                              <div key={produto.id} className="flex justify-between text-sm">
                                <span className="text-gray-700">📦 {produto.codigo || 'N/A'} - {produto.nome}</span>
                                <span className="text-gray-600">R$ {produto.preco.toFixed(2)}/{produto.unidade}</span>
                              </div>
                            ))}
                            {servicosSelecionados.map(servico => (
                              <div key={servico.id} className="flex justify-between text-sm">
                                <span className="text-gray-700">🔧 {servico.codigo || 'N/A'} - {servico.nome}</span>
                                <span className="text-gray-600">R$ {servico.preco.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2">
                              <div className="flex justify-between text-sm font-medium">
                                <span className="text-blue-700">Total:</span>
                                <span className="text-blue-700">
                                  R$ {(
                                    produtosSelecionados.reduce((sum, p) => sum + p.preco, 0) +
                                    servicosSelecionados.reduce((sum, s) => sum + s.preco, 0)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {etapaAtual === 6 && (
              <div className="w-full flex flex-col gap-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4 text-left">Imagens do Equipamento</h3>
                
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 text-left">Fotos do Equipamento</label>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                      
                      const files = Array.from(e.dataTransfer.files).filter(file => 
                        file.type.startsWith('image/')
                      );
                      
                      if (files.length > 0) {
                        setImagens(prev => [...prev, ...files]);
                        const previews = files.map(file => URL.createObjectURL(file));
                        setPreviewImagens(prev => [...prev, ...previews]);
                      }
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      id="image-upload"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setImagens(prev => [...prev, ...files]);
                        
                        // Criar previews
                        const previews = files.map(file => URL.createObjectURL(file));
                        setPreviewImagens(prev => [...prev, ...previews]);
                      }}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <div className="text-4xl">📷</div>
                        <p className="text-sm text-gray-600">
                          Clique para selecionar imagens ou arraste aqui
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG até 5MB cada • Máximo 10 imagens
                        </p>
                        {imagens.length > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            {imagens.length} imagem{imagens.length !== 1 ? 'ns' : ''} selecionada{imagens.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Preview das imagens */}
                {previewImagens.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700 text-left">Imagens Selecionadas</h4>
                      <button
                        onClick={() => {
                          setImagens([]);
                          setPreviewImagens([]);
                        }}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Limpar todas
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {previewImagens.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => {
                                setImagens(prev => prev.filter((_, i) => i !== index));
                                setPreviewImagens(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {imagens[index]?.name?.substring(0, 15)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-700 mb-2 text-left">💡 Dica</h4>
                  <p className="text-sm text-blue-600 text-left">
                    Tire fotos do equipamento para documentar seu estado atual. 
                    Isso ajuda a evitar problemas futuros e facilita a identificação.
                  </p>
                </div>
              </div>
            )}

            {etapaAtual > 6 && (
              <div className="text-center text-gray-500">
                <p>Etapa {etapaAtual} em desenvolvimento...</p>
              </div>
            )}
          </div>

          {/* Botões de navegação */}
          <div className="flex justify-between">
            <Button 
              variant="secondary" 
              onClick={etapaAnterior}
              disabled={etapaAtual === 1}
            >
              Anterior
            </Button>
            <Button 
              variant="default" 
              onClick={etapaAtual === etapas.length ? finalizarOS : proximaEtapa}
              disabled={etapaAtual === etapas.length && (!formularioCompleto() || salvando)}
              className={etapaAtual === etapas.length && formularioCompleto() ? 'bg-green-600 hover:bg-green-700' : ''}
              title={etapaAtual === etapas.length ? getTooltipFinalizar() : ''}
            >
              {etapaAtual === etapas.length ? (salvando ? 'Salvando...' : 'Finalizar') : 'Próxima'}
            </Button>
          </div>

          {/* Modal de Cadastro Rápido de Produto */}
          {showCadastroRapidoProduto && (
            <div className="fixed inset-0 bg-gray-600/40 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cadastrar Produto Rápido</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                    <input
                      type="text"
                      placeholder="Ex: Tela LCD Samsung"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      value={novoProduto.nome}
                      onChange={(e) => setNovoProduto(prev => ({ ...prev, nome: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      value={novoProduto.preco}
                      onChange={(e) => setNovoProduto(prev => ({ ...prev, preco: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      value={novoProduto.unidade}
                      onChange={(e) => setNovoProduto(prev => ({ ...prev, unidade: e.target.value }))}
                    >
                      <option value="un">Unidade</option>
                      <option value="kg">Quilograma</option>
                      <option value="m">Metro</option>
                      <option value="l">Litro</option>
                      <option value="pct">Pacote</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setShowCadastroRapidoProduto(false);
                      setNovoProduto({
                        nome: '',
                        tipo: 'produto',
                        preco: 0,
                        unidade: 'un'
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    variant="default" 
                    onClick={onCadastrarProdutoRapido}
                    disabled={cadastrandoRapido || !novoProduto.nome || novoProduto.preco <= 0}
                  >
                    {cadastrandoRapido ? 'Salvando...' : 'Cadastrar'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Cadastro Rápido de Serviço */}
          {showCadastroRapidoServico && (
            <div className="fixed inset-0 bg-gray-600/40 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cadastrar Serviço Rápido</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço</label>
                    <input
                      type="text"
                      placeholder="Ex: Troca de Tela"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      value={novoProduto.nome}
                      onChange={(e) => setNovoProduto(prev => ({ ...prev, nome: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      value={novoProduto.preco}
                      onChange={(e) => setNovoProduto(prev => ({ ...prev, preco: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setShowCadastroRapidoServico(false);
                      setNovoProduto({
                        nome: '',
                        tipo: 'servico',
                        preco: 0,
                        unidade: 'un'
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    variant="default" 
                    onClick={onCadastrarProdutoRapido}
                    disabled={cadastrandoRapido || !novoProduto.nome || novoProduto.preco <= 0}
                  >
                    {cadastrandoRapido ? 'Salvando...' : 'Cadastrar'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Aviso se não há técnicos */}
          {!loadingTecnicos && !hasTecnicos && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Técnico Necessário
                    </h3>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    Para criar Ordens de Serviço, você precisa cadastrar pelo menos um técnico na empresa.
                  </p>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => window.location.href = '/configuracoes?tab=1'}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      Cadastrar Técnico
                    </button>
                    <button
                      onClick={() => window.history.back()}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MenuLayout>
  );
}

export default function NovaOS2Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NovaOS2Content />
    </Suspense>
  );
}
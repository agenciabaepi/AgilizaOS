"use client";

import MenuLayout from "@/components/MenuLayout";

import { Button } from '@/components/Button';
import ReactSelect from 'react-select';
import { useState, useEffect, startTransition } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { handleSupabaseError } from '@/utils/supabaseErrorHandler';
import { interceptSupabaseQuery } from '@/utils/supabaseInterceptor';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Suspense } from 'react';
import { useToast } from '@/components/Toast';
import PatternLock from '@/components/PatternLock';
import {
  FiSmartphone,
  FiCheckCircle,
  FiPackage,
  FiKey,
  FiList,
  FiEye,
  FiEyeOff,
  FiEdit2,
  FiCheck,
  FiX,
  FiExternalLink,
} from 'react-icons/fi';
import EquipamentoSelector from '@/components/EquipamentoSelector';
import AparelhoSelector from '@/components/AparelhoSelector';
import DynamicChecklist from '@/components/DynamicChecklist';
import NovaOSWizardLayout, { type NovaOSContextChip } from '@/components/nova-os/NovaOSWizardLayout';
import NovaOSSection from '@/components/nova-os/NovaOSSection';
import NovaOSAparelhoPreview from '@/components/nova-os/NovaOSAparelhoPreview';
import type { AparelhoSelecionado } from '@/types/aparelhos';
import type { TipoEquipamentoSelecionado } from '@/types/equipamentos';
import {
  ensureTermoGarantiaPadraoNoBanco,
  getTermoGarantiaPadraoId,
  isTermoGarantiaPadraoId,
  mesclarTermosGarantia,
} from '@/lib/termoGarantiaPadrao';

const etapas = ["Cliente", "Aparelho", "Checklist", "Técnico", "Status", "Imagens"];

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  celular: string;
  email?: string;
  documento?: string;
  numero_cliente?: number | null;
  cidade?: string | null;
}

function contatosClienteResumo(c: Pick<Cliente, 'telefone' | 'celular'>) {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const raw of [c.telefone, c.celular]) {
    const v = String(raw || '').trim();
    if (!v) continue;
    const key = v.replace(/\D/g, '') || v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(v);
  }
  return parts.length ? parts.join(' · ') : null;
}

function linhaSecundariaOptionCliente(c: Cliente) {
  const partes = [
    c.numero_cliente != null && c.numero_cliente !== undefined ? `Cliente #${c.numero_cliente}` : null,
    contatosClienteResumo(c),
    c.email?.trim() || null,
    c.cidade?.trim() || null,
  ].filter(Boolean);
  return partes.join(' · ');
}

function CampoResumoCliente({ label, valor }: { label: string; valor: string }) {
  const v = valor?.trim();
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2.5 text-sm sm:grid-cols-[9rem_1fr] sm:gap-x-4 sm:gap-y-0">
      <div className="text-gray-500">{label}</div>
      <div className={`min-w-0 break-words ${v ? 'text-gray-900' : 'text-gray-400'}`}>{v || '—'}</div>
    </div>
  );
}

const inputEdicaoRapidaClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900';

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
  const [tipoEntrada, setTipoEntrada] = useState<'nova' | 'garantia'>('nova');
  const [osGarantiaBusca, setOsGarantiaBusca] = useState('');
  const [osGarantiaResultados, setOsGarantiaResultados] = useState<Record<string, unknown>[]>([]);
  const [osGarantiaSelecionada, setOsGarantiaSelecionada] = useState<Record<string, unknown> | null>(null);
  const [buscandoOsGarantia, setBuscandoOsGarantia] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteEdicaoRapidaAberto, setClienteEdicaoRapidaAberto] = useState(false);
  const [salvandoEdicaoCliente, setSalvandoEdicaoCliente] = useState(false);
  const [formEdicaoCliente, setFormEdicaoCliente] = useState({
    nome: '',
    telefone: '',
    celular: '',
    email: '',
    documento: '',
    cidade: '',
  });
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
  
  const [tipoEquipamentoSelecionado, setTipoEquipamentoSelecionado] =
    useState<TipoEquipamentoSelecionado | null>(null);
  const [aparelhoSelecionado, setAparelhoSelecionado] = useState<AparelhoSelecionado | null>(null);
  const [identificacaoManual, setIdentificacaoManual] = useState(false);

  const handleTipoEquipamentoSelecionado = (tipo: TipoEquipamentoSelecionado | null) => {
    setTipoEquipamentoSelecionado(tipo);
    setAparelhoSelecionado(null);
    setIdentificacaoManual(false);
    setDadosEquipamento((prev) => ({
      ...prev,
      tipo: tipo?.codigo || '',
      marca: '',
      modelo: '',
      cor: '',
      numero_serie: '',
    }));
  };

  const handleAparelhoSelecionado = (aparelho: AparelhoSelecionado | null) => {
    setAparelhoSelecionado(aparelho ? { ...aparelho } : null);

    startTransition(() => {
      if (!aparelho && !identificacaoManual) {
        setDadosEquipamento((prev) => ({
          ...prev,
          marca: '',
          modelo: '',
          cor: '',
          numero_serie: '',
        }));
      }
      if (aparelho) {
        setIdentificacaoManual(false);
        setDadosEquipamento((prev) => ({
          ...prev,
          tipo: aparelho.tipo || prev.tipo,
          marca: aparelho.marca,
          modelo: aparelho.modelo,
        }));
        if (aparelho.tipoId) {
          setTipoEquipamentoSelecionado({
            codigo: aparelho.tipo,
            nome: aparelho.tipo,
            origem: 'catalogo_global',
            catalogoId: aparelho.tipoId,
            empresaTipoId: null,
          });
        } else if (aparelho.tipo) {
          setTipoEquipamentoSelecionado((prev) =>
            prev?.codigo === aparelho.tipo
              ? prev
              : {
                  codigo: aparelho.tipo,
                  nome: aparelho.tipo,
                  origem: aparelho.origem === 'empresa' ? 'empresa' : 'catalogo_global',
                  catalogoId: null,
                  empresaTipoId: aparelho.aparelhoEmpresaId || null,
                }
          );
        }
      }
    });
  };

  const aparelhoImagemFrentePreview = aparelhoSelecionado?.imagemFrenteUrl ?? aparelhoSelecionado?.imagemUrl ?? null;
  const aparelhoImagemVersoPreview = aparelhoSelecionado?.imagemVersoUrl ?? null;

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

  const identificacaoLiberada =
    !!aparelhoSelecionado ||
    identificacaoManual ||
    (tipoEntrada === 'garantia' && !!osGarantiaSelecionada && !!(dadosEquipamento.marca && dadosEquipamento.modelo));

  const marcaModeloDoCatalogo = !!aparelhoSelecionado && !identificacaoManual;
  
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
        .select('id, nome, telefone, celular, email, documento, numero_cliente, cidade')
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
    setClienteEdicaoRapidaAberto(false);
  }, [clienteSelecionado]);

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
      const merged = mesclarTermosGarantia(empresaData.id, data);
      setTermos(merged);

      if (merged.length > 0) {
        if (!termoSelecionado || !merged.find((t) => t.id === termoSelecionado)) {
          setTermoSelecionado(merged[0].id);
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

  function abrirEdicaoRapidaCliente() {
    const c = clientes.find((x) => x.id === clienteSelecionado);
    if (!c) return;
    setFormEdicaoCliente({
      nome: c.nome ?? '',
      telefone: c.telefone ?? '',
      celular: c.celular ?? '',
      email: c.email ?? '',
      documento: c.documento ?? '',
      cidade: c.cidade ?? '',
    });
    setClienteEdicaoRapidaAberto(true);
  }

  async function salvarEdicaoRapidaCliente() {
    if (!clienteSelecionado) return;
    if (!formEdicaoCliente.nome.trim()) {
      addToast('error', 'O nome do cliente é obrigatório.');
      return;
    }
    setSalvandoEdicaoCliente(true);
    const payload = {
      nome: formEdicaoCliente.nome.trim(),
      telefone: formEdicaoCliente.telefone.trim(),
      celular: formEdicaoCliente.celular.trim(),
      email: formEdicaoCliente.email.trim(),
      documento: formEdicaoCliente.documento.trim(),
      cidade: formEdicaoCliente.cidade.trim(),
    };
    const { error } = await supabase.from('clientes').update(payload).eq('id', clienteSelecionado);
    setSalvandoEdicaoCliente(false);
    if (error) {
      handleSupabaseError(error, 'Edição rápida de cliente');
      addToast('error', error.message || 'Não foi possível salvar as alterações.');
      return;
    }
    setClientes((prev) => prev.map((row) => (row.id === clienteSelecionado ? { ...row, ...payload } : row)));
    setClienteEdicaoRapidaAberto(false);
    addToast('success', 'Dados do cliente atualizados.');
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

  function irParaEtapa(etapa: number) {
    if (etapa >= 1 && etapa <= etapas.length && etapa <= etapaAtual) {
      setEtapaAtual(etapa);
    }
  }

  function getWizardContextChips(): NovaOSContextChip[] {
    const chips: NovaOSContextChip[] = [];
    if (etapaAtual > 1 && clienteSelecionado) {
      const c = clientes.find((x) => x.id === clienteSelecionado);
      if (c?.nome) chips.push({ label: 'Cliente', value: c.nome });
    }
    if (etapaAtual > 2 && (dadosEquipamento.marca || dadosEquipamento.modelo)) {
      const ap = [dadosEquipamento.marca, dadosEquipamento.modelo].filter(Boolean).join(' ');
      if (ap) chips.push({ label: 'Aparelho', value: ap });
      else if (dadosEquipamento.tipo) chips.push({ label: 'Tipo', value: dadosEquipamento.tipo });
    }
    if (etapaAtual > 3 && dadosEquipamento.tipo) {
      chips.push({ label: 'Checklist', value: dadosEquipamento.tipo });
    }
    if (etapaAtual > 4 && tecnicoResponsavel) {
      const t = tecnicos.find((x) => (x.tecnico_id || x.auth_user_id) === tecnicoResponsavel);
      if (t?.nome) chips.push({ label: 'Técnico', value: t.nome });
    }
    return chips;
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
      let termoGarantiaIdFinal = termoSelecionado || null;
      if (
        termoGarantiaIdFinal &&
        empresaData?.id &&
        isTermoGarantiaPadraoId(termoGarantiaIdFinal, empresaData.id)
      ) {
        await ensureTermoGarantiaPadraoNoBanco(supabase, empresaData.id);
      }

      // Buscar dados do técnico selecionado
      const tecnicoSelecionado = tecnicos.find(t => t.tecnico_id === tecnicoResponsavel);
      
      // Buscar o status selecionado para obter o nome
      const statusSelecionadoObj = statusOS.find(s => s.id === statusSelecionado);
      const nomeStatus = statusSelecionadoObj?.nome || 'ORÇAMENTO';

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
        termo_garantia_id: termoGarantiaIdFinal,
        tipo: tipoEntrada === 'garantia' ? 'Retorno' : 'Normal',
        // Campos de senha
        senha_aparelho: dadosEquipamento.senha || null,
        senha_padrao: dadosEquipamento.senha_padrao.length > 0 ? JSON.stringify(dadosEquipamento.senha_padrao) : null,
        checklist_entrada: Object.keys(checklistEntrada).length > 0 ? JSON.stringify(checklistEntrada) : null,
        aparelho_origem: aparelhoSelecionado?.origem || (dadosEquipamento.marca && dadosEquipamento.modelo ? 'manual' : null),
        aparelho_catalogo_id: aparelhoSelecionado?.catalogoId || null,
        aparelho_empresa_id: aparelhoSelecionado?.aparelhoEmpresaId || null,
        aparelho_imagem_url: aparelhoSelecionado?.imagemFrenteUrl || aparelhoSelecionado?.imagemUrl || aparelhoSelecionado?.imagemVersoUrl || null,
        aparelho_imagem_frente_url: aparelhoImagemFrentePreview,
        aparelho_imagem_verso_url: aparelhoImagemVersoPreview,
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
          // API de upload espera o campo 'osId' para identificar a OS
          formData.append('osId', osData.id);
          
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
      <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100/80 pb-6">
        {/* Barra fixa só com Voltar - no lugar do header */}
        <div className="sticky top-0 z-20 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 md:px-6 py-3">
          <div className="relative mx-auto flex max-w-4xl items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/ordens')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Voltar para Ordens</span>
              <span className="sm:hidden">Voltar</span>
            </button>
            <Link
              href="/ordens"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              aria-label="Gestão Consert"
            >
              <Image
                src="/assets/imagens/logopreto.png"
                alt="Gestão Consert"
                width={140}
                height={40}
                className="h-8 w-auto object-contain sm:h-9"
                priority
              />
            </Link>
            <div className="w-[72px] sm:w-[140px]" aria-hidden />
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <header className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Nova Ordem de Serviço
            </h1>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Preencha cada etapa com calma. Você pode voltar às anteriores a qualquer momento.
            </p>
          </header>

          <NovaOSWizardLayout
            etapas={etapas}
            etapaAtual={etapaAtual}
            onEtapaClick={irParaEtapa}
            contextChips={getWizardContextChips()}
            onAnterior={etapaAnterior}
            onProxima={etapaAtual === etapas.length ? finalizarOS : proximaEtapa}
            proximaLabel={etapaAtual === etapas.length ? (salvando ? 'Salvando...' : 'Finalizar') : 'Continuar'}
            disableAnterior={etapaAtual === 1}
            disableProxima={etapaAtual === etapas.length && (!formularioCompleto() || salvando)}
            proximaClassName={
              etapaAtual === etapas.length && formularioCompleto() ? 'bg-green-600 hover:bg-green-700' : ''
            }
            proximaTitle={etapaAtual === etapas.length ? getTooltipFinalizar() : undefined}
          >
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
                  placeholder={loadingClientes ? "Carregando clientes..." : "Busque por nome, telefone, e-mail, CPF ou nº do cliente..."}
                  className="mb-2"
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  formatOptionLabel={(option, meta) => {
                    const c = (clientes || []).find((x) => x.id === option.value);
                    if (!c) return <span>{option.label}</span>;
                    const sub = linhaSecundariaOptionCliente(c);
                    const isValueChip = meta.context === 'value';
                    return (
                      <div className="py-0.5 text-left">
                        <div className="font-semibold leading-tight">{c.nome}</div>
                        {sub ? (
                          <div
                            className={
                              isValueChip
                                ? 'text-xs text-gray-600 mt-0.5 leading-snug line-clamp-2'
                                : 'text-xs mt-0.5 leading-snug line-clamp-2 opacity-90'
                            }
                            style={isValueChip ? undefined : { color: 'inherit' }}
                          >
                            {sub}
                          </div>
                        ) : null}
                      </div>
                    );
                  }}
                  filterOption={(option, rawInput) => {
                    const q = rawInput.toLowerCase().trim();
                    if (!q) return true;
                    const c = (clientes || []).find((x) => x.id === option.value);
                    if (!c) return String(option.label).toLowerCase().includes(q);
                    const telefoneCelular = `${c.telefone || ''} ${c.celular || ''}`.toLowerCase();
                    const docDigits = (c.documento || '').replace(/\D/g, '');
                    const qDigits = q.replace(/\D/g, '');
                    const matchDoc = docDigits && qDigits && docDigits.includes(qDigits);
                    const haystack = [
                      c.nome,
                      c.telefone,
                      c.celular,
                      telefoneCelular,
                      c.email,
                      c.documento,
                      c.cidade,
                      c.numero_cliente != null ? String(c.numero_cliente) : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase();
                    return haystack.includes(q) || !!matchDoc;
                  }}
                  styles={{
                    control: (provided, state) => ({
                      ...provided,
                      borderRadius: '0.5rem',
                      borderColor: state.isFocused ? '#111827' : '#e5e7eb',
                      minHeight: '44px',
                      fontSize: '1rem',
                      boxShadow: 'none',
                      ':hover': { borderColor: '#d1d5db' },
                    }),
                    menuPortal: (p) => ({ ...p, zIndex: 9999 }),
                    menu: (p) => ({
                      ...p,
                      zIndex: 9999,
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      border: '1px solid #e5e7eb',
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isSelected ? '#111827' : state.isFocused ? '#f9fafb' : 'white',
                      color: state.isSelected ? '#fff' : '#111827',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }),
                    singleValue: (provided, state) => ({
                      ...provided,
                      color: state.isDisabled ? provided.color : '#111827',
                    }),
                  }}
                  isDisabled={tipoEntrada === 'garantia' && !!osGarantiaSelecionada}
                />
                ) : (
                  <div className="mb-4 h-11 bg-gray-100 rounded-lg animate-pulse flex items-center px-3">
                    <span className="text-gray-400">Carregando...</span>
                  </div>
                )}
                {clienteSelecionado && (() => {
                  const c = (clientes || []).find((x) => x.id === clienteSelecionado);
                  if (!c) return null;
                  return (
                    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 text-left sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-gray-900">{c.nome}</h3>
                          {c.numero_cliente != null && c.numero_cliente !== undefined ? (
                            <p className="mt-0.5 text-xs text-gray-500">Código interno {c.numero_cliente}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                          {!clienteEdicaoRapidaAberto ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 px-2 text-gray-700 hover:bg-gray-50"
                                onClick={abrirEdicaoRapidaCliente}
                              >
                                <FiEdit2 className="h-3.5 w-3.5" aria-hidden />
                                Editar
                              </Button>
                              <span className="text-gray-300" aria-hidden>
                                ·
                              </span>
                              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-gray-600 hover:bg-gray-50" asChild>
                                <Link href={`/clientes/${c.id}`} target="_blank" rel="noopener noreferrer">
                                  <FiExternalLink className="h-3.5 w-3.5" aria-hidden />
                                  Ficha completa
                                </Link>
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 px-2 text-gray-600"
                                onClick={() => setClienteEdicaoRapidaAberto(false)}
                                disabled={salvandoEdicaoCliente}
                              >
                                <FiX className="h-3.5 w-3.5" aria-hidden />
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="h-8 gap-1 px-3"
                                onClick={salvarEdicaoRapidaCliente}
                                disabled={salvandoEdicaoCliente}
                              >
                                <FiCheck className="h-3.5 w-3.5" aria-hidden />
                                {salvandoEdicaoCliente ? 'Salvando...' : 'Salvar'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-gray-500">
                        Em caso de homônimos, confira telefone e documento antes de seguir.
                      </p>
                      {!clienteEdicaoRapidaAberto ? (
                        <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
                          <CampoResumoCliente label="Telefone" valor={c.telefone || ''} />
                          <CampoResumoCliente label="WhatsApp" valor={c.celular || ''} />
                          <CampoResumoCliente label="E-mail" valor={c.email || ''} />
                          <CampoResumoCliente label="CPF / CNPJ" valor={c.documento || ''} />
                          <CampoResumoCliente label="Cidade" valor={c.cidade || ''} />
                        </div>
                      ) : (
                        <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label htmlFor="edicao-rapida-nome" className="mb-1 block text-xs text-gray-600">
                              Nome <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="edicao-rapida-nome"
                              type="text"
                              value={formEdicaoCliente.nome}
                              onChange={(e) => setFormEdicaoCliente((p) => ({ ...p, nome: e.target.value }))}
                              className={inputEdicaoRapidaClass}
                              autoComplete="name"
                            />
                          </div>
                          <div>
                            <label htmlFor="edicao-rapida-tel" className="mb-1 block text-xs text-gray-600">
                              Telefone
                            </label>
                            <input
                              id="edicao-rapida-tel"
                              type="text"
                              value={formEdicaoCliente.telefone}
                              onChange={(e) => setFormEdicaoCliente((p) => ({ ...p, telefone: e.target.value }))}
                              className={inputEdicaoRapidaClass}
                              autoComplete="tel-national"
                            />
                          </div>
                          <div>
                            <label htmlFor="edicao-rapida-cel" className="mb-1 block text-xs text-gray-600">
                              WhatsApp
                            </label>
                            <input
                              id="edicao-rapida-cel"
                              type="text"
                              value={formEdicaoCliente.celular}
                              onChange={(e) => setFormEdicaoCliente((p) => ({ ...p, celular: e.target.value }))}
                              className={inputEdicaoRapidaClass}
                              inputMode="tel"
                            />
                          </div>
                          <div>
                            <label htmlFor="edicao-rapida-email" className="mb-1 block text-xs text-gray-600">
                              E-mail
                            </label>
                            <input
                              id="edicao-rapida-email"
                              type="email"
                              value={formEdicaoCliente.email}
                              onChange={(e) => setFormEdicaoCliente((p) => ({ ...p, email: e.target.value }))}
                              className={inputEdicaoRapidaClass}
                              autoComplete="email"
                            />
                          </div>
                          <div>
                            <label htmlFor="edicao-rapida-doc" className="mb-1 block text-xs text-gray-600">
                              CPF / CNPJ
                            </label>
                            <input
                              id="edicao-rapida-doc"
                              type="text"
                              value={formEdicaoCliente.documento}
                              onChange={(e) => setFormEdicaoCliente((p) => ({ ...p, documento: e.target.value }))}
                              className={inputEdicaoRapidaClass}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label htmlFor="edicao-rapida-cidade" className="mb-1 block text-xs text-gray-600">
                              Cidade
                            </label>
                            <input
                              id="edicao-rapida-cidade"
                              type="text"
                              value={formEdicaoCliente.cidade}
                              onChange={(e) => setFormEdicaoCliente((p) => ({ ...p, cidade: e.target.value }))}
                              className={inputEdicaoRapidaClass}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
              <div className="flex flex-col gap-5">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold text-gray-900">Dados do aparelho</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Escolha o equipamento no catálogo e complete os detalhes da entrada.
                  </p>
                </div>

                <NovaOSSection
                  step={1}
                  title="Tipo e modelo"
                  description="Defina a categoria e selecione o aparelho no catálogo."
                  icon={<FiPackage className="text-amber-600" />}
                >
                  <div className="space-y-4">
                    <div className="relative isolate">
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Tipo de equipamento</label>
                      <EquipamentoSelector
                        empresaId={empresaData?.id || ''}
                        value={tipoEquipamentoSelecionado}
                        valueCodigo={dadosEquipamento.tipo}
                        onChange={handleTipoEquipamentoSelecionado}
                        placeholder="Ex: CELULAR, NOTEBOOK..."
                        className="w-full"
                      />
                    </div>
                    <div className="relative isolate">
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Aparelho</label>
                      <AparelhoSelector
                        empresaId={empresaData?.id || ''}
                        tipoSelecionado={tipoEquipamentoSelecionado}
                        marca={dadosEquipamento.marca}
                        modelo={dadosEquipamento.modelo}
                        value={aparelhoSelecionado}
                        onChange={handleAparelhoSelecionado}
                        readOnly={tipoEntrada === 'garantia' && !!osGarantiaSelecionada}
                        hidePreview
                        className="w-full"
                      />
                      {!identificacaoLiberada && tipoEquipamentoSelecionado && (
                        <button
                          type="button"
                          onClick={() => setIdentificacaoManual(true)}
                          className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Não encontrou? Preencher manualmente
                        </button>
                      )}
                    </div>
                  </div>
                </NovaOSSection>

                <NovaOSAparelhoPreview
                  imagemFrenteUrl={aparelhoImagemFrentePreview}
                  imagemVersoUrl={aparelhoImagemVersoPreview}
                  marca={dadosEquipamento.marca}
                  modelo={dadosEquipamento.modelo}
                  tipo={dadosEquipamento.tipo}
                  aparelhoSelecionado={aparelhoSelecionado}
                />

                <NovaOSSection
                  step={2}
                  title="Identificação"
                  description={
                    identificacaoLiberada
                      ? marcaModeloDoCatalogo
                        ? 'Marca e modelo vindos do catálogo.'
                        : 'Confira ou ajuste os dados do equipamento.'
                      : 'Selecione um aparelho acima para liberar.'
                  }
                  icon={<FiSmartphone className="text-blue-600" />}
                >
                  {!identificacaoLiberada ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
                      <FiSmartphone className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                      <p className="text-sm font-medium text-gray-600">Aguardando seleção</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(['marca', 'modelo', 'cor', 'numero_serie'] as const).map((field) => {
                        const labels = {
                          marca: 'Marca',
                          modelo: 'Modelo',
                          cor: 'Cor',
                          numero_serie: 'Nº de série',
                        };
                        const placeholders = {
                          marca: 'Apple, Samsung...',
                          modelo: 'iPhone 11, Galaxy...',
                          cor: 'Preto, Prata...',
                          numero_serie: 'Opcional',
                        };
                        const readOnlyGarantia = tipoEntrada === 'garantia' && !!osGarantiaSelecionada;
                        const readOnlyField =
                          (field === 'marca' || field === 'modelo') &&
                          (marcaModeloDoCatalogo || readOnlyGarantia);
                        const readOnly =
                          readOnlyField || (readOnlyGarantia && (field === 'cor' || field === 'numero_serie' || field === 'marca' || field === 'modelo'));

                        return (
                          <div key={field} className={field === 'numero_serie' ? 'sm:col-span-2' : ''}>
                            <label className="mb-1 block text-xs font-medium text-gray-600">{labels[field]}</label>
                            <input
                              type="text"
                              placeholder={placeholders[field]}
                              className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 ${
                                readOnlyField ? 'bg-gray-50 text-gray-600' : 'bg-white'
                              }`}
                              value={dadosEquipamento[field]}
                              onChange={(e) =>
                                setDadosEquipamento((prev) => ({
                                  ...prev,
                                  [field]: e.target.value.toUpperCase(),
                                }))
                              }
                              readOnly={readOnly}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </NovaOSSection>

                <NovaOSSection
                  step={3}
                  title="Problema relatado"
                  description="O que o cliente informou na recepção."
                >
                  <textarea
                    placeholder="Descreva o defeito ou solicitação..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm h-28 resize-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                    value={dadosEquipamento.descricao_problema}
                    onChange={(e) =>
                      setDadosEquipamento((prev) => ({
                        ...prev,
                        descricao_problema: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </NovaOSSection>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <NovaOSSection
                    step={4}
                    title="Acesso ao aparelho"
                    description="Senha, PIN ou padrão de desbloqueio."
                    icon={<FiKey className="text-slate-600" />}
                    optional
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Senha / PIN</label>
                        <div className="relative">
                          <input
                            type={mostrarSenha ? 'text' : 'password'}
                            placeholder="Ex: 1234"
                            autoComplete="off"
                            className="w-full rounded-lg border border-gray-200 py-2.5 pl-3 pr-10 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                            value={dadosEquipamento.senha}
                            onChange={(e) =>
                              setDadosEquipamento((prev) => ({ ...prev, senha: e.target.value }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarSenha((s) => !s)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-400 hover:text-gray-600"
                          >
                            {mostrarSenha ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex w-full flex-col items-center">
                        <label className="mb-2 w-full text-left text-xs font-medium text-gray-600">
                          Padrão Android
                        </label>
                        <PatternLock
                          onPatternComplete={(p) =>
                            setDadosEquipamento((prev) => ({ ...prev, senha_padrao: p }))
                          }
                          onPatternClear={() =>
                            setDadosEquipamento((prev) => ({ ...prev, senha_padrao: [] }))
                          }
                          value={dadosEquipamento.senha_padrao}
                          className="w-full max-w-[220px]"
                          showCoordinates={false}
                          centered
                        />
                      </div>
                      {(dadosEquipamento.senha || dadosEquipamento.senha_padrao.length > 0) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                          <FiCheckCircle className="h-3.5 w-3.5" /> Acesso registrado
                        </span>
                      )}
                    </div>
                  </NovaOSSection>

                  <NovaOSSection
                    step={5}
                    title="Itens que acompanham"
                    description="Acessórios e estado físico na entrega."
                    icon={<FiList className="text-amber-600" />}
                    optional
                  >
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Acessórios</label>
                        <textarea
                          placeholder="Carregador, cabo, capa..."
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                          rows={2}
                          value={acessorios}
                          onChange={(e) => setAcessorios(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Estado físico</label>
                        <textarea
                          placeholder="Riscos, amassados..."
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                          rows={2}
                          value={condicoesEquipamento}
                          onChange={(e) => setCondicoesEquipamento(e.target.value)}
                        />
                      </div>
                    </div>
                  </NovaOSSection>
                </div>
              </div>
            )}

            {etapaAtual === 3 && (
              <div className="w-full flex flex-col gap-5">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
                    <FiList className="text-blue-600" />
                    Checklist de entrada
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {dadosEquipamento.tipo
                      ? <>Checklist para <strong>{dadosEquipamento.tipo}</strong>. Para cada item testado, indique se <strong>funciona</strong> ou <strong>não funciona</strong>.</>
                      : 'Selecione o tipo de equipamento na etapa anterior para ver o checklist específico.'}
                  </p>
                </div>
                {dadosEquipamento.tipo ? (
                  <DynamicChecklist
                    equipamentoCategoria={tipoEquipamentoSelecionado?.codigo || dadosEquipamento.tipo}
                    tipoCatalogoId={tipoEquipamentoSelecionado?.catalogoId}
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
                      {termos.map((termo) => (
                        <option key={termo.id} value={termo.id}>
                          {termo.is_sistema ? `${termo.nome} (Modelo de exemplo)` : termo.nome}
                        </option>
                      ))}
                    </select>
                    {loadingTermos && <p className="text-xs text-gray-500 mt-1 text-left">Carregando termos...</p>}
                    {termos.length > 0 && termoSelecionado && !loadingTermos && (
                      <p className="text-xs text-green-600 mt-1 text-left">
                        Termo selecionado — use o padrão do sistema ou um personalizado
                      </p>
                    )}
                    {termos.length === 0 && !loadingTermos && (
                      <p className="text-xs text-gray-500 mt-1 text-left">
                        Carregando termos de garantia...
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
          </NovaOSWizardLayout>

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
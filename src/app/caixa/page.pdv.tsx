'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/Button';
import { SearchInput } from '@/components/SearchInput';
import { ProdutoCard } from '@/components/caixa/ProdutoCard';
import { Carrinho } from '@/components/caixa/Carrinho';
import { PagamentoModal } from '@/components/caixa/PagamentoModal';
import { PainelControles } from '@/components/caixa/PainelControles';
import { CupomVenda } from '@/components/caixa/CupomVenda';
import { OrcamentoModal } from '@/components/caixa/OrcamentoModal';
import { DevolucaoModal } from '@/components/caixa/DevolucaoModal';
import { SangriaSuprimentoModal } from '@/components/caixa/SangriaSuprimentoModal';
import { DescontoModal } from '@/components/caixa/DescontoModal';
import { AcrescimoModal } from '@/components/caixa/AcrescimoModal';
import { VendaParceladaModal } from '@/components/caixa/VendaParceladaModal';
import { useToast } from '@/components/Toast';
import { interceptSupabaseQuery } from '@/utils/supabaseInterceptor';
import { FiLock, FiUnlock, FiX, FiMinimize, FiMaximize } from 'react-icons/fi';

// Interfaces
interface Produto {
  id: string;
  nome: string;
  preco: number;
  categoria?: string;
  imagem_url?: string;
  codigo?: string;
  estoque_atual?: number;
  marca?: string;
  desconto?: number;
  acrescimo?: number;
}

interface ProdutoSupabase {
  id: string;
  nome: string;
  preco: number;
  categoria?: string;
  imagens_url?: string[];
  codigo?: string;
  estoque_atual?: number;
  marca?: string;
}

interface Cliente {
  id: string;
  nome: string;
  documento: string;
  telefone: string;
  celular: string;
  email: string;
  numero_cliente: string;
}

interface Turno {
  id: string;
  data_abertura: string;
  usuario: string;
  valor_inicial: number;
}

interface UltimoFechamento {
  data?: string;
  usuario?: string;
}

export default function CaixaPage() {
  const router = useRouter();
  // Isola temporariamente a página do PDV
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return null;

  const { addToast } = useToast();
  
  // Estados principais
  const [usuarioData, setUsuarioData] = useState<any>(null);
  const [turnoAtual, setTurnoAtual] = useState<Turno | null>(null);
  const [ultimoFechamento, setUltimoFechamento] = useState<UltimoFechamento | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cart, setCart] = useState<(Produto & { qty: number })[]>([]);
  const [orderType, setOrderType] = useState('Local');
  const [paymentType, setPaymentType] = useState('Dinheiro');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingTurno, setLoadingTurno] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const pdvRef = React.useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para seleção de cliente
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [searchCliente, setSearchCliente] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const clienteSearchRef = React.useRef<HTMLDivElement>(null);

  // Estados para modais
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false);
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false);
  const [modalSangria, setModalSangria] = useState(false);
  const [modalSuprimento, setModalSuprimento] = useState(false);
  const [modalMovimentacoes, setModalMovimentacoes] = useState(false);
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalCupom, setModalCupom] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState<any>(null);
  const [modalDesconto, setModalDesconto] = useState(false);
  const [modalAcrescimo, setModalAcrescimo] = useState(false);
  const [descontoItemId, setDescontoItemId] = useState<string | null>(null);
  const [acrescimoItemId, setAcrescimoItemId] = useState<string | null>(null);
  const [descontoVenda, setDescontoVenda] = useState<number>(0);
  const [acrescimoVenda, setAcrescimoVenda] = useState<number>(0);
  const [modalVendaParcelada, setModalVendaParcelada] = useState(false);
  const [vendaParcelada, setVendaParcelada] = useState<{
    parcelas: number;
    valorParcela: number;
    formaPagamento: string;
  } | null>(null);
  const [modalOrcamento, setModalOrcamento] = useState(false);
  const [modalDevolucao, setModalDevolucao] = useState(false);
  const [modalSangriaSuprimento, setModalSangriaSuprimento] = useState(false);
  const [tipoSangriaSuprimento, setTipoSangriaSuprimento] = useState<'sangria' | 'suprimento'>('sangria');
  
  // Estados para o novo modal unificado
  const [modalFinalizarVenda, setModalFinalizarVenda] = useState(false);
  const [vendedorSelecionado, setVendedorSelecionado] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [mostrarPainelControles, setMostrarPainelControles] = useState(true);
  const [itemSelecionado, setItemSelecionado] = useState<any>(null);

  // Estados para formulários
  const [valorInicial, setValorInicial] = useState('');
  const [valorSangria, setValorSangria] = useState('');
  const [valorSuprimento, setValorSuprimento] = useState('');
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteDocumento, setNovoClienteDocumento] = useState('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');

  // Buscar vendedores quando o componente carregar
  useEffect(() => {
    if (usuarioData?.empresa_id) {
      fetchVendedores();
    }
  }, [usuarioData?.empresa_id]);

  // Controlar hidratação para evitar mismatch
  React.useLayoutEffect(() => {
    setIsHydrated(true);
    updateTime();
    
    // Atualizar tempo a cada segundo
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const updateTime = () => {
    const now = new Date();
    setCurrentTime(`${now.toLocaleDateString('pt-BR')} - ${now.toLocaleTimeString('pt-BR')}`);
  };

  // Fechar dropdown quando clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clienteSearchRef.current && !clienteSearchRef.current.contains(event.target as Node)) {
        setShowClienteDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Entrar automaticamente em tela cheia quando a página carregar
  React.useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
      }
    } catch (error) {
        console.log('Não foi possível entrar em tela cheia:', error);
      }
    };

    // Pequeno delay para garantir que a página carregou completamente
    const timer = setTimeout(enterFullscreen, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Listener para detectar mudanças no fullscreen
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Atalho ESC para sair da página
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('Tecla pressionada:', event.key, 'Code:', event.code);
      
      // Verificar tanto 'Escape' quanto 'Esc' para compatibilidade
      if (event.key === 'Escape' || event.key === 'Esc' || event.code === 'Escape') {
        console.log('ESC detectado, saindo da tela cheia...');
        event.preventDefault();
        event.stopPropagation();
        
        // Função para sair e redirecionar
        const exitAndRedirect = async () => {
          try {
            // Verificar se estamos em fullscreen
            if (document.fullscreenElement) {
              console.log('Saindo da tela cheia...');
              if (document.exitFullscreen) {
                await document.exitFullscreen();
                console.log('Saiu da tela cheia com sucesso');
              }
            }
            
            // Pequeno delay antes de redirecionar
            setTimeout(() => {
              console.log('Redirecionando para dashboard...');
              window.location.href = '/dashboard';
            }, 100);
            
    } catch (error) {
            console.log('Erro ao sair da tela cheia:', error);
            // Mesmo assim, redirecionar
            window.location.href = '/dashboard';
          }
        };
        
        exitAndRedirect();
      }
    };

    // Adicionar listener em múltiplas formas para garantir compatibilidade
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    
    console.log('Listeners ESC adicionados');
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      console.log('Listeners ESC removidos');
    };
  }, []);

  // Buscar clientes
  const buscarClientes = async (search = '') => {
      if (!usuarioData?.empresa_id) return;
      
    setLoadingClientes(true);
    try {
      const { data, error } = await interceptSupabaseQuery('clientes', async () => {
        return await supabase
          .from('clientes')
          .select('id, nome, documento, telefone, celular, email, numero_cliente')
          .eq('empresa_id', usuarioData.empresa_id)
          .ilike('nome', `%${search}%`)
          .limit(10);
      });
      
      if (error && error.code === 'TABLE_NOT_EXISTS') {
        setClientes([]);
      } else if (error) {
        console.error('Erro ao buscar clientes:', error.message || 'Erro desconhecido');
        setClientes([]);
      } else {
        setClientes(data || []);
      }
      } catch (err) {
        console.error('Erro ao buscar clientes:', err instanceof Error ? err.message : 'Erro desconhecido');
        setClientes([]);
      } finally {
      setLoadingClientes(false);
    }
  };

  // Buscar dados do usuário
  useEffect(() => {
    async function fetchUserData() {
      console.log('🔍 PDV: Iniciando busca de dados do usuário...');
      setLoadingUser(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('🔍 PDV: Usuário autenticado:', user);
        
        if (user) {
          const { data: usuario } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', user.id)
            .single();
          
          console.log('🔍 PDV: Dados do usuário:', usuario);
          
          if (usuario) {
            setUsuarioData(usuario);
            console.log('✅ Usuário carregado:', usuario);
          } else {
            console.log('⚠️ Usuário não encontrado na tabela usuarios');
          }
        } else {
          console.log('⚠️ Nenhum usuário autenticado');
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error.message || 'Erro desconhecido');
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUserData();
  }, []);

  // Buscar produtos
  useEffect(() => {
    async function fetchProdutos() {
      setLoading(true);
      console.log('🔍 PDV: Iniciando busca de produtos...');
      console.log('🔍 PDV: usuarioData:', usuarioData);
      console.log('🔍 PDV: empresa_id:', usuarioData?.empresa_id);
      
      if (!usuarioData?.empresa_id) {
        console.log('⚠️ PDV: Empresa ID não encontrado, não buscando produtos');
        setProdutos([]);
        setLoading(false);
        return;
      }
      
      console.log('🔍 PDV: Buscando produtos para empresa:', usuarioData.empresa_id);
      
      // Usar a mesma API que a página de equipamentos usa
      const url = `/api/produtos-servicos/listar?empresaId=${encodeURIComponent(usuarioData.empresa_id)}&tipo=produto`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      
      console.log('🔍 PDV: Resultado da busca:', { data, error: null });
      
      if (data && Array.isArray(data)) {
        console.log('✅ PDV: Produtos encontrados:', data.length);
        
        // Filtrar produtos ativos e do tipo produto no JavaScript
        const produtosFiltrados = data.filter((p: any) => 
          p.ativo === true && p.tipo === 'produto'
        );
        
        const produtosMapeados = produtosFiltrados?.map((p: ProdutoSupabase) => ({
          ...p,
          imagem_url: Array.isArray(p.imagens_url) && p.imagens_url.length > 0 ? p.imagens_url[0] : undefined,
          codigo: p.codigo,
          estoque_atual: p.estoque_atual,
          marca: p.marca
        }));
        
        // Ordenar por nome após o mapeamento
        produtosMapeados.sort((a, b) => a.nome.localeCompare(b.nome));
        
        console.log('✅ PDV: Produtos mapeados:', produtosMapeados);
        setProdutos(produtosMapeados);
      } else {
        console.log('⚠️ PDV: Nenhum dado retornado ou formato inválido');
        setProdutos([]);
      }
      setLoading(false);
    }
    fetchProdutos();
  }, [usuarioData?.empresa_id]);

  // Buscar turno atual
  useEffect(() => {
    async function fetchTurnoAtual() {
      if (!usuarioData?.empresa_id) return;
      
      setLoadingTurno(true);
      
      // Garantir tempo mínimo de loading para evitar flash
      const startTime = Date.now();
      const minLoadingTime = 1000; // 1 segundo mínimo
      
      try {
        const { data, error } = await interceptSupabaseQuery('turnos_caixa', async () => {
          return await supabase
            .from('turnos_caixa')
            .select('*')
      .eq('empresa_id', usuarioData.empresa_id)
            .is('data_fechamento', null)
            .order('data_abertura', { ascending: false })
            .limit(1)
            .single();
        });

        if (error && error.code === 'TABLE_NOT_EXISTS') {
          setTurnoAtual(null);
        } else if (error && error.code !== 'PGRST116') {
          console.error('Erro ao buscar turno atual:', error.message || 'Erro desconhecido');
          setTurnoAtual(null);
        } else {
          setTurnoAtual(data);
        }
      } catch (err) {
        console.error('Erro ao buscar turno atual:', err instanceof Error ? err.message : 'Erro desconhecido');
        setTurnoAtual(null);
      }
      
      // Aguardar tempo mínimo se necessário
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      setLoadingTurno(false);
    }
    fetchTurnoAtual();
  }, [usuarioData?.empresa_id]);

  // Buscar último fechamento - TEMPORARIAMENTE DESABILITADO
  // useEffect(() => {
  //   async function fetchUltimoFechamento() {
  //     if (!usuarioData?.empresa_id) return;
      
  //     try {
  //       const { data, error } = await interceptSupabaseQuery('turnos_caixa', async () => {
  //         return await supabase
  //           .from('turnos_caixa')
  //           .select('data_fechamento, usuario')
  //           .eq('empresa_id', usuarioData.empresa_id)
  //           .not('data_fechamento', 'is', null)
  //           .order('data_fechamento', { ascending: false })
  //           .limit(1)
  //           .single();
  //       });

  //       if (error && error.code === 'TABLE_NOT_EXISTS') {
  //         setUltimoFechamento(null);
  //       } else if (error && error.code !== 'PGRST116') {
  //         console.log('⚠️ Erro ao buscar último fechamento:', error.message || 'Erro desconhecido');
  //         setUltimoFechamento(null);
  //       } else {
  //         setUltimoFechamento(data);
  //       }
  //     } catch (err) {
  //       console.log('⚠️ Erro ao buscar último fechamento:', err instanceof Error ? err.message : 'Erro desconhecido');
  //       setUltimoFechamento(null);
  //     }
  //   }
  //   fetchUltimoFechamento();
  // }, [usuarioData?.empresa_id]);

  // Filtrar produtos
  const produtosExibidos = produtos.filter(produto => {
    const matchesSearch = !searchTerm || 
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo?.includes(searchTerm);
    
    const matchesCategory = selectedCategory === 'Todos' || produto.categoria === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Obter categorias únicas
  const categoriasUnicas = ['Todos', ...Array.from(new Set(produtos.map(p => p.categoria).filter(Boolean)))];

  // Funções do carrinho
  const addToCart = (produto: Produto) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === produto.id);
      if (existing) {
        return prev.map(item => 
          item.id === produto.id 
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prev, { ...produto, qty: 1 }];
    });
    addToast('success', `${produto.nome} adicionado ao carrinho!`);
  };

  const changeQty = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, qty } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.preco * item.qty), 0);

  // Funções de cliente
  const handleSearchCliente = (value: string) => {
    setSearchCliente(value);
    if (value.length >= 2) {
      buscarClientes(value);
      setShowClienteDropdown(true);
    } else {
      setShowClienteDropdown(false);
    }
  };

  const selecionarCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setSearchCliente(cliente.nome);
    setShowClienteDropdown(false);
  };

  const cadastrarCliente = async () => {
    if (!novoClienteNome.trim()) {
      addToast('error', 'Nome do cliente é obrigatório');
      return;
    }

    setSalvandoCliente(true);
    try {
      const { data, error } = await interceptSupabaseQuery('clientes', async () => {
        return await supabase
          .from('clientes')
          .insert({
            nome: novoClienteNome.trim(),
            documento: novoClienteDocumento.trim() || '',
            telefone: novoClienteTelefone.trim() || '',
            celular: novoClienteTelefone.trim() || '',
            email: '',
            numero_cliente: '',
            empresa_id: usuarioData.empresa_id
          })
          .select()
          .single();
      });

    if (error) {
        addToast('error', 'Erro ao cadastrar cliente: ' + error.message);
      return;
    }

      const novoCliente = data as Cliente;
      setClienteSelecionado(novoCliente);
      setSearchCliente(novoCliente.nome);
      setModalNovoCliente(false);
      setNovoClienteNome('');
      setNovoClienteDocumento('');
      setNovoClienteTelefone('');
      addToast('success', 'Cliente cadastrado com sucesso!');
    } catch (err) {
      console.error('Erro ao cadastrar cliente:', err instanceof Error ? err.message : 'Erro desconhecido');
      addToast('error', 'Erro inesperado ao cadastrar cliente');
    } finally {
      setSalvandoCliente(false);
    }
  };

  // Funções do caixa
  const abrirCaixa = async () => {
    if (!valorInicial || isNaN(Number(valorInicial))) {
      addToast('error', 'Valor inicial inválido');
      return;
    }

    try {
      const { data, error } = await interceptSupabaseQuery('turnos_caixa', async () => {
        return await supabase
          .from('turnos_caixa')
          .insert({
            empresa_id: usuarioData.empresa_id,
            usuario_id: usuarioData.id,
            valor_inicial: Number(valorInicial),
            data_abertura: new Date().toISOString()
          })
          .select()
          .single();
      });

      if (error) {
        addToast('error', 'Erro ao abrir caixa: ' + error.message);
        return;
      }

      setTurnoAtual(data);
      setModalAbrirCaixa(false);
      setValorInicial('');
      addToast('success', 'Caixa aberto com sucesso!');
    } catch (err) {
      console.error('Erro ao abrir caixa:', err instanceof Error ? err.message : 'Erro desconhecido');
      addToast('error', 'Erro inesperado ao abrir caixa');
    }
  };

  const fecharCaixa = async () => {
    if (!turnoAtual) return;
    
    try {
      const { error } = await interceptSupabaseQuery('turnos_caixa', async () => {
        return await supabase
          .from('turnos_caixa')
          .update({
            data_fechamento: new Date().toISOString(),
            valor_final: total
          })
          .eq('id', turnoAtual.id);
      });

    if (error) {
        addToast('error', 'Erro ao fechar caixa: ' + error.message);
      return;
    }

      setTurnoAtual(null);
      setModalFecharCaixa(false);
      addToast('success', 'Caixa fechado com sucesso!');
    } catch (err) {
      console.error('Erro ao fechar caixa:', err instanceof Error ? err.message : 'Erro desconhecido');
      addToast('error', 'Erro inesperado ao fechar caixa');
    }
  };

  // Função para calcular total com desconto e acréscimo
  const calcularTotal = () => {
    const subtotal = cart.reduce((acc, item) => {
      const itemSubtotal = item.preco * item.qty;
      const itemDesconto = (item.desconto || 0) * item.qty;
      const itemAcrescimo = (item.acrescimo || 0) * item.qty;
      return acc + itemSubtotal - itemDesconto + itemAcrescimo;
    }, 0);
    
    return subtotal - descontoVenda + acrescimoVenda;
  };

  // Funções para desconto e acréscimo
  const aplicarDescontoItem = (itemId: string) => {
    const item = cart.find(item => item.id === itemId);
    if (!item) return;
    
    setDescontoItemId(itemId);
    setModalDesconto(true);
  };

  const aplicarAcrescimoItem = (itemId: string) => {
    const item = cart.find(item => item.id === itemId);
    if (!item) return;
    
    setAcrescimoItemId(itemId);
    setModalAcrescimo(true);
  };

  const aplicarDescontoVenda = () => {
    setDescontoItemId(null);
    setModalDesconto(true);
  };

  const aplicarAcrescimoVenda = () => {
    setAcrescimoItemId(null);
    setModalAcrescimo(true);
  };

  const confirmarDesconto = (tipo: 'percentual' | 'valor', valor: number) => {
    if (descontoItemId) {
      // Desconto em item específico
      setCart(prevCart => 
        prevCart.map(item => 
          item.id === descontoItemId 
            ? { 
                ...item, 
                desconto: tipo === 'percentual' ? (item.preco * valor) / 100 : valor 
              }
            : item
        )
      );
      addToast('success', 'Desconto aplicado no item');
    } else {
      // Desconto na venda toda
      setDescontoVenda(tipo === 'percentual' ? (calcularTotal() * valor) / 100 : valor);
      addToast('success', 'Desconto aplicado na venda');
    }
    
    setModalDesconto(false);
    setDescontoItemId(null);
  };

  const confirmarAcrescimo = (tipo: 'percentual' | 'valor', valor: number) => {
    if (acrescimoItemId) {
      // Acréscimo em item específico
      setCart(prevCart => 
        prevCart.map(item => 
          item.id === acrescimoItemId 
            ? { 
                ...item, 
                acrescimo: tipo === 'percentual' ? (item.preco * valor) / 100 : valor 
              }
            : item
        )
      );
      addToast('success', 'Acréscimo aplicado no item');
    } else {
      // Acréscimo na venda toda
      setAcrescimoVenda(tipo === 'percentual' ? (calcularTotal() * valor) / 100 : valor);
      addToast('success', 'Acréscimo aplicado na venda');
    }
    
    setModalAcrescimo(false);
    setAcrescimoItemId(null);
  };

  // Funções para venda parcelada
  const abrirVendaParcelada = () => {
    setModalVendaParcelada(true);
  };

  const confirmarVendaParcelada = (parcelas: number, valorParcela: number, formaPagamento: string) => {
    setVendaParcelada({ parcelas, valorParcela, formaPagamento });
    setModalVendaParcelada(false);
    
    // Fechar modal de pagamento e processar venda parcelada
    setModalPagamento(false);
    processarVendaParcelada(formaPagamento, parcelas, valorParcela);
  };

  const processarVendaParcelada = async (formaPagamento: string, parcelas: number, valorParcela: number) => {
    try {
      const { data, error } = await interceptSupabaseQuery('vendas', async () => {
        return await supabase
          .from('vendas')
          .insert({
            empresa_id: usuarioData.empresa_id,
            usuario_id: usuarioData.id,
            vendedor_id: vendedorSelecionado?.id || usuarioData.id,
      cliente_id: clienteSelecionado?.id || null,
      produtos: cart.map(item => ({
        id: item.id,
        nome: item.nome,
        preco: item.preco,
              quantidade: item.qty,
              desconto: item.desconto || 0,
              acrescimo: item.acrescimo || 0,
              subtotal: (item.preco * item.qty) - ((item.desconto || 0) * item.qty) + ((item.acrescimo || 0) * item.qty)
            })),
            total: calcularTotal(),
            desconto_total: descontoVenda,
            acrescimo_total: acrescimoVenda,
            forma_pagamento: `${formaPagamento} - ${parcelas}x de R$ ${valorParcela.toFixed(2)}`,
      tipo_pedido: orderType,
      status: 'finalizada',
            observacoes: `Venda parcelada em ${parcelas} parcelas de R$ ${valorParcela.toFixed(2)}`,
            parcelas: parcelas,
            valor_parcela: valorParcela
          })
          .select()
          .single();
      });

      if (error) {
        console.error('Erro ao finalizar venda parcelada:', error.message || 'Erro desconhecido');
        addToast('error', 'Erro ao finalizar venda parcelada: ' + (error.message || 'Erro desconhecido'));
        return;
      }

      // Preparar dados para o cupom
      const dadosVenda = {
        id: data.id,
        numero_venda: data.numero_venda,
        cliente: clienteSelecionado,
        items: cart,
        total: calcularTotal(),
        desconto: descontoVenda,
        acrescimo: acrescimoVenda,
        forma_pagamento: `${formaPagamento} - ${parcelas}x de R$ ${valorParcela.toFixed(2)}`,
        tipo_pedido: orderType,
      data_venda: new Date().toISOString(),
        usuario: usuarioData.nome,
        parcelas: parcelas,
        valor_parcela: valorParcela
      };

      setVendaFinalizada(dadosVenda);
      setModalCupom(true);
      
      // Limpar carrinho
      setCart([]);
      setClienteSelecionado(null);
      setDescontoVenda(0);
      setAcrescimoVenda(0);
      setVendaParcelada(null);
      
      addToast('success', `Venda parcelada finalizada! ${parcelas}x de R$ ${valorParcela.toFixed(2)}`);
    } catch (err) {
      console.error('Erro ao finalizar venda parcelada:', err instanceof Error ? err.message : 'Erro desconhecido');
      addToast('error', 'Erro inesperado ao finalizar venda parcelada');
    }
  };

  // Funções para orçamento/pré-venda
  const abrirOrcamento = () => {
    if (cart.length === 0) {
      addToast('error', 'Adicione produtos ao carrinho');
      return;
    }
    setModalOrcamento(true);
  };

  const confirmarOrcamento = async (orcamento: {
    validade: number;
    observacoes: string;
    tipo: 'orcamento' | 'pre_venda';
  }) => {
    try {
      const { data, error } = await interceptSupabaseQuery('orcamentos', async () => {
        return await supabase
          .from('orcamentos')
          .insert({
            empresa_id: usuarioData.empresa_id,
            usuario_id: usuarioData.id,
            vendedor_id: vendedorSelecionado?.id || usuarioData.id,
            cliente_id: clienteSelecionado?.id || null,
            produtos: cart.map(item => ({
              id: item.id,
              nome: item.nome,
              preco: item.preco,
              quantidade: item.qty,
              desconto: item.desconto || 0,
              acrescimo: item.acrescimo || 0,
              subtotal: (item.preco * item.qty) - ((item.desconto || 0) * item.qty) + ((item.acrescimo || 0) * item.qty)
            })),
            total: calcularTotal(),
            desconto_total: descontoVenda,
            acrescimo_total: acrescimoVenda,
            tipo: orcamento.tipo,
            validade_dias: orcamento.validade,
            data_validade: new Date(Date.now() + orcamento.validade * 24 * 60 * 60 * 1000).toISOString(),
            observacoes: orcamento.observacoes,
            status: 'pendente'
          })
          .select()
          .single();
      });

      if (error) {
        console.error('Erro ao gerar orçamento:', error.message || 'Erro desconhecido');
        addToast('error', 'Erro ao gerar orçamento: ' + (error.message || 'Erro desconhecido'));
      return;
    }

      addToast('success', `${orcamento.tipo === 'orcamento' ? 'Orçamento' : 'Pré-venda'} gerado com sucesso!`);
      
      // Limpar carrinho
    setCart([]);
    setClienteSelecionado(null);
      setDescontoVenda(0);
      setAcrescimoVenda(0);
      
      setModalOrcamento(false);
    } catch (err) {
      console.error('Erro ao gerar orçamento:', err instanceof Error ? err.message : 'Erro desconhecido');
      addToast('error', 'Erro inesperado ao gerar orçamento');
    }
  };

  // Funções para devolução
  const abrirDevolucao = () => {
    setModalDevolucao(true);
  };

  const confirmarDevolucao = async (devolucao: {
    vendaId: string;
    produtos: Array<{
      id: string;
      nome: string;
      quantidade: number;
      motivo: string;
    }>;
    observacoes: string;
  }) => {
    try {
      const { data, error } = await interceptSupabaseQuery('devolucoes', async () => {
        return await supabase
          .from('devolucoes')
          .insert({
            empresa_id: usuarioData.empresa_id,
            usuario_id: usuarioData.id,
            venda_id: devolucao.vendaId,
            produtos: devolucao.produtos,
            observacoes: devolucao.observacoes,
            status: 'processada',
            data_devolucao: new Date().toISOString()
          })
          .select()
          .single();
      });

      if (error) {
        console.error('Erro ao processar devolução:', error.message || 'Erro desconhecido');
        addToast('error', 'Erro ao processar devolução: ' + (error.message || 'Erro desconhecido'));
      return;
    }

      addToast('success', 'Devolução processada com sucesso!');
      setModalDevolucao(false);
    } catch (err) {
      console.error('Erro ao processar devolução:', err instanceof Error ? err.message : 'Erro desconhecido');
      addToast('error', 'Erro inesperado ao processar devolução');
    }
  };

  // Funções para sangria e suprimento
  const abrirSangria = () => {
    setTipoSangriaSuprimento('sangria');
    setModalSangriaSuprimento(true);
  };

  const abrirSuprimento = () => {
    setTipoSangriaSuprimento('suprimento');
    setModalSangriaSuprimento(true);
  };

  const confirmarSangriaSuprimento = async (valor: number, observacoes: string, tipo: 'sangria' | 'suprimento') => {
    try {
      const { data, error } = await interceptSupabaseQuery('movimentacoes_caixa', async () => {
        return await supabase
          .from('movimentacoes_caixa')
          .insert({
            empresa_id: usuarioData.empresa_id,
            usuario_id: usuarioData.id,
            turno_id: turnoAtual?.id,
            tipo: tipo,
            valor: valor,
            observacoes: observacoes,
            data_movimentacao: new Date().toISOString()
          })
          .select()
          .single();
      });

      if (error) {
        console.error(`Erro ao processar ${tipo}:`, error.message || 'Erro desconhecido');
        addToast('error', `Erro ao processar ${tipo}: ` + (error.message || 'Erro desconhecido'));
      return;
    }

      addToast('success', `${tipo === 'sangria' ? 'Sangria' : 'Suprimento'} processado com sucesso!`);
      setModalSangriaSuprimento(false);
      
      // Atualizar dados do turno se necessário
      // fetchTurnoAtual();
    } catch (err) {
      console.error(`Erro ao processar ${tipo}:`, err instanceof Error ? err.message : 'Erro desconhecido');
      addToast('error', `Erro inesperado ao processar ${tipo}`);
    }
  };

  // Função para buscar vendedores
  const fetchVendedores = async () => {
    try {
      const { data, error } = await interceptSupabaseQuery('usuarios', async () => {
        return await supabase
          .from('usuarios')
          .select('id, nome, email, funcao')
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('ativo', true)
          .in('funcao', ['vendedor', 'gerente', 'admin']);
      });

      if (error) {
        console.error('Erro ao buscar vendedores:', error.message || 'Erro desconhecido');
        return;
      }

      setVendedores(data || []);
    } catch (err) {
      console.error('Erro ao buscar vendedores:', err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  // Funções simplificadas para o painel de controles
  const aplicarDescontoRapido = (tipo: 'percentual' | 'valor', valor: number, itemId?: string) => {
    if (itemId) {
      // Desconto em item específico
      setCart(prevCart => 
        prevCart.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                desconto: tipo === 'percentual' ? (item.preco * valor) / 100 : valor 
              }
            : item
        )
      );
      addToast('success', 'Desconto aplicado no item');
    } else {
      // Desconto na venda toda
      setDescontoVenda(tipo === 'percentual' ? (calcularTotal() * valor) / 100 : valor);
      addToast('success', 'Desconto aplicado na venda');
    }
  };

  const aplicarAcrescimoRapido = (tipo: 'percentual' | 'valor', valor: number, itemId?: string) => {
    if (itemId) {
      // Acréscimo em item específico
      setCart(prevCart => 
        prevCart.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                acrescimo: tipo === 'percentual' ? (item.preco * valor) / 100 : valor 
              }
            : item
        )
      );
      addToast('success', 'Acréscimo aplicado no item');
    } else {
      // Acréscimo na venda toda
      setAcrescimoVenda(tipo === 'percentual' ? (calcularTotal() * valor) / 100 : valor);
      addToast('success', 'Acréscimo aplicado na venda');
    }
  };

  const parcelarRapido = (parcelas: number, formaPagamento: string) => {
    const valorParcela = calcularTotal() / parcelas;
    confirmarVendaParcelada(parcelas, valorParcela, formaPagamento);
  };

  const gerarOrcamentoRapido = (tipo: 'orcamento' | 'pre_venda', validade: number, observacoes: string) => {
    confirmarOrcamento({ validade, observacoes, tipo });
  };

  const sangriaRapida = (valor: number, observacoes: string) => {
    confirmarSangriaSuprimento(valor, observacoes, 'sangria');
  };

  const suprimentoRapido = (valor: number, observacoes: string) => {
    confirmarSangriaSuprimento(valor, observacoes, 'suprimento');
  };

  const finalizarVenda = async () => {
    if (cart.length === 0) {
      addToast('error', 'Adicione produtos ao carrinho');
      return;
    }

    if (!turnoAtual) {
      addToast('error', 'Abra o caixa antes de finalizar a venda');
      return;
    }

    // Abrir modal unificado de finalização
    setModalFinalizarVenda(true);
  };

  const handleFinalizarVenda = async (dadosVenda: any) => {
    try {
      // Aqui você implementaria a lógica de finalização da venda
      // usando os dados do modal unificado
      console.log('Finalizando venda com dados:', dadosVenda);
      
      // Por enquanto, apenas fechar o modal
      setModalFinalizarVenda(false);
      addToast('success', 'Venda finalizada com sucesso!');
      
      // Limpar carrinho
      setCart([]);
      
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      addToast('error', 'Erro ao finalizar venda');
    }
  };

  const confirmarVenda = async (formaPagamento: string, valorPago?: number) => {
    try {
      const { data, error } = await interceptSupabaseQuery('vendas', async () => {
        return await supabase
          .from('vendas')
          .insert({
            empresa_id: usuarioData.empresa_id,
            cliente_id: clienteSelecionado?.id || null,
            turno_id: turnoAtual.id,
            tipo_pedido: orderType,
            forma_pagamento: formaPagamento,
            total: total,
            produtos: cart.map(item => ({
              produto_id: item.id,
              quantidade: item.qty,
              preco_unitario: item.preco,
              subtotal: item.preco * item.qty
            }))
          })
          .select()
          .single();
      });

      if (error) {
        addToast('error', 'Erro ao finalizar venda: ' + error.message);
      return;
    }

      // Preparar dados da venda para o cupom
      const dadosVenda = {
        id: data.id,
        numero_venda: data.numero_venda,
        cliente: clienteSelecionado ? {
          nome: clienteSelecionado.nome,
          documento: clienteSelecionado.documento
        } : null,
        items: cart,
        total: total,
        desconto: 0,
        acrescimo: 0,
        forma_pagamento: formaPagamento,
        tipo_pedido: orderType,
        data_venda: data.data_venda || new Date().toISOString(),
        usuario: usuarioData?.nome || 'Sistema'
      };

      // Salvar dados da venda e abrir modal de cupom
      setVendaFinalizada(dadosVenda);
      setModalCupom(true);

    setCart([]);
    setClienteSelecionado(null);
      setSearchCliente('');
      addToast('success', 'Venda finalizada com sucesso!');
    } catch (err) {
      console.error('Erro ao finalizar venda:', err instanceof Error ? err.message : 'Erro desconhecido');
      addToast('error', 'Erro inesperado ao finalizar venda');
    }
  };

  const imprimirCupom = () => {
    if (!vendaFinalizada) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const subtotal = vendaFinalizada.items.reduce((acc, item) => acc + (item.preco * item.qty), 0);
      const totalFinal = subtotal + (vendaFinalizada.acrescimo || 0) - (vendaFinalizada.desconto || 0);
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Cupom Fiscal</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                margin: 0; 
                padding: 10px;
                width: 300px;
                line-height: 1.2;
              }
              .cupom { 
                width: 100%;
                max-width: 300px;
                margin: 0 auto;
                background: white;
                color: black;
              }
              .header {
                text-align: center;
                border-bottom: 1px dashed #666;
                padding-bottom: 8px;
                margin-bottom: 8px;
              }
              .company-name {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 4px;
              }
              .cupom-title {
                font-size: 10px;
                margin-bottom: 2px;
              }
              .date-info {
                font-size: 10px;
                margin-bottom: 2px;
              }
              .venda-number {
                font-size: 10px;
              }
              .cliente-section {
                margin-bottom: 8px;
                font-size: 10px;
              }
              .tipo-pedido {
                margin-bottom: 8px;
                font-size: 10px;
              }
              .separator {
                border-bottom: 1px dashed #666;
                margin: 8px 0;
              }
              .products-header {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 10px;
                margin-bottom: 4px;
              }
              .product-item {
                margin-bottom: 4px;
                font-size: 10px;
              }
              .product-name {
                margin-bottom: 2px;
                word-wrap: break-word;
              }
              .product-details {
                display: flex;
                justify-content: space-between;
              }
              .totals-section {
                margin-bottom: 8px;
                font-size: 10px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
              }
              .total-final {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 14px;
                border-top: 1px solid #666;
                padding-top: 4px;
                margin-top: 4px;
              }
              .payment-section {
                margin-bottom: 8px;
                font-size: 10px;
              }
              .payment-row {
                display: flex;
                justify-content: space-between;
              }
              .footer {
                text-align: center;
                font-size: 10px;
              }
              .footer-message {
                margin-bottom: 4px;
              }
              .footer-brand {
                margin-top: 8px;
                font-weight: bold;
              }
              .footer-website {
                font-size: 9px;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .cupom { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="cupom">
              <!-- Cabeçalho -->
              <div class="header">
                <h1 class="company-name">EMPRESA TESTE</h1>
                <p class="cupom-title">CUPOM FISCAL NÃO FISCAL</p>
                <p class="date-info">${new Date(vendaFinalizada.data_venda).toLocaleDateString('pt-BR')}</p>
                <p class="venda-number">Venda #${vendaFinalizada.numero_venda || vendaFinalizada.id.slice(-6)}</p>
            </div>

              <!-- Informações da empresa -->
              <div class="cliente-section">
                <p>RUA DE TESTE 123, LOJA 1</p>
                <p>CIDADE DA EMPRESA DE TESTE</p>
                <p>CNPJ: 12.123.123/0001-23</p>
                <p>Tel: (12) 11232-1223</p>
                <p>empresateste@gmail.com</p>
          </div>

              <div class="separator"></div>

              <!-- Informações da venda -->
              <div class="cliente-section">
                <p><strong>Pedido Venda:</strong> ${vendaFinalizada.numero_venda || vendaFinalizada.id.slice(-6)}</p>
                <p><strong>Data:</strong> ${new Date(vendaFinalizada.data_venda).toLocaleDateString('pt-BR')}</p>
                <p><strong>Colaborador:</strong> ${vendaFinalizada.usuario || 'Sistema'}</p>
                <p><strong>Tipo:</strong> ${vendaFinalizada.tipo_pedido}</p>
        </div>

              <!-- Cliente -->
              ${vendaFinalizada.cliente ? `
                <div class="cliente-section">
                  <p><strong>Cliente:</strong> ${vendaFinalizada.cliente.nome}</p>
                  <p><strong>CPF/CNPJ:</strong> ${vendaFinalizada.cliente.documento || 'N/A'}</p>
      </div>
              ` : `
                <div class="cliente-section">
                  <p><strong>Cliente:</strong> Consumidor Final</p>
      </div>
              `}

              <div class="separator"></div>

              <!-- Produtos -->
              <div>
                <div class="products-header">
                  <span>ITEM</span>
                  <span>QTD</span>
                  <span>VALOR</span>
                </div>
                
                ${vendaFinalizada.items.map((item) => `
                  <div class="product-item">
                    <div class="product-name">${item.nome}</div>
                    <div class="product-details">
                      <span>${item.qty} x R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
                      <span>R$ ${(item.preco * item.qty).toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                `).join('')}
              </div>

              <div class="separator"></div>

              <!-- Totais -->
              <div class="totals-section">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                ${(vendaFinalizada.desconto || 0) > 0 ? `
                  <div class="total-row">
                    <span>Desconto:</span>
                    <span>- R$ ${(vendaFinalizada.desconto || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                ` : ''}
                ${(vendaFinalizada.acrescimo || 0) > 0 ? `
                  <div class="total-row">
                    <span>Acréscimo:</span>
                    <span>+ R$ ${(vendaFinalizada.acrescimo || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                ` : ''}
                <div class="total-final">
                  <span>TOTAL:</span>
                  <span>R$ ${totalFinal.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <!-- Forma de pagamento -->
              <div class="payment-section">
                <div class="payment-row">
                  <span>Pagamento:</span>
                  <span>${vendaFinalizada.forma_pagamento}</span>
                </div>
              </div>

              <div class="separator"></div>

              <!-- Informações adicionais -->
              <div class="cliente-section">
                <p><strong>Caixa:</strong> 1</p>
                <p><strong>Usuário:</strong> ${vendaFinalizada.usuario || 'Sistema'}</p>
                <p><strong>Data/Hora:</strong> ${new Date(vendaFinalizada.data_venda).toLocaleString('pt-BR')}</p>
              </div>

              <div class="separator"></div>

              <!-- Rodapé -->
              <div class="footer">
                <p class="footer-message">Obrigado pela preferência!</p>
                <p class="footer-message">Volte sempre!</p>
                <div class="footer-brand">
                  <p>Tecnologia que conecta soluções</p>
                  <p class="footer-website">www.gestaoconsert.com</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header da tela cheia */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">PDV - Ponto de Venda</h1>
          <div className="text-sm text-gray-500">
            {isHydrated ? currentTime : 'Carregando...'}
          </div>
        </div>
          
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Total de produtos: <span className="font-semibold">{produtos.length}</span>
          </div>
          
          <PainelControles
            onApplyDiscount={(tipo, valor, itemId) => {
              if (itemId) {
                setDescontoItemId(itemId);
              } else {
                setDescontoItemId(null);
              }
              setModalDesconto(true);
            }}
            onApplyAddition={(tipo, valor, itemId) => {
              if (itemId) {
                setAcrescimoItemId(itemId);
              } else {
                setAcrescimoItemId(null);
              }
              setModalAcrescimo(true);
            }}
            onParcelar={(parcelas, formaPagamento) => {
              setModalVendaParcelada(true);
            }}
            onGerarOrcamento={(tipo, validade, observacoes) => {
              // Implementar lógica de orçamento
            }}
            onDevolucao={(vendaId, produtos, observacoes) => {
              setModalDevolucao(true);
            }}
            onSangria={(valor, observacoes) => {
              setTipoSangriaSuprimento('sangria');
              setModalSangriaSuprimento(true);
            }}
            onSuprimento={(valor, observacoes) => {
              setTipoSangriaSuprimento('suprimento');
              setModalSangriaSuprimento(true);
            }}
            vendedores={vendedores}
            vendedorSelecionado={vendedorSelecionado}
            onVendedorChange={setVendedorSelecionado}
            total={calcularTotal()}
            saldoCaixa={turnoAtual?.valor_inicial || 0}
            itemSelecionado={itemSelecionado}
          />
              
              <Button
                onClick={async () => {
                  console.log('Botão sair clicado, saindo da tela cheia...');
                  try {
                    if (document.exitFullscreen) {
                      await document.exitFullscreen();
                    }
                  } catch (error) {
                    console.log('Erro ao sair da tela cheia:', error);
                  }
                  window.location.href = '/dashboard';
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <FiX size={16} />
                Sair (ESC)
              </Button>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 flex overflow-hidden">
                {loadingUser || loadingTurno ? (
                  <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Carregando caixa...</p>
                    </div>
                  </div>
                ) : !turnoAtual ? (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                      <div className="mb-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FiLock className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Caixa Fechado</h1>
                        <p className="text-gray-600 mb-6">
                          O caixa está fechado. Abra o caixa para começar a realizar vendas.
                        </p>
                      </div>
                      
                      <Button
                        onClick={() => setModalAbrirCaixa(true)}
                        className="w-full py-3 text-lg font-semibold bg-green-600 hover:bg-green-700"
                      >
                        <FiUnlock className="w-5 h-5 mr-2" />
                        Abrir Caixa
                      </Button>
                      
                      <div className="mt-4 text-sm text-gray-500">
                        {ultimoFechamento ? (
                          <div>
                            <div>Último fechamento: {new Date(ultimoFechamento.data).toLocaleString('pt-BR')}</div>
                            <div>Por: {ultimoFechamento.usuario}</div>
                          </div>
                        ) : (
                          <div>Último fechamento: N/A</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
              <>
                {/* Seção de Produtos - Lado Esquerdo */}
                <div className="w-1/2 p-6 bg-white border-r border-gray-200 flex flex-col">
                  {/* Busca e filtros */}
                    <div className="mb-6">
                      <div className="mb-4">
                        <SearchInput
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar produto por nome, código ou categoria..."
                          className="w-full"
                        />
                      </div>

                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {categoriasUnicas.map(category => (
                          <Button
                            key={category}
                            variant={selectedCategory === category ? 'default' : 'secondary'}
                            onClick={() => setSelectedCategory(category)}
                          className={`px-4 py-2 whitespace-nowrap ${
                            selectedCategory === category 
                              ? 'bg-black text-white hover:bg-gray-800' 
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                    </div>

                  {/* Grid de produtos */}
                  <div className="flex-1 overflow-auto">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-500">Carregando produtos...</p>
                        </div>
                      </div>
                    ) : produtos.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚠️</span>
                          </div>
                          <p className="text-red-600 font-medium">Nenhum produto encontrado</p>
                          <p className="text-gray-500 text-sm mt-1">Cadastre produtos para começar a vender</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-2 auto-rows-fr">
                        {produtosExibidos.map(produto => (
                          <ProdutoCard
                            key={produto.id} 
                            produto={produto}
                            onClick={() => {
                              if (!turnoAtual) {
                                addToast('warning', 'Abra o caixa antes de adicionar produtos!');
                                setModalAbrirCaixa(true);
                                return;
                              }
                              addToCart(produto);
                            }}
                          />
                        ))}
                      </div>
                    )}
                      </div>
                  </div>

                {/* Seção do Carrinho - Lado Direito */}
                <div className="w-1/2 bg-white flex flex-col">
                  {/* Seletor de Vendedor */}
                  {turnoAtual && vendedores.length > 0 && (
                    <div className="px-4 py-2 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Vendedor:</span>
                        <select
                          value={vendedorSelecionado?.id || ''}
                          onChange={(e) => {
                            const vendedor = vendedores.find(v => v.id === e.target.value);
                            setVendedorSelecionado(vendedor || null);
                          }}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Selecionar vendedor</option>
                          {vendedores.map(vendedor => (
                            <option key={vendedor.id} value={vendedor.id}>
                              {vendedor.nome} ({vendedor.funcao})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  
                  <Carrinho
                    items={cart}
                    onUpdateQuantity={changeQty}
                    onRemove={removeFromCart}
                    total={calcularTotal()}
                    onFinalizar={finalizarVenda}
                    turnoAtual={turnoAtual}
                    onAbrirCaixa={() => setModalAbrirCaixa(true)}
                    clienteSelecionado={clienteSelecionado}
                    onClienteChange={setClienteSelecionado}
                    onSearchCliente={setSearchCliente}
                    searchCliente={searchCliente}
                    showClienteDropdown={showClienteDropdown}
                    onSelecionarCliente={(cliente) => {
                      setClienteSelecionado(cliente);
                      setShowClienteDropdown(false);
                    }}
                    onCadastrarCliente={() => setModalNovoCliente(true)}
                    clientes={clientes}
                    loadingClientes={loadingClientes}
                    orderType={orderType}
                    onOrderTypeChange={setOrderType}
                    onFecharCaixa={() => setModalFecharCaixa(true)}
                  />
                </div>
              </>
            )}
          </div>

        {/* Modal Abrir Caixa */}
        {modalAbrirCaixa && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Abrir Caixa</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorInicial}
                  onChange={(e) => setValorInicial(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0,00"
                />
                  </div>
              <div className="flex gap-3">
                          <Button
                  onClick={() => setModalAbrirCaixa(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                          </Button>
                              <Button 
                  onClick={abrirCaixa}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                Abrir Caixa
                              </Button>
                            </div>
                              </div>
                            </div>
                          )}

        {/* Modal Fechar Caixa */}
        {modalFecharCaixa && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Fechar Caixa</h2>
              <p className="text-gray-600 mb-4">
                Tem certeza que deseja fechar o caixa? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                          <Button
                  onClick={() => setModalFecharCaixa(false)}
                            variant="outline"
                  className="flex-1"
                          >
                  Cancelar
                          </Button>
                          <Button
                  onClick={fecharCaixa}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Fechar Caixa
                      </Button>
                    </div>
                  </div>
                                  </div>
                )}

        {/* Modal Novo Cliente */}
            {modalNovoCliente && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Novo Cliente</h2>
              <div className="space-y-4">
                    <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={novoClienteNome}
                    onChange={(e) => setNovoClienteNome(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nome completo"
                      />
                    </div>
                    <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documento
                  </label>
                  <input
                        type="text"
                    value={novoClienteDocumento}
                    onChange={(e) => setNovoClienteDocumento(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="CPF/CNPJ"
                  />
                            </div>
                        <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                        type="text"
                    value={novoClienteTelefone}
                    onChange={(e) => setNovoClienteTelefone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="(11) 99999-9999"
                  />
                  </div>
                    </div>
              <div className="flex gap-3 mt-6">
                            <Button 
                  onClick={() => setModalNovoCliente(false)}
                          variant="outline"
                  className="flex-1"
                        >
                  Cancelar
                        </Button>
                        <Button
                  onClick={cadastrarCliente}
                  disabled={salvandoCliente}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {salvandoCliente ? 'Salvando...' : 'Cadastrar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

        {/* Modal de Pagamento */}
        <PagamentoModal
          isOpen={modalPagamento}
          onClose={() => setModalPagamento(false)}
          onConfirm={confirmarVenda}
          onParcelar={abrirVendaParcelada}
          total={calcularTotal()}
        />

        {/* Modal de Desconto */}
        <DescontoModal
          isOpen={modalDesconto}
          onClose={() => {
            setModalDesconto(false);
            setDescontoItemId(null);
          }}
          onConfirm={confirmarDesconto}
          total={descontoItemId ? 
            cart.find(item => item.id === descontoItemId)?.preco || 0 : 
            calcularTotal()
          }
          tipo={descontoItemId ? 'item' : 'venda'}
          itemNome={descontoItemId ? 
            cart.find(item => item.id === descontoItemId)?.nome : 
            undefined
          }
        />

        {/* Modal de Acréscimo */}
        <AcrescimoModal
          isOpen={modalAcrescimo}
          onClose={() => {
            setModalAcrescimo(false);
            setAcrescimoItemId(null);
          }}
          onConfirm={confirmarAcrescimo}
          total={acrescimoItemId ? 
            cart.find(item => item.id === acrescimoItemId)?.preco || 0 : 
            calcularTotal()
          }
          tipo={acrescimoItemId ? 'item' : 'venda'}
          itemNome={acrescimoItemId ? 
            cart.find(item => item.id === acrescimoItemId)?.nome : 
            undefined
          }
        />

        {/* Modal de Venda Parcelada */}
        <VendaParceladaModal
          isOpen={modalVendaParcelada}
          onClose={() => setModalVendaParcelada(false)}
          onConfirm={confirmarVendaParcelada}
          total={calcularTotal()}
        />

        {/* Modal de Orçamento */}
        <OrcamentoModal
          isOpen={modalOrcamento}
          onClose={() => setModalOrcamento(false)}
          onConfirm={confirmarOrcamento}
          total={calcularTotal()}
          cliente={clienteSelecionado}
        />

        {/* Modal de Sangria/Suprimento */}
        <SangriaSuprimentoModal
          isOpen={modalSangriaSuprimento}
          onClose={() => setModalSangriaSuprimento(false)}
          onConfirm={confirmarSangriaSuprimento}
          tipo={tipoSangriaSuprimento}
          saldoAtual={turnoAtual?.valor_inicial || 0}
        />

        {/* Modal de Devolução */}
        <DevolucaoModal
          isOpen={modalDevolucao}
          onClose={() => setModalDevolucao(false)}
          onConfirm={confirmarDevolucao}
        />

        {/* Modal de Pagamento */}
        <PagamentoModal
          isOpen={modalFinalizarVenda}
          onClose={() => setModalFinalizarVenda(false)}
          onConfirm={(formaPagamento, valorPago) => {
            handleFinalizarVenda({ formaPagamento, valorPago } as any);
          }}
          onParcelar={() => setModalVendaParcelada(true)}
          total={calcularTotal()}
        />

        {/* Modal de Cupom */}
        {vendaFinalizada && (
                    <CupomVenda
            isOpen={modalCupom}
            onClose={() => {
              setModalCupom(false);
              setVendaFinalizada(null);
            }}
            onPrint={imprimirCupom}
            venda={vendaFinalizada}
          />
        )}
          </div>
        );
}
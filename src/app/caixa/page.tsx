"use client";
import React, { useState, useEffect } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { FiMaximize, FiMinimize, FiUser, FiUserPlus, FiSearch, FiX } from 'react-icons/fi';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SearchInput } from '@/components/SearchInput';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  descricao: string;
  categoria?: string;
  imagem_url?: string;
  tipo: string;
  codigo_barras?: string;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  celular: string;
  email: string;
  documento: string;
  numero_cliente: string;
}

export default function CaixaPage() {
  const { user, usuarioData } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState<(Produto & { qty: number })[]>([]);
  const [orderType, setOrderType] = useState('Local');
  const [paymentType, setPaymentType] = useState('Dinheiro');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pdvRef = React.useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para seleção de cliente
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchCliente, setSearchCliente] = useState('');
  const [loadingClientes, setLoadingClientes] = useState(false);
  const clienteSearchRef = React.useRef<HTMLDivElement>(null);

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

  // Buscar clientes
  const buscarClientes = async (search = '') => {
    if (!usuarioData?.empresa_id) return;
    
    setLoadingClientes(true);
    try {
      const response = await fetch(`/api/clientes?empresaId=${usuarioData.empresa_id}&search=${search}`);
      const data = await response.json();
      
      if (data.clientes) {
        setClientes(data.clientes);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
    setLoadingClientes(false);
  };

  // Selecionar cliente
  const selecionarCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setSearchCliente(cliente.nome);
    setShowClienteDropdown(false);
  };

  // Remover cliente selecionado
  const removerCliente = () => {
    setClienteSelecionado(null);
    setSearchCliente('');
  };

  // Buscar clientes quando digitar
  const handleSearchCliente = (value: string) => {
    setSearchCliente(value);
    if (value.length >= 2) {
      buscarClientes(value);
      setShowClienteDropdown(true);
    } else {
      setShowClienteDropdown(false);
    }
  };

  // Função para alternar tela cheia
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (pdvRef.current) {
        if (pdvRef.current.requestFullscreen) {
          pdvRef.current.requestFullscreen();
        } else if ((pdvRef.current as any).webkitRequestFullscreen) {
          (pdvRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listener para sair do fullscreen com ESC
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Buscar produtos reais do Supabase
  useEffect(() => {
    async function fetchProdutos() {
      setLoading(true);
      if (!usuarioData?.empresa_id) return;
      const { data, error } = await supabase
        .from('produtos_servicos')
        .select('id, nome, preco, obs, categoria, imagens_url, tipo, ativo, codigo_barras')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('ativo', true)
        .eq('tipo', 'produto')
        .order('nome', { ascending: true });
      console.log('PRODUTOS SUPABASE:', { data, error });
      if (error) {
        setProdutos([]);
      } else if (data) {
        setProdutos(data.map((p: any) => ({
          ...p,
          imagem_url: Array.isArray(p.imagens_url) && p.imagens_url.length > 0 ? p.imagens_url[0] : undefined,
          descricao: p.obs || ''
        })));
      }
      setLoading(false);
    }
    fetchProdutos();
  }, [usuarioData?.empresa_id]);

  // Categorias dinâmicas
  const categoriasUnicas = [
    'Todos',
    ...Array.from(new Set(produtos.map(p => p.categoria).filter(Boolean)))
  ];

  // Filtro de produtos incluindo busca parcial por código de barras
  const filteredProducts = selectedCategory === 'Todos'
    ? produtos.filter(p => {
        const nome = p.nome?.toLowerCase() || '';
        const categoria = p.categoria?.toLowerCase() || '';
        const codigoBarras = (p.codigo_barras || '').toString().toLowerCase();
        const termo = searchTerm.toLowerCase();
        if (termo) {
          console.log('DEBUG codigo_barras:', codigoBarras, 'termo:', termo);
        }
        return (
          nome.includes(termo) ||
          codigoBarras.includes(termo) ||
          categoria.includes(termo) ||
          termo === ''
        );
      })
    : produtos.filter(p => {
        const nome = p.nome?.toLowerCase() || '';
        const codigoBarras = (p.codigo_barras || '').toString().toLowerCase();
        const termo = searchTerm.toLowerCase();
        return (
          p.categoria === selectedCategory &&
          (nome.includes(termo) || codigoBarras.includes(termo) || termo === '')
        );
      });

  // Se o usuário digitar um código de barras exato e só houver um produto, adicionar automaticamente ao carrinho
  useEffect(() => {
    if (searchTerm.length > 4) {
      const match = produtos.find(
        p => (p.codigo_barras || '').toString().toLowerCase() === searchTerm.toLowerCase()
      );
      if (match) {
        addToCart(match);
        setSearchTerm('');
      }
    }
    // eslint-disable-next-line
  }, [searchTerm]);

  // Exibir apenas os 9 primeiros produtos
  const produtosExibidos = filteredProducts.slice(0, 9);

  const addToCart = (product: Produto) => {
    setCart(prev => {
      const found = prev.find((item) => item.id === product.id);
      if (found) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const changeQty = (id: string, delta: number) => {
    setCart(prev =>
      prev.map(item =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.preco * item.qty, 0);
  const discount = 0;
  const total = subtotal + discount;

  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsuarioId() {
      if (user?.id) {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (data?.id) setUsuarioId(data.id);
      }
    }
    fetchUsuarioId();
  }, [user]);

  // Função para registrar venda no Supabase
  async function registrarVendaNoSupabase() {
    if (!usuarioId || !usuarioData?.empresa_id) return;
    const payload = {
      cliente_id: clienteSelecionado?.id || null,
      usuario_id: usuarioId,
      produtos: cart.map(item => ({
        id: item.id,
        nome: item.nome,
        preco: item.preco,
        qtd: item.qty,
        codigo_barras: item.codigo_barras || null
      })),
      total: total,
      desconto: 0, // ajuste se houver desconto
      acrescimo: 0, // ajuste se houver acrescimo
      forma_pagamento: paymentType,
      tipo_pedido: orderType,
      status: 'finalizada',
      observacoes: '',
      empresa_id: usuarioData.empresa_id,
      data_venda: new Date().toISOString(),
    };
    const { error } = await supabase.from('vendas').insert([payload]);
    if (error) {
      alert('Erro ao registrar venda: ' + error.message);
      return false;
    }
    return true;
  }

  // Finalizar venda
  const finalizarVenda = async () => {
    if (cart.length === 0) {
      alert('Adicione produtos ao carrinho antes de finalizar a venda.');
      return;
    }

    // Aqui você pode implementar a lógica de finalização da venda
    console.log('Finalizando venda:', {
      cliente: clienteSelecionado,
      produtos: cart,
      total,
      formaPagamento: paymentType,
      tipoPedido: orderType
    });

    // Se houver cliente, registrar venda no cadastro do cliente (agora integrado ao Supabase)
    const ok = await registrarVendaNoSupabase();
    if (!ok) return;

    alert('Venda finalizada com sucesso!');
    
    // Limpar carrinho e cliente
    setCart([]);
    setClienteSelecionado(null);
  };

  return (
    <MenuLayout>
      <div ref={pdvRef} className="flex min-h-screen bg-white relative w-full p-0 m-0">
        {/* Botão tela cheia */}
        <Button
          onClick={toggleFullscreen}
          variant="secondary"
          className="absolute top-4 right-8 z-50 flex items-center gap-2"
          title={isFullscreen ? 'Sair do modo tela cheia' : 'Tela cheia'}
        >
          {isFullscreen ? <FiMinimize /> : <FiMaximize />}
          {isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
        </Button>

        {/* Main */}
        <div className="flex-1 p-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">{new Date().toLocaleDateString('pt-BR')}</div>
              <h1 className="text-2xl font-bold text-lime-700">PDV - Caixa</h1>
            </div>
            <div className="w-full max-w-xl ml-8">
              <SearchInput
                placeholder="Buscar produto por nome, código ou categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus={false}
              />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Escolha o produto</h2>
            <Button variant="link" className="text-lime-700 font-semibold p-0 h-auto">Ver todos</Button>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {categoriasUnicas.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'secondary'}
                className={`px-4 py-2 rounded-full border ${selectedCategory === cat ? 'bg-lime-700 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
          {loading ? (
            <div className="text-center text-gray-500 py-20">Carregando produtos...</div>
          ) : produtos.length === 0 ? (
            <div className="text-center text-red-500 py-20">Nenhum produto cadastrado ou erro ao buscar produtos.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {produtosExibidos.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow p-3 flex flex-col items-center border border-lime-100 w-full">
                  <img 
                    src={product.imagem_url || '/assets/imagens/imagem-produto.jpg'} 
                    alt={product.nome} 
                    className="w-16 h-16 object-cover rounded-full mb-1"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/imagens/imagem-produto.jpg'; }}
                  />
                  <div className="font-semibold text-base mb-0.5 text-gray-800 text-center truncate w-full">{product.nome}</div>
                  <div className="text-lime-700 font-bold text-sm mb-0.5">R$ {product.preco.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mb-1 text-center line-clamp-2">{product.descricao}</div>
                  <Button
                    className="w-full mt-auto text-xs py-1"
                    onClick={() => addToCart(product)}
                  >
                    Adicionar ao carrinho
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-[400px] bg-white p-6 border-l flex flex-col rounded-none md:rounded-xl md:shadow md:my-8 md:mr-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Meu Pedido</h2>
          
          {/* Seção de Cliente */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Cliente</h3>
              {clienteSelecionado && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removerCliente}
                  className="text-xs h-6 px-2"
                >
                  <FiX className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            {clienteSelecionado ? (
              <div className="bg-white p-2 rounded border">
                <div className="flex items-center gap-2">
                  <FiUser className="text-blue-600 text-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{clienteSelecionado.nome}</p>
                    <p className="text-xs text-gray-600">
                      {clienteSelecionado.telefone || clienteSelecionado.celular || 'Sem telefone'} | 
                      #{clienteSelecionado.numero_cliente}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative" ref={clienteSearchRef}>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={searchCliente}
                    onChange={(e) => handleSearchCliente(e.target.value)}
                    className="pl-10 pr-8 h-8 text-sm"
                    onFocus={() => {
                      if (searchCliente.length >= 2) {
                        setShowClienteDropdown(true);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 px-2 text-xs"
                  >
                    <FiUserPlus className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Dropdown de resultados */}
                {showClienteDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {loadingClientes ? (
                      <div className="p-3 text-center text-sm text-gray-500">Carregando...</div>
                    ) : clientes.length === 0 ? (
                      <div className="p-3 text-center text-sm text-gray-500">Nenhum cliente encontrado</div>
                    ) : (
                      <div className="py-1">
                        {clientes.map((cliente) => (
                          <div
                            key={cliente.id}
                            onClick={() => selecionarCliente(cliente)}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-semibold text-sm text-gray-800">{cliente.nome}</div>
                            <div className="text-xs text-gray-600">
                              {cliente.telefone || cliente.celular || 'Sem telefone'} | 
                              Cliente #{cliente.numero_cliente}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            {['Local', 'Retirada', 'Entrega'].map(type => (
              <Button
                key={type}
                variant={orderType === type ? 'default' : 'secondary'}
                className="px-3 py-1 rounded-full text-xs"
                onClick={() => setOrderType(type)}
              >
                {type}
              </Button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto mb-4">
            {cart.length === 0 ? (
              <div className="text-gray-400 text-center mt-10">Carrinho vazio</div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex items-center justify-between mb-4 border-b pb-2">
                  <div>
                    <div className="font-semibold text-gray-800">{item.nome}</div>
                    <div className="text-xs text-gray-500">Unidade</div>
                    <div className="text-lime-700 font-bold">R$ {item.preco.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="icon" onClick={() => changeQty(item.id, -1)}>-</Button>
                    <span>{item.qty}</span>
                    <Button variant="secondary" size="icon" onClick={() => changeQty(item.id, 1)}>+</Button>
                  </div>
                  <Button variant="destructive" size="icon" onClick={() => removeFromCart(item.id)} className="ml-2">×</Button>
                </div>
              ))
            )}
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Itens</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>Desconto</span>
              <span className="text-red-500">R$ {discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-md">
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
          </div>
          <div className="mb-4">
            <div className="font-semibold mb-2">Pagamento</div>
            <div className="flex gap-2 mb-2">
              {['Dinheiro', 'Débito', 'Pix'].map(type => (
                <Button
                  key={type}
                  variant={paymentType === type ? 'default' : 'secondary'}
                  className="px-4 py-1 rounded-full text-xs"
                  onClick={() => setPaymentType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
          <Button 
            className="w-full py-3 font-bold text-lg mt-2"
            onClick={finalizarVenda}
            disabled={cart.length === 0}
          >
            Finalizar venda
          </Button>
        </div>
      </div>
    </MenuLayout>
  );
} 
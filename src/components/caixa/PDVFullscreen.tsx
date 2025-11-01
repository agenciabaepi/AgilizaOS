import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiMinimize, FiMaximize, FiUnlock, FiLock, FiMinus, FiPlus, FiEye, FiShoppingCart, FiSearch } from 'react-icons/fi';
import { Button } from '@/components/Button';
import { SearchInput } from '@/components/SearchInput';
import { ProdutoCard } from '@/components/caixa/ProdutoCard';
import { Carrinho } from '@/components/caixa/Carrinho';

interface Produto {
  id: string;
  nome: string;
  preco: number;
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

interface PDVFullscreenProps {
  produtos: Produto[];
  loading: boolean;
  cart: (Produto & { qty: number })[];
  total: number;
  turnoAtual: any;
  clienteSelecionado: Cliente | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categoriasUnicas: string[];
  onAddToCart: (produto: Produto) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveFromCart: (id: string) => void;
  onFinalizarVenda: () => void;
  onAbrirCaixa: () => void;
  onClienteChange: (cliente: Cliente | null) => void;
  onSearchCliente: (search: string) => void;
  searchCliente: string;
  showClienteDropdown: boolean;
  clientes: Cliente[];
  loadingClientes: boolean;
  onSelecionarCliente: (cliente: Cliente) => void;
  onCadastrarCliente: () => void;
  orderType: string;
  onOrderTypeChange: (type: string) => void;
  onSangria: () => void;
  onSuprimento: () => void;
  onMovimentacoes: () => void;
  onFecharCaixa: () => void;
  onExitFullscreen: () => void;
}

export function PDVFullscreen({
  produtos,
  loading,
  cart,
  total,
  turnoAtual,
  clienteSelecionado,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  categoriasUnicas,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onFinalizarVenda,
  onAbrirCaixa,
  onClienteChange,
  onSearchCliente,
  searchCliente,
  showClienteDropdown,
  clientes,
  loadingClientes,
  onSelecionarCliente,
  onCadastrarCliente,
  orderType,
  onOrderTypeChange,
  onSangria,
  onSuprimento,
  onMovimentacoes,
  onFecharCaixa,
  onExitFullscreen
}: PDVFullscreenProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Função para entrar em tela cheia
  const enterFullscreen = async () => {
    try {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error('Erro ao entrar em tela cheia:', error);
    }
  };

  // Função para sair da tela cheia
  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
        onExitFullscreen();
      }
    } catch (error) {
      console.error('Erro ao sair da tela cheia:', error);
    }
  };

  // Listener para detectar mudanças no fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        onExitFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onExitFullscreen]);

  // Atalho ESC para sair
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Produtos filtrados
  const filteredProducts = selectedCategory === 'Todos'
    ? produtos.filter(p => {
        const nome = p.nome?.toLowerCase() || '';
        const categoria = p.categoria?.toLowerCase() || '';
        const codigoBarras = (p.codigo_barras || '').toString().toLowerCase();
        const termo = searchTerm.toLowerCase();
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

  const produtosExibidos = filteredProducts.slice(0, 12); // Mais produtos na tela cheia

  return (
    <div 
      ref={containerRef}
      className="h-screen bg-gray-50 flex flex-col"
    >
      {/* Header da tela cheia */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">PDV - Ponto de Venda</h1>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Total de produtos: <span className="font-semibold">{produtos.length}</span>
          </div>
          
          <Button
            onClick={exitFullscreen}
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
              <div className="grid grid-cols-3 gap-4">
                {produtosExibidos.map(produto => (
                  <ProdutoCard
                    key={produto.id}
                    produto={produto}
                    onClick={() => {
                      if (!turnoAtual) {
                        onAbrirCaixa();
                        return;
                      }
                      onAddToCart(produto);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Seção do Carrinho - Lado Direito */}
        <div className="w-1/2 bg-white flex flex-col">
          <Carrinho
            items={cart}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemoveFromCart}
            total={total}
            onFinalizar={onFinalizarVenda}
            turnoAtual={turnoAtual}
            onAbrirCaixa={onAbrirCaixa}
            clienteSelecionado={clienteSelecionado}
            onClienteChange={onClienteChange}
            onSearchCliente={onSearchCliente}
            searchCliente={searchCliente}
            showClienteDropdown={showClienteDropdown}
            clientes={clientes}
            loadingClientes={loadingClientes}
            onSelecionarCliente={onSelecionarCliente}
            onCadastrarCliente={onCadastrarCliente}
            orderType={orderType}
            onOrderTypeChange={onOrderTypeChange}
            onSangria={onSangria}
            onSuprimento={onSuprimento}
            onMovimentacoes={onMovimentacoes}
            onFecharCaixa={onFecharCaixa}
          />
        </div>
      </div>
    </div>
  );
}

export default PDVFullscreen;

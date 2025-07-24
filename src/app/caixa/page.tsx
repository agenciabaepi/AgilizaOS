"use client";
import React, { useState, useEffect } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  descricao: string;
  categoria?: string;
  imagem_url?: string;
  tipo: string;
}

export default function CaixaPage() {
  const { usuarioData } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState<any[]>([]);
  const [orderType, setOrderType] = useState('Local');
  const [paymentType, setPaymentType] = useState('Dinheiro');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar produtos reais do Supabase
  useEffect(() => {
    async function fetchProdutos() {
      setLoading(true);
      if (!usuarioData?.empresa_id) return;
      const { data, error } = await supabase
        .from('produtos_servicos')
        .select('id, nome, preco, obs, categoria, imagens_url, tipo, ativo')
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

  const filteredProducts = selectedCategory === 'Todos'
    ? produtos
    : produtos.filter(p => p.categoria === selectedCategory);

  // Exibir apenas os 9 primeiros produtos
  const produtosExibidos = filteredProducts.slice(0, 9);

  const addToCart = (product: Produto) => {
    setCart(prev => {
      const found = prev.find((item: any) => item.id === product.id);
      if (found) {
        return prev.map((item: any) =>
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

  return (
    <MenuLayout>
      <div className="flex min-h-screen bg-[#f6ffe6]">
        {/* Main */}
        <div className="flex-1 p-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">{new Date().toLocaleDateString('pt-BR')}</div>
              <h1 className="text-2xl font-bold text-lime-700">PDV - Caixa</h1>
            </div>
            <input
              type="text"
              placeholder="Buscar produto..."
              className="border rounded px-3 py-2 w-64 bg-zinc-100 focus:ring-lime-400 focus:border-lime-400"
            />
          </div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Escolha o produto</h2>
            <button className="text-lime-700 font-semibold">Ver todos</button>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {categoriasUnicas.map(cat => (
              <button
                key={cat}
                className={`px-4 py-2 rounded-full border ${selectedCategory === cat ? 'bg-lime-700 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="text-center text-gray-500 py-20">Carregando produtos...</div>
          ) : produtos.length === 0 ? (
            <div className="text-center text-red-500 py-20">Nenhum produto cadastrado ou erro ao buscar produtos.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {produtosExibidos.map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow p-4 flex flex-col items-center border border-lime-100">
                  <img 
                    src={product.imagem_url || '/assets/imagens/imagem-produto.jpg'} 
                    alt={product.nome} 
                    className="w-24 h-24 object-cover rounded-full mb-2"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/imagens/imagem-produto.jpg'; }}
                  />
                  <div className="font-semibold text-lg mb-1 text-gray-800">{product.nome}</div>
                  <div className="text-lime-700 font-bold text-md mb-1">R$ {product.preco.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mb-2 text-center">{product.descricao}</div>
                  <button
                    className="bg-lime-700 text-white px-4 py-1 rounded mt-auto hover:bg-lime-800"
                    onClick={() => addToCart(product)}
                  >
                    Adicionar ao carrinho
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Sidebar */}
        <div className="w-[400px] bg-white p-6 border-l flex flex-col rounded-none md:rounded-xl md:shadow md:my-8 md:mr-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Meu Pedido</h2>
          <div className="flex gap-2 mb-4">
            {['Local', 'Retirada', 'Entrega'].map(type => (
              <button
                key={type}
                className={`px-3 py-1 rounded-full border ${orderType === type ? 'bg-lime-700 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setOrderType(type)}
              >
                {type}
              </button>
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
                    <button onClick={() => changeQty(item.id, -1)} className="px-2">-</button>
                    <span>{item.qty}</span>
                    <button onClick={() => changeQty(item.id, 1)} className="px-2">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 ml-2">×</button>
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
                <button
                  key={type}
                  className={`px-4 py-1 rounded-full border ${paymentType === type ? 'bg-lime-700 text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => setPaymentType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <button className="bg-lime-700 text-white py-3 rounded font-bold text-lg hover:bg-lime-800">Finalizar venda</button>
        </div>
      </div>
    </MenuLayout>
  );
} 
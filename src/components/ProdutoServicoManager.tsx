'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { interceptSupabaseQuery } from '@/utils/supabaseInterceptor';
import { FiPlus, FiX, FiEdit2, FiTrash2, FiDollarSign, FiPackage, FiTool } from 'react-icons/fi';
import { Button } from './Button';

interface Item {
  id?: string;
  nome: string;
  preco: number;
  quantidade: number;
  total: number;
  isNew?: boolean;
}

interface ProdutoServicoManagerProps {
  tipo: 'servico' | 'produto';
  itens: Item[];
  onItensChange: (itens: Item[]) => void;
  readonly?: boolean;
}

interface ProdutoServico {
  id: string;
  nome: string;
  preco: number;
  tipo: 'produto' | 'servico';
}

export default function ProdutoServicoManager({ 
  tipo, 
  itens, 
  onItensChange, 
  readonly = false 
}: ProdutoServicoManagerProps) {
  const { usuarioData } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  const [produtosServicos, setProdutosServicos] = useState<ProdutoServico[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para novo item
  const [novoItem, setNovoItem] = useState<Item>({
    nome: '',
    preco: 0,
    quantidade: 1,
    total: 0
  });

  // Estados para controlar a exibição dos valores nos inputs
  const [precoDisplay, setPrecoDisplay] = useState('');
  const [quantidadeDisplay, setQuantidadeDisplay] = useState('1');

  const icon = tipo === 'servico' ? <FiTool size={20} /> : <FiPackage size={20} />;
  const title = tipo === 'servico' ? 'Serviços' : 'Produtos/Peças';
  const color = tipo === 'servico' ? 'green' : 'blue';

  // Filtrar produtos/serviços baseado na busca
  const filteredItems = produtosServicos.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (usuarioData?.empresa_id) {
      fetchProdutosServicos();
    }
  }, [usuarioData, tipo]);

  const fetchProdutosServicos = async () => {
    if (!usuarioData?.empresa_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await interceptSupabaseQuery('produtos_servicos', async () => {
        return await supabase
          .from('produtos_servicos')
          .select('id, nome, preco, tipo')
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('tipo', tipo)
          .order('nome');
      });

      if (error && error.code === 'TABLE_NOT_EXISTS') {
        // Usar dados de teste se a tabela não existir
        setProdutosServicos([]);
      } else if (error) {
        console.error('Erro ao buscar items:', error);
        setProdutosServicos([]);
      } else {
        setProdutosServicos((data as any[]) || []);
      }
    } catch (error) {
      console.error('Erro:', error);
      setProdutosServicos([]);
    } finally {
      setLoading(false);
    }
  };

  const adicionarItem = (item: ProdutoServico | null = null) => {
    const novoItemFinal: Item = item ? {
      id: item.id,
      nome: item.nome,
      preco: item.preco,
      quantidade: 1,
      total: item.preco
    } : {
      ...novoItem,
      total: novoItem.preco * novoItem.quantidade
    };

    const novosItens = [...itens, novoItemFinal];
    onItensChange(novosItens);
    
    setNovoItem({ nome: '', preco: 0, quantidade: 1, total: 0 });
    setShowAddForm(false);
  };

  const editarItem = (index: number, campo: keyof Item, valor: any) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    
    if (campo === 'preco' || campo === 'quantidade') {
      novosItens[index].total = novosItens[index].preco * novosItens[index].quantidade;
    }
    
    onItensChange(novosItens);
  };

  const removerItem = async (index: number) => {
    const confirmed = await confirm({
      title: 'Remover Item',
      message: `Deseja remover "${itens[index].nome}"?`,
      confirmText: 'Remover',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      const novosItens = itens.filter((_, i) => i !== index);
      onItensChange(novosItens);
    }
  };

  const cadastrarNovoItem = async () => {
    // TESTE DIRETO - criar função global para testar no console
    if (typeof window !== 'undefined') {
      (window as any).testarSupabase = async () => {
        const { data, error } = await supabase.from('produtos_servicos').select('*').limit(1);
        console.log('TESTE SELECT:', { data, error });
        return { data, error };
      };
    }
    
    console.log('🔄 Iniciando cadastro de novo item:', { novoItem, usuarioData });
    
    if (!novoItem.nome.trim()) {
      addToast('Nome é obrigatório', 'error');
      return;
    }
    
    if (!usuarioData?.empresa_id) {
      console.error('❌ Empresa não identificada:', usuarioData);
      addToast('Erro: empresa não identificada', 'error');
      return;
    }

    try {
      const itemData = {
        nome: novoItem.nome.trim(),
        preco: novoItem.preco,
        tipo: tipo,
        empresa_id: usuarioData.empresa_id
      };
      
      console.log('📤 Enviando dados para cadastro:', itemData);

      // Verificar se a tabela existe primeiro
      const { data: tableCheck, error: tableError } = await supabase
        .from('produtos_servicos')
        .select('count', { count: 'exact', head: true });

      if (tableError) {
        console.error('❌ Tabela produtos_servicos não existe:', tableError);
        addToast('Erro: Tabela de produtos não configurada no banco de dados', 'error');
        return;
      }

      console.log('✅ Tabela produtos_servicos existe, prosseguindo com insert...');

      const { data, error } = await supabase
        .from('produtos_servicos')
        .insert(itemData);

      // Log imediato sem interceptação - usando window.console e alert para contornar interceptações
      if (typeof window !== 'undefined') {
        window.console.log('🔍 RESULTADO DIRETO DO SUPABASE:');
        window.console.log('data:', data);
        window.console.log('error (raw):', error);
        window.console.log('error type:', typeof error);
        window.console.log('error keys:', error ? Object.keys(error) : 'null');
        
        // Alert para garantir que vemos o erro
        if (error) {
          alert(`ERRO SUPABASE:\nTipo: ${typeof error}\nKeys: ${error ? Object.keys(error).join(', ') : 'null'}\nJSON: ${JSON.stringify(error)}`);
        }
      }

      if (error) {
        console.error('❌ Erro do Supabase (detalhado):', {
          error,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          stringified: JSON.stringify(error)
        });
        const errorMsg = error?.message || error?.details || error?.hint || 'Erro desconhecido no banco de dados';
        addToast(`Erro ao cadastrar: ${errorMsg}`, 'error');
        return;
      }

      console.log('✅ Item cadastrado com sucesso');

      // Criar objeto do item para adicionar localmente
      const novoItemCriado = {
        id: Date.now().toString(), // ID temporário
        nome: itemData.nome,
        preco: itemData.preco,
        tipo: itemData.tipo
      };

      // Adicionar à lista local
      setProdutosServicos(prev => [...prev, novoItemCriado]);
      
      // Adicionar ao pedido
      adicionarItem(novoItemCriado);
      
      addToast('success', `${tipo === 'servico' ? 'Serviço' : 'Produto'} cadastrado e adicionado!`);
      
      // Limpar formulário
      setNovoItem({ nome: '', preco: 0, quantidade: 1, total: 0 });
      setPrecoDisplay('');
      setQuantidadeDisplay('1');
      setShowAddForm(false);
      
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      addToast('error', `Erro ao salvar: ${error}`);
    }
  };

  const calcularTotal = () => {
    return itens.reduce((total, item) => {
      const preco = typeof item.preco === 'number' ? item.preco : parseFloat(String(item.preco));
      const quantidade = typeof item.quantidade === 'number' ? item.quantidade : parseInt(String(item.quantidade));
      const totalItem = item.total ?? ((isNaN(preco) ? 0 : preco) * (isNaN(quantidade) ? 0 : quantidade));
      return total + (isNaN(totalItem) ? 0 : totalItem);
    }, 0);
  };

  const formatCurrency = (value: number) => {
    const safe = typeof value === 'number' && !isNaN(value) ? value : 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(safe);
  };

  if (readonly && itens.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-${color}-100 rounded-lg`}>
            <div className={`text-${color}-600`}>{icon}</div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        
        {!readonly && (
          <button
            onClick={() => setShowAddForm(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors`}
          >
            <FiPlus size={16} />
            Adicionar
          </button>
        )}
      </div>

      {/* Lista de itens */}
      <div className="space-y-3 mb-4">
        {itens.map((item, index) => {
          const preco = typeof item.preco === 'number' ? item.preco : parseFloat(String(item.preco));
          const quantidade = typeof item.quantidade === 'number' ? item.quantidade : parseInt(String(item.quantidade));
          const totalItem = item.total ?? ((isNaN(preco) ? 0 : preco) * (isNaN(quantidade) ? 0 : quantidade));
          return (
          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              {editingIndex === index && !readonly ? (
                <input
                  type="text"
                  value={item.nome}
                  onChange={(e) => editarItem(index, 'nome', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  onBlur={() => setEditingIndex(null)}
                  autoFocus
                />
              ) : (
                <div 
                  className="font-medium text-gray-900 cursor-pointer"
                  onClick={() => !readonly && setEditingIndex(index)}
                >
                  {item.nome}
                </div>
              )}
            </div>
            
            <div className="w-20">
              {!readonly ? (
                <input
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={(e) => editarItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-center"
                />
              ) : (
                <span className="text-sm text-gray-600">{item.quantidade}x</span>
              )}
            </div>
            
            <div className="w-24">
              {!readonly ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.preco}
                  onChange={(e) => editarItem(index, 'preco', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right"
                />
              ) : (
                <span className="text-sm text-gray-600">{formatCurrency(item.preco)}</span>
              )}
            </div>
            
            <div className="w-24 text-right">
              <span className="font-semibold text-gray-900">
                {formatCurrency(totalItem)}
              </span>
            </div>
            
            {!readonly && (
              <button
                onClick={() => removerItem(index)}
                className="p-1 text-red-500 hover:text-red-700 transition-colors"
              >
                <FiTrash2 size={16} />
              </button>
            )}
          </div>
          );
        })}
      </div>

      {/* Formulário de adicionar */}
      {showAddForm && !readonly && (
        <div className="border-t pt-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-lg">
                Adicionar {tipo === 'servico' ? 'Serviço' : 'Produto/Peça'}
              </h4>
              <p className="text-sm text-gray-600">
                Encontre um item existente ou crie um novo
              </p>
            </div>
          </div>
          
          {/* Buscar existente */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar no catálogo
              </label>
              <p className="text-xs text-gray-500">
                Encontre um {tipo === 'servico' ? 'serviço' : 'produto'} já cadastrado para adicionar rapidamente
              </p>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder={`Digite para buscar ${tipo === 'servico' ? 'serviços' : 'produtos'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D1FE6E] focus:border-[#D1FE6E] transition-colors"
              />
              
              {searchTerm && filteredItems.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredItems.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        adicionarItem(item);
                        setSearchTerm('');
                      }}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <span className="font-medium">{item.nome}</span>
                      <span className="text-sm text-gray-600">{formatCurrency(item.preco)}</span>
                    </button>
                  ))}
                  {filteredItems.length > 10 && (
                    <div className="p-2 text-center text-sm text-gray-500">
                      +{filteredItems.length - 10} mais resultados...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Criar novo */}
          <div className="border-t pt-6">
            <div className="mb-6">
              <h5 className="text-lg font-semibold text-gray-900 mb-2">Criar novo item</h5>
              <p className="text-sm text-gray-600">Preencha os dados abaixo para adicionar um novo {tipo === 'servico' ? 'serviço' : 'produto'}</p>
            </div>
            
            <div className="space-y-6">
              {/* Nome do Item */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do {tipo === 'servico' ? 'Serviço' : 'Produto'} *
                </label>
                <input
                  type="text"
                  placeholder={`Ex: ${tipo === 'servico' ? 'Limpeza de notebook' : 'Tela LCD 15.6"'}`}
                  value={novoItem.nome}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D1FE6E] focus:border-[#D1FE6E] transition-colors"
                />
              </div>

              {/* Preço e Quantidade lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Preço Unitário */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Unitário *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500 text-sm">R$</span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={precoDisplay}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPrecoDisplay(value);
                        const numericValue = parseFloat(value.replace(',', '.')) || 0;
                        setNovoItem(prev => ({ 
                          ...prev, 
                          preco: numericValue,
                          total: numericValue * prev.quantidade
                        }));
                      }}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D1FE6E] focus:border-[#D1FE6E] transition-colors"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Preço por unidade do item</p>
                </div>

                {/* Quantidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="text"
                    placeholder="1"
                    value={quantidadeDisplay}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Só permite números
                      if (value === '' || /^\d+$/.test(value)) {
                        setQuantidadeDisplay(value);
                        const numericValue = parseInt(value) || 1;
                        setNovoItem(prev => ({ 
                          ...prev, 
                          quantidade: numericValue,
                          total: prev.preco * numericValue
                        }));
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D1FE6E] focus:border-[#D1FE6E] transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">Número de unidades</p>
                </div>
              </div>

              {/* Total Calculado */}
              {(novoItem.preco > 0 && novoItem.quantidade > 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Total do item:
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      R$ {((novoItem.preco || 0) * (novoItem.quantidade || 1)).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {novoItem.quantidade} × R$ {(novoItem.preco || 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              )}
            </div>
            {/* Ações */}
            <div className="mt-8 space-y-4">
              {/* Informação sobre as opções */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h6 className="text-sm font-medium text-gray-900 mb-2">Escolha uma opção:</h6>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-black rounded-full mt-1.5 flex-shrink-0"></span>
                    <span><strong>Salvar no catálogo e adicionar:</strong> Salva o item no seu catálogo para reutilizar em outras OS e adiciona nesta OS</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span><strong>Apenas adicionar:</strong> Adiciona somente nesta OS (não salva no catálogo)</span>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={cadastrarNovoItem}
                  disabled={!novoItem.nome.trim() || !precoDisplay.trim() || novoItem.preco <= 0}
                  className="flex-1 h-auto py-4 flex-col"
                  variant="default"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FiPlus size={16} />
                    <span>Salvar no catálogo e adicionar</span>
                  </div>
                  <span className="text-xs opacity-80">Recomendado para itens que você usa frequentemente</span>
                </Button>
                
                <Button
                  onClick={() => adicionarItem()}
                  disabled={!novoItem.nome.trim() || !precoDisplay.trim() || novoItem.preco <= 0}
                  className="flex-1 h-auto py-4 flex-col"
                  variant="secondary"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FiPlus size={16} />
                    <span>Apenas adicionar</span>
                  </div>
                  <span className="text-xs opacity-80">Para itens únicos ou específicos</span>
                </Button>
              </div>

              {/* Botão cancelar */}
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  setNovoItem({ nome: '', preco: 0, quantidade: 1, total: 0 });
                  setPrecoDisplay('');
                  setQuantidadeDisplay('1');
                }}
                className="w-full"
                variant="outline"
              >
                <FiX size={16} className="mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Total */}
      {itens.length > 0 && (
        <div className="border-t pt-4 flex justify-between items-center">
          <span className="font-medium text-gray-900">
            Total {title}: {itens.length} {itens.length === 1 ? 'item' : 'itens'}
          </span>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(calcularTotal())}
          </span>
        </div>
      )}
    </div>
  );
}

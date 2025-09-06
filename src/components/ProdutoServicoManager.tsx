'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { interceptSupabaseQuery } from '@/utils/supabaseInterceptor';
import { FiPlus, FiX, FiEdit2, FiTrash2, FiDollarSign, FiPackage, FiTool } from 'react-icons/fi';

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
    if (!novoItem.nome.trim()) {
      addToast('error', 'Nome é obrigatório');
      return;
    }
    
    if (!usuarioData?.empresa_id) {
      addToast('error', 'Erro: empresa não identificada');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('produtos_servicos')
        .insert({
          nome: novoItem.nome.trim(),
          preco: novoItem.preco,
          tipo: tipo,
          empresa_id: usuarioData.empresa_id
        })
        .select()
        .single();

      if (error) {
        addToast('error', 'Erro ao cadastrar item');
        return;
      }

      // Adicionar à lista local
      setProdutosServicos(prev => [...prev, data]);
      
      // Adicionar ao pedido
      adicionarItem(data);
      
      addToast('success', `${tipo === 'servico' ? 'Serviço' : 'Produto'} cadastrado e adicionado!`);
      
    } catch (error) {
      addToast('error', 'Erro ao salvar');
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
            <div className={`w-10 h-10 bg-${color === 'green' ? 'green' : 'blue'}-100 rounded-lg flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-lg">
                ➕ Adicionar {tipo === 'servico' ? 'Serviço' : 'Produto/Peça'}
              </h4>
              <p className="text-sm text-gray-600">
                Encontre um item existente ou crie um novo
              </p>
            </div>
          </div>
          
          {/* Buscar existente */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🔍 Buscar {tipo === 'servico' ? 'serviço' : 'produto'} existente no catálogo
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={`Digite para buscar ${tipo === 'servico' ? 'serviços' : 'produtos'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-4">📝 Ou criar novo item:</h5>
            
            {/* Layout melhorado com cards e labels claros */}
            <div className="space-y-4">
              {/* Nome do Item */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📌 Nome do {tipo === 'servico' ? 'Serviço' : 'Produto'}
                </label>
                <input
                  type="text"
                  placeholder={`Ex: ${tipo === 'servico' ? 'Limpeza de notebook' : 'Tela LCD 15.6"'}`}
                  value={novoItem.nome}
                  onChange={(e) => setNovoItem(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                />
              </div>

              {/* Preço e Quantidade lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preço Unitário */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-green-700 mb-2">
                    💰 Valor Unitário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={novoItem.preco}
                    onChange={(e) => setNovoItem(prev => ({ 
                      ...prev, 
                      preco: parseFloat(e.target.value) || 0,
                      total: (parseFloat(e.target.value) || 0) * prev.quantidade
                    }))}
                    className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-medium text-green-800"
                  />
                  <p className="text-xs text-green-600 mt-1">Preço por unidade</p>
                </div>

                {/* Quantidade */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    🔢 Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={novoItem.quantidade}
                    onChange={(e) => setNovoItem(prev => ({ 
                      ...prev, 
                      quantidade: parseInt(e.target.value) || 1,
                      total: prev.preco * (parseInt(e.target.value) || 1)
                    }))}
                    className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium text-blue-800"
                  />
                  <p className="text-xs text-blue-600 mt-1">Quantas unidades</p>
                </div>
              </div>

              {/* Total Calculado */}
              {(novoItem.preco > 0 && novoItem.quantidade > 0) && (
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      🧮 Total Calculado:
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      R$ {((novoItem.preco || 0) * (novoItem.quantidade || 1)).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {novoItem.quantidade}x R$ {(novoItem.preco || 0).toFixed(2).replace('.', ',')} = Total acima
                  </p>
                </div>
              )}
            </div>
            {/* Botões de Ação Melhorados */}
            <div className="mt-6 space-y-3">
              {/* Explicação dos botões */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  💡 <strong>Escolha uma opção:</strong>
                </p>
                <ul className="text-xs text-blue-600 mt-2 space-y-1">
                  <li>• <strong>Salvar e Adicionar:</strong> Salva no catálogo para usar depois + adiciona agora</li>
                  <li>• <strong>Apenas Adicionar:</strong> Adiciona só nesta OS (não salva no catálogo)</li>
                </ul>
              </div>

              {/* Botões principais */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={cadastrarNovoItem}
                  disabled={!novoItem.nome.trim() || novoItem.preco <= 0}
                  className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-${color === 'green' ? 'green' : 'blue'}-600 text-white rounded-lg hover:bg-${color === 'green' ? 'green' : 'blue'}-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
                >
                  <FiPlus size={20} />
                  <div className="text-left">
                    <div>💾 Salvar e Adicionar</div>
                    <div className="text-xs opacity-90">Salva no catálogo + adiciona</div>
                  </div>
                </button>
                
                <button
                  onClick={() => adicionarItem()}
                  disabled={!novoItem.nome.trim() || novoItem.preco <= 0}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <FiPlus size={20} />
                  <div className="text-left">
                    <div>📋 Apenas Adicionar</div>
                    <div className="text-xs opacity-90">Só nesta OS</div>
                  </div>
                </button>
              </div>

              {/* Botão cancelar */}
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNovoItem({ nome: '', preco: 0, quantidade: 1, total: 0 });
                }}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <FiX size={16} />
                Cancelar
              </button>
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

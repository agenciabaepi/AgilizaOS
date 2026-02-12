'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
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
  quantidade?: number; // ✅ ADICIONADO: propriedade quantidade opcional
  total?: number; // ✅ ADICIONADO: propriedade total opcional
  tipo: 'produto' | 'servico';
}

// Função para validar se um item é válido (movida para fora do componente)
const isItemValido = (item: Item): boolean => {
  return !!(
    item.nome && 
    item.nome.trim() !== '' && 
    !/^[\d\s]+$/.test(item.nome.trim()) && // Não apenas números
    item.nome.trim().length > 1 // Nome com pelo menos 2 caracteres
  );
};

export default function ProdutoServicoManager({ 
  tipo, 
  itens, 
  onItensChange, 
  readonly = false 
}: ProdutoServicoManagerProps) {
  const { usuarioData, session } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  // Filtrar itens inválidos automaticamente quando itens mudam
  // Usar useRef para evitar loops infinitos
  const prevItensRef = useRef<string>('');
  useEffect(() => {
    const itensStr = JSON.stringify(itens.map(i => ({ nome: i.nome, preco: i.preco, quantidade: i.quantidade })));
    // Só processar se os itens realmente mudaram
    if (prevItensRef.current === itensStr) return;
    prevItensRef.current = itensStr;
    
    const itensValidos = itens.filter(isItemValido);
    // Só atualizar se realmente houver diferença e se houver itens inválidos
    if (itensValidos.length !== itens.length && itens.length > 0) {
      // Usar setTimeout para evitar atualizações síncronas que podem causar loops
      setTimeout(() => {
        onItensChange(itensValidos);
      }, 0);
    }
  }, [itens, onItensChange]);
  
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
  const isServico = tipo === 'servico';
  const iconBgClass = isServico ? 'bg-green-100' : 'bg-blue-100';
  const iconTextClass = isServico ? 'text-green-600' : 'text-blue-600';
  const btnClass = isServico
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  // Filtrar produtos/serviços baseado na busca
  const filteredItems = produtosServicos.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar itens válidos usando useMemo no nível superior
  const itensValidos = useMemo(() => {
    return itens.filter(isItemValido);
  }, [itens]);

  useEffect(() => {
    if (usuarioData?.empresa_id || session) {
      fetchProdutosServicos();
    }
  }, [usuarioData?.empresa_id, session, tipo]);

  const fetchProdutosServicos = async () => {
    if (!usuarioData?.empresa_id) return;

    setLoading(true);
    try {
      const url = `/api/produtos-servicos/listar?empresaId=${encodeURIComponent(usuarioData.empresa_id)}&tipo=${tipo}`;
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin', headers });
      const data = await res.json();

      if (!res.ok) {
        setProdutosServicos([]);
        return;
      }
      const list = Array.isArray(data) ? data : [];
      setProdutosServicos(list.map((row: { id: string; nome: string; preco: number; tipo?: string }) => ({
        id: row.id,
        nome: row.nome,
        preco: typeof row.preco === 'number' ? row.preco : parseFloat(String(row.preco)) || 0,
        tipo: (row.tipo || tipo) as 'produto' | 'servico',
      })));
    } catch (error) {
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
      quantidade: item.quantidade || novoItem.quantidade, // ✅ CORRIGIDO: Usar quantidade do item ou do formulário
      total: (item.preco || 0) * (item.quantidade || novoItem.quantidade || 1) // ✅ CORRIGIDO: Calcular total corretamente
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
    const itemAtual = novosItens[index];
    
    // Garantir que valores numéricos sejam preservados corretamente
    if (campo === 'preco') {
      const novoPreco = typeof valor === 'number' && !isNaN(valor) ? valor : (typeof valor === 'string' ? parseFloat(valor) || itemAtual.preco || 0 : itemAtual.preco || 0);
      novosItens[index] = { 
        ...itemAtual, 
        preco: novoPreco,
        total: novoPreco * (itemAtual.quantidade || 1)
      };
    } else if (campo === 'quantidade') {
      const novaQuantidade = typeof valor === 'number' && !isNaN(valor) && valor > 0 ? valor : (typeof valor === 'string' ? parseInt(valor) || itemAtual.quantidade || 1 : itemAtual.quantidade || 1);
      novosItens[index] = { 
        ...itemAtual, 
        quantidade: novaQuantidade,
        total: (itemAtual.preco || 0) * novaQuantidade
      };
    } else {
      novosItens[index] = { ...itemAtual, [campo]: valor };
    }
    
    onItensChange(novosItens);
  };

  const removerItem = async (index: number) => {
    if (index < 0 || index >= itens.length) {
      return;
    }

    const itemToRemove = itens[index];
    if (!itemToRemove) {
      return;
    }

    const confirmed = await confirm({
      title: 'Remover Item',
      message: `Deseja remover "${itemToRemove.nome}"?`,
      confirmText: 'Remover',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      const novosItens = itens.filter((_, i) => i !== index);
      
      // Garantir que onItensChange é chamado com uma nova referência
      if (onItensChange) {
        onItensChange([...novosItens]);
      }
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
      // Criar item apenas localmente - não tentar salvar no banco
      const novoItemCriado = {
        id: `temp-${Math.random().toString(36).substr(2, 9)}`, // ID temporário único
        nome: novoItem.nome.trim(),
        preco: novoItem.preco,
        quantidade: novoItem.quantidade, // ✅ CORRIGIDO: Incluir quantidade
        total: novoItem.total, // ✅ CORRIGIDO: Incluir total calculado
        tipo: tipo
      };

      // Adicionar à lista local
      setProdutosServicos(prev => [...prev, novoItemCriado]);
      
      // Adicionar ao pedido
      adicionarItem(novoItemCriado);
      
      addToast('success', `${tipo === 'servico' ? 'Serviço' : 'Produto'} adicionado à OS com sucesso!`);
      
      // Limpar formulário
      setNovoItem({ nome: '', preco: 0, quantidade: 1, total: 0 });
      setPrecoDisplay('');
      setQuantidadeDisplay('1');
      setShowAddForm(false);
      
    } catch (error) {
      addToast('error', `Erro ao adicionar item: ${error}`);
    }
  };

  const calcularTotal = () => {
    // Filtrar apenas itens válidos para o cálculo
    const itensValidos = itens.filter(item => 
      item.nome && 
      item.nome.trim() !== '' && 
      !/^[\d\s]+$/.test(item.nome.trim()) && 
      item.nome.trim().length > 1
    );
    
    return itensValidos.reduce((total, item) => {
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

  // Função para formatar preço no input (sem R$)
  const formatarPrecoInput = (value: number): string => {
    if (!value || value === 0) return '';
    // Formatar como número brasileiro sem símbolo de moeda
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (readonly && itens.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg flex-shrink-0 ${iconBgClass}`}>
            <div className={iconTextClass}>{icon}</div>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{title}</h2>
        </div>
        
        {!readonly && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors flex-shrink-0 w-full sm:w-auto min-h-[44px] ${btnClass}`}
          >
            <FiPlus size={18} />
            Adicionar
          </button>
        )}
      </div>

      {/* Buscar produtos/serviços cadastrados (catálogo da empresa) */}
      {!readonly && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Buscar {tipo === 'servico' ? 'serviços' : 'produtos'} cadastrados</p>
          <input
            type="text"
            placeholder={`Digite para buscar ${tipo === 'servico' ? 'serviço' : 'produto'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:ring-[#D1FE6E] focus:border-[#D1FE6E]"
          />
          {!searchTerm.trim() ? (
            <p className="text-xs text-gray-500 mt-2">Digite acima para buscar no catálogo ou use &quot;Adicionar&quot; para criar um novo.</p>
          ) : loading ? (
            <p className="text-xs text-gray-500 mt-2">Carregando...</p>
          ) : filteredItems.length > 0 ? (
            <ul className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {filteredItems.slice(0, 20).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 py-2 px-2 rounded hover:bg-gray-100 text-sm"
                >
                  <span className="flex-1 min-w-0 truncate">{item.nome}</span>
                  <span className="text-gray-600 shrink-0">{formatCurrency(item.preco)}</span>
                  <button
                    type="button"
                    onClick={() => adicionarItem(item)}
                    className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${btnClass}`}
                  >
                    Adicionar
                  </button>
                </li>
              ))}
              {filteredItems.length > 20 && (
                <li className="text-xs text-gray-500 py-1">Digite mais para refinar a busca ({filteredItems.length} itens)</li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-gray-500 mt-2">Nenhum item encontrado. Use &quot;Adicionar&quot; para criar um novo.</p>
          )}
        </div>
      )}

      {/* Lista de itens - filtrar itens inválidos */}
      <div className="space-y-3 mb-4">
        {itensValidos.map((item, filteredIndex) => {
          // Encontrar o índice real no array original para operações de edição/remoção
          const realIndex = itens.findIndex((i, idx) => {
            // Tentar encontrar por ID primeiro
            if (i.id && item.id && i.id === item.id) return true;
            // Se não tiver ID, tentar por nome, preço e quantidade
            if (!i.id && !item.id) {
              return i.nome === item.nome && 
                     i.preco === item.preco && 
                     (i.quantidade || 1) === (item.quantidade || 1);
            }
            return false;
          });
          const index = realIndex >= 0 ? realIndex : filteredIndex;
          
          const preco = typeof item.preco === 'number' ? item.preco : parseFloat(String(item.preco));
          const quantidade = typeof item.quantidade === 'number' ? item.quantidade : parseInt(String(item.quantidade));
          const totalItem = item.total ?? ((isNaN(preco) ? 0 : preco) * (isNaN(quantidade) ? 0 : quantidade));
          const itemKey = item.id || `item-${index}-${item.nome}`;
          return (
          <div key={itemKey} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {/* Nome + delete no topo no mobile; inline no desktop */}
            <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0 order-1">
              <div className="flex-1 min-w-0">
                {editingIndex === index && !readonly ? (
                  <input
                    type="text"
                    value={item.nome}
                    onChange={(e) => editarItem(index, 'nome', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded min-h-[44px]"
                    onBlur={() => setEditingIndex(null)}
                    autoFocus
                  />
                ) : (
                  <div 
                    className="font-medium text-gray-900 cursor-pointer py-1 break-words"
                    onClick={() => !readonly && setEditingIndex(index)}
                  >
                    {item.nome}
                  </div>
                )}
              </div>
              {!readonly && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removerItem(index);
                  }}
                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  type="button"
                  aria-label="Remover item"
                >
                  <FiTrash2 size={18} />
                </button>
              )}
            </div>
            
            {/* Qtd, preço, total: em linha no mobile com labels; inline no desktop */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:flex-nowrap order-2">
              <div className="w-16 sm:w-20">
                {!readonly ? (
                  <input
                    type="number"
                    min="1"
                    value={item.quantidade || 1}
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (valor === '') return;
                      const numValor = parseInt(valor);
                      if (!isNaN(numValor) && numValor > 0) {
                        editarItem(index, 'quantidade', numValor);
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseInt(e.target.value) < 1) {
                        editarItem(index, 'quantidade', item.quantidade || 1);
                      }
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded text-center min-h-[44px]"
                  />
                ) : (
                  <span className="text-sm text-gray-600 block py-1.5">{item.quantidade || 1}x</span>
                )}
              </div>
              
              <div className="flex-1 min-w-[80px] sm:w-24">
                {!readonly ? (
                  <input
                    type="text"
                    value={formatarPrecoInput(item.preco || 0)}
                    onChange={(e) => {
                      let valor = e.target.value;
                      valor = valor.replace(/[^\d,]/g, '');
                      const partes = valor.split(',');
                      if (partes.length > 2) valor = partes[0] + ',' + partes.slice(1).join('');
                      if (partes.length === 2 && partes[1].length > 2) valor = partes[0] + ',' + partes[1].substring(0, 2);
                      let numValor = 0;
                      if (valor.includes(',')) numValor = parseFloat(valor.replace(',', '.'));
                      else if (valor.length > 2) numValor = parseFloat(`${valor.slice(0, -2) || '0'}.${valor.slice(-2)}`);
                      else if (valor.length > 0) numValor = parseFloat(`0.${valor.padStart(2, '0')}`);
                      if (!isNaN(numValor) && numValor >= 0) editarItem(index, 'preco', numValor);
                    }}
                    onBlur={(e) => {
                      const valor = e.target.value;
                      if (valor === '' || valor.trim() === '') {
                        editarItem(index, 'preco', item.preco || 0);
                      } else {
                        let numValor = 0;
                        if (valor.includes(',')) numValor = parseFloat(valor.replace(',', '.'));
                        else if (valor.length > 2) numValor = parseFloat(`${valor.slice(0, -2) || '0'}.${valor.slice(-2)}`);
                        else if (valor.length > 0) numValor = parseFloat(`0.${valor.padStart(2, '0')}`);
                        editarItem(index, 'preco', isNaN(numValor) || numValor < 0 ? item.preco || 0 : numValor);
                      }
                    }}
                    placeholder="0,00"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded text-right min-h-[44px]"
                  />
                ) : (
                  <span className="text-sm text-gray-600 block py-1.5 text-right">{formatCurrency(item.preco || 0)}</span>
                )}
              </div>
              
              <div className="w-20 sm:w-24 text-right flex-shrink-0">
                <span className="font-semibold text-gray-900 text-sm sm:text-base">
                  {formatCurrency(totalItem)}
                </span>
              </div>
            </div>
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
                Crie um novo item para adicionar à OS
              </p>
            </div>
          </div>
          
          {/* Criar novo */}
          <div>
            <div className="mb-6">
              <h5 className="text-lg font-semibold text-gray-900 mb-1">Novo {tipo === 'servico' ? 'Serviço' : 'Produto'}</h5>
              <p className="text-sm text-gray-500 mb-4">Preencha os dados abaixo</p>
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

              {/* Preço e Quantidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="text-lg font-semibold text-gray-900">
                      R$ {((novoItem.preco || 0) * (novoItem.quantidade || 1)).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Ações - Design Simples */}
            <div className="mt-6 space-y-3">
              {/* Botão principal */}
              <Button
                onClick={cadastrarNovoItem}
                disabled={!novoItem.nome.trim() || !precoDisplay.trim() || novoItem.preco <= 0}
                className="w-full py-3 text-base font-medium"
                variant="default"
              >
                <FiPlus size={16} className="mr-2" />
                Adicionar à OS
              </Button>
              
              {/* Botão cancelar */}
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  setNovoItem({ nome: '', preco: 0, quantidade: 1, total: 0 });
                  setPrecoDisplay('');
                  setQuantidadeDisplay('1');
                }}
                className="w-full py-3 text-sm"
                variant="outline"
              >
                <FiX size={14} className="mr-2" />
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

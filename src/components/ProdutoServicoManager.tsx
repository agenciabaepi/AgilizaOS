'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { FiPlus, FiX, FiTrash2, FiPackage, FiTool, FiSearch } from 'react-icons/fi';
import { Button } from './Button';
import { cn } from '@/lib/utils';

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
  quantidade?: number;
  total?: number;
  tipo: 'produto' | 'servico';
}

const isItemValido = (item: Item): boolean =>
  !!(
    item.nome &&
    item.nome.trim() !== '' &&
    !/^[\d\s]+$/.test(item.nome.trim()) &&
    item.nome.trim().length > 1
  );

export default function ProdutoServicoManager({
  tipo,
  itens,
  onItensChange,
  readonly = false,
}: ProdutoServicoManagerProps) {
  const { usuarioData, session } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();

  const prevItensRef = useRef<string>('');
  useEffect(() => {
    const itensStr = JSON.stringify(itens.map((i) => ({ nome: i.nome, preco: i.preco, quantidade: i.quantidade })));
    if (prevItensRef.current === itensStr) return;
    prevItensRef.current = itensStr;

    const itensValidos = itens.filter(isItemValido);
    if (itensValidos.length !== itens.length && itens.length > 0) {
      setTimeout(() => onItensChange(itensValidos), 0);
    }
  }, [itens, onItensChange]);

  const [produtosServicos, setProdutosServicos] = useState<ProdutoServico[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [novoItem, setNovoItem] = useState<Item>({
    nome: '',
    preco: 0,
    quantidade: 1,
    total: 0,
  });
  const [precoDisplay, setPrecoDisplay] = useState('');
  const [quantidadeDisplay, setQuantidadeDisplay] = useState('1');

  const isServico = tipo === 'servico';
  const title = isServico ? 'Serviços' : 'Produtos / Peças';
  const labelSingular = isServico ? 'serviço' : 'produto';
  const accent = isServico
    ? {
        ring: 'focus:ring-emerald-500/20 focus:border-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        iconBg: 'bg-emerald-50 text-emerald-600',
      }
    : {
        ring: 'focus:ring-blue-500/20 focus:border-blue-500',
        badge: 'bg-blue-50 text-blue-700 ring-blue-100',
        btn: 'bg-blue-600 hover:bg-blue-700 text-white',
        iconBg: 'bg-blue-50 text-blue-600',
      };

  const Icon = isServico ? FiTool : FiPackage;

  const filteredItems = produtosServicos.filter((item) =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const itensValidos = useMemo(() => itens.filter(isItemValido), [itens]);

  const sugestoes = useMemo(() => {
    const base = searchTerm.trim()
      ? filteredItems
      : produtosServicos.slice(0, 8);
    return base.slice(0, 12);
  }, [searchTerm, filteredItems, produtosServicos]);

  useEffect(() => {
    if (usuarioData?.empresa_id || session) {
      fetchProdutosServicos();
    }
  }, [usuarioData?.empresa_id, session, tipo]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProdutosServicos = async () => {
    if (!usuarioData?.empresa_id) return;

    setLoading(true);
    try {
      const url = `/api/produtos-servicos/listar?empresaId=${encodeURIComponent(usuarioData.empresa_id)}&tipo=${tipo}`;
      const headers: Record<string, string> = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin', headers });
      const data = await res.json();

      if (!res.ok) {
        setProdutosServicos([]);
        return;
      }
      const list = Array.isArray(data) ? data : [];
      setProdutosServicos(
        list.map((row: { id: string; nome: string; preco: number; tipo?: string }) => ({
          id: row.id,
          nome: row.nome,
          preco: typeof row.preco === 'number' ? row.preco : parseFloat(String(row.preco)) || 0,
          tipo: (row.tipo || tipo) as 'produto' | 'servico',
        }))
      );
    } catch {
      setProdutosServicos([]);
    } finally {
      setLoading(false);
    }
  };

  const adicionarItem = (item: ProdutoServico | null = null) => {
    const novoItemFinal: Item = item
      ? {
          id: item.id,
          nome: item.nome,
          preco: item.preco,
          quantidade: item.quantidade || novoItem.quantidade,
          total: (item.preco || 0) * (item.quantidade || novoItem.quantidade || 1),
        }
      : {
          ...novoItem,
          total: novoItem.preco * novoItem.quantidade,
        };

    onItensChange([...itens, novoItemFinal]);
    setNovoItem({ nome: '', preco: 0, quantidade: 1, total: 0 });
    setShowAddForm(false);
    setSearchTerm('');
    setSearchOpen(false);
  };

  const editarItem = (index: number, campo: keyof Item, valor: unknown) => {
    const novosItens = [...itens];
    const itemAtual = novosItens[index];

    if (campo === 'preco') {
      const novoPreco =
        typeof valor === 'number' && !isNaN(valor)
          ? valor
          : typeof valor === 'string'
            ? parseFloat(valor) || itemAtual.preco || 0
            : itemAtual.preco || 0;
      novosItens[index] = {
        ...itemAtual,
        preco: novoPreco,
        total: novoPreco * (itemAtual.quantidade || 1),
      };
    } else if (campo === 'quantidade') {
      const novaQuantidade =
        typeof valor === 'number' && !isNaN(valor) && valor > 0
          ? valor
          : typeof valor === 'string'
            ? parseInt(valor) || itemAtual.quantidade || 1
            : itemAtual.quantidade || 1;
      novosItens[index] = {
        ...itemAtual,
        quantidade: novaQuantidade,
        total: (itemAtual.preco || 0) * novaQuantidade,
      };
    } else {
      novosItens[index] = { ...itemAtual, [campo]: valor };
    }

    onItensChange(novosItens);
  };

  const removerItem = async (index: number) => {
    if (index < 0 || index >= itens.length) return;
    const itemToRemove = itens[index];
    if (!itemToRemove) return;

    const confirmed = await confirm({
      title: 'Remover item',
      message: `Deseja remover "${itemToRemove.nome}"?`,
      confirmText: 'Remover',
      cancelText: 'Cancelar',
    });

    if (confirmed) {
      onItensChange(itens.filter((_, i) => i !== index));
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
      const novoItemCriado = {
        id: `temp-${Math.random().toString(36).substr(2, 9)}`,
        nome: novoItem.nome.trim(),
        preco: novoItem.preco,
        quantidade: novoItem.quantidade,
        total: novoItem.total,
        tipo,
      };

      setProdutosServicos((prev) => [...prev, novoItemCriado]);
      adicionarItem(novoItemCriado);
      addToast('success', `${isServico ? 'Serviço' : 'Produto'} adicionado à OS!`);

      setNovoItem({ nome: '', preco: 0, quantidade: 1, total: 0 });
      setPrecoDisplay('');
      setQuantidadeDisplay('1');
      setShowAddForm(false);
    } catch (error) {
      addToast('error', `Erro ao adicionar item: ${error}`);
    }
  };

  const calcularTotal = () =>
    itensValidos.reduce((total, item) => {
      const preco = typeof item.preco === 'number' ? item.preco : parseFloat(String(item.preco));
      const quantidade = typeof item.quantidade === 'number' ? item.quantidade : parseInt(String(item.quantidade));
      const totalItem = item.total ?? (isNaN(preco) ? 0 : preco) * (isNaN(quantidade) ? 0 : quantidade);
      return total + (isNaN(totalItem) ? 0 : totalItem);
    }, 0);

  const formatCurrency = (value: number) => {
    const safe = typeof value === 'number' && !isNaN(value) ? value : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safe);
  };

  const formatarPrecoInput = (value: number): string => {
    if (!value || value === 0) return '';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parsePrecoInput = (valor: string, fallback = 0) => {
    if (valor === '' || valor.trim() === '') return fallback;
    if (valor.includes(',')) return parseFloat(valor.replace(',', '.')) || fallback;
    if (valor.length > 2) return parseFloat(`${valor.slice(0, -2) || '0'}.${valor.slice(-2)}`) || fallback;
    if (valor.length > 0) return parseFloat(`0.${valor.padStart(2, '0')}`) || fallback;
    return fallback;
  };

  const abrirFormularioNovo = () => {
    setShowAddForm(true);
    setSearchOpen(false);
    if (searchTerm.trim()) {
      setNovoItem((prev) => ({ ...prev, nome: searchTerm.trim() }));
    }
  };

  const fecharFormulario = () => {
    setShowAddForm(false);
    setNovoItem({ nome: '', preco: 0, quantidade: 1, total: 0 });
    setPrecoDisplay('');
    setQuantidadeDisplay('1');
  };

  if (readonly && itens.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', accent.iconBg)}>
            <Icon size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500">
              {itensValidos.length} {itensValidos.length === 1 ? 'item' : 'itens'} · {formatCurrency(calcularTotal())}
            </p>
          </div>
        </div>
      </div>

      {/* Busca + ações */}
      {!readonly && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex flex-col sm:flex-row gap-2">
            <div ref={searchRef} className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder={`Buscar ${labelSingular} no catálogo...`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className={cn(
                  'w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2',
                  accent.ring
                )}
              />

              {searchOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  {loading ? (
                    <p className="px-4 py-3 text-sm text-gray-500">Carregando catálogo...</p>
                  ) : sugestoes.length > 0 ? (
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {!searchTerm.trim() && (
                        <li className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          Catálogo da empresa
                        </li>
                      )}
                      {sugestoes.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => adicionarItem(item)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
                          >
                            <span className="truncate font-medium text-gray-900">{item.nome}</span>
                            <span className="shrink-0 text-gray-500 tabular-nums">{formatCurrency(item.preco)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-4 text-center">
                      <p className="text-sm text-gray-500">Nenhum {labelSingular} encontrado</p>
                      <button
                        type="button"
                        onClick={abrirFormularioNovo}
                        className="mt-2 text-sm font-medium text-gray-900 hover:underline"
                      >
                        Cadastrar &quot;{searchTerm.trim()}&quot; agora
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => (showAddForm ? fecharFormulario() : abrirFormularioNovo())}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors shrink-0',
                showAddForm
                  ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  : accent.btn
              )}
            >
              {showAddForm ? <FiX size={16} /> : <FiPlus size={16} />}
              {showAddForm ? 'Cancelar' : `Novo ${labelSingular}`}
            </button>
          </div>
        </div>
      )}

      {/* Formulário inline */}
      {showAddForm && !readonly && (
        <div className="px-5 py-4 border-b border-gray-100 bg-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Cadastrar {labelSingular} personalizado
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <input
                type="text"
                placeholder={isServico ? 'Ex: Troca de tela' : 'Ex: Tela LCD iPhone 11'}
                value={novoItem.nome}
                onChange={(e) => setNovoItem((prev) => ({ ...prev, nome: e.target.value }))}
                className={cn('w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2', accent.ring)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Qtd</label>
              <input
                type="text"
                value={quantidadeDisplay}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d+$/.test(value)) {
                    setQuantidadeDisplay(value);
                    const numericValue = parseInt(value) || 1;
                    setNovoItem((prev) => ({
                      ...prev,
                      quantidade: numericValue,
                      total: prev.preco * numericValue,
                    }));
                  }
                }}
                className={cn('w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-center focus:outline-none focus:ring-2', accent.ring)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor unit.</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                <input
                  type="text"
                  placeholder="0,00"
                  value={precoDisplay}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPrecoDisplay(value);
                    const numericValue = parseFloat(value.replace(',', '.')) || 0;
                    setNovoItem((prev) => ({
                      ...prev,
                      preco: numericValue,
                      total: numericValue * prev.quantidade,
                    }));
                  }}
                  className={cn('w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2', accent.ring)}
                />
              </div>
            </div>
            <div className="sm:col-span-2 flex items-end">
              <Button
                type="button"
                onClick={cadastrarNovoItem}
                disabled={!novoItem.nome.trim() || !precoDisplay.trim() || novoItem.preco <= 0}
                className="w-full"
              >
                <FiPlus size={14} className="mr-1.5" />
                Incluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de itens */}
      <div className="px-5 py-4">
        {itensValidos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
            <Icon className="mx-auto mb-2 text-gray-300" size={28} />
            <p className="text-sm text-gray-500">Nenhum {labelSingular} adicionado</p>
            {!readonly && (
              <p className="text-xs text-gray-400 mt-1">Busque no catálogo ou clique em &quot;Novo {labelSingular}&quot;</p>
            )}
          </div>
        ) : (
          <>
            {!readonly && (
              <div className="hidden sm:grid sm:grid-cols-[1fr_72px_96px_96px_40px] gap-3 px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                <span>Descrição</span>
                <span className="text-center">Qtd</span>
                <span className="text-right">Unit.</span>
                <span className="text-right">Total</span>
                <span />
              </div>
            )}

            <div className="space-y-2">
              {itensValidos.map((item) => {
                const realIndex = itens.findIndex((i) => {
                  if (i.id && item.id && i.id === item.id) return true;
                  if (!i.id && !item.id) {
                    return (
                      i.nome === item.nome &&
                      i.preco === item.preco &&
                      (i.quantidade || 1) === (item.quantidade || 1)
                    );
                  }
                  return false;
                });
                const index = realIndex >= 0 ? realIndex : itensValidos.indexOf(item);

                const preco = typeof item.preco === 'number' ? item.preco : parseFloat(String(item.preco));
                const quantidade = typeof item.quantidade === 'number' ? item.quantidade : parseInt(String(item.quantidade));
                const totalItem = item.total ?? (isNaN(preco) ? 0 : preco) * (isNaN(quantidade) ? 0 : quantidade);
                const itemKey = item.id || `item-${index}-${item.nome}`;

                return (
                  <div
                    key={itemKey}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_72px_96px_96px_40px] gap-2 sm:gap-3 sm:items-center rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="sm:hidden text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Descrição</p>
                      {readonly ? (
                        <p className="text-sm font-medium text-gray-900 break-words">{item.nome}</p>
                      ) : (
                        <input
                          type="text"
                          value={item.nome}
                          onChange={(e) => editarItem(index, 'nome', e.target.value)}
                          className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-gray-900 hover:border-gray-200 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                        />
                      )}
                    </div>

                    <div>
                      <p className="sm:hidden text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Qtd</p>
                      {readonly ? (
                        <p className="text-sm text-gray-600 sm:text-center">{item.quantidade || 1}</p>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          value={item.quantidade || 1}
                          onChange={(e) => {
                            const num = parseInt(e.target.value);
                            if (!isNaN(num) && num > 0) editarItem(index, 'quantidade', num);
                          }}
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                        />
                      )}
                    </div>

                    <div>
                      <p className="sm:hidden text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Unit.</p>
                      {readonly ? (
                        <p className="text-sm text-gray-600 sm:text-right tabular-nums">{formatCurrency(item.preco || 0)}</p>
                      ) : (
                        <input
                          type="text"
                          value={formatarPrecoInput(item.preco || 0)}
                          onChange={(e) => {
                            let valor = e.target.value.replace(/[^\d,]/g, '');
                            const partes = valor.split(',');
                            if (partes.length > 2) valor = partes[0] + ',' + partes.slice(1).join('');
                            if (partes.length === 2 && partes[1].length > 2) valor = partes[0] + ',' + partes[1].substring(0, 2);
                            const numValor = parsePrecoInput(valor, item.preco || 0);
                            if (!isNaN(numValor) && numValor >= 0) editarItem(index, 'preco', numValor);
                          }}
                          onBlur={(e) => editarItem(index, 'preco', parsePrecoInput(e.target.value, item.preco || 0))}
                          placeholder="0,00"
                          className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                        />
                      )}
                    </div>

                    <div>
                      <p className="sm:hidden text-[10px] font-semibold uppercase text-gray-400 mb-0.5">Total</p>
                      <p className="text-sm font-semibold text-gray-900 sm:text-right tabular-nums">{formatCurrency(totalItem)}</p>
                    </div>

                    {!readonly && (
                      <div className="flex sm:justify-center">
                        <button
                          type="button"
                          onClick={() => removerItem(index)}
                          className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          aria-label="Remover item"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer total */}
      {itensValidos.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-5 py-3">
          <span className="text-sm text-gray-600">
            Subtotal · {itensValidos.length} {itensValidos.length === 1 ? 'item' : 'itens'}
          </span>
          <span className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(calcularTotal())}</span>
        </div>
      )}
    </div>
  );
}

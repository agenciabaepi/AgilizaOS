'use client';

import React from 'react';
import { FiSearch, FiMoreVertical } from 'react-icons/fi';
import { ItemCarrinho, ProdutoPDV } from './types';
import { calcularTotalItem, formatCurrency } from './utils';

const inputClass =
  'w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand';
const inputReadonlyClass =
  'w-full px-3 py-2.5 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-600';

interface PainelProdutosProps {
  buscaContainerRef: React.RefObject<HTMLDivElement | null>;
  buscaProduto: string;
  onBuscaProdutoChange: (v: string) => void;
  onBuscaProdutoKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  produtosSugeridos: ProdutoPDV[];
  showSugestoes: boolean;
  buscandoProdutos: boolean;
  erroBuscaProdutos: string | null;
  indiceDestaque: number;
  onSelecionarProduto: (p: ProdutoPDV) => void;
  quantidade: number;
  onQuantidadeChange: (q: number) => void;
  valorUnitario: number;
  valorLinha: number;
  onInserir: () => void;
  itens: ItemCarrinho[];
  onRemoverItem: (id: string) => void;
  onEditarItem: (id: string, campo: 'desconto' | 'acrescimo', valor: number) => void;
  totalItens: number;
  subtotal: number;
  totalDescontos: number;
  totalAcrescimos: number;
  totalGeral: number;
  inputBuscaRef: React.RefObject<HTMLInputElement | null>;
}

export function PainelProdutos({
  buscaContainerRef,
  buscaProduto,
  onBuscaProdutoChange,
  onBuscaProdutoKeyDown,
  produtosSugeridos,
  showSugestoes,
  buscandoProdutos,
  erroBuscaProdutos,
  indiceDestaque,
  onSelecionarProduto,
  quantidade,
  onQuantidadeChange,
  valorUnitario,
  valorLinha,
  onInserir,
  itens,
  onRemoverItem,
  onEditarItem,
  totalItens,
  subtotal,
  totalDescontos,
  totalAcrescimos,
  totalGeral,
  inputBuscaRef,
}: PainelProdutosProps) {
  const [menuAberto, setMenuAberto] = React.useState<string | null>(null);

  const exibirDropdown = showSugestoes && buscaProduto.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-zinc-200/80">
      <div className="p-4 border-b border-zinc-100 relative z-30" ref={buscaContainerRef}>
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-5 relative">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Produto/Código</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                ref={inputBuscaRef}
                type="text"
                value={buscaProduto}
                onChange={(e) => onBuscaProdutoChange(e.target.value)}
                onKeyDown={onBuscaProdutoKeyDown}
                onFocus={() => buscaProduto.trim() && onBuscaProdutoChange(buscaProduto)}
                placeholder="Nome, código ou código de barras..."
                autoComplete="off"
                className={`${inputClass} pl-9 pr-3`}
              />
            </div>
            {exibirDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                {buscandoProdutos ? (
                  <div className="px-4 py-6 text-center text-sm text-zinc-500">
                    <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Buscando produtos...
                  </div>
                ) : erroBuscaProdutos ? (
                  <div className="px-4 py-4 text-sm text-red-600 text-center">{erroBuscaProdutos}</div>
                ) : produtosSugeridos.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-zinc-400 text-center">
                    Nenhum produto encontrado
                  </div>
                ) : (
                  produtosSugeridos.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelecionarProduto(p)}
                      className={`w-full text-left px-3 py-2.5 border-b border-zinc-50 last:border-0 transition-colors ${
                        idx === indiceDestaque ? 'bg-brand-surface' : 'hover:bg-brand-surface'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">{p.nome}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {[p.codigo && `#${p.codigo}`, p.codigo_barras && `EAN ${p.codigo_barras}`, p.categoria, p.marca]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        <span className="text-sm text-zinc-900 font-semibold shrink-0">
                          {formatCurrency(p.preco)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Quantidade</label>
            <input
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => onQuantidadeChange(Math.max(1, parseInt(e.target.value) || 1))}
              className={`${inputClass} text-center`}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Valor unitário</label>
            <input type="text" readOnly value={formatCurrency(valorUnitario)} className={`${inputReadonlyClass} text-right`} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Valor total</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(valorLinha)}
              className={`${inputReadonlyClass} text-right font-medium text-zinc-800`}
            />
          </div>
          <div className="col-span-1">
            <button
              type="button"
              onClick={onInserir}
              className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              Inserir
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-50/95 backdrop-blur-sm z-10">
            <tr className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              <th className="px-4 py-3">Item</th>
              <th className="px-3 py-3 text-center w-16">Qt.</th>
              <th className="px-3 py-3 text-right w-28">Valor unit.</th>
              <th className="px-3 py-3 text-right w-24">Desconto</th>
              <th className="px-3 py-3 text-right w-24">Acréscimo</th>
              <th className="px-3 py-3 text-right w-28">Valor total</th>
              <th className="px-3 py-3 w-12">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-zinc-400">
                  Nenhum item adicionado. Busque um produto para começar.
                </td>
              </tr>
            ) : (
              itens.map((item) => (
                <tr key={item.id} className="border-t border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{item.nome}</td>
                  <td className="px-3 py-3 text-center text-zinc-600">{item.qty}</td>
                  <td className="px-3 py-3 text-right text-zinc-600">{formatCurrency(item.preco)}</td>
                  <td className="px-3 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.desconto || ''}
                      onChange={(e) => onEditarItem(item.id, 'desconto', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-right bg-transparent border border-transparent hover:border-zinc-200 focus:border-brand rounded text-sm"
                      placeholder="0,00"
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.acrescimo || ''}
                      onChange={(e) => onEditarItem(item.id, 'acrescimo', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-right bg-transparent border border-transparent hover:border-zinc-200 focus:border-brand rounded text-sm"
                      placeholder="0,00"
                    />
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-zinc-900">
                    {formatCurrency(calcularTotalItem(item))}
                  </td>
                  <td className="px-3 py-3 relative">
                    <button
                      type="button"
                      onClick={() => setMenuAberto(menuAberto === item.id ? null : item.id)}
                      className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-500 transition-colors"
                    >
                      <FiMoreVertical size={16} />
                    </button>
                    {menuAberto === item.id && (
                      <div className="absolute right-2 top-10 z-20 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                        <button
                          type="button"
                          onClick={() => { onRemoverItem(item.id); setMenuAberto(null); }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-zinc-100">
        <div className="grid grid-cols-4 gap-3 p-4">
          {[
            { label: 'Itens', value: String(totalItens) },
            { label: 'Subtotal', value: formatCurrency(subtotal) },
            { label: 'Descontos', value: formatCurrency(totalDescontos) },
            { label: 'Acréscimos', value: formatCurrency(totalAcrescimos) },
          ].map((box) => (
            <div key={box.label} className="bg-zinc-50 rounded-lg px-4 py-3 text-center border border-zinc-100">
              <p className="text-xs text-zinc-500 font-medium">{box.label}</p>
              <p className="text-sm font-bold text-zinc-900 mt-0.5">{box.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-brand px-6 py-4 flex items-center justify-between border-t border-black/5">
          <span className="text-sm font-semibold text-black/70">Total da venda</span>
          <span className="text-3xl font-bold text-black tracking-tight">{formatCurrency(totalGeral)}</span>
        </div>
      </div>
    </div>
  );
}

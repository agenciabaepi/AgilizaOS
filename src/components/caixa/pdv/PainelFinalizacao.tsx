'use client';

import React from 'react';
import {
  FiCreditCard,
  FiSearch,
  FiUser,
  FiX,
  FiPlus,
  FiDollarSign,
  FiSmartphone,
} from 'react-icons/fi';
import { ClientePDV, FORMAS_PAGAMENTO, PagamentoAplicado } from './types';
import { formatCPF, formatCurrency } from './utils';

const inputClass =
  'w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand';

const acaoRodapeClass =
  'w-full min-w-0 min-h-[52px] px-1.5 py-2 rounded-lg text-[11px] font-semibold transition-colors flex flex-col items-center justify-center text-center leading-tight';

interface PainelFinalizacaoProps {
  empresaNome?: string;
  usuarioNome?: string;
  buscaCliente: string;
  onBuscaClienteChange: (v: string) => void;
  clientesSugeridos: ClientePDV[];
  showClientes: boolean;
  onSelecionarCliente: (c: ClientePDV) => void;
  clienteSelecionado: ClientePDV | null;
  onLimparCliente: () => void;
  cpf: string;
  onCpfChange: (v: string) => void;
  endereco: string;
  observacao: string;
  onObservacaoChange: (v: string) => void;
  valorAPagar: number;
  tipoAjuste: 'desconto' | 'acrescimo';
  onTipoAjusteChange: (t: 'desconto' | 'acrescimo') => void;
  valorAjuste: string;
  onValorAjusteChange: (v: string) => void;
  onInserirAjuste: () => void;
  descontoVenda: number;
  acrescimoVenda: number;
  pagamentos: PagamentoAplicado[];
  onAdicionarPagamento: (metodo: string) => void;
  onRemoverPagamento: (id: string) => void;
  valorPagamentoInput: string;
  onValorPagamentoInputChange: (v: string) => void;
  metodoSelecionado: string;
  onMetodoSelecionadoChange: (m: string) => void;
  totalRecebido: number;
  restante: number;
  troco: number;
  onCancelarVenda: () => void;
  onFinalizarVenda: () => void;
  onSair: () => void;
  onTelaCheia: () => void;
  onBuscarProduto: () => void;
  finalizando: boolean;
  inputClienteRef: React.RefObject<HTMLInputElement | null>;
}

const iconesPagamento: Record<string, React.ReactNode> = {
  dinheiro: <FiDollarSign size={18} />,
  pix: <FiSmartphone size={18} />,
  credito: <FiCreditCard size={18} />,
  debito: <FiCreditCard size={18} />,
};

export function PainelFinalizacao({
  empresaNome,
  usuarioNome,
  buscaCliente,
  onBuscaClienteChange,
  clientesSugeridos,
  showClientes,
  onSelecionarCliente,
  clienteSelecionado,
  onLimparCliente,
  cpf,
  onCpfChange,
  endereco,
  observacao,
  onObservacaoChange,
  valorAPagar,
  tipoAjuste,
  onTipoAjusteChange,
  valorAjuste,
  onValorAjusteChange,
  onInserirAjuste,
  descontoVenda,
  acrescimoVenda,
  pagamentos,
  onAdicionarPagamento,
  onRemoverPagamento,
  valorPagamentoInput,
  onValorPagamentoInputChange,
  metodoSelecionado,
  onMetodoSelecionadoChange,
  totalRecebido,
  restante,
  troco,
  onCancelarVenda,
  onFinalizarVenda,
  onSair,
  onTelaCheia,
  onBuscarProduto,
  finalizando,
  inputClienteRef,
}: PainelFinalizacaoProps) {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-zinc-200/80 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-surface rounded-lg border border-brand-muted">
            <FiCreditCard className="text-black" size={18} />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Finalizar a venda</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400 hidden sm:block">{empresaNome || 'sua marca.'}</span>
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold">
            {usuarioNome?.charAt(0)?.toUpperCase() || <FiUser size={16} />}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4 min-h-0">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Cliente/Código <span className="text-zinc-400">(Ctrl+1)</span>
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
              <input
                ref={inputClienteRef}
                type="text"
                value={buscaCliente}
                onChange={(e) => onBuscaClienteChange(e.target.value)}
                placeholder="Buscar cliente..."
                className={`${inputClass} pl-9 pr-8`}
              />
              {clienteSelecionado && (
                <button
                  type="button"
                  onClick={onLimparCliente}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>
            {showClientes && clientesSugeridos.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {clientesSugeridos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelecionarCliente(c)}
                    className="w-full text-left px-3 py-2 hover:bg-brand-surface border-b border-zinc-50 last:border-0 text-sm"
                  >
                    <span className="font-medium text-zinc-900">{c.nome}</span>
                    {c.documento && <span className="text-zinc-400 ml-2 text-xs">{c.documento}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              CPF <span className="text-zinc-400">(Ctrl+2)</span>
            </label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => onCpfChange(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {endereco && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-muted rounded-full text-xs text-zinc-700">
              {endereco}
            </span>
          )}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={observacao}
              onChange={(e) => onObservacaoChange(e.target.value)}
              placeholder="Observação..."
              className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Valor a pagar <span className="text-zinc-400">(Ctrl+3)</span>
          </label>
          <input
            type="text"
            readOnly
            value={formatCurrency(valorAPagar)}
            className="w-full px-4 py-3 bg-brand-surface border border-brand-muted rounded-lg text-xl font-bold text-black text-center"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Desconto/Acréscimo <span className="text-zinc-400">(Ctrl+4)</span>
          </label>
          <div className="flex gap-2">
            <select
              value={tipoAjuste}
              onChange={(e) => onTipoAjusteChange(e.target.value as 'desconto' | 'acrescimo')}
              className={`${inputClass} w-auto`}
            >
              <option value="desconto">Desconto</option>
              <option value="acrescimo">Acréscimo</option>
            </select>
            <input
              type="text"
              value={valorAjuste}
              onChange={(e) => onValorAjusteChange(e.target.value)}
              placeholder="0,00"
              className={`${inputClass} flex-1 text-right`}
            />
            <button
              type="button"
              onClick={onInserirAjuste}
              className="px-4 py-2.5 bg-black hover:bg-neutral-800 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Inserir
            </button>
          </div>
          {(descontoVenda > 0 || acrescimoVenda > 0) && (
            <div className="flex gap-3 mt-2 text-xs text-zinc-500">
              {descontoVenda > 0 && <span>Desconto: -{formatCurrency(descontoVenda)}</span>}
              {acrescimoVenda > 0 && <span>Acréscimo: +{formatCurrency(acrescimoVenda)}</span>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-2">Forma de pagamento</p>
            <div className="space-y-1.5">
              {FORMAS_PAGAMENTO.map((fp) => (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => onMetodoSelecionadoChange(fp.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    metodoSelecionado === fp.id
                      ? 'bg-brand text-black font-medium shadow-sm border border-black/10'
                      : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                  }`}
                >
                  {iconesPagamento[fp.id]}
                  <span className="flex-1 text-left">{fp.label}</span>
                  <span className={`text-xs ${metodoSelecionado === fp.id ? 'text-black/50' : 'text-zinc-400'}`}>
                    ({fp.shortcut})
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => onAdicionarPagamento(metodoSelecionado)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-black text-white hover:bg-neutral-800 transition-colors"
              >
                <FiPlus size={16} />
                Adicionar <span className="text-white/50 text-xs">(Alt+5)</span>
              </button>
            </div>
            <input
              type="text"
              value={valorPagamentoInput}
              onChange={(e) => onValorPagamentoInputChange(e.target.value)}
              placeholder="Valor do pagamento"
              className={`${inputClass} mt-2 text-right`}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-2">Pagamentos aplicados</p>
            <div className="space-y-1.5 min-h-[160px]">
              {pagamentos.length === 0 ? (
                <p className="text-xs text-zinc-400 py-8 text-center">Nenhum pagamento adicionado</p>
              ) : (
                pagamentos.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100 text-sm"
                  >
                    <span className="text-zinc-700">{p.metodo}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">{formatCurrency(p.valor)}</span>
                      <button
                        type="button"
                        onClick={() => onRemoverPagamento(p.id)}
                        className="text-red-400 hover:text-red-600 p-0.5"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-50 rounded-lg px-4 py-3 text-center border border-zinc-100">
            <p className="text-xs text-zinc-500">Recebido</p>
            <p className="text-lg font-bold text-zinc-900">{formatCurrency(totalRecebido)}</p>
          </div>
          <div className="bg-zinc-50 rounded-lg px-4 py-3 text-center border border-zinc-100">
            <p className="text-xs text-zinc-500">Restante</p>
            <p className={`text-lg font-bold ${restante > 0 ? 'text-orange-600' : 'text-black'}`}>
              {formatCurrency(restante)}
            </p>
          </div>
          <div className="bg-brand-light rounded-lg px-4 py-3 text-center border border-black/10">
            <p className="text-xs text-black/60 font-medium">Troco</p>
            <p className="text-lg font-bold text-black">{formatCurrency(troco)}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-100 p-4 space-y-2 shrink-0">
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'NFCe', sub: 'F1' },
            { label: 'PV', sub: 'F2' },
            { label: 'NFe', sub: 'F4' },
            { label: 'Consultar', sub: 'F8' },
            { label: 'Cancelar', sub: 'F7', danger: true },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              className={`${acaoRodapeClass} ${
                btn.danger
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-black hover:bg-neutral-800 text-white'
              }`}
            >
              <span className="block truncate w-full">{btn.label}</span>
              <span className="block text-[10px] opacity-70">({btn.sub})</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            onClick={onCancelarVenda}
            className={`${acaoRodapeClass} bg-black hover:bg-neutral-800 text-white`}
          >
            <span className="block truncate w-full">Cancelar venda</span>
            <span className="block text-[10px] opacity-70">(F9)</span>
          </button>
          <button
            type="button"
            onClick={() => inputClienteRef.current?.focus()}
            className={`${acaoRodapeClass} bg-zinc-800 hover:bg-zinc-900 text-white`}
          >
            <span className="block truncate w-full">Buscar cliente</span>
          </button>
          <button
            type="button"
            onClick={onBuscarProduto}
            className={`${acaoRodapeClass} bg-zinc-800 hover:bg-zinc-900 text-white`}
          >
            <span className="block truncate w-full">Buscar produto</span>
          </button>
          <button
            type="button"
            onClick={onTelaCheia}
            className={`${acaoRodapeClass} bg-zinc-800 hover:bg-zinc-900 text-white`}
          >
            <span className="block truncate w-full">Tela cheia</span>
            <span className="block text-[10px] opacity-70">(F11)</span>
          </button>
          <button
            type="button"
            onClick={onSair}
            className={`${acaoRodapeClass} bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300`}
          >
            <span className="block truncate w-full">Sair</span>
            <span className="block text-[10px] opacity-70">(ESC)</span>
          </button>
        </div>
        <button
          type="button"
          onClick={onFinalizarVenda}
          disabled={finalizando || valorAPagar <= 0}
          className="w-full min-h-[48px] py-3 bg-brand hover:bg-brand-hover disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm transition-colors shadow-sm border border-black/10"
        >
          {finalizando ? 'Finalizando...' : 'Confirmar venda'}
        </button>
      </div>
    </div>
  );
}

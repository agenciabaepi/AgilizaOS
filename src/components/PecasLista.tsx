'use client';

import { useMemo, useState } from 'react';
import { FiPackage, FiSearch } from 'react-icons/fi';
import type { PecaCatalogo } from '@/types/pecas';
import { isUltimaPeca, isUltimasPecas } from '@/lib/pecas-estoque';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function EstoqueBadge({ estoque, estoqueMin }: { estoque: number; estoqueMin?: number }) {
  if (isUltimaPeca(estoque)) {
    return (
      <span className="text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">
        Última peça!
      </span>
    );
  }
  if (isUltimasPecas(estoque, estoqueMin)) {
    return (
      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">
        Últimas peças
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
      Em estoque
    </span>
  );
}

function FornecedorLinha({ peca }: { peca: PecaCatalogo }) {
  const nome = peca.fornecedor?.nome || peca.marca;
  const logo = peca.fornecedor?.imagem_url;
  if (!nome && !peca.modelo_compativel) return null;

  return (
    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={nome || 'Fornecedor'}
          className="w-4 h-4 object-contain shrink-0"
        />
      ) : null}
      <p className="text-xs text-zinc-500 line-clamp-1">
        {[nome, peca.modelo_compativel].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

export default function PecasLista({
  pecas,
  emptyText = 'Nenhuma peça disponível.',
}: {
  pecas: PecaCatalogo[];
  emptyText?: string;
}) {
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pecas;
    return pecas.filter((p) =>
      [
        p.nome,
        p.codigo,
        p.marca,
        p.fornecedor?.nome,
        p.modelo_compativel,
        p.categoria?.nome,
        p.subcategoria?.nome,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [pecas, busca]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar peça, modelo..."
          className="w-full pl-9 pr-3 py-3 rounded-xl border border-zinc-200 bg-white text-sm outline-none focus:border-zinc-400"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-200 p-8 text-center text-sm text-zinc-500">
          {emptyText}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtradas.map((peca) => (
            <li
              key={peca.id}
              className="bg-white border border-zinc-200 rounded-2xl p-3.5 flex gap-3 shadow-sm"
            >
              <div className="w-20 h-20 shrink-0 rounded-xl bg-zinc-100 overflow-hidden flex items-center justify-center">
                {peca.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={peca.imagem_url}
                    alt={peca.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiPackage className="w-8 h-8 text-zinc-300" />
                )}
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-semibold text-[15px] leading-snug line-clamp-2">{peca.nome}</h2>
                  <FornecedorLinha peca={peca} />
                  {(peca.categoria?.nome || peca.subcategoria?.nome) && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {[peca.categoria?.nome, peca.subcategoria?.nome].filter(Boolean).join(' / ')}
                    </p>
                  )}
                </div>
                <div className="flex items-end justify-between gap-2 mt-2">
                  <span className="text-base font-bold tracking-tight">
                    {formatMoney(Number(peca.preco))}
                  </span>
                  <EstoqueBadge estoque={peca.estoque} estoqueMin={peca.estoque_min} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

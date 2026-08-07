'use client';

import { useMemo, useState } from 'react';
import { FiPackage, FiSearch } from 'react-icons/fi';
import type { PecaCatalogo, PecaSubcategoriaCatalogo } from '@/types/pecas';
import { isUltimaPeca, isUltimasPecas } from '@/lib/pecas-estoque';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type GrupoTipo = {
  key: string;
  nome: string;
  ordem: number;
  pecas: PecaCatalogo[];
};

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

function PecaCard({ peca }: { peca: PecaCatalogo }) {
  const fornecedorNome = peca.fornecedor?.nome || peca.marca;
  const fornecedorLogo = peca.fornecedor?.imagem_url;

  return (
    <li className="bg-white border border-zinc-200 rounded-2xl p-3.5 flex gap-3 shadow-sm">
      <div className="w-20 h-20 shrink-0 rounded-xl bg-zinc-100 overflow-hidden flex items-center justify-center">
        {peca.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={peca.imagem_url} alt={peca.nome} className="w-full h-full object-cover" />
        ) : (
          <FiPackage className="w-8 h-8 text-zinc-300" />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <div>
          <h2 className="font-semibold text-[15px] leading-snug line-clamp-2">{peca.nome}</h2>
          {(fornecedorNome || peca.modelo_compativel) && (
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {fornecedorLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fornecedorLogo}
                  alt={fornecedorNome || 'Fornecedor'}
                  className="w-4 h-4 object-contain shrink-0"
                />
              ) : null}
              <p className="text-xs text-zinc-500 line-clamp-1">
                {[fornecedorNome, peca.modelo_compativel].filter(Boolean).join(' · ')}
              </p>
            </div>
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
  );
}

/** Lista com busca, agrupada por tipo (OLED, Incell, Vivid…). */
export default function PecasListaAgrupada({
  pecas,
  subcategorias = [],
  searchPlaceholder = 'Buscar modelo, ex: iPhone 11',
  emptyText = 'Nenhuma peça disponível.',
}: {
  pecas: PecaCatalogo[];
  subcategorias?: PecaSubcategoriaCatalogo[];
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pecas;
    return pecas.filter((p) =>
      [p.nome, p.codigo, p.marca, p.fornecedor?.nome, p.modelo_compativel, p.subcategoria?.nome]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [pecas, busca]);

  const grupos = useMemo((): GrupoTipo[] => {
    const ordemMap = new Map(subcategorias.map((s, i) => [s.id, s.ordem ?? i]));
    const nomeMap = new Map(subcategorias.map((s) => [s.id, s.nome]));
    const buckets = new Map<string, GrupoTipo>();

    for (const peca of filtradas) {
      const id = peca.subcategoria_id || '__sem_tipo__';
      const nome =
        peca.subcategoria?.nome ||
        nomeMap.get(id) ||
        (id === '__sem_tipo__' ? 'Outros' : 'Tipo');
      const ordem =
        id === '__sem_tipo__'
          ? 9999
          : (ordemMap.get(id) ?? peca.subcategoria?.ordem ?? 500);

      if (!buckets.has(id)) {
        buckets.set(id, { key: id, nome, ordem, pecas: [] });
      }
      buckets.get(id)!.pecas.push(peca);
    }

    return Array.from(buckets.values()).sort((a, b) => {
      if (a.ordem !== b.ordem) return a.ordem - b.ordem;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [filtradas, subcategorias]);

  return (
    <div className="space-y-4">
      <div className="relative sticky top-14 z-[5] -mx-4 px-4 py-2 bg-zinc-100/95 backdrop-blur">
        <FiSearch className="absolute left-7 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-3 rounded-xl border border-zinc-200 bg-white text-sm outline-none focus:border-zinc-400 shadow-sm"
        />
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-2xl bg-white border border-zinc-200 p-8 text-center text-sm text-zinc-500">
          {busca.trim() ? `Nenhum resultado para “${busca.trim()}”.` : emptyText}
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map((grupo) => (
            <section key={grupo.key}>
              <div className="sticky top-[7.25rem] z-[4] -mx-1 mb-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white shadow-sm">
                  <span className="text-sm font-semibold tracking-wide uppercase">
                    {grupo.nome}
                  </span>
                  <span className="text-[11px] text-white/50 ml-auto">
                    {grupo.pecas.length}{' '}
                    {grupo.pecas.length === 1 ? 'peça' : 'peças'}
                  </span>
                </div>
              </div>
              <ul className="space-y-3">
                {grupo.pecas.map((peca) => (
                  <PecaCard key={peca.id} peca={peca} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { FiCpu, FiDollarSign, FiInfo, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import type { AparelhoInfoIA } from '@/types/aparelhos';

interface NovaOSAparelhoInfoIAProps {
  data: AparelhoInfoIA | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  marca: string;
  modelo: string;
}

function SkeletonLine({ w = 'w-full' }: { w?: string }) {
  return <div className={`h-3.5 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse ${w}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5 p-3">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
        <SkeletonLine w="w-40" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <SkeletonLine w="w-16" />
            <SkeletonLine w="w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}

export default function NovaOSAparelhoInfoIA({
  data,
  loading,
  error,
  onRetry,
}: NovaOSAparelhoInfoIAProps) {
  const [expanded, setExpanded] = useState(true);

  if (!loading && !data && !error) return null;

  return (
    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-800/50 bg-gradient-to-b from-indigo-50/60 via-white to-white dark:from-indigo-950/40 dark:via-zinc-900 dark:to-zinc-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <HiSparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 truncate">
            Informações via IA
          </span>
          {loading && (
            <span className="text-[11px] text-indigo-400 dark:text-indigo-400/80 animate-pulse">Buscando...</span>
          )}
        </div>
        {expanded ? (
          <FiChevronUp className="w-3.5 h-3.5 text-indigo-400" />
        ) : (
          <FiChevronDown className="w-3.5 h-3.5 text-indigo-400" />
        )}
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5">
          {loading && <LoadingSkeleton />}

          {error && !loading && (
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800/60">
              <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 px-2 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shrink-0"
              >
                <FiRefreshCw className="w-3 h-3" />
                Tentar
              </button>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-3">
              {data.descricao && (
                <div className="flex items-start gap-1.5">
                  <FiInfo className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">{data.descricao}</p>
                </div>
              )}

              {data.preco_medio && (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60">
                  <FiDollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatBRL(data.preco_medio.min)} – {formatBRL(data.preco_medio.max)}
                    </p>
                    <p className="text-[10px] text-emerald-500 dark:text-emerald-400/80">Usado/seminovo (valor aproximado)</p>
                  </div>
                </div>
              )}

              {Object.keys(data.especificacoes).length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FiCpu className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                      Especificações
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(data.especificacoes).map(([key, value]) => (
                      <div key={key} className="flex items-baseline justify-between gap-2 min-w-0">
                        <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wide shrink-0">
                          {key}
                        </span>
                        <span className="text-[11px] text-gray-700 dark:text-zinc-200 text-right truncate" title={value}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.ano_lancamento && (
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                  Lançamento: {data.ano_lancamento}
                </p>
              )}

              <p className="text-[9px] text-gray-300 dark:text-zinc-600 text-right">
                Dados via IA — podem conter imprecisões
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

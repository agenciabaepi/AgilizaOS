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
  return <div className={`h-3.5 bg-gray-200 rounded animate-pulse ${w}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5 p-3">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
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
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 via-white to-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-indigo-50/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <HiSparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="text-xs font-semibold text-indigo-700 truncate">
            Informações via IA
          </span>
          {loading && (
            <span className="text-[11px] text-indigo-400 animate-pulse">Buscando...</span>
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
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-red-50 border border-red-100">
              <p className="text-xs text-red-600">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors shrink-0"
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
                  <FiInfo className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600 leading-relaxed">{data.descricao}</p>
                </div>
              )}

              {data.preco_medio && (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                  <FiDollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-emerald-700">
                      {formatBRL(data.preco_medio.min)} – {formatBRL(data.preco_medio.max)}
                    </p>
                    <p className="text-[10px] text-emerald-500">Usado/seminovo (valor aproximado)</p>
                  </div>
                </div>
              )}

              {Object.keys(data.especificacoes).length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FiCpu className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      Especificações
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(data.especificacoes).map(([key, value]) => (
                      <div key={key} className="flex items-baseline justify-between gap-2 min-w-0">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide shrink-0">
                          {key}
                        </span>
                        <span className="text-[11px] text-gray-700 text-right truncate" title={value}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.ano_lancamento && (
                <p className="text-[10px] text-gray-400">
                  Lançamento: {data.ano_lancamento}
                </p>
              )}

              <p className="text-[9px] text-gray-300 text-right">
                Dados via IA — podem conter imprecisões
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

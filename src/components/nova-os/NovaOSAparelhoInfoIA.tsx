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
  return <div className={`h-4 bg-gray-200 rounded animate-pulse ${w}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
        <SkeletonLine w="w-48" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <SkeletonLine w="w-20" />
            <SkeletonLine w="w-28" />
          </div>
        ))}
      </div>
      <SkeletonLine w="w-32" />
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
  marca,
  modelo,
}: NovaOSAparelhoInfoIAProps) {
  const [expanded, setExpanded] = useState(true);

  if (!loading && !data && !error) return null;

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 via-white to-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <HiSparkles className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-semibold text-indigo-700 truncate">
            Informações via IA
          </span>
          {loading && (
            <span className="text-xs text-indigo-400 animate-pulse">Buscando...</span>
          )}
        </div>
        {expanded ? (
          <FiChevronUp className="w-4 h-4 text-indigo-400" />
        ) : (
          <FiChevronDown className="w-4 h-4 text-indigo-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {loading && <LoadingSkeleton />}

          {error && !loading && (
            <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-red-50 border border-red-100">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
              >
                <FiRefreshCw className="w-3 h-3" />
                Tentar novamente
              </button>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-4">
              {data.descricao && (
                <div className="flex items-start gap-2">
                  <FiInfo className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-600 leading-relaxed">{data.descricao}</p>
                </div>
              )}

              {data.preco_medio && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                  <FiDollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-700">
                      {formatBRL(data.preco_medio.min)} – {formatBRL(data.preco_medio.max)}
                    </p>
                    <p className="text-[11px] text-emerald-500">Valor aproximado no mercado brasileiro</p>
                  </div>
                </div>
              )}

              {Object.keys(data.especificacoes).length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FiCpu className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Especificações
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                    {Object.entries(data.especificacoes).map(([key, value]) => (
                      <div key={key} className="min-w-0">
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide truncate">
                          {key}
                        </p>
                        <p className="text-sm text-gray-700 truncate" title={value}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.ano_lancamento && (
                <p className="text-[11px] text-gray-400">
                  Lançamento: {data.ano_lancamento}
                </p>
              )}

              <p className="text-[10px] text-gray-300 text-right">
                Dados obtidos via IA — podem conter imprecisões
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

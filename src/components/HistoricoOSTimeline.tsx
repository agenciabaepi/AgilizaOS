'use client';

import React, { useMemo } from 'react';
import { HistoricoItem } from '@/hooks/useHistoricoOS';
import {
  filtrarHistoricoRelevante,
  melhorarDescricaoHistorico,
} from '@/utils/osHistoricoAuditoria';
import {
  FiUser,
  FiClock,
  FiMessageSquare,
  FiImage,
  FiDollarSign,
  FiTruck,
  FiRefreshCw,
  FiTool,
  FiPackage,
  FiFileText,
  FiEdit3,
} from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface HistoricoOSTimelineProps {
  historico: HistoricoItem[];
  loading?: boolean;
  compact?: boolean;
  showMetrics?: boolean;
}

const CATEGORIA_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; bg: string; text: string; border: string; dot: string }
> = {
  STATUS: {
    label: 'Status',
    icon: <FiRefreshCw className="w-4 h-4" />,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  SERVICOS: {
    label: 'Serviços',
    icon: <FiTool className="w-4 h-4" />,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  PRODUTOS: {
    label: 'Produtos',
    icon: <FiPackage className="w-4 h-4" />,
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
  ANEXOS: {
    label: 'Anexos',
    icon: <FiImage className="w-4 h-4" />,
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
  },
  FINANCEIRO: {
    label: 'Financeiro',
    icon: <FiDollarSign className="w-4 h-4" />,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  ENTREGA: {
    label: 'Entrega',
    icon: <FiTruck className="w-4 h-4" />,
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
  },
  DADOS: {
    label: 'Informações',
    icon: <FiEdit3 className="w-4 h-4" />,
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
};

const DEFAULT_CONFIG = {
  label: 'Registro',
  icon: <FiFileText className="w-4 h-4" />,
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  border: 'border-gray-200',
  dot: 'bg-gray-500',
};

function getConfig(item: HistoricoItem) {
  if (item.categoria && CATEGORIA_CONFIG[item.categoria]) {
    return CATEGORIA_CONFIG[item.categoria];
  }
  if (item.acao === 'STATUS_CHANGE') return CATEGORIA_CONFIG.STATUS;
  if (item.acao === 'IMAGE_UPLOAD' || item.acao === 'IMAGE_CHANGE') return CATEGORIA_CONFIG.ANEXOS;
  if (item.acao === 'SERVICE_CHANGE') return CATEGORIA_CONFIG.SERVICOS;
  if (item.acao === 'PRODUCT_CHANGE') return CATEGORIA_CONFIG.PRODUTOS;
  if (item.acao === 'VALUE_CHANGE') return CATEGORIA_CONFIG.FINANCEIRO;
  if (item.acao === 'DELIVERY') return CATEGORIA_CONFIG.ENTREGA;
  return DEFAULT_CONFIG;
}

function formatarData(data: string) {
  const date = new Date(data);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  if (date.toDateString() === hoje.toDateString()) {
    return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === ontem.toDateString()) {
    return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderDetalhesExtras(item: HistoricoItem) {
  const linhas: string[] = [];

  if (item.detalhes) {
    try {
      const detalhes = typeof item.detalhes === 'string' ? JSON.parse(item.detalhes) : item.detalhes;

      if (Array.isArray(detalhes.adicionados) && detalhes.adicionados.length > 0) {
        detalhes.adicionados.forEach((nome: string) => linhas.push(`+ ${nome}`));
      }
      if (Array.isArray(detalhes.removidos) && detalhes.removidos.length > 0) {
        detalhes.removidos.forEach((nome: string) => linhas.push(`− ${nome}`));
      }

      if (
        item.categoria === 'STATUS' &&
        detalhes.valor_anterior &&
        detalhes.valor_novo &&
        detalhes.valor_anterior !== detalhes.valor_novo
      ) {
        linhas.push(`${detalhes.valor_anterior} → ${detalhes.valor_novo}`);
      }
    } catch {
      // ignora JSON inválido
    }
  }

  if (linhas.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 rounded-md bg-white/80 px-3 py-2 text-xs text-gray-600 border border-gray-100">
      {linhas.map((linha, i) => (
        <div key={i}>{linha}</div>
      ))}
    </div>
  );
}

export default function HistoricoOSTimeline({
  historico,
  loading = false,
  compact = false,
  showMetrics = false,
}: HistoricoOSTimelineProps) {
  const historicoFiltrado = useMemo(
    () => filtrarHistoricoRelevante(historico),
    [historico]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600" />
          <p className="text-sm text-gray-500">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  if (historicoFiltrado.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
          <FiClock className="h-6 w-6 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-700">Nenhuma alteração registrada</p>
        <p className="mt-1 text-xs text-gray-400">
          Mudanças de status, serviços, produtos, laudo e anexos aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {historicoFiltrado.map((item, index) => {
        const config = getConfig(item);
        const descricao = melhorarDescricaoHistorico(item);
        const isLast = index === historicoFiltrado.length - 1;

        return (
          <div key={item.id} className="relative flex gap-3 pb-5">
            {!isLast && (
              <div className="absolute left-[19px] top-10 bottom-0 w-px bg-gray-200" />
            )}

            <div
              className={cn(
                'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
                config.bg,
                config.border,
                config.text
              )}
            >
              {config.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'rounded-xl border bg-white',
                  config.border,
                  compact ? 'p-3' : 'p-4'
                )}
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                      config.bg,
                      config.text
                    )}
                  >
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-400">{formatarData(item.created_at)}</span>
                </div>

                <p className={cn('text-sm font-medium leading-snug', config.text.replace('700', '900'))}>
                  {descricao}
                </p>

                {(item.observacoes || item.motivo) && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-600">
                    <FiMessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span className="line-clamp-3">{item.observacoes || item.motivo}</span>
                  </div>
                )}

                {!compact && renderDetalhesExtras(item)}

                <div className="mt-2.5 flex items-center gap-1 text-xs text-gray-500">
                  <FiUser className="h-3 w-3" />
                  <span>{item.usuario_nome || 'Sistema'}</span>
                  {item.usuario_tipo && (
                    <span className="text-gray-400">· {item.usuario_tipo}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

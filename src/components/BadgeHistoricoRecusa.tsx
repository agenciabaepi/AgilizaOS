'use client';

import { verificarHistoricoRecusa, getBadgeRecusa } from '@/utils/osHistorico';

interface BadgeHistoricoRecusaProps {
  observacoes?: string | null;
  className?: string;
}

export default function BadgeHistoricoRecusa({ observacoes, className = '' }: BadgeHistoricoRecusaProps) {
  const historico = verificarHistoricoRecusa(observacoes);
  const badge = getBadgeRecusa(historico);

  if (!badge) return null;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.cor} ${className}`}>
      <span>{badge.icone}</span>
      <span>{badge.texto}</span>
      {badge.tooltip && (
        <div className="hidden group-hover:block absolute z-10 px-2 py-1 text-xs bg-black text-white rounded shadow-lg -top-8 left-0 whitespace-nowrap">
          {badge.tooltip}
        </div>
      )}
    </div>
  );
}

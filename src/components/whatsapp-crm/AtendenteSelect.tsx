'use client';

import { Headphones, Loader2 } from 'lucide-react';
import type { WhatsAppAtendente } from '@/lib/whatsapp-crm/types';

interface Props {
  atendentes: WhatsAppAtendente[];
  value: string | null | undefined;
  usuarioAtualId?: string | null;
  onChange: (atribuidoUsuarioId: string | null) => void | Promise<void>;
  saving?: boolean;
  disabled?: boolean;
}

export function AtendenteSelect({
  atendentes,
  value,
  usuarioAtualId,
  onChange,
  saving = false,
  disabled = false,
}: Props) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Headphones size={14} className="text-gray-400 shrink-0" />
      <label className="sr-only" htmlFor="atendente-conversa">
        Atendente responsável
      </label>
      <div className="relative min-w-0 flex-1 max-w-[220px]">
        <select
          id="atendente-conversa"
          value={value ?? ''}
          disabled={disabled || saving || atendentes.length === 0}
          onChange={(e) => {
            const v = e.target.value;
            void onChange(v ? v : null);
          }}
          className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-2.5 pr-8 text-xs text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:opacity-50 truncate"
        >
          <option value="">Selecionar atendente...</option>
          {atendentes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.id === usuarioAtualId ? `${a.nome} (você)` : a.nome}
            </option>
          ))}
        </select>
        {saving && (
          <Loader2
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-400 pointer-events-none"
          />
        )}
      </div>
    </div>
  );
}

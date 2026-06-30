'use client';

import { useState } from 'react';
import { FiCheck, FiTag, FiX } from 'react-icons/fi';
import { formatarValorAssinatura } from '@/hooks/usePlanosPublicos';
import type { PlanoSlug } from '@/config/planModules';

export type CupomAplicado = {
  codigo: string;
  percentual: number;
  valor_original: number;
  valor_desconto: number;
  valor_final: number;
};

type Props = {
  planoSlug: PlanoSlug;
  valorOriginal: number;
  disabled?: boolean;
  onApplied: (cupom: CupomAplicado) => void;
  onClear: () => void;
};

export default function CupomDescontoInput({
  planoSlug,
  valorOriginal,
  disabled,
  onApplied,
  onClear,
}: Props) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aplicado, setAplicado] = useState<CupomAplicado | null>(null);

  async function aplicar() {
    if (!codigo.trim() || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        (headers as Record<string, string>).Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/cupons/validar', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ codigo: codigo.trim(), plano_slug: planoSlug }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Cupom inválido');
      }

      const cupom: CupomAplicado = {
        codigo: json.codigo,
        percentual: json.percentual,
        valor_original: json.valor_original,
        valor_desconto: json.valor_desconto,
        valor_final: json.valor_final,
      };
      setAplicado(cupom);
      onApplied(cupom);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao validar cupom';
      setError(msg);
      setAplicado(null);
      onClear();
    } finally {
      setLoading(false);
    }
  }

  function limpar() {
    setCodigo('');
    setAplicado(null);
    setError(null);
    onClear();
  }

  if (aplicado) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-300 text-sm font-medium">
            <FiCheck className="shrink-0" />
            Cupom <span className="font-mono">{aplicado.codigo}</span> aplicado ({aplicado.percentual}% off)
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={limpar}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              aria-label="Remover cupom"
            >
              <FiX />
            </button>
          )}
        </div>
        <div className="text-sm text-green-900 dark:text-green-200">
          <span className="line-through text-gray-500 mr-2">
            R$ {formatarValorAssinatura(aplicado.valor_original)}
          </span>
          <span className="font-semibold">R$ {formatarValorAssinatura(aplicado.valor_final)}</span>
          <span className="text-xs text-green-700 dark:text-green-400 ml-1">
            (economia de R$ {formatarValorAssinatura(aplicado.valor_desconto)})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
        <FiTag className="text-gray-500" />
        Cupom de desconto
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          disabled={disabled || loading}
          placeholder="Ex: PROMO50"
          className="flex-1 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm uppercase"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void aplicar();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void aplicar()}
          disabled={disabled || loading || !codigo.trim()}
          className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Validando…' : 'Aplicar'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <p className="text-xs text-gray-500">Cada cupom só pode ser usado uma vez.</p>
    </div>
  );
}

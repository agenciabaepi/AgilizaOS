'use client';

import { useState, useEffect } from 'react';
import { PLANO_SLUGS, type PlanoSlug } from '@/config/planModules';

export interface PlanoPublico {
  id: string;
  slug: PlanoSlug;
  nome: string;
  descricao: string;
  preco: number;
  recursos_disponiveis: Record<string, boolean>;
}

/**
 * Planos vendáveis (Básico + Completo) com preços do admin.
 */
export function usePlanosPublicos() {
  const [planos, setPlanos] = useState<PlanoPublico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/planos/publicos', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.planos)) {
          setPlanos(data.planos);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = !loading && planos.length > 0;
  const basico = planos.find((p) => p.slug === PLANO_SLUGS.BASICO) ?? null;
  const completo = planos.find((p) => p.slug === PLANO_SLUGS.COMPLETO) ?? null;

  return { planos, loading, ready, basico, completo };
}

export function formatarValorAssinatura(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

export function formatarPrecoBRL(valor: number): string {
  return `R$ ${formatarValorAssinatura(valor)}`;
}

/** @deprecated Use usePlanosPublicos */
export function useValorAssinatura() {
  const { completo, loading, ready } = usePlanosPublicos();
  return {
    valor: completo?.preco ?? null,
    loading,
    ready,
  };
}

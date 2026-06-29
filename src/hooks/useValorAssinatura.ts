'use client';

import { useState, useEffect } from 'react';

/**
 * Valor mensal da assinatura (R$). Só preenchido após o fetch — evita flash de valor padrão na UI.
 */
export function useValorAssinatura() {
  const [valor, setValor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/assinatura/valor', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data?.valor === 'number' && data.valor > 0) {
          setValor(data.valor);
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

  const ready = !loading && valor !== null;

  return { valor, loading, ready };
}

export function formatarValorAssinatura(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

'use client';

import { useState, useEffect } from 'react';

/**
 * Hook para obter o valor mensal da assinatura (R$)
 * Usado em: landing, planos, pagar, renovar
 */
export function useValorAssinatura() {
  const [valor, setValor] = useState<number>(119.9);
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

  return { valor, loading };
}

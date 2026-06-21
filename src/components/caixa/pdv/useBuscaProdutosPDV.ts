'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProdutoPDV } from './types';
import { mapProdutoPDV } from './produtoSearch';

interface UseBuscaProdutosPDVOptions {
  empresaId?: string;
  accessToken?: string;
  debounceMs?: number;
}

export function useBuscaProdutosPDV({
  empresaId,
  accessToken,
  debounceMs = 280,
}: UseBuscaProdutosPDVOptions) {
  const [resultados, setResultados] = useState<ProdutoPDV[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const buscarProdutos = useCallback(
    async (termo: string, opts?: { limit?: number }) => {
      if (!empresaId) return [];

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setBuscando(true);
      setErro(null);

      try {
        const params = new URLSearchParams({
          empresaId,
          tipo: 'produto',
          apenasAtivos: 'true',
          limit: String(opts?.limit ?? 15),
        });
        if (termo.trim()) params.set('search', termo.trim());

        const headers: Record<string, string> = {};
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const res = await fetch(`/api/produtos-servicos/listar?${params}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
          headers,
        });

        const data = await res.json();

        if (!res.ok) {
          const msg = typeof data?.error === 'string' ? data.error : 'Erro ao buscar produtos';
          setErro(msg);
          setResultados([]);
          return [];
        }

        const lista = (Array.isArray(data) ? data : []).map((p) => mapProdutoPDV(p));
        setResultados(lista);
        return lista;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return [];
        setErro('Erro ao buscar produtos');
        setResultados([]);
        return [];
      } finally {
        if (!controller.signal.aborted) setBuscando(false);
      }
    },
    [empresaId, accessToken]
  );

  const buscarExato = useCallback(
    async (termo: string): Promise<ProdutoPDV | null> => {
      const t = termo.trim();
      if (!t) return null;

      const local = resultados.find(
        (p) => p.codigo === t || p.codigo_barras === t
      );
      if (local) return local;

      const lista = await buscarProdutos(t, { limit: 20 });
      return (
        lista.find((p) => p.codigo === t || p.codigo_barras === t) ??
        lista.find((p) => p.nome.toLowerCase() === t.toLowerCase()) ??
        null
      );
    },
    [buscarProdutos, resultados]
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { resultados, buscando, erro, buscarProdutos, buscarExato, setResultados };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

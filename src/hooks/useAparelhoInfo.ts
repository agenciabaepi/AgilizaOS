'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { bearerAuthHeadersForApi } from '@/lib/api/clientAuthHeaders';
import type { AparelhoInfoIA } from '@/types/aparelhos';

interface UseAparelhoInfoParams {
  marca: string;
  modelo: string;
  tipo?: string;
  temImagem: boolean;
}

interface UseAparelhoInfoResult {
  data: AparelhoInfoIA | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const clientCache = new Map<string, AparelhoInfoIA>();

export function useAparelhoInfo({
  marca,
  modelo,
  tipo,
  temImagem,
}: UseAparelhoInfoParams): UseAparelhoInfoResult {
  const { session } = useAuth();
  const [data, setData] = useState<AparelhoInfoIA | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const shouldFetch = !temImagem && marca.length > 0 && modelo.length > 0;
  const cacheKey = `${marca}|${modelo}|${tipo || ''}`.toLowerCase();

  useEffect(() => {
    if (!shouldFetch) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = clientCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const debounce = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ marca, modelo });
        if (tipo) params.set('tipo', tipo);

        const headers = await bearerAuthHeadersForApi(session);
        const res = await fetch(`/api/aparelhos/buscar-info?${params}`, {
          headers,
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 429) {
            setError('Aguarde um momento...');
          } else {
            setError('Não foi possível buscar informações');
          }
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (json.info) {
          clientCache.set(cacheKey, json.info);
          setData(json.info);
        } else {
          setError('Informações não encontradas');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError('Erro ao buscar informações');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [cacheKey, shouldFetch, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = () => {
    clientCache.delete(cacheKey);
    setRetryCount((c) => c + 1);
  };

  return { data, loading, error, retry };
}

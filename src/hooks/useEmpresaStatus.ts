'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import {
  fetchStatusEmpresa,
  type StatusEmpresa,
  type StatusTipo,
} from '@/lib/statusEmpresa';

export function useEmpresaStatus(tipo: StatusTipo, excludeNomes: string[] = []) {
  const { empresaData, usuarioData } = useAuth();
  const empresaId = empresaData?.id || usuarioData?.empresa_id || null;
  const excludeKey = excludeNomes.join('|');
  const [status, setStatus] = useState<StatusEmpresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const exclude = excludeKey ? excludeKey.split('|') : [];

    async function load() {
      setLoading(true);
      try {
        const lista = await fetchStatusEmpresa(supabase, {
          empresaId,
          tipo,
          excludeNomes: exclude,
        });
        if (!cancelled) setStatus(lista);
      } catch (error) {
        console.error('Erro ao carregar status da empresa:', error);
        if (!cancelled) setStatus([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [empresaId, tipo, excludeKey]);

  return { status, loading, empresaId };
}

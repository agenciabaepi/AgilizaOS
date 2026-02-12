'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Categoria {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
}

export interface ContaPagar {
  id: string;
  descricao: string;
  categoria_id: string;
  categoria: Categoria | null;
  tipo: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string | null;
  status: string;
  fornecedor?: string;
  observacoes?: string;
  os_id?: string | null;
  peca_nome?: string;
  peca_quantidade?: number;
  conta_fixa?: boolean;
  parcelas_totais?: number;
  parcela_atual?: number;
  data_fixa_mes?: number;
  [key: string]: unknown;
}

export interface OrdemServico {
  id: string;
  numero_os: string;
  cliente_id: string;
  cliente?: { nome: string };
}

const norm = (v: string | undefined) => (v || '').toLowerCase().trim();

/**
 * Conta está no mês se vence no mês (data_vencimento YYYY-MM = mesISO).
 * Na página de Contas a Pagar, o critério é sempre o vencimento.
 */
function contaNoMes(conta: ContaPagar, mesISO: string): boolean {
  if (!mesISO) return true;
  const venc = (conta.data_vencimento || '').toString().substring(0, 7);
  return venc === mesISO;
}

export function useContasAPagar(empresaId: string | undefined, filtroMes: string) {
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [catRes, ordRes, contRes] = await Promise.all([
        supabase
          .from('categorias_contas')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('ordens_servico')
          .select('id, numero_os, cliente_id, cliente:clientes(nome)')
          .eq('empresa_id', empresaId)
          .order('numero_os', { ascending: false }),
        supabase
          .from('contas_pagar')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('data_vencimento', { ascending: false })
      ]);

      if (catRes.error) throw catRes.error;
      if (contRes.error) throw contRes.error;

      const catMap = new Map((catRes.data || []).map((c: Categoria) => [c.id, c]));
      const contasEnriquecidas: ContaPagar[] = (contRes.data || []).map((c: any) => ({
        ...c,
        categoria: c.categoria_id ? (catMap.get(c.categoria_id) || null) : null
      }));

      const ordensMapeadas: OrdemServico[] = (ordRes.data || []).map((o: any) => ({
        ...o,
        cliente: Array.isArray(o.cliente) ? o.cliente[0] : o.cliente
      }));

      setCategorias(catRes.data || []);
      setContas(contasEnriquecidas);
      setOrdensServico(ordensMapeadas);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
      setContas([]);
      setCategorias([]);
      setOrdensServico([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const contasDoMes = useMemo(() => {
    return contas.filter(c => contaNoMes(c, filtroMes));
  }, [contas, filtroMes]);

  const totalPendente = useMemo(() =>
    contasDoMes.filter(c => norm(c.status) === 'pendente' || norm(c.status) === 'vencido').reduce((s, c) => s + (c.valor || 0), 0),
    [contasDoMes]
  );

  const totalPago = useMemo(() =>
    contasDoMes.filter(c => norm(c.status) === 'pago').reduce((s, c) => s + (c.valor || 0), 0),
    [contasDoMes]
  );

  const contasPorTipo = useMemo(() => {
    const tipo = (t: string) => (c: ContaPagar) => norm(c.tipo) === t;
    return {
      todas: contasDoMes.length,
      fixas: contasDoMes.filter(tipo('fixa')).length,
      variaveis: contasDoMes.filter(tipo('variavel')).length,
      pecas: contasDoMes.filter(tipo('pecas')).length
    };
  }, [contasDoMes]);

  return {
    loading,
    error,
    contas,
    contasDoMes,
    categorias,
    ordensServico,
    totalPendente,
    totalPago,
    contasPorTipo,
    refetch: loadAll
  };
}

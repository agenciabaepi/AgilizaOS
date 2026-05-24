import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { diffDiasCalendario } from '@/lib/assinaturaCalendario';
import { dataFimTrialAPartirDe } from '@/config/trial';
import { computeAssinaturaVencidaPorBilling } from '@/lib/billing/empresaSaasBilling';
import { pickAssinaturaParaContexto } from '@/lib/billing/pickAssinatura';

/** Disparar após pagamento aprovado para o guard atualizar e liberar o acesso */
export function dispatchAssinaturaUpdated() {
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('assinatura-updated'));
  }
}

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  limite_usuarios: number;
  limite_produtos: number;
  limite_clientes: number;
  limite_fornecedores: number;
  limite_ordens?: number;
  recursos_disponiveis: Record<string, any>;
}

interface Assinatura {
  id: string;
  empresa_id: string;
  plano_id: string;
  status: 'trial' | 'active' | 'cancelled' | 'expired' | 'suspended' | 'pending_payment';
  data_inicio: string;
  data_fim: string | null;
  data_trial_fim: string | null;
  proxima_cobranca: string | null;
  valor: number;
  plano: Plano;
}

interface Limites {
  usuarios: { atual: number; limite: number };
  produtos: { atual: number; limite: number };
  servicos: { atual: number; limite: number };
  clientes: { atual: number; limite: number };
  ordens: { atual: number; limite: number };
  fornecedores: { atual: number; limite: number };
}

const LIMITES_PADRAO = {
  limite_usuarios: 5,
  limite_produtos: 50,
  limite_clientes: 100,
  limite_fornecedores: 10,
};

/** `planos!inner` omitia a assinatura se o join com planos falhasse (RLS, FK, plano removido). */
function planoFromAssinaturaRow(row: Record<string, unknown>): Plano {
  const raw = row.planos;
  const p = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null | undefined;
  const id = (typeof row.plano_id === 'string' ? row.plano_id : p?.id) || '';
  const nome = (typeof p?.nome === 'string' ? p.nome : null) || (row.status === 'trial' ? 'Trial' : 'Plano');
  return {
    id: typeof id === 'string' ? id : '',
    nome,
    descricao: typeof p?.descricao === 'string' ? p.descricao : '',
    preco: typeof p?.preco === 'number' ? p.preco : 0,
    limite_usuarios: typeof p?.limite_usuarios === 'number' ? p.limite_usuarios : LIMITES_PADRAO.limite_usuarios,
    limite_produtos: typeof p?.limite_produtos === 'number' ? p.limite_produtos : LIMITES_PADRAO.limite_produtos,
    limite_clientes: typeof p?.limite_clientes === 'number' ? p.limite_clientes : LIMITES_PADRAO.limite_clientes,
    limite_fornecedores: typeof p?.limite_fornecedores === 'number' ? p.limite_fornecedores : LIMITES_PADRAO.limite_fornecedores,
    limite_ordens: 100,
    recursos_disponiveis: (p?.recursos_disponiveis as Record<string, unknown>) || {},
  };
}

/** Sem linha em `assinaturas`: trial derivado de `empresas.created_at` (igual `MS_TRIAL_GRATIS` no cadastro). */
const ID_ASSINATURA_TRIAL_IMPLICITA = '__trial_implicito__';

function buildAssinaturaTrialImplicita(empresaId: string, empresaCreatedAt: string | null | undefined): Assinatura | null {
  const dataTrialFim = dataFimTrialAPartirDe(empresaCreatedAt);
  if (!empresaCreatedAt || !dataTrialFim) return null;
  const fakeRow: Record<string, unknown> = {
    id: ID_ASSINATURA_TRIAL_IMPLICITA,
    empresa_id: empresaId,
    plano_id: '',
    status: 'trial',
    data_inicio: empresaCreatedAt,
    data_fim: null,
    data_trial_fim: dataTrialFim,
    proxima_cobranca: null,
    valor: 0,
    planos: null,
  };
  return {
    id: ID_ASSINATURA_TRIAL_IMPLICITA,
    empresa_id: empresaId,
    plano_id: '',
    status: 'trial',
    data_inicio: empresaCreatedAt,
    data_fim: null,
    data_trial_fim: dataTrialFim,
    proxima_cobranca: null,
    valor: 0,
    plano: planoFromAssinaturaRow(fakeRow),
  };
}

export const useSubscription = () => {
  const { user, usuarioData, empresaData } = useAuth();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [limites, setLimites] = useState<Limites | null>(null);
  const [loading, setLoading] = useState(true);
  /** Empresa para a qual `assinatura` foi carregada (evita usar dados do login anterior). */
  const [loadedEmpresaId, setLoadedEmpresaId] = useState<string | null>(null);

  const empresaIdAtual = usuarioData?.empresa_id?.trim() || null;
  const fetchSeqRef = useRef(0);

  const resetSubscriptionState = useCallback(() => {
    setAssinatura(null);
    setLimites(null);
    setLoadedEmpresaId(null);
    setLoading(true);
  }, []);

  // Troca de usuário/empresa: descartar assinatura anterior e invalidar fetches em voo
  useEffect(() => {
    fetchSeqRef.current += 1;
    resetSubscriptionState();
  }, [user?.id, empresaIdAtual, resetSubscriptionState]);

  const fetchAssinatura = useCallback(async () => {
    const empresaId = usuarioData?.empresa_id?.trim();
    if (!empresaId) {
      setAssinatura(null);
      setLimites(null);
      setLoadedEmpresaId(null);
      setLoading(false);
      return;
    }
    const seq = ++fetchSeqRef.current;
    const isStale = () => seq !== fetchSeqRef.current;

    try {
      setLoading(true);
      setLoadedEmpresaId(null);

      let primeiraAssinatura: Record<string, unknown> | null = null;
      let empresaCriadaEm: string | null = null;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = { cache: 'no-store' };
        if (session?.access_token) {
          (headers as Record<string, string>).Authorization = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`/api/assinatura/minha?_=${Date.now()}`, {
          credentials: 'include',
          headers,
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.assinatura) primeiraAssinatura = json.assinatura as Record<string, unknown>;
          if (typeof json?.empresa_created_at === 'string' && json.empresa_created_at) {
            empresaCriadaEm = json.empresa_created_at;
          }
        }
      } catch {
        /* fallback abaixo */
      }

      if (isStale()) return;

      const empresaCriadaEmParaPick =
        empresaCriadaEm ||
        (typeof empresaData?.created_at === 'string' && empresaData.created_at.trim()
          ? empresaData.created_at
          : null);

      if (!primeiraAssinatura) {
        const { data: assinaturaData, error: assinaturaError } = await supabase
          .from('assinaturas')
          .select(`
            *,
            planos(nome, descricao, preco, limite_usuarios, limite_produtos, limite_clientes, limite_fornecedores, recursos_disponiveis)
          `)
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (isStale()) return;

        if (!assinaturaError && assinaturaData && assinaturaData.length > 0) {
          const picked = pickAssinaturaParaContexto(
            assinaturaData as Record<string, unknown>[],
            empresaCriadaEmParaPick
          );
          if (picked) primeiraAssinatura = picked;
        } else if (assinaturaError && assinaturaError.code !== 'PGRST116') {
          console.error('Erro ao buscar assinatura (fallback):', assinaturaError);
        }
      }

      const empresaCriadaEmFinal = empresaCriadaEmParaPick;

      if (isStale()) return;

      if (primeiraAssinatura) {
        const assinaturaMapeada: Assinatura = {
          id: primeiraAssinatura.id as string,
          empresa_id: primeiraAssinatura.empresa_id as string,
          plano_id: (primeiraAssinatura.plano_id as string) || '',
          status: primeiraAssinatura.status as Assinatura['status'],
          data_inicio: (primeiraAssinatura.data_inicio || primeiraAssinatura.created_at) as string,
          data_fim: primeiraAssinatura.data_fim as string | null,
          data_trial_fim: primeiraAssinatura.data_trial_fim as string | null,
          proxima_cobranca: primeiraAssinatura.proxima_cobranca as string | null,
          valor: (primeiraAssinatura.valor as number) || 0,
          plano: planoFromAssinaturaRow(primeiraAssinatura),
        };
        setAssinatura(assinaturaMapeada);
        setLoadedEmpresaId(empresaId);
        await fetchLimites(empresaId, assinaturaMapeada.plano);
      } else if (empresaCriadaEmFinal) {
        const implicit = buildAssinaturaTrialImplicita(empresaId, empresaCriadaEmFinal);
        if (implicit) {
          setAssinatura(implicit);
          setLoadedEmpresaId(empresaId);
          await fetchLimites(empresaId, implicit.plano);
        } else {
          setAssinatura(null);
          setLoadedEmpresaId(empresaId);
        }
      } else {
        setAssinatura(null);
        setLoadedEmpresaId(empresaId);
      }
    } catch (error) {
      if (!isStale()) {
        console.error('Erro ao buscar assinatura:', error);
        setAssinatura(null);
        setLoadedEmpresaId(null);
      }
    } finally {
      if (!isStale()) {
        setLoading(false);
      }
    }
  }, [usuarioData?.empresa_id, empresaData?.created_at, empresaData?.id]);

  useEffect(() => {
    if (!user) {
      setAssinatura(null);
      setLimites(null);
      setLoadedEmpresaId(null);
      setLoading(false);
      return;
    }
    if (!empresaIdAtual) {
      return;
    }
    void fetchAssinatura();
  }, [user?.id, empresaIdAtual, fetchAssinatura]);

  // Refetch quando um pagamento for aprovado (PIX). Um segundo fetch cobre lag Asaas→Supabase.
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (!usuarioData?.empresa_id) return;
      void fetchAssinatura();
      if (t1) clearTimeout(t1);
      t1 = setTimeout(() => void fetchAssinatura(), 750);
    };
    document.addEventListener('assinatura-updated', handler);
    return () => {
      document.removeEventListener('assinatura-updated', handler);
      if (t1) clearTimeout(t1);
    };
  }, [usuarioData?.empresa_id, fetchAssinatura]);

  // Buscar limites reais da empresa (`planoLimite` evita estado React atrasado logo após setAssinatura)
  const fetchLimites = async (empresaId: string, planoLimite?: Plano) => {
    try {
      const lim = planoLimite ?? assinatura?.plano;
      const [
        { count: usuariosCount },
        { count: produtosCount },
        { count: servicosCount },
        { count: clientesCount },
        { count: ordensCount },
        { count: fornecedoresCount }
      ] = await Promise.all([
        supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('servicos').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('ordens_servico').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('fornecedores').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId)
      ]);

      const limitesReais: Limites = {
        usuarios: { atual: usuariosCount || 0, limite: lim?.limite_usuarios || LIMITES_PADRAO.limite_usuarios },
        produtos: { atual: produtosCount || 0, limite: lim?.limite_produtos || LIMITES_PADRAO.limite_produtos },
        servicos: { atual: servicosCount || 0, limite: 50 },
        clientes: { atual: clientesCount || 0, limite: lim?.limite_clientes || LIMITES_PADRAO.limite_clientes },
        ordens: { atual: ordensCount || 0, limite: 100 },
        fornecedores: { atual: fornecedoresCount || 0, limite: lim?.limite_fornecedores || LIMITES_PADRAO.limite_fornecedores }
      };

      setLimites(limitesReais);
    } catch (error) {
      console.error('Erro ao buscar limites:', error);
    }
  };

  // Funções de verificação reais
  /** Trial expirado após o último dia civil de `data_trial_fim` (igual período pago). */
  const isTrialExpired = (): boolean => {
    if (!assinatura || assinatura.status !== 'trial') return false;
    if (assinatura.data_trial_fim) {
      const d = diffDiasCalendario(assinatura.data_trial_fim);
      return d !== null && d < 0;
    }
    const end = dataFimTrialAPartirDe(empresaData?.created_at);
    if (!end) return false;
    const d = diffDiasCalendario(end);
    return d !== null && d < 0;
  };

  const isSubscriptionActive = (): boolean => {
    if (!assinatura) return false;
    if (assinatura.status === 'cancelled' || assinatura.status === 'expired') return false;
    if (assinatura.status === 'trial') {
      const ref = assinatura.data_trial_fim || dataFimTrialAPartirDe(empresaData?.created_at);
      if (ref) {
        const d = diffDiasCalendario(ref);
        if (d !== null && d < 0) return false;
      }
    }
    if (assinatura.data_fim) {
      const d = diffDiasCalendario(assinatura.data_fim);
      if (d !== null && d < 0) return false;
    }
    return true;
  };

  /** Assinatura vencida: bloqueia acesso às páginas (usuário deve renovar) */
  const isAssinaturaVencida = (): boolean => {
    if (!empresaIdAtual) return false;
    if (loading || loadedEmpresaId !== empresaIdAtual) return false;
    if (assinatura && assinatura.empresa_id !== empresaIdAtual) return false;
    const empresaCreatedAt =
      empresaData?.id === empresaIdAtual ? empresaData?.created_at : undefined;
    return computeAssinaturaVencidaPorBilling(
      assinatura
        ? {
            status: assinatura.status,
            data_trial_fim: assinatura.data_trial_fim,
            proxima_cobranca: assinatura.proxima_cobranca,
            data_fim: assinatura.data_fim,
          }
        : null,
      empresaCreatedAt,
      {
        loading: false,
        empresaIdPresent: true,
      }
    );
  };

  const podeCriar = (tipo: 'usuarios' | 'produtos' | 'servicos' | 'clientes' | 'ordens' | 'fornecedores'): boolean => {
    if (!limites) return true;
    return limites[tipo].atual < limites[tipo].limite;
  };

  const diasRestantesTrial = (): number => {
    if (!assinatura || assinatura.status !== 'trial') return 0;
    const ref = assinatura.data_trial_fim || dataFimTrialAPartirDe(empresaData?.created_at);
    if (!ref) return 0;
    const d = diffDiasCalendario(ref);
    if (d === null) return 0;
    return Math.max(0, d);
  };

  // Plano único R$119,90 - todos têm acesso a todos os recursos
  const temRecurso = (_recurso: string): boolean => true;

  // Funções para recarregar dados
  const carregarAssinatura = async () => {
    await fetchAssinatura();
  };

  const carregarLimites = async () => {
    if (usuarioData?.empresa_id) {
      await fetchLimites(usuarioData.empresa_id);
    }
  };

  return {
    assinatura,
    limites,
    loading,
    isTrialExpired,
    isSubscriptionActive,
    isAssinaturaVencida,
    podeCriar,
    diasRestantesTrial,
    temRecurso,
    carregarAssinatura,
    carregarLimites
  };
};
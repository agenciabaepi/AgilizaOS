'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { diffDiasCalendario } from '@/lib/assinaturaCalendario';
import { dataFimTrialAPartirDe } from '@/config/trial';
import { computeAssinaturaVencidaPorBilling } from '@/lib/billing/empresaSaasBilling';
import { pickAssinaturaParaContexto } from '@/lib/billing/pickAssinatura';
import { temAcessoRecurso } from '@/lib/billing/planResources';
import { PLANO_SLUGS } from '@/config/planModules';

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
  recursos_disponiveis: Record<string, unknown>;
  slug?: string | null;
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

/** Só refetch ao voltar à aba se ficou oculta por pelo menos este tempo (ms) */
const VISIBILITY_REFETCH_MIN_HIDDEN_MS = 30_000;

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
    slug: typeof p?.slug === 'string' ? p.slug : null,
  };
}

const ID_ASSINATURA_TRIAL_IMPLICITA = '__trial_implicito__';

function buildAssinaturaTrialImplicita(
  empresaId: string,
  empresaCreatedAt: string | null | undefined,
  empresaDiasTrial?: number | null
): Assinatura | null {
  const dataTrialFim = dataFimTrialAPartirDe(empresaCreatedAt, empresaDiasTrial);
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

type SubscriptionContextValue = {
  assinatura: Assinatura | null;
  limites: Limites | null;
  loading: boolean;
  isTrialExpired: () => boolean;
  isSubscriptionActive: () => boolean;
  isAssinaturaVencida: () => boolean;
  podeCriar: (tipo: 'usuarios' | 'produtos' | 'servicos' | 'clientes' | 'ordens' | 'fornecedores') => boolean;
  diasRestantesTrial: () => number;
  temRecurso: (recurso: string) => boolean;
  planoSlug: string | null;
  carregarAssinatura: () => Promise<void>;
  carregarLimites: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, usuarioData, empresaData } = useAuth();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [limites, setLimites] = useState<Limites | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedEmpresaId, setLoadedEmpresaId] = useState<string | null>(null);
  const [sistemaLiberado, setSistemaLiberado] = useState(false);
  const [acessoBloqueadoServidor, setAcessoBloqueadoServidor] = useState<boolean | null>(null);

  const empresaIdAtual = usuarioData?.empresa_id?.trim() || null;
  const fetchSeqRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const loadedEmpresaIdRef = useRef<string | null>(null);
  const prevAuthEmpresaRef = useRef<{ userId: string | null; empresaId: string | null }>({
    userId: null,
    empresaId: null,
  });
  const empresaDataRef = useRef(empresaData);
  empresaDataRef.current = empresaData;

  const resetSubscriptionState = useCallback(() => {
    setAssinatura(null);
    setLimites(null);
    setLoadedEmpresaId(null);
    loadedEmpresaIdRef.current = null;
    setLoading(true);
    hasLoadedOnceRef.current = false;
  }, []);

  useEffect(() => {
    const userId = user?.id ?? null;
    const empresaId = empresaIdAtual;
    const prev = prevAuthEmpresaRef.current;

    if (!userId) {
      prevAuthEmpresaRef.current = { userId: null, empresaId: null };
      fetchSeqRef.current += 1;
      setSistemaLiberado(false);
      setAcessoBloqueadoServidor(null);
      resetSubscriptionState();
      return;
    }

    // Placeholder do auth (empresa_id vazio) — não derrubar cache da assinatura
    if (!empresaId) return;

    const userChanged = prev.userId !== null && prev.userId !== userId;
    const empresaChanged = prev.empresaId !== null && prev.empresaId !== empresaId;
    const isFirstLoad = prev.userId === null;

    prevAuthEmpresaRef.current = { userId, empresaId };

    if (isFirstLoad || userChanged || empresaChanged) {
      fetchSeqRef.current += 1;
      setSistemaLiberado(false);
      setAcessoBloqueadoServidor(null);
      resetSubscriptionState();
    }
  }, [user?.id, empresaIdAtual, resetSubscriptionState]);

  const fetchLimitesForEmpresa = async (empresaId: string, planoLimite?: Plano) => {
    try {
      const lim = planoLimite;
      const [
        { count: usuariosCount },
        { count: produtosCount },
        { count: servicosCount },
        { count: clientesCount },
        { count: ordensCount },
        { count: fornecedoresCount },
      ] = await Promise.all([
        supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('servicos').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('ordens_servico').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('fornecedores').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
      ]);

      setLimites({
        usuarios: { atual: usuariosCount || 0, limite: lim?.limite_usuarios || LIMITES_PADRAO.limite_usuarios },
        produtos: { atual: produtosCount || 0, limite: lim?.limite_produtos || LIMITES_PADRAO.limite_produtos },
        servicos: { atual: servicosCount || 0, limite: 50 },
        clientes: { atual: clientesCount || 0, limite: lim?.limite_clientes || LIMITES_PADRAO.limite_clientes },
        ordens: { atual: ordensCount || 0, limite: 100 },
        fornecedores: { atual: fornecedoresCount || 0, limite: lim?.limite_fornecedores || LIMITES_PADRAO.limite_fornecedores },
      });
    } catch (error) {
      console.error('Erro ao buscar limites:', error);
    }
  };

  const fetchAssinatura = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const empresaId = usuarioData?.empresa_id?.trim();
    const empresaDataSnapshot = empresaDataRef.current;
    if (!empresaId) {
      setAssinatura(null);
      setLimites(null);
      setLoadedEmpresaId(null);
      loadedEmpresaIdRef.current = null;
      setLoading(false);
      return;
    }

    const seq = ++fetchSeqRef.current;
    const isStale = () => seq !== fetchSeqRef.current;
    const canSilent = silent && hasLoadedOnceRef.current && loadedEmpresaIdRef.current === empresaId;

    try {
      if (!canSilent) {
        setLoading(true);
        setLoadedEmpresaId(null);
        loadedEmpresaIdRef.current = null;
      }

      let primeiraAssinatura: Record<string, unknown> | null = null;
      let empresaCriadaEm: string | null = null;
      let liberadoApi = false;
      let liberadoEmpresa =
        empresaDataSnapshot?.id === empresaId && empresaDataSnapshot?.sistema_liberado === true;

      try {
        const { data: empFlags } = await supabase
          .from('empresas')
          .select('sistema_liberado, created_at')
          .eq('id', empresaId)
          .maybeSingle();
        if (empFlags?.sistema_liberado === true) liberadoEmpresa = true;
        if (!empresaCriadaEm && typeof empFlags?.created_at === 'string' && empFlags.created_at) {
          empresaCriadaEm = empFlags.created_at;
        }
      } catch {
        /* fallback */
      }

      if (isStale()) return;
      if (liberadoEmpresa) setSistemaLiberado(true);

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
          if (json?.sistema_liberado === true) liberadoApi = true;
          if (typeof json?.acesso_bloqueado === 'boolean') {
            setAcessoBloqueadoServidor(json.acesso_bloqueado);
          }
        }
      } catch {
        /* fallback */
      }

      if (isStale()) return;

      setSistemaLiberado(liberadoApi || liberadoEmpresa);

      const empresaCriadaEmParaPick =
        empresaCriadaEm ||
        (typeof empresaDataSnapshot?.created_at === 'string' && empresaDataSnapshot.created_at.trim()
          ? empresaDataSnapshot.created_at
          : null);

      if (!primeiraAssinatura) {
        const { data: assinaturaData, error: assinaturaError } = await supabase
          .from('assinaturas')
          .select(`
            *,
            planos(nome, descricao, preco, slug, limite_usuarios, limite_produtos, limite_clientes, limite_fornecedores, recursos_disponiveis)
          `)
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (isStale()) return;

        if (!assinaturaError && assinaturaData && assinaturaData.length > 0) {
          const picked = pickAssinaturaParaContexto(
            assinaturaData as Record<string, unknown>[],
            empresaCriadaEmParaPick,
            empresaDataSnapshot?.dias_trial
          );
          if (picked) primeiraAssinatura = picked;
        } else if (assinaturaError && assinaturaError.code !== 'PGRST116') {
          console.error('Erro ao buscar assinatura (fallback):', assinaturaError);
        }
      }

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
        loadedEmpresaIdRef.current = empresaId;
        await fetchLimitesForEmpresa(empresaId, assinaturaMapeada.plano);
      } else if (empresaCriadaEmParaPick) {
        const implicit = buildAssinaturaTrialImplicita(
          empresaId,
          empresaCriadaEmParaPick,
          empresaDataSnapshot?.dias_trial
        );
        if (implicit) {
          setAssinatura(implicit);
          setLoadedEmpresaId(empresaId);
          loadedEmpresaIdRef.current = empresaId;
          await fetchLimitesForEmpresa(empresaId, implicit.plano);
        } else {
          setAssinatura(null);
          setLoadedEmpresaId(empresaId);
          loadedEmpresaIdRef.current = empresaId;
        }
      } else {
        setAssinatura(null);
        setLoadedEmpresaId(empresaId);
        loadedEmpresaIdRef.current = empresaId;
      }

      hasLoadedOnceRef.current = true;
    } catch (error) {
      if (!isStale()) {
        console.error('Erro ao buscar assinatura:', error);
        if (!canSilent) {
          setAssinatura(null);
          setLoadedEmpresaId(null);
          loadedEmpresaIdRef.current = null;
        }
      }
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [usuarioData?.empresa_id]);

  const fetchAssinaturaRef = useRef(fetchAssinatura);
  fetchAssinaturaRef.current = fetchAssinatura;

  useEffect(() => {
    if (!user) {
      setAssinatura(null);
      setLimites(null);
      setLoadedEmpresaId(null);
      loadedEmpresaIdRef.current = null;
      setLoading(false);
      return;
    }
    if (!empresaIdAtual) return;
    void fetchAssinaturaRef.current();
  }, [user?.id, empresaIdAtual]);

  useEffect(() => {
    const handler = () => {
      if (!usuarioData?.empresa_id) return;
      void fetchAssinaturaRef.current({ silent: hasLoadedOnceRef.current });
    };
    document.addEventListener('assinatura-updated', handler);
    return () => document.removeEventListener('assinatura-updated', handler);
  }, [usuarioData?.empresa_id]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      if (document.visibilityState !== 'visible' || !usuarioData?.empresa_id) return;

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt == null) return;

      const hiddenMs = Date.now() - hiddenAt;
      if (hiddenMs < VISIBILITY_REFETCH_MIN_HIDDEN_MS) return;

      void fetchAssinaturaRef.current({ silent: true });
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [usuarioData?.empresa_id]);

  const isTrialExpired = useCallback((): boolean => {
    if (!assinatura || assinatura.status !== 'trial') return false;
    if (assinatura.data_trial_fim) {
      const d = diffDiasCalendario(assinatura.data_trial_fim);
      return d !== null && d < 0;
    }
    const end = dataFimTrialAPartirDe(empresaData?.created_at, empresaData?.dias_trial);
    if (!end) return false;
    const d = diffDiasCalendario(end);
    return d !== null && d < 0;
  }, [assinatura, empresaData?.created_at, empresaData?.dias_trial]);

  const isSubscriptionActive = useCallback((): boolean => {
    if (!assinatura) return false;
    if (assinatura.status === 'cancelled' || assinatura.status === 'expired') return false;
    if (assinatura.status === 'trial') {
      const ref =
        assinatura.data_trial_fim ||
        dataFimTrialAPartirDe(empresaData?.created_at, empresaData?.dias_trial);
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
  }, [assinatura, empresaData?.created_at, empresaData?.dias_trial]);

  const isAssinaturaVencida = useCallback((): boolean => {
    if (!empresaIdAtual) return false;
    const liberado =
      sistemaLiberado ||
      (empresaData?.id === empresaIdAtual && empresaData?.sistema_liberado === true);
    if (liberado) return false;
    if (loading || loadedEmpresaId !== empresaIdAtual) return false;
    if (assinatura && assinatura.empresa_id !== empresaIdAtual) return false;

    if (acessoBloqueadoServidor === true) return true;
    if (acessoBloqueadoServidor === false) return false;

    const empresaCreatedAt =
      empresaData?.id === empresaIdAtual ? empresaData?.created_at : undefined;
    const empresaDiasTrial =
      empresaData?.id === empresaIdAtual ? empresaData?.dias_trial : undefined;
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
        sistemaLiberado: liberado,
        empresaDiasTrial,
      }
    );
  }, [
    empresaIdAtual,
    sistemaLiberado,
    empresaData?.id,
    empresaData?.sistema_liberado,
    empresaData?.created_at,
    empresaData?.dias_trial,
    loading,
    loadedEmpresaId,
    assinatura,
    acessoBloqueadoServidor,
  ]);

  const podeCriar = useCallback(
    (tipo: 'usuarios' | 'produtos' | 'servicos' | 'clientes' | 'ordens' | 'fornecedores'): boolean => {
      if (!limites) return true;
      return limites[tipo].atual < limites[tipo].limite;
    },
    [limites]
  );

  const diasRestantesTrial = useCallback((): number => {
    if (!assinatura || assinatura.status !== 'trial') return 0;
    const ref =
      assinatura.data_trial_fim ||
      dataFimTrialAPartirDe(empresaData?.created_at, empresaData?.dias_trial);
    if (!ref) return 0;
    const d = diffDiasCalendario(ref);
    if (d === null) return 0;
    return Math.max(0, d);
  }, [assinatura, empresaData?.created_at, empresaData?.dias_trial]);

  const isTrialAtivo = useCallback((): boolean => {
    if (!assinatura) return false;
    if (assinatura.status !== 'trial') return false;
    return !isTrialExpired();
  }, [assinatura, isTrialExpired]);

  const planoSlug = useMemo(() => {
    if (assinatura?.plano?.slug) return assinatura.plano.slug;
    if (isTrialAtivo()) return PLANO_SLUGS.TRIAL;
    return null;
  }, [assinatura?.plano?.slug, isTrialAtivo]);

  const temRecurso = useCallback(
    (recurso: string): boolean => {
      return temAcessoRecurso(recurso, {
        planoRecursos: assinatura?.plano?.recursos_disponiveis ?? null,
        recursosCustomizados: empresaData?.recursos_customizados ?? null,
        isTrial: isTrialAtivo(),
        sistemaLiberado,
        planoSlug,
      });
    },
    [
      assinatura?.plano?.recursos_disponiveis,
      empresaData?.recursos_customizados,
      isTrialAtivo,
      sistemaLiberado,
      planoSlug,
    ]
  );

  const carregarAssinatura = useCallback(async () => {
    await fetchAssinatura({ silent: hasLoadedOnceRef.current });
  }, [fetchAssinatura]);

  const carregarLimites = useCallback(async () => {
    if (usuarioData?.empresa_id) {
      await fetchLimitesForEmpresa(usuarioData.empresa_id);
    }
  }, [usuarioData?.empresa_id]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      assinatura,
      limites,
      loading,
      isTrialExpired,
      isSubscriptionActive,
      isAssinaturaVencida,
      podeCriar,
      diasRestantesTrial,
      temRecurso,
      planoSlug,
      carregarAssinatura,
      carregarLimites,
    }),
    [
      assinatura,
      limites,
      loading,
      isTrialExpired,
      isSubscriptionActive,
      isAssinaturaVencida,
      podeCriar,
      diasRestantesTrial,
      temRecurso,
      planoSlug,
      carregarAssinatura,
      carregarLimites,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (ctx === undefined) {
    throw new Error('useSubscription deve ser usado dentro de SubscriptionProvider');
  }
  return ctx;
}

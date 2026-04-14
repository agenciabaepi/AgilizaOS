import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { diffDiasCalendario } from '@/lib/assinaturaCalendario';
import { dataFimTrialAPartirDe } from '@/config/trial';

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

  const fetchAssinatura = useCallback(async () => {
    if (!usuarioData?.empresa_id) {
      setAssinatura(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      let primeiraAssinatura: Record<string, unknown> | null = null;
      let empresaCriadaEm: string | null = null;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = { cache: 'no-store' };
        if (session?.access_token) {
          (headers as Record<string, string>).Authorization = `Bearer ${session.access_token}`;
        }
        const res = await fetch('/api/assinatura/minha', {
          credentials: 'include',
          headers,
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

      if (!primeiraAssinatura) {
        const { data: assinaturaData, error: assinaturaError } = await supabase
          .from('assinaturas')
          .select(`
            *,
            planos(nome, descricao, preco, limite_usuarios, limite_produtos, limite_clientes, limite_fornecedores, recursos_disponiveis)
          `)
          .eq('empresa_id', usuarioData.empresa_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!assinaturaError && assinaturaData && assinaturaData.length > 0) {
          primeiraAssinatura = assinaturaData[0] as Record<string, unknown>;
        } else if (assinaturaError && assinaturaError.code !== 'PGRST116') {
          console.error('Erro ao buscar assinatura (fallback):', assinaturaError);
        }
      }

      const empresaCriadaEmFinal =
        empresaCriadaEm ||
        (typeof empresaData?.created_at === 'string' && empresaData.created_at.trim()
          ? empresaData.created_at
          : null);

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
        await fetchLimites(usuarioData.empresa_id, assinaturaMapeada.plano);
      } else if (empresaCriadaEmFinal) {
        const implicit = buildAssinaturaTrialImplicita(usuarioData.empresa_id, empresaCriadaEmFinal);
        if (implicit) {
          setAssinatura(implicit);
          await fetchLimites(usuarioData.empresa_id, implicit.plano);
        } else {
          setAssinatura(null);
        }
      } else {
        setAssinatura(null);
      }
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      setAssinatura(null);
    } finally {
      setLoading(false);
    }
  }, [usuarioData?.empresa_id, empresaData?.created_at]);

  useEffect(() => {
    if (!user || !usuarioData?.empresa_id) {
      setLoading(false);
      return;
    }
    fetchAssinatura();
  }, [user, usuarioData?.empresa_id, fetchAssinatura]);

  // Refetch quando um pagamento for aprovado (PIX) para liberar o acesso na hora
  useEffect(() => {
    const handler = () => {
      if (usuarioData?.empresa_id) fetchAssinatura();
    };
    document.addEventListener('assinatura-updated', handler);
    return () => document.removeEventListener('assinatura-updated', handler);
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
    if (!assinatura.data_trial_fim) return false;
    const d = diffDiasCalendario(assinatura.data_trial_fim);
    return d !== null && d < 0;
  };

  const isSubscriptionActive = (): boolean => {
    if (!assinatura) return false;
    if (assinatura.status === 'cancelled' || assinatura.status === 'expired') return false;
    if (assinatura.status === 'trial' && assinatura.data_trial_fim) {
      const d = diffDiasCalendario(assinatura.data_trial_fim);
      if (d !== null && d < 0) return false;
    }
    if (assinatura.data_fim) {
      const d = diffDiasCalendario(assinatura.data_fim);
      if (d !== null && d < 0) return false;
    }
    return true;
  };

  /** Assinatura vencida: bloqueia acesso às páginas (usuário deve renovar) */
  const isAssinaturaVencida = (): boolean => {
    if (loading || !usuarioData?.empresa_id) return false;
    if (!assinatura) return false;
    if (['cancelled', 'expired', 'suspended', 'pending_payment'].includes(assinatura.status)) return true;
    if (assinatura.status === 'active' && assinatura.proxima_cobranca) {
      const d = diffDiasCalendario(assinatura.proxima_cobranca);
      if (d !== null && d < 0) return true;
    }
    if (assinatura.status === 'trial' && assinatura.data_trial_fim) {
      const d = diffDiasCalendario(assinatura.data_trial_fim);
      if (d !== null && d < 0) return true;
    }
    return false;
  };

  const podeCriar = (tipo: 'usuarios' | 'produtos' | 'servicos' | 'clientes' | 'ordens' | 'fornecedores'): boolean => {
    if (!limites) return true;
    return limites[tipo].atual < limites[tipo].limite;
  };

  const diasRestantesTrial = (): number => {
    if (!assinatura || assinatura.status !== 'trial' || !assinatura.data_trial_fim) return 0;
    const d = diffDiasCalendario(assinatura.data_trial_fim);
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
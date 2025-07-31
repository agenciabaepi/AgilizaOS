import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

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
  status: 'trial' | 'active' | 'cancelled' | 'expired' | 'suspended';
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

export const useSubscription = () => {
  const { user, usuarioData } = useAuth();
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [limites, setLimites] = useState<Limites | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLimites, setLoadingLimites] = useState(false);

  // Carregar assinatura da empresa
  const carregarAssinatura = async () => {
    if (!usuarioData?.empresa_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('assinaturas')
        .select(`
          *,
          plano:planos(*)
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar assinatura:', error);
      }

      setAssinatura(data);
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar limites atuais
  const carregarLimites = async () => {
    if (!usuarioData?.empresa_id || !assinatura || loadingLimites) return;

    setLoadingLimites(true);
    try {
      // Fazer todas as contagens em paralelo para melhor performance
      const [
        { count: usuariosCount },
        { count: produtosCount },
        { count: servicosCount },
        { count: clientesCount },
        { count: ordensCount },
        { count: fornecedoresCount }
      ] = await Promise.all([
        supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', usuarioData.empresa_id),
        supabase
          .from('produtos_servicos')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('tipo', 'produto'),
        supabase
          .from('produtos_servicos')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('tipo', 'servico'),
        supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', usuarioData.empresa_id),
        supabase
          .from('ordens_servico')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', usuarioData.empresa_id),
        supabase
          .from('fornecedores')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', usuarioData.empresa_id)
      ]);

      setLimites({
        usuarios: { atual: usuariosCount || 0, limite: assinatura.plano.limite_usuarios },
        produtos: { atual: produtosCount || 0, limite: assinatura.plano.limite_produtos },
        servicos: { atual: servicosCount || 0, limite: assinatura.plano.limite_produtos }, // Usa o mesmo limite de produtos
        clientes: { atual: clientesCount || 0, limite: assinatura.plano.limite_clientes },
        ordens: { atual: ordensCount || 0, limite: assinatura.plano.limite_ordens || 15 },
        fornecedores: { atual: fornecedoresCount || 0, limite: assinatura.plano.limite_fornecedores }
      });
    } catch (error) {
      console.error('Erro ao carregar limites:', error);
    } finally {
      setLoadingLimites(false);
    }
  };

  // Verificar se trial expirou
  const isTrialExpired = (): boolean => {
    if (!assinatura || assinatura.status !== 'trial') return false;
    if (!assinatura.data_trial_fim) return false;
    
    const agora = new Date();
    const fimTrial = new Date(assinatura.data_trial_fim);
    const expirou = fimTrial < agora;
    
    console.log('Debug isTrialExpired:', {
      agora: agora.toISOString(),
      fimTrial: fimTrial.toISOString(),
      expirou: expirou,
      diferencaHoras: (fimTrial.getTime() - agora.getTime()) / (1000 * 60 * 60)
    });
    
    return expirou;
  };

  // Verificar se assinatura está ativa
  const isSubscriptionActive = (): boolean => {
    if (!assinatura) return false;
    if (assinatura.status === 'cancelled' || assinatura.status === 'expired') return false;
    if (assinatura.data_fim && new Date(assinatura.data_fim) < new Date()) return false;
    
    return true;
  };

  // Verificar se pode criar mais itens
  const podeCriar = (tipo: 'usuarios' | 'produtos' | 'servicos' | 'clientes' | 'ordens' | 'fornecedores'): boolean => {
    if (!limites) return false;
    return limites[tipo].atual < limites[tipo].limite;
  };

  // Obter dias restantes do trial
  const diasRestantesTrial = (): number => {
    if (!assinatura || assinatura.status !== 'trial' || !assinatura.data_trial_fim) return 0;
    
    const hoje = new Date();
    const fimTrial = new Date(assinatura.data_trial_fim);
    const diffTime = fimTrial.getTime() - hoje.getTime();
    
    // Se já expirou, retorna 0
    if (diffTime <= 0) return 0;
    
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Verificar se tem recurso disponível
  const temRecurso = (recurso: string): boolean => {
    if (!assinatura) return false;
    return assinatura.plano.recursos_disponiveis[recurso] === true;
  };

  useEffect(() => {
    if (usuarioData?.empresa_id) {
      carregarAssinatura();
    }
  }, [usuarioData?.empresa_id]);

  useEffect(() => {
    if (assinatura && !loading) {
      carregarLimites();
    }
  }, [assinatura?.id, loading]);

  return {
    assinatura,
    limites,
    loading,
    isTrialExpired,
    isSubscriptionActive,
    podeCriar,
    diasRestantesTrial,
    temRecurso,
    carregarAssinatura,
    carregarLimites
  };
}; 
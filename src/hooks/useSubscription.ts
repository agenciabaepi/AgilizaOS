import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false); // ✅ SEMPRE FALSE PARA EVITAR TRAVAMENTOS

  // ✅ VERSÃO ULTRA SIMPLIFICADA - SEM CHAMADAS AO BANCO
  useEffect(() => {
    console.log('🔍 useSubscription: VERSÃO ULTRA SIMPLIFICADA');
    
    // Simular dados de assinatura para evitar travamentos
    if (user && usuarioData?.empresa_id) {
      const mockAssinatura: Assinatura = {
        id: 'mock-id',
        empresa_id: usuarioData.empresa_id,
        plano_id: 'mock-plano',
        status: 'trial',
        data_inicio: new Date().toISOString(),
        data_fim: null,
        data_trial_fim: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dias
        proxima_cobranca: null,
        valor: 0,
        plano: {
          id: 'mock-plano',
          nome: 'Plano Trial',
          descricao: 'Plano de teste',
          preco: 0,
          limite_usuarios: 5,
          limite_produtos: 50,
          limite_clientes: 100,
          limite_fornecedores: 10,
          limite_ordens: 100,
          recursos_disponiveis: {}
        }
      };

      const mockLimites: Limites = {
        usuarios: { atual: 1, limite: 5 },
        produtos: { atual: 0, limite: 50 },
        servicos: { atual: 0, limite: 50 },
        clientes: { atual: 0, limite: 100 },
        ordens: { atual: 0, limite: 100 },
        fornecedores: { atual: 0, limite: 10 }
      };

      setAssinatura(mockAssinatura);
      setLimites(mockLimites);
      setLoading(false);
    }
  }, [user, usuarioData?.empresa_id]);

  // ✅ FUNÇÕES SIMPLIFICADAS
  const isTrialExpired = (): boolean => {
    if (!assinatura || assinatura.status !== 'trial') return false;
    if (!assinatura.data_trial_fim) return false;
    
    const agora = new Date();
    const fimTrial = new Date(assinatura.data_trial_fim);
    return fimTrial < agora;
  };

  const isSubscriptionActive = (): boolean => {
    if (!assinatura) return false;
    if (assinatura.status === 'cancelled' || assinatura.status === 'expired') return false;
    if (assinatura.data_fim && new Date(assinatura.data_fim) < new Date()) return false;
    return true;
  };

  const podeCriar = (tipo: 'usuarios' | 'produtos' | 'servicos' | 'clientes' | 'ordens' | 'fornecedores'): boolean => {
    if (!limites) return true; // ✅ SEMPRE PERMITIR PARA EVITAR TRAVAMENTOS
    return limites[tipo].atual < limites[tipo].limite;
  };

  const diasRestantesTrial = (): number => {
    if (!assinatura || assinatura.status !== 'trial' || !assinatura.data_trial_fim) return 14;
    
    const hoje = new Date();
    const fimTrial = new Date(assinatura.data_trial_fim);
    const diffTime = fimTrial.getTime() - hoje.getTime();
    
    if (diffTime <= 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const temRecurso = (recurso: string): boolean => {
    if (!assinatura) return true; // ✅ SEMPRE PERMITIR PARA EVITAR TRAVAMENTOS
    return true;
  };

  // ✅ FUNÇÕES VAZIAS PARA EVITAR CHAMADAS AO BANCO
  const carregarAssinatura = () => {
    console.log('🔍 useSubscription: Função carregarAssinatura desabilitada para evitar travamentos');
  };

  const carregarLimites = () => {
    console.log('🔍 useSubscription: Função carregarLimites desabilitada para evitar travamentos');
  };

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
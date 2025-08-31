import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface OnboardingStatus {
  empresa: boolean;
  tecnicos: boolean;
  servicos: boolean;
  isFirstLogin: boolean;
  hasCompletedOnboarding: boolean;
}

export const useOnboarding = () => {
  const { usuarioData, empresaData } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>({
    empresa: false,
    tecnicos: false,
    servicos: false,
    isFirstLogin: false,
    hasCompletedOnboarding: false
  });
  const [loading, setLoading] = useState(true);

  // Verificar se é o primeiro login
  useEffect(() => {
    checkFirstLogin();
  }, [usuarioData]);

  // Verificar status das configurações
  useEffect(() => {
    if (usuarioData?.empresa_id) {
      checkOnboardingStatus();
    }
  }, [usuarioData, empresaData]);

  const checkFirstLogin = async () => {
    if (!usuarioData?.auth_user_id) return;

    try {
      // Verificar se já existe registro de onboarding para este usuário
      const { data: onboardingRecord } = await supabase
        .from('onboarding_status')
        .select('*')
        .eq('user_id', usuarioData.auth_user_id)
        .single();

      setOnboardingStatus(prev => ({
        ...prev,
        isFirstLogin: !onboardingRecord,
        hasCompletedOnboarding: !!onboardingRecord?.completed
      }));
    } catch (error) {
      // Se não existe a tabela ou registro, considera como primeiro login
      setOnboardingStatus(prev => ({
        ...prev,
        isFirstLogin: true,
        hasCompletedOnboarding: false
      }));
    }
  };

  const checkOnboardingStatus = async () => {
    if (!usuarioData?.empresa_id) return;

    setLoading(true);
    
    try {
      // 1. Verificar dados da empresa
      const empresa = empresaData?.nome && empresaData?.cnpj;

      // 2. Verificar técnicos
      const { data: tecnicos } = await supabase
        .from('usuarios')
        .select('id')
        .eq('nivel', 'tecnico')
        .eq('empresa_id', usuarioData.empresa_id);

      // 3. Verificar serviços
      const { data: servicos } = await supabase
        .from('servicos')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .limit(1);

      setOnboardingStatus(prev => ({
        ...prev,
        empresa: !!empresa,
        tecnicos: !!(tecnicos && tecnicos.length > 0),
        servicos: !!(servicos && servicos.length > 0)
      }));
    } catch (error) {
      console.error('Erro ao verificar status do onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const markOnboardingCompleted = async () => {
    if (!usuarioData?.auth_user_id) return;

    try {
      // Tentar inserir ou atualizar registro de onboarding
      await supabase
        .from('onboarding_status')
        .upsert({
          user_id: usuarioData.auth_user_id,
          empresa_id: usuarioData.empresa_id,
          completed: true,
          completed_at: new Date().toISOString()
        });

      setOnboardingStatus(prev => ({
        ...prev,
        hasCompletedOnboarding: true
      }));
    } catch (error) {
      console.error('Erro ao marcar onboarding como concluído:', error);
    }
  };

  const canCreateOS = onboardingStatus.empresa && onboardingStatus.tecnicos;
  const onboardingProgress = [
    onboardingStatus.empresa,
    onboardingStatus.tecnicos,
    onboardingStatus.servicos
  ].filter(Boolean).length;

  return {
    onboardingStatus,
    loading,
    canCreateOS,
    onboardingProgress,
    markOnboardingCompleted,
    checkOnboardingStatus
  };
};

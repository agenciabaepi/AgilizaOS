import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { TECNICOS_OR_FILTER } from '@/lib/tecnicos';

interface OnboardingStatus {
  empresa: boolean;
  tecnicos: boolean;
  servicos: boolean;
  isFirstLogin: boolean;
  hasCompletedOnboarding: boolean;
}

export const useOnboarding = () => {
  const { usuarioData, empresaData, lastUpdate } = useAuth();
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
    if (usuarioData?.empresa_id && empresaData) {
      checkOnboardingStatus();
    } else {
      }
  }, [usuarioData, empresaData]);
  
  // Re-verificar onboarding quando empresaData mudar especificamente
  useEffect(() => {
    if (empresaData && usuarioData?.empresa_id) {
      checkOnboardingStatus();
    }
  }, [empresaData?.logo_url, empresaData?.nome, empresaData?.endereco, empresaData?.cnpj, empresaData?.telefone]);
  
  // Re-verificar onboarding quando lastUpdate mudar (força atualização)
  useEffect(() => {
    if (lastUpdate && empresaData && usuarioData?.empresa_id) {
      checkOnboardingStatus();
    }
  }, [lastUpdate]);

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
      // 1. Verificação SIMPLES e DIRETA dos dados da empresa
      const logoPreenchido = Boolean(empresaData?.logo_url);
      const nomePreenchido = Boolean(empresaData?.nome);
      const enderecoPreenchido = Boolean(empresaData?.endereco);
      const cnpjPreenchido = Boolean(empresaData?.cnpj);
      const telefonePreenchido = Boolean(empresaData?.telefone);
      
      const empresaFields = {
        logo: logoPreenchido,
        nome: nomePreenchido,
        endereco: enderecoPreenchido,
        cnpj: cnpjPreenchido,
        telefone: telefonePreenchido
      };
      
      const empresa = Object.values(empresaFields).every(field => field);
      
      // This was likely debug code that should be removed
      // setCompletionStatus was not defined
      const missingFields = Object.entries(empresaFields)
        .filter(([, value]) => !value)
        .map(([key]) => {
          // Mapear nomes mais amigáveis para os campos
          const fieldNames: { [key: string]: string } = {
            logo: 'Logo',
            nome: 'Nome da Empresa',
            endereco: 'Endereço',
            cnpj: 'CNPJ',
            telefone: 'Telefone'
          };
          return fieldNames[key] || key;
        });
      
      // 2. Verificar técnicos
      const { data: tecnicos } = await supabase
        .from('usuarios')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .or(TECNICOS_OR_FILTER);

      setOnboardingStatus(prev => ({
        ...prev,
        empresa: !!empresa,
        tecnicos: !!(tecnicos && tecnicos.length > 0)
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
    onboardingStatus.tecnicos
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

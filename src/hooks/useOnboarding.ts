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
    console.log('🔍 useOnboarding useEffect - Verificando status:', {
      usuarioData: !!usuarioData,
      empresaData: !!empresaData,
      empresaId: usuarioData?.empresa_id
    });
    
    if (usuarioData?.empresa_id && empresaData) {
      console.log('🔍 useOnboarding: Dados disponíveis, verificando status...');
      checkOnboardingStatus();
    } else {
      console.log('🔍 useOnboarding: Aguardando dados...', {
        temUsuario: !!usuarioData,
        temEmpresa: !!empresaData,
        empresaId: usuarioData?.empresa_id
      });
    }
  }, [usuarioData, empresaData]);
  
  // Re-verificar onboarding quando empresaData mudar especificamente
  useEffect(() => {
    if (empresaData && usuarioData?.empresa_id) {
      console.log('🔍 DADOS DA EMPRESA MUDARAM, RE-VERIFICANDO ONBOARDING:', {
        logo_url: empresaData?.logo_url,
        nome: empresaData?.nome,
        endereco: empresaData?.endereco,
        cnpj: empresaData?.cnpj,
        telefone: empresaData?.telefone
      });
      checkOnboardingStatus();
    }
  }, [empresaData?.logo_url, empresaData?.nome, empresaData?.endereco, empresaData?.cnpj, empresaData?.telefone]);
  
  // Re-verificar onboarding quando lastUpdate mudar (força atualização)
  useEffect(() => {
    if (lastUpdate && empresaData && usuarioData?.empresa_id) {
      console.log('🔄 LAST UPDATE MUDOU, FORÇANDO RE-VERIFICAÇÃO:', lastUpdate);
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

    console.log('🔍 INICIANDO VERIFICAÇÃO:', {
      usuarioData: usuarioData,
      empresaData: empresaData,
      empresa_id: usuarioData?.empresa_id
    });

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
      
      console.log('🔍 VERIFICAÇÃO FINAL:', {
        empresaFields: empresaFields,
        todosCampos: Object.values(empresaFields),
        empresa: empresa,
        todosPreenchidos: Object.values(empresaFields).every(field => field)
      });
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
      
      // Log SIMPLES e DIRETO
      console.log('🔍 VERIFICAÇÃO SIMPLES:', {
        empresaData: empresaData,
        logo_url: empresaData?.logo_url,
        nome: empresaData?.nome,
        endereco: empresaData?.endereco,
        cnpj: empresaData?.cnpj,
        telefone: empresaData?.telefone
      });
      
      console.log('🔍 CAMPOS PREENCHIDOS:', {
        logo: logoPreenchido,
        nome: nomePreenchido,
        endereco: enderecoPreenchido,
        cnpj: cnpjPreenchido,
        telefone: telefonePreenchido
      });
      
      // Debug individual de cada campo - VERIFICAÇÃO DETALHADA
      console.log('🔍 VERIFICAÇÃO DETALHADA DOS CAMPOS:', {
        logo: {
          valor: empresaData?.logo_url,
          tipo: typeof empresaData?.logo_url,
          existe: !!empresaData?.logo_url,
          trim: empresaData?.logo_url?.trim(),
          length: empresaData?.logo_url?.trim()?.length,
          resultado: empresaFields.logo,
          validacao: `empresaData?.logo_url ? empresaData.logo_url.trim().length > 0 : false`,
          debug: {
            empresaDataLogo: empresaData?.logo_url,
            isTruthy: !!empresaData?.logo_url,
            afterTrim: empresaData?.logo_url?.trim(),
            trimLength: empresaData?.logo_url?.trim()?.length,
            finalResult: empresaFields.logo
          }
        },
        nome: {
          valor: empresaData?.nome,
          tipo: typeof empresaData?.nome,
          existe: !!empresaData?.nome,
          trim: empresaData?.nome?.trim(),
          length: empresaData?.nome?.trim()?.length,
          resultado: empresaFields.nome,
          validacao: `empresaData?.nome ? empresaData.nome.trim().length > 0 : false`
        },
        endereco: {
          valor: empresaData?.endereco,
          tipo: typeof empresaData?.endereco,
          existe: !!empresaData?.endereco,
          trim: empresaData?.endereco?.trim(),
          length: empresaData?.endereco?.trim()?.length,
          resultado: empresaFields.endereco,
          validacao: `empresaData?.endereco ? empresaData.endereco.trim().length > 0 : false`
        },
        cnpj: {
          valor: empresaData?.cnpj,
          tipo: typeof empresaData?.cnpj,
          existe: !!empresaData?.cnpj,
          trim: empresaData?.cnpj?.trim(),
          length: empresaData?.cnpj?.trim()?.length,
          resultado: empresaFields.cnpj,
          validacao: `empresaData?.cnpj ? empresaData.cnpj.trim().length > 0 : false`
        },
        telefone: {
          valor: empresaData?.telefone,
          tipo: typeof empresaData?.telefone,
          existe: !!empresaData?.telefone,
          trim: empresaData?.telefone?.trim(),
          length: empresaData?.telefone?.trim()?.length,
          resultado: empresaFields.telefone,
          validacao: `empresaData?.telefone ? empresaData.telefone.trim().length > 0 : false`
        }
      });
      
      // Debug completo dos dados
      console.log('🔍 DADOS COMPLETOS DA EMPRESA:', {
        empresaData: empresaData,
        empresaFields: empresaFields,
        missingFields: missingFields,
        empresa: empresa,
        totalCampos: Object.keys(empresaFields).length,
        camposPreenchidos: Object.values(empresaFields).filter(Boolean).length,
        camposVazios: Object.values(empresaFields).filter(field => !field).length
      });
      
      // Verificação adicional - dados brutos
      console.log('🔍 DADOS BRUTOS DO BANCO:', {
        logo_url: empresaData?.logo_url,
        nome: empresaData?.nome,
        endereco: empresaData?.endereco,
        cnpj: empresaData?.cnpj,
        telefone: empresaData?.telefone,
        empresa_id: usuarioData?.empresa_id,
        empresaDataCompleto: empresaData
      });
      
      // Verificação específica do logo
      console.log('🔍 VERIFICAÇÃO ESPECÍFICA DO LOGO:', {
        logo_url: empresaData?.logo_url,
        tipo: typeof empresaData?.logo_url,
        existe: !!empresaData?.logo_url,
        naoVazio: empresaData?.logo_url !== '',
        naoNull: empresaData?.logo_url !== null,
        naoUndefined: empresaData?.logo_url !== undefined,
        trim: empresaData?.logo_url?.trim(),
        trimNaoVazio: empresaData?.logo_url?.trim() !== '',
        resultadoFinal: empresaFields.logo
      });

      // 2. Verificar técnicos
      const { data: tecnicos } = await supabase
        .from('usuarios')
        .select('id')
        .eq('nivel', 'tecnico')
        .eq('empresa_id', usuarioData.empresa_id);



      console.log('🔍 Debug Onboarding Hook:', {
        empresaData: empresaData,
        usuarioData: usuarioData,
        empresa: {
          logo: {
            valor: empresaData?.logo_url,
            preenchido: empresaFields.logo,
            trim: empresaData?.logo_url?.trim()
          },
          nome: {
            valor: empresaData?.nome,
            preenchido: empresaFields.nome,
            trim: empresaData?.nome?.trim()
          },
          endereco: {
            valor: empresaData?.endereco,
            preenchido: empresaFields.endereco,
            trim: empresaData?.endereco?.trim()
          },
          cnpj: {
            valor: empresaData?.cnpj,
            preenchido: empresaFields.cnpj,
            trim: empresaData?.cnpj?.trim()
          },
          whatsapp: {
            valor: empresaData?.whatsapp,
            preenchido: empresaFields.whatsapp,
            trim: empresaData?.whatsapp?.trim()
          },
          camposPreenchidos: empresaFields,
          camposFaltando: missingFields,
          status: !!empresa
        },
        tecnicos: {
          count: tecnicos?.length || 0,
          status: !!(tecnicos && tecnicos.length > 0)
        },
      });

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

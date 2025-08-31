import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cria o cliente do Supabase apenas no browser.
 * Evita erro "supabaseUrl is required" durante o build/prerender no servidor.
 */
export const supabase: SupabaseClient | any =
  typeof window !== 'undefined'
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: true, // ✅ Persistir sessão
            autoRefreshToken: true, // ✅ Renovar tokens automaticamente
            detectSessionInUrl: true, // ✅ Detectar sessão na URL
            flowType: 'pkce' // ✅ Usar PKCE para segurança
          },
          global: {
            headers: {
              'x-client-info': 'supabase-js-web'
            }
          },
          db: {
            schema: 'public'
          },
          realtime: {
            params: {
              eventsPerSecond: 2
            }
          }
        }
      )
    : ({} as any);

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não configurados');
  }
  return createClient(url, key);
}

export const forceLogout = async () => {
  console.log('🔴 FORCE LOGOUT: Iniciando logout...');
  
  try {
    // 1. Limpar localStorage e sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    console.log('🔴 localStorage e sessionStorage limpos');
    
    // 2. Fazer logout do Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log('⚠️ Erro no logout Supabase:', error.message);
    } else {
      console.log('✅ Logout Supabase realizado');
    }
    
    // 3. Forçar limpeza do estado do Supabase
    await supabase.auth.setSession(null);
    console.log('🔴 Sessão forçada para null');
    
    // 4. Limpeza final
    localStorage.clear();
    sessionStorage.clear();
    
    // 5. Redirecionar para login
    console.log('🔄 Redirecionando para login...');
    window.location.href = '/login';
    
  } catch (error) {
    console.error('❌ Erro no forceLogout:', error);
    // Mesmo com erro, forçar redirecionamento
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  }
};

// Função utilitária para limpar dados de sessão corrompidos
export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
};

// Função para verificar se a sessão é válida
export const isValidSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Erro ao verificar sessão:', error);
      return false;
    }
    return !!session;
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return false;
  }
};



// Função otimizada para buscar dados do usuário
export const fetchUserDataOptimized = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        empresa_id, 
        nome, 
        email, 
        nivel, 
        permissoes, 
        foto_url
      `)
      .eq('auth_user_id', userId)
      .single();

    if (error) {
      throw error;
    }

    // Buscar dados reais da empresa
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome, cnpj, endereco, telefone, email, whatsapp, logo_url')
      .eq('id', data.empresa_id)
      .single();

    if (empresaError) {
      console.warn('⚠️ Erro ao buscar dados da empresa, usando fallback:', empresaError);
      // Fallback para dados básicos
      return {
        userData: {
          empresa_id: data.empresa_id,
          nome: data.nome,
          email: data.email,
          nivel: data.nivel,
          permissoes: data.permissoes,
          foto_url: data.foto_url
        },
        empresaData: {
          id: data.empresa_id,
          nome: 'Empresa',
          plano: 'trial'
        }
      };
    }

    return {
      userData: {
        empresa_id: data.empresa_id,
        nome: data.nome,
        email: data.email,
        nivel: data.nivel,
        permissoes: data.permissoes,
        foto_url: data.foto_url
      },
      empresaData: {
        id: empresaData.id,
        nome: empresaData.nome || '',
        cnpj: empresaData.cnpj || '',
        endereco: empresaData.endereco || '',
        telefone: empresaData.telefone || '',
        email: empresaData.email || '',
        whatsapp: empresaData.whatsapp || '',
        plano: 'trial'
      }
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados otimizados:', error);
    throw error;
  }
};

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase-config';

/**
 * Cria o cliente do Supabase apenas no browser.
 * Evita erro "supabaseUrl is required" durante o build/prerender no servidor.
 * Usa supabaseConfig com fallbacks para evitar "Invalid API key"
 */
export const supabase: SupabaseClient =
  typeof window !== 'undefined'
    ? createClient(
        supabaseConfig.url,
        supabaseConfig.anonKey,
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
    : ({} as SupabaseClient);

export function createAdminClient(): SupabaseClient {
  // Usa supabaseConfig com fallbacks para evitar erros de configuração
  return createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);
}

export const forceLogout = async () => {
  try {
    // 1. Limpar localStorage e sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // 2. Fazer logout do Supabase
    const { error } = await supabase.auth.signOut();
    
    // 3. Forçar limpeza do estado do Supabase
    await supabase.auth.setSession(null);
    
    // 4. Limpeza final
    localStorage.clear();
    sessionStorage.clear();
    
    // 5. Redirecionar para login
    window.location.href = '/login';
    
  } catch (error) {
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

// ✅ NOVA FUNÇÃO: Limpar completamente o cache do Supabase
export const clearSupabaseCache = async () => {
  try {
    if (typeof window !== 'undefined') {
      // Limpar localStorage e sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Limpar cache do Supabase
      await supabase.auth.signOut();
      await supabase.auth.setSession(null);
      
      // Limpar novamente após logout
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('✅ Cache do Supabase limpo completamente');
    }
  } catch (error) {
    console.error('❌ Erro ao limpar cache do Supabase:', error);
    // Mesmo com erro, limpar storage local
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  }
};

// ✅ NOVA FUNÇÃO: Forçar refresh dos dados do usuário
export const forceRefreshUserData = async () => {
  try {
    if (typeof window !== 'undefined') {
      // Limpar cache local
      localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
      sessionStorage.clear();
      
      // Forçar refresh da sessão
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erro ao refrescar sessão:', error);
        return false;
      }
      
      if (session) {
        console.log('✅ Sessão refrescada com sucesso');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao forçar refresh:', error);
    return false;
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

// Função otimizada para buscar dados do usuário com timeout e retry
export const fetchUserDataOptimized = async (userId: string, retryCount = 0) => {
  const maxRetries = 2;
  
  try {
    // Validar se o userId é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error(`ID de usuário inválido: ${userId}. Deve ser um UUID válido.`);
    }
    
    console.log(`🔍 Buscando dados otimizados para usuário: ${userId} (tentativa ${retryCount + 1}/${maxRetries + 1})`);
    
    // ✅ TIMEOUT AGRESSIVO: Evitar queries lentas
    const userQueryPromise = supabase
      .from('usuarios')
      .select(`
        id,
        empresa_id, 
        nome, 
        email, 
        nivel, 
        permissoes, 
        foto_url
      `)
      .eq('auth_user_id', userId)
      .single();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout - Supabase demorou mais de 15 segundos')), 15000)
    );

    let { data, error } = await Promise.race([
      userQueryPromise,
      timeoutPromise
    ]) as any;

    // Se não encontrar com auth_user_id, tentar com id (com timeout também)
    if (error && error.code === 'PGRST116') {
      const userByIdQueryPromise = supabase
        .from('usuarios')
        .select(`
          id,
          empresa_id, 
          nome, 
          email, 
          nivel, 
          permissoes, 
          foto_url
        `)
        .eq('id', userId)
        .single();

      const { data: dataById, error: errorById } = await Promise.race([
        userByIdQueryPromise,
        timeoutPromise
      ]) as any;
      
      if (errorById) {
        console.error('❌ Erro ao buscar usuário com id:', errorById);
        throw errorById;
      }
      
      data = dataById;
      error = null;
    }

    if (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      throw error;
    }

    // Verificar se o usuário tem empresa_id
    if (!data.empresa_id) {
      return {
        userData: {
          id: data.id,
          empresa_id: null,
          nome: data.nome,
          email: data.email,
          nivel: data.nivel,
          permissoes: data.permissoes,
          foto_url: data.foto_url
        },
        empresaData: {
          id: null,
          nome: 'Empresa',
          plano: 'trial'
        },
        catalogoHabilitado: true,
        recursosPlano: {} as Record<string, boolean>
      };
    }
    
    // ✅ BUSCAR EMPRESA COM TIMEOUT: Evitar queries lentas
    const empresaQueryPromise = supabase
      .from('empresas')
      .select('*')
      .eq('id', data.empresa_id)
      .single();

    const empresaTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Empresa query timeout - Supabase demorou mais de 15 segundos')), 15000)
    );

    const { data: empresaData, error: empresaError } = await Promise.race([
      empresaQueryPromise,
      empresaTimeoutPromise
    ]) as any;

    if (empresaError) {
      // Fallback para dados básicos
      return {
        userData: {
          id: data.id,
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
          plano: 'trial',
          ativo: true // Assumir ativa se não conseguir buscar
        },
        catalogoHabilitado: true,
        recursosPlano: {} as Record<string, boolean>
      };
    }

    // ⚠️ BLOQUEAR ACESSO: Verificar se empresa está ativa
    // Se empresa não estiver ativa, lançar erro para forçar logout
    if (empresaData && empresaData.ativo === false) {
      throw new Error('EMPRESA_DESATIVADA');
    }

    // Buscar em paralelo: catálogo e recursos do plano (para o menu carregar de uma vez)
    const [configRes, assinaturaRes] = await Promise.all([
      supabase
        .from('configuracoes_empresa')
        .select('catalogo_habilitado')
        .eq('empresa_id', data.empresa_id)
        .maybeSingle(),
      supabase
        .from('assinaturas')
        .select('*, planos!inner(recursos_disponiveis)')
        .eq('empresa_id', data.empresa_id)
        .order('created_at', { ascending: false })
        .limit(1)
    ]);

    // Se não houver configuração, assume catálogo habilitado (igual ao comportamento anterior do MenuLayout)
    const catalogoHabilitado = configRes.data?.catalogo_habilitado !== false;
    const recursosPlano = (assinaturaRes.data as any)?.[0]?.planos?.recursos_disponiveis || {};

    const result = {
      userData: {
        id: data.id,
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
        recursos_customizados: empresaData.recursos_customizados || null,
        endereco: empresaData.endereco || '',
        telefone: empresaData.telefone || '',
        email: empresaData.email || '',
        logo_url: empresaData.logo_url || '',
        plano: empresaData.plano || 'trial',
        ativo: empresaData.ativo ?? true // Incluir campo ativo
      },
      catalogoHabilitado,
      recursosPlano: recursosPlano || {}
    };
    
    return result;
    
  } catch (error) {
    // ⚠️ IMPORTANTE: Se erro for de empresa desativada, relançar sem logar (será tratado no AuthContext)
    if (error instanceof Error && error.message === 'EMPRESA_DESATIVADA') {
      throw error; // Relançar o erro para ser tratado no AuthContext
    }
    
    // Log mais detalhado do erro (apenas para erros não esperados)
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack : undefined,
      userId: userId,
      retryCount: retryCount,
      timestamp: new Date().toISOString()
    };
    
    console.error('❌ Erro ao buscar dados otimizados:', errorDetails);
    
    // Retry automático em caso de timeout ou erro de conexão
    if (retryCount < maxRetries && error instanceof Error && 
        (error.message.includes('timeout') || error.message.includes('fetch'))) {
      console.log(`🔄 Tentando novamente em 2 segundos... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchUserDataOptimized(userId, retryCount + 1);
    }
    
    // Em caso de erro definitivo, retornar dados padrão para evitar quebrar a aplicação
    if (error instanceof Error && error.message.includes('timeout')) {
      console.warn('⚠️ Timeout definitivo - retornando dados padrão para manter funcionalidade');
      return {
        userData: {
          empresa_id: null,
          nome: 'Usuário',
          email: '',
          nivel: 'atendente',
          permissoes: [],
          foto_url: null
        },
        empresaData: {
          id: null,
          nome: 'Empresa',
          cnpj: '',
          endereco: '',
          telefone: '',
          email: '',
          logo_url: '',
          plano: 'trial'
        },
        catalogoHabilitado: true,
        recursosPlano: {} as Record<string, boolean>
      };
    }
    
    throw error;
  }
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Configurações melhoradas para evitar problemas de refresh token
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: process.env.NODE_ENV === 'development',
  },
  global: {
    headers: {
      'X-Client-Info': 'consert-web',
    },
  },
});

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Função utilitária para limpar dados de sessão corrompidos
export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sb-' + supabaseUrl.replace(/https?:\/\//, '').replace(/\.supabase\.co.*/, '') + '-auth-token');
    sessionStorage.removeItem('sb-' + supabaseUrl.replace(/https?:\/\//, '').replace(/\.supabase\.co.*/, '') + '-auth-token');
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
    console.error('Erro inesperado ao verificar sessão:', error);
    return false;
  }
};

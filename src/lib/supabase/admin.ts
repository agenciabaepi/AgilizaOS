import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readSupabaseServiceKey, readSupabaseUrl } from '@/lib/supabase-config';

/**
 * Cria o cliente admin sob demanda, somente em tempo de execução.
 * Evita falhas no build quando variáveis de ambiente não estão expostas na etapa de build.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = readSupabaseUrl();
  const supabaseServiceKey = readSupabaseServiceKey();

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) e NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) não configurados'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
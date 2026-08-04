// Configuração centralizada do Supabase (aceita nomes legados e novos do dashboard)
function readSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

function readSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  );
}

function readSupabaseServiceKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  );
}

export const supabaseConfig = {
  url: readSupabaseUrl(),
  anonKey: readSupabaseAnonKey(),
  serviceRoleKey: readSupabaseServiceKey(),
};

export { readSupabaseUrl, readSupabaseAnonKey, readSupabaseServiceKey };

// Validação — variáveis públicas (client + server)
if (!supabaseConfig.url) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}

if (!supabaseConfig.anonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
}

// Service role só existe no servidor; validar aqui quebrava o app no browser
if (typeof window === 'undefined' && !supabaseConfig.serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

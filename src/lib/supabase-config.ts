// Configuração centralizada do Supabase
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nxamrvfusyrtkcshehfm.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yeCVZkUfO6Rut3Vr4EDzq5Ci9h7l1lUrukCwJMITS',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_3dbdcMGcAyk8vN9ruzVRmZDjHRBAZEjt20fMCt4ClIzrhlLJ8PmcdLOFRIxd29hAGGWIX7W2lTUZjNJis'
};

// Validação das configurações
if (!supabaseConfig.url) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}

if (!supabaseConfig.anonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
}

if (!supabaseConfig.serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

// Configuração centralizada do Supabase
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nxamrvfusyrtkcshehfm.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW1ydmZ1c3lydGtjc2hlZmYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0Nzg2MTMxMCwiZXhwIjoyMDYzNDM3MzEwfQ.CWTKEVlWcMeRTv8kHgsPkk-WzoHxypFDb_QSf-DLPAQ',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW1ydmZ1c3lydGtjc2hlZmYiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ3ODYxMzEwLCJleHAiOjIwNjM0MzczMTB9.ax2dDACyrsila_Z97fjupFITA7DplPOTXoqyp-bezKc'
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

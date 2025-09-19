import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import LoginClient from './LoginClient';

export default async function LoginPage() {
  const cookieStore = await cookies();
  
  // Criar cliente Supabase para server-side
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
  
  const { data: { session } } = await supabase.auth.getSession();

  // ✅ ACESSO TOTALMENTE LIVRE: Sem redirecionamentos automáticos
  // Usuário pode acessar login mesmo estando logado

  // Renderiza o formulário de login client-side
  return <LoginClient />;
}
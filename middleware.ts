// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Busca o usuário logado na tabela usuarios
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id, nivel')
    .eq('auth_user_id', user.id)
    .single();

  // Busca a empresa vinculada ao usuário
  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', usuario?.empresa_id)
    .single();

  // Verifica o status da empresa
  if (!empresa || empresa.status !== 'ativo') {
    return NextResponse.redirect(new URL('/acesso-bloqueado', req.url));
  }

  // Verifica se o usuário é atendente tentando acessar configurações
  if (usuario?.nivel === 'atendente' && req.nextUrl.pathname.startsWith('/configuracoes')) {
    // Permite acesso apenas à aba de perfil do usuário
    if (req.nextUrl.pathname === '/configuracoes' || req.nextUrl.pathname === '/configuracoes/perfil') {
      return res;
    }
    // Bloqueia acesso a outras abas de configurações
    return NextResponse.redirect(new URL('/configuracoes/perfil', req.url));
  }

  return res;
}

// Aplicar middleware só em rotas protegidas
export const config = {
  matcher: ['/dashboard/:path*', '/clientes/:path*', '/ordens/:path*', '/configuracoes/:path*'], // adicionado configuracoes
};
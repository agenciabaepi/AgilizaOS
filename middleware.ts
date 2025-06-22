// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers/nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Busca a empresa associada ao usuário
  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .eq('email', user.email)
    .single();

  // Verifica o status da empresa
  if (!empresa || empresa.status !== 'ativo') {
    return NextResponse.redirect(new URL('/acesso-bloqueado', req.url));
  }

  return res;
}

// Aplicar middleware só em rotas protegidas
export const config = {
  matcher: ['/dashboard/:path*', '/clientes/:path*', '/ordens/:path*'], // ajuste conforme suas rotas
};
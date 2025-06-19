// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers/nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // Permite que o app carregue e sincronize a sessão no cliente
    return res;
  }

  const user = session.user;

  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .eq('email', user.email)
    .single();

  if (!empresa || empresa.status === 'cancelado' || empresa.status === 'vencido') {
    return NextResponse.redirect(new URL('/acesso-bloqueado', req.url));
  }

  if (empresa.status === 'teste') {
    const hoje = new Date();
    const dataCriacao = new Date(empresa.created_at);
    const diffEmDias = (hoje.getTime() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24);

    if (diffEmDias > 15) {
      return NextResponse.redirect(new URL('/acesso-bloqueado', req.url));
    }
  }

  return res;
}

// Aplicar middleware só em rotas protegidas
export const config = {
  matcher: ['/clientes/:path*', '/ordens/:path*'], // ajuste conforme suas rotas
};
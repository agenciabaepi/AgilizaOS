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

  // Verifica se a empresa existe
  if (!empresa) {
    return NextResponse.redirect(new URL('/acesso-bloqueado', req.url));
  }

  // Verifica se a empresa está ativa
  if (empresa.status === 'cancelado' || empresa.status === 'vencido') {
    return NextResponse.redirect(new URL('/acesso-bloqueado', req.url));
  }

  // Se a empresa estiver em período de teste, verifica os 15 dias
  if (empresa.status === 'teste') {
    const hoje = new Date();
    const dataCriacao = new Date(empresa.created_at);
    const diffEmMs = hoje.getTime() - dataCriacao.getTime();
    const diffEmDias = diffEmMs / (1000 * 60 * 60 * 24);

    if (diffEmDias > 15) {
      return NextResponse.redirect(new URL('/acesso-bloqueado', req.url));
    }
  }

  return res;
}

// Aplicar middleware só em rotas protegidas
export const config = {
  matcher: ['/dashboard/:path*', '/clientes/:path*', '/ordens/:path*'], // ajuste conforme suas rotas
};
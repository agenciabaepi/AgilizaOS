import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  console.log('🔍 Middleware executando para:', req.nextUrl.pathname);
  
  // TEMPORARIAMENTE DESABILITADO - Permitir acesso a todas as páginas
  console.log('🔍 Middleware - DESABILITADO - Permitindo acesso');
  return NextResponse.next();
  
  // CÓDIGO ORIGINAL COMENTADO:
  /*
  const res = NextResponse.next();
  
  // Criar cliente Supabase para middleware
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Verificar se o usuário está autenticado
  const { data: { user } } = await supabase.auth.getUser();
  console.log('🔍 Middleware - Usuário autenticado:', !!user);

  // Se não está autenticado e não está em páginas públicas, redirecionar para login
  if (!user && !req.nextUrl.pathname.startsWith('/login') && !req.nextUrl.pathname.startsWith('/criar-empresa') && !req.nextUrl.pathname.startsWith('/cadastro') && !req.nextUrl.pathname.startsWith('/teste-expirado') && req.nextUrl.pathname !== '/' && !req.nextUrl.pathname.startsWith('/assets/')) {
    console.log('🔍 Middleware - Redirecionando para login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Temporariamente desabilitar verificações complexas para testar login
  console.log('🔍 Middleware - Permitindo acesso');
  return res;
  */
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 
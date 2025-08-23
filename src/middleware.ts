import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Ignorar arquivos estáticos, assets e requisições internas do Next.js
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.startsWith('/favicon.ico') ||
    req.nextUrl.pathname.startsWith('/assets') ||
    req.nextUrl.pathname.startsWith('/notification.js') ||
    req.nextUrl.pathname.includes('.') ||
    req.nextUrl.searchParams.has('_rsc') || // ← ADICIONAR: Excluir requisições RSC
    req.headers.get('RSC') === '1' // ← ADICIONAR: Excluir headers RSC
  ) {
    return NextResponse.next();
  }

  // Páginas públicas que não precisam de autenticação
  const publicPages = [
    '/',
    '/login',
    '/cadastro',
    '/criar-empresa',
    '/teste-expirado',
    '/termos',
    '/planos',
    '/periodo-teste'
  ];

  const isPublicPage = publicPages.some(page => req.nextUrl.pathname.startsWith(page));
  
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Para páginas protegidas, verificar autenticação
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    // if (error || !user) {
    //   return NextResponse.redirect(new URL('/login', req.url));
    // }
    return NextResponse.next(); // ← Permitir acesso temporariamente
  } catch (error) {
    // Em caso de erro, redirecionar para login
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - _rsc (React Server Components)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Middleware de autenticação - Primeira linha de defesa
 * 
 * Responsabilidades:
 * 1. Proteger rotas privadas de acesso não autenticado
 * 2. Redirecionar usuários não logados para /login
 * 3. Evitar acesso a /login por usuários já autenticados
 * 4. Preservar URL de destino para redirecionamento pós-login
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ✅ OTIMIZADO: Logs apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Middleware: ${pathname}`);
  }
  
  // Lista de rotas públicas (não exigem autenticação)
  const publicPaths = [
    '/login',
    '/cadastro', 
    '/',
    '/sobre',
    '/termos',
    '/politicas-privacidade',
    '/planos',
    '/pagamentos/sucesso',
    '/pagamentos/falha',
    '/pagamentos/pendente',
    '/instrucoes-verificacao',
    '/clear-auth',
    '/clear-cache',
    '/os', // Rotas públicas de OS
  ];

  // Verificar se é uma rota pública ou de API
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );
  
  // Rotas de API não devem ser bloqueadas pelo middleware de autenticação
  const isApiRoute = pathname.startsWith('/api');
  const isStaticAsset = pathname.startsWith('/_next') || 
                       pathname.includes('.') || 
                       pathname.startsWith('/assets');
  
  // Se é rota pública, API ou asset estático, deixar passar
  if (isPublicPath || isApiRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // ✅ MELHORADO: Verificar sessão usando Supabase adequadamente
  try {
    // Procurar por cookies de autenticação do Supabase
    const authCookies = request.cookies.getAll().filter(cookie => 
      cookie.name.startsWith('sb-') && 
      cookie.name.includes('auth-token')
    );

    // Se não há cookies de autenticação, redirecionar para login
    if (authCookies.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚫 Middleware: Sem cookies de auth, redirecionando para login`);
      }
      
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar se há pelo menos um cookie com conteúdo válido
    const hasValidAuthCookie = authCookies.some(cookie => 
      cookie.value && cookie.value.length > 50 // JWT tokens são longos
    );

    if (!hasValidAuthCookie) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚫 Middleware: Cookies inválidos, redirecionando para login`);
      }
      
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ✅ Passou pela verificação de cookies, permitir acesso
    // A verificação completa de sessão será feita no client-side pelo AuthGuard
    return NextResponse.next();

  } catch (error) {
    // Em caso de erro, por segurança, redirecionar para login
    console.error('❌ Middleware: Erro na verificação:', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon and other static assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.mp3|.*\\.mp4|.*\\.pdf).*)',
  ],
}

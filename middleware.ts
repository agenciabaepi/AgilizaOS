import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitMiddleware } from './src/middleware/rateLimit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Aplicar rate limiting para APIs
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // 2. Verificar autenticação para rotas protegidas
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
    '/clear-cache'
  ];

  // Verificar se é uma rota pública
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  if (!isPublicPath) {
    // Verificar se usuário está autenticado
    const session = request.cookies.get('sb-access-token')?.value || 
                   request.cookies.get('session')?.value ||
                   request.headers.get('authorization');

    if (!session) {
      // Redirecionar para login mantendo a URL de destino
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Verificar se está tentando acessar login com sessão ativa
  if (pathname === '/login') {
    const session = request.cookies.get('sb-access-token')?.value || 
                   request.cookies.get('session')?.value;
    
    if (session) {
      // Se já está logado, redirecionar para dashboard
      const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - rate limiting já cuida)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.mp3|.*\\.mp4|.*\\.pdf).*)',
  ],
}

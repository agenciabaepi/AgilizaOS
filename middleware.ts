import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`🔍 MIDDLEWARE EXECUTANDO: ${pathname}`);
  
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
    '/clear-cache'
  ];

  // Verificar se é uma rota pública
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  console.log(`🔐 Rota ${pathname} é pública: ${isPublicPath}`);
  
  // Se NÃO é uma rota pública, verificar autenticação
  if (!isPublicPath) {
    // Verificar cookies do Supabase
    const supabaseCookies = request.cookies.getAll().filter(cookie => 
      cookie.name.startsWith('sb-') || 
      cookie.name.includes('supabase') ||
      cookie.name.includes('auth')
    );
    
    console.log(`🍪 Cookies Supabase encontrados:`, supabaseCookies.length);
    console.log(`🍪 Todos os cookies:`, request.cookies.getAll().map(c => c.name));
    
    // Verificar se usuário está autenticado - SER MAIS RIGOROSO
    const hasValidSession = supabaseCookies.length > 0 && 
                           supabaseCookies.some(cookie => {
                             const hasValue = cookie.value && cookie.value.length > 10;
                             console.log(`🔍 Cookie ${cookie.name}: ${hasValue ? 'VÁLIDO' : 'INVÁLIDO'} (${cookie.value?.length || 0} chars)`);
                             return hasValue;
                           });

    console.log(`🔑 Sessão válida encontrada: ${hasValidSession}`);

    // FORÇAR REDIRECIONAMENTO PARA TESTE
    if (!hasValidSession || supabaseCookies.length === 0) {
      console.log(`🚫 REDIRECIONANDO PARA LOGIN: ${pathname}`);
      // Redirecionar para login mantendo a URL de destino
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Se está tentando acessar login com sessão ativa
  if (pathname === '/login') {
    const session = request.cookies.get('sb-access-token')?.value || 
                   request.cookies.get('session')?.value;
    
    if (session) {
      console.log(`✅ Já está logado, redirecionando para dashboard`);
      // Se já está logado, redirecionar para dashboard
      const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.mp3|.*\\.mp4|.*\\.pdf).*)',
  ],
}

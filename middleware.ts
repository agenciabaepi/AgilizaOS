import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Middleware de autenticação - Primeira linha de defesa
 * 
 * Responsabilidades:
 * 1. Proteger rotas privadas de acesso não autenticado
 * 2. Redirecionar usuários não logados para /login
 * 3. Preservar URL de destino para redirecionamento pós-login
 * 
 * ⚠️ IMPORTANTE: Apenas as rotas listadas em publicPaths são acessíveis sem autenticação.
 * Todas as outras rotas requerem autenticação válida.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ✅ OTIMIZADO: Logs apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Middleware: ${pathname}`);
  }
  
  // ⚠️ SEGURANÇA CRÍTICA: Proteger rotas do admin-saas
  // Rotas do admin-saas requerem cookie de verificação 2FA (admin_saas_access)
  // A rota de login foi movida para /admin-login para evitar conflitos de layout
  
  // Redirecionar /admin-saas/login antigo para /admin-login novo
  if (pathname === '/admin-saas/login') {
    const loginUrl = new URL('/admin-login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  if (pathname.startsWith('/admin-saas')) {
    // Para TODAS as rotas do admin-saas, verificar cookie obrigatoriamente
    const adminCookie = request.cookies.get('admin_saas_access')?.value === '1';
    
    if (!adminCookie) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚫 Middleware: Acesso negado ao admin-saas sem cookie de autenticação: ${pathname}`);
      }
      const loginUrl = new URL('/admin-login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Cookie válido, permitir acesso
    return NextResponse.next();
  }
  
  // Permitir /admin-login sem verificação de cookie
  if (pathname === '/admin-login') {
    return NextResponse.next();
  }

  // ✅ LISTA COMPLETA DE ROTAS PÚBLICAS (sem autenticação)
  // ATENÇÃO: Todas as rotas que não estão nesta lista REQUEREM autenticação
  const publicPaths = [
    '/admin-login', // Login do admin (movido de /admin-saas/login)
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
    // Rotas públicas de OS (clientes podem acessar com senha)
    '/os',
    '/os/buscar',
    '/os/[id]/status', // Permite acesso público com senha na query string
  ];

  // Verificar se é uma rota pública usando match exato ou prefixo
  const isPublicPath = publicPaths.some(path => {
    // Match exato
    if (pathname === path) return true;
    // Match com prefixo (ex: /os, /os/buscar, /os/123/status)
    if (path.startsWith('/os') && pathname.startsWith('/os')) {
      // Permitir rotas públicas de OS
      if (pathname.startsWith('/os/buscar')) return true;
      if (pathname.match(/^\/os\/[^\/]+\/status$/)) return true;
      if (pathname === '/os') return true;
      // Bloquear outras rotas de OS que não são públicas
      return false;
    }
    // Para outras rotas, usar match exato ou prefixo simples
    return pathname.startsWith(path + '/') || pathname === path;
  });
  
  // Rotas de API não devem ser bloqueadas pelo middleware de autenticação
  // (elas têm sua própria validação interna)
  const isApiRoute = pathname.startsWith('/api');
  const isStaticAsset = pathname.startsWith('/_next') || 
                       pathname.startsWith('/_static') ||
                       pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/i);
  
  // Se é rota pública, API ou asset estático, deixar passar
  if (isPublicPath || isApiRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // ✅ VERIFICAÇÃO DE AUTENTICAÇÃO PARA ROTAS PRIVADAS
  // Se chegou aqui, a rota NÃO é pública e REQUER autenticação
  try {
    // Criar cliente Supabase para verificar sessão no middleware
    // No middleware do Next.js, usamos a API do request/response diretamente
    const response = NextResponse.next();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Verificar sessão real do Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Se não há sessão válida, redirecionar para login
    if (!session || sessionError) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚫 Middleware: Sem sessão válida para ${pathname}, redirecionando para login`);
      }
      
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ✅ Passou pela verificação de sessão, permitir acesso
    // A verificação completa de permissões será feita no client-side pelo AuthGuard
    return response;

  } catch (error) {
    // Em caso de erro, por segurança, redirecionar para login
    console.error('❌ Middleware: Erro na verificação de autenticação:', error);
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

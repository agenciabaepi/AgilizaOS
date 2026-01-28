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
  if (pathname === '/admin-saas/login') {
    const loginUrl = new URL('/admin-login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin-saas')) {
    const adminCookie = request.cookies.get('admin_saas_access')?.value === '1';
    if (!adminCookie) {
      const loginUrl = new URL('/admin-login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname === '/admin-login') {
    return NextResponse.next();
  }

  // Rotas públicas – lógica inline para evitar import no Edge Runtime (evita erro webpack)
  const publicPaths = [
    '/login', '/cadastro', '/', '/sobre', '/termos', '/politicas-privacidade',
    '/planos', '/pagamentos/sucesso', '/pagamentos/falha', '/pagamentos/pendente',
    '/instrucoes-verificacao', '/clear-auth', '/clear-cache', '/os', '/os/buscar',
  ];
  const isPublicPath = publicPaths.some((path) => {
    if (pathname === path) return true;
    if (path.startsWith('/os') && pathname.startsWith('/os')) {
      if (pathname.startsWith('/os/buscar')) return true;
      if (/^\/os\/[^/]+\/status$/.test(pathname)) return true;
      if (/^\/os\/[^/]+\/login$/.test(pathname)) return true;
      if (pathname === '/os') return true;
      return false;
    }
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

    // 🔒 SEGURANÇA CRÍTICA: Verificar acesso a dashboards específicas ANTES de servir a página
    const dashboardRoutes = ['/dashboard', '/dashboard-tecnico', '/dashboard-atendente'];
    const isDashboardRoute = dashboardRoutes.includes(pathname);
    
    if (isDashboardRoute) {
      // Buscar dados do usuário para verificar role
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nivel, empresa_id')
        .eq('auth_user_id', session.user.id)
        .single();

      if (usuarioError || !usuarioData) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 Middleware: Erro ao buscar dados do usuário para ${pathname}`);
        }
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Verificar se o usuário tem acesso à dashboard específica
      const nivel = usuarioData.nivel?.toLowerCase();
      let temAcesso = false;
      let dashboardCorreta = '/dashboard';

      if (pathname === '/dashboard') {
        // Dashboard admin - apenas admin e usuarioteste
        temAcesso = nivel === 'admin' || nivel === 'usuarioteste';
        dashboardCorreta = '/dashboard';
      } else if (pathname === '/dashboard-tecnico') {
        // Dashboard técnico - apenas técnico
        temAcesso = nivel === 'tecnico';
        dashboardCorreta = '/dashboard-tecnico';
      } else if (pathname === '/dashboard-atendente') {
        // Dashboard atendente - apenas atendente
        temAcesso = nivel === 'atendente';
        dashboardCorreta = '/dashboard-atendente';
      }

      // Se não tem acesso, redirecionar imediatamente para a dashboard correta
      if (!temAcesso) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 Middleware: Usuário ${nivel} tentou acessar ${pathname}, redirecionando para ${dashboardCorreta}`);
        }
        
        // Determinar dashboard correta baseada no role
        if (nivel === 'tecnico') {
          dashboardCorreta = '/dashboard-tecnico';
        } else if (nivel === 'atendente') {
          dashboardCorreta = '/dashboard-atendente';
        } else if (nivel === 'admin' || nivel === 'usuarioteste') {
          dashboardCorreta = '/dashboard';
        }
        
        const correctDashboardUrl = new URL(dashboardCorreta, request.url);
        return NextResponse.redirect(correctDashboardUrl);
      }
    }

    // ✅ Passou pela verificação de sessão e permissões, permitir acesso
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

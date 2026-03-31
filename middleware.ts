import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
// Import dinâmico para evitar travar "Compiling middleware" no Turbopack (carrega só em rotas privadas)

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

  // ✅ Primeira carga: / vai direto para /login (página mais leve, evita travar 20+ min na home pesada)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

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
    '/login', '/cadastro', '/empresa-desativada', '/', '/sobre', '/termos', '/politicas-privacidade',
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

    // Buscar dados do usuário (role e permissões para técnico - sistema existente)
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nivel, empresa_id, permissoes')
      .eq('auth_user_id', session.user.id)
      .single();

    if (usuarioError || !usuarioData) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚫 Middleware: Erro ao buscar dados do usuário para ${pathname}`);
      }
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const nivel = usuarioData.nivel?.toLowerCase();
    const rawPermissoes = Array.isArray(usuarioData.permissoes) ? usuarioData.permissoes : [];
    const isAdminOuTeste = nivel === 'admin' || nivel === 'usuarioteste';

    // Carregar permissões só quando necessário (evita travar compilação do middleware no Turbopack)
    const { canTecnicoAccessPath, TECNICO_DEFAULT_PERMISSIONS } = await import('@/config/tecnicoAllowedPaths');

    // Admin e usuarioteste têm acesso total; demais níveis podem ter permissões restritas
    let permissoes: string[] = [];
    if (nivel === 'tecnico') {
      permissoes = rawPermissoes.length > 0 ? rawPermissoes : TECNICO_DEFAULT_PERMISSIONS;
    } else if (!isAdminOuTeste && rawPermissoes.length > 0) {
      permissoes = rawPermissoes;
    }

    // 🔒 /comissoes = só técnico (Minhas Comissões). Admin/atendente redireciona para o dashboard.
    if (pathname === '/comissoes' && nivel !== 'tecnico') {
      const dashboardUrl = new URL(nivel === 'atendente' ? '/dashboard-atendente' : '/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // 🔒 /financeiro/comissoes-tecnicos = só admin/atendente (gestão de comissões). Técnico redireciona.
    if (pathname === '/financeiro/comissoes-tecnicos' && nivel === 'tecnico') {
      const dashboardTecnicoUrl = new URL('/dashboard-tecnico', request.url);
      return NextResponse.redirect(dashboardTecnicoUrl);
    }

    // 🔒 /assinatura = não disponível para técnico (gestão de assinatura é admin/atendente).
    if (pathname === '/assinatura' && nivel === 'tecnico') {
      return NextResponse.redirect(new URL('/dashboard-tecnico', request.url));
    }

    // 🔒 Bloquear rotas por permissão: técnico sempre; atendente/financeiro quando tiverem permissoes definidas
    if (!isAdminOuTeste && permissoes.length > 0) {
      const permitido = canTecnicoAccessPath(pathname, permissoes);
      if (!permitido) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 Middleware: Usuário (${nivel}) tentou acessar ${pathname}, redirecionando`);
        }
        const redirectPath = nivel === 'tecnico' ? '/dashboard-tecnico' : nivel === 'atendente' ? '/dashboard-atendente' : '/dashboard';
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }

    // 🔒 Verificar acesso a dashboards específicas (admin/atendente não acessam dashboard do outro)
    const dashboardRoutes = ['/dashboard', '/dashboard-tecnico', '/dashboard-atendente'];
    const isDashboardRoute = dashboardRoutes.includes(pathname);
    
    if (isDashboardRoute) {
      let temAcesso = false;
      let dashboardCorreta = '/dashboard';

      if (pathname === '/dashboard') {
        temAcesso = nivel === 'admin' || nivel === 'usuarioteste';
        dashboardCorreta = '/dashboard';
      } else if (pathname === '/dashboard-tecnico') {
        temAcesso = nivel === 'tecnico';
        dashboardCorreta = '/dashboard-tecnico';
      } else if (pathname === '/dashboard-atendente') {
        temAcesso = nivel === 'atendente';
        dashboardCorreta = '/dashboard-atendente';
      }

      if (!temAcesso) {
        if (nivel === 'tecnico') dashboardCorreta = '/dashboard-tecnico';
        else if (nivel === 'atendente') dashboardCorreta = '/dashboard-atendente';
        else dashboardCorreta = '/dashboard';
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

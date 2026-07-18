import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
// Import dinâmico para evitar travar "Compiling middleware" no Turbopack (carrega só em rotas privadas)

const WHATSAPP_CRM_ENABLED =
  process.env.NEXT_PUBLIC_WHATSAPP_CRM_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'beta' ||
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'development';

function blockWhatsAppCrmRoutes(request: NextRequest): NextResponse | null {
  if (WHATSAPP_CRM_ENABLED) return null;

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/whatsapp/crm')) {
    return NextResponse.json({ error: 'Recurso indisponível' }, { status: 404 });
  }

  if (pathname === '/whatsapp' || pathname.startsWith('/whatsapp/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname === '/configuracoes/whatsapp') {
    return NextResponse.redirect(new URL('/configuracoes', request.url));
  }

  return null;
}

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

  const crmBlock = blockWhatsAppCrmRoutes(request);
  if (crmBlock) return crmBlock;

  // Legado: planos públicos movidos para /assinatura (dentro do sistema)
  if (pathname === '/planos' || pathname === '/planos/renovar') {
    return NextResponse.redirect(new URL('/assinatura', request.url));
  }
  if (pathname.startsWith('/planos/pagar/')) {
    const slug = pathname.slice('/planos/pagar/'.length).split('/')[0];
    if (slug) {
      return NextResponse.redirect(new URL(`/assinatura/pagar/${slug}`, request.url));
    }
  }

  // ✅ Primeira carga: / vai direto para /login
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
    '/login', '/cadastro', '/fale-conosco', '/empresa-desativada', '/', '/sobre', '/termos', '/politicas-privacidade',
    '/pagamentos/sucesso', '/pagamentos/falha', '/pagamentos/pendente',
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

    // Buscar dados do usuário (role, permissões e confirmação SMS)
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nivel, empresa_id, permissoes, email, email_verificado, verificacao_liberada_admin')
      .eq('auth_user_id', session.user.id)
      .single();

    if (usuarioError || !usuarioData) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚫 Middleware: Erro ao buscar dados do usuário para ${pathname}`);
      }
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // 🔒 Admin da empresa NÃO entra sem confirmar SMS (ou liberação no admin-saas)
    const { SMS_VERIFICATION_ENABLED } = await import('@/config/sms-verification');
    if (SMS_VERIFICATION_ENABLED) {
      const nivelUser = (usuarioData.nivel || '').toLowerCase();
      const verificadoPessoal =
        usuarioData.email_verificado === true || usuarioData.verificacao_liberada_admin === true;

      if (nivelUser === 'admin' && !verificadoPessoal) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 Middleware: Admin sem confirmação SMS — ${pathname}`);
        }
        const loginUrl = new URL('/login', request.url);
        const email = usuarioData.email || session.user.email || '';
        if (email) loginUrl.searchParams.set('email', email);
        loginUrl.searchParams.set('verificacao', 'pending');
        const res = NextResponse.redirect(loginUrl);
        for (const c of request.cookies.getAll()) {
          if (c.name.includes('auth-token') || c.name.startsWith('sb-')) {
            res.cookies.set(c.name, '', { path: '/', maxAge: 0 });
          }
        }
        return res;
      }
    }

    const nivel = usuarioData.nivel?.toLowerCase();
    const {
      normalizePermissoes,
      checkRouteAccess,
      getHomePathForUser,
    } = await import('@/lib/permissions');

    const rawPermissoes = normalizePermissoes(usuarioData.permissoes);
    const isAdminOuTeste = nivel === 'admin' || nivel === 'usuarioteste';

    // 🔒 Bloquear rotas por permissão (técnico, atendente, financeiro)
    if (!isAdminOuTeste && !checkRouteAccess(pathname, nivel, rawPermissoes)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚫 Middleware: Usuário (${nivel}) bloqueado em ${pathname}`);
      }
      return NextResponse.redirect(new URL(getHomePathForUser(nivel, rawPermissoes), request.url));
    }

    // 🔒 Cobrança / trial (SaaS): exige RPC `saas_auth_pode_usar_app` no Postgres (ver database/saas_billing_functions.sql)
    if (process.env.SAAS_SKIP_BILLING_RPC !== '1') {
      const { isAllowedWhenSubscriptionExpired } = await import('@/config/allowedPathsWhenSubscriptionExpired');
      if (!isAllowedWhenSubscriptionExpired(pathname)) {
        const { data: billingOk, error: billingErr } = await supabase.rpc('saas_auth_pode_usar_app');
        if (billingErr) {
          const msg = billingErr.message || '';
          const missingFn =
            (billingErr as { code?: string }).code === '42883' ||
            msg.includes('saas_auth_pode_usar_app') ||
            msg.includes('does not exist');
          if (missingFn) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(
                '[middleware] RPC saas_auth_pode_usar_app ausente — aplique database/saas_billing_functions.sql ou defina SAAS_SKIP_BILLING_RPC=1'
              );
            }
          } else {
            console.error('[middleware] saas_auth_pode_usar_app:', billingErr);
          }
        }
        if (billingOk === false) {
          const u = new URL('/teste-expirado', request.url);
          u.searchParams.set('billing', '1');
          return NextResponse.redirect(u);
        }
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

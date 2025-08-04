import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  console.log('🔍 Middleware executando para:', req.nextUrl.pathname);
  
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Verificar se o usuário está autenticado
  const { data: { user } } = await supabase.auth.getUser();

  // Se não está autenticado e não está em páginas públicas, redirecionar para login
  if (!user && !req.nextUrl.pathname.startsWith('/login') && !req.nextUrl.pathname.startsWith('/criar-empresa') && !req.nextUrl.pathname.startsWith('/cadastro') && !req.nextUrl.pathname.startsWith('/teste-expirado') && req.nextUrl.pathname !== '/' && !req.nextUrl.pathname.startsWith('/assets/')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Se está autenticado, verificar assinatura para rotas protegidas
  if (user) {
    // Rotas que precisam de verificação de assinatura
    const rotasProtegidas = [
      '/dashboard',
      '/caixa',
      '/clientes',
      '/fornecedores',
      '/equipamentos',
      '/ordens',
      '/bancada',
      '/financeiro',
      '/lembretes',
      '/perfil',
      '/configuracoes'
    ];

    const precisaVerificarAssinatura = rotasProtegidas.some(rota => 
      req.nextUrl.pathname.startsWith(rota)
    );

    if (precisaVerificarAssinatura) {
      try {
        // Buscar empresa do usuário
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('auth_user_id', user.id)
          .single();

        if (usuario?.empresa_id) {
          // Verificar se tem assinatura ativa usando service role
          try {
            // Criar cliente com service role para bypass RLS
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
              {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false
                }
              }
            );

            // Buscar assinatura ativa/trial
            const { data: assinatura, error: assinaturaError } = await supabaseAdmin
              .from('assinaturas')
              .select('status, data_fim, data_trial_fim')
              .eq('empresa_id', usuario.empresa_id)
              .in('status', ['active', 'trial'])
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (assinaturaError) {
              console.error('Erro ao buscar assinatura no middleware:', assinaturaError);
              // Em caso de erro, permitir acesso (não bloquear o usuário)
              return res;
            }

            console.log('Middleware Debug:', {
              empresa_id: usuario.empresa_id,
              assinatura: assinatura,
              pathname: req.nextUrl.pathname
            });

            if (assinatura) {
              // Se tem assinatura ativa (não trial), verificar se não expirou
              if (assinatura.status === 'active') {
                if (assinatura.data_fim && new Date(assinatura.data_fim) < new Date()) {
                  // Assinatura ativa expirou, redirecionar para teste expirado
                  if (!req.nextUrl.pathname.startsWith('/teste-expirado')) {
                    console.log('Middleware: Assinatura ativa expirou, redirecionando');
                    return NextResponse.redirect(new URL('/teste-expirado', req.url));
                  }
                } else {
                  // Assinatura ativa válida, permitir acesso
                  console.log('Middleware: Assinatura ativa válida, permitindo acesso');
                  return res;
                }
              }

              // Se está no trial, verificar se expirou
              if (assinatura.status === 'trial') {
                const agora = new Date();
                const fimTrial = new Date(assinatura.data_trial_fim);
                const expirou = fimTrial < agora;
                
                console.log('Middleware Trial Check:', {
                  agora: agora.toISOString(),
                  fimTrial: fimTrial.toISOString(),
                  expirou: expirou,
                  diferencaHoras: (fimTrial.getTime() - agora.getTime()) / (1000 * 60 * 60)
                });

                if (expirou) {
                  // Trial expirou, redirecionar para teste expirado
                  if (!req.nextUrl.pathname.startsWith('/teste-expirado')) {
                    console.log('Middleware: Trial expirou, redirecionando');
                    return NextResponse.redirect(new URL('/teste-expirado', req.url));
                  }
                } else {
                  // Trial ativo, permitir acesso normal
                  console.log('Middleware: Trial ativo, permitindo acesso normal');
                  return res;
                }
              }
            } else {
              // Se não tem assinatura, redirecionar para teste expirado
              if (!req.nextUrl.pathname.startsWith('/teste-expirado')) {
                console.log('Middleware: Sem assinatura, redirecionando');
                return NextResponse.redirect(new URL('/teste-expirado', req.url));
              }
            }
          } catch (error) {
            console.error('Erro ao verificar assinatura no middleware:', error);
            // Em caso de erro, permitir acesso (não bloquear o usuário)
          }
        }
      } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
        // Em caso de erro, permitir acesso (não bloquear o usuário)
      }
    }
  }

  return res;
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
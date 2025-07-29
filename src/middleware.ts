import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Verificar se o usuário está autenticado
  const { data: { user } } = await supabase.auth.getUser();

  // Se não está autenticado e não está em páginas públicas, redirecionar para login
  if (!user && !req.nextUrl.pathname.startsWith('/login') && !req.nextUrl.pathname.startsWith('/criar-empresa') && !req.nextUrl.pathname.startsWith('/cadastro')) {
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
          // Verificar se tem assinatura ativa
          const { data: assinatura } = await supabase
            .from('assinaturas')
            .select('status, data_fim, data_trial_fim')
            .eq('empresa_id', usuario.empresa_id)
            .in('status', ['active', 'trial'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Se não tem assinatura ou está expirada, redirecionar para planos
          if (!assinatura || 
              (assinatura.status === 'trial' && assinatura.data_trial_fim && new Date(assinatura.data_trial_fim) < new Date()) ||
              (assinatura.status === 'active' && assinatura.data_fim && new Date(assinatura.data_fim) < new Date())) {
            
            // Não redirecionar se já está na página de planos
            if (!req.nextUrl.pathname.startsWith('/planos')) {
              return NextResponse.redirect(new URL('/planos', req.url));
            }
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
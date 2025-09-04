// MIDDLEWARE COMPLETAMENTE DESABILITADO
// Para resolver problemas de EvalError no Edge Runtime

// import { createClient } from '@supabase/supabase-js';
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export async function middleware(req: NextRequest) {
//   return NextResponse.next();
// }
  
  // TODO: Reativar middleware após resolver compatibilidade com Edge Runtime
  /*
  // Ignorar arquivos estáticos, assets e requisições internas do Next.js
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.startsWith('/favicon.ico') ||
    req.nextUrl.pathname.startsWith('/assets') ||
    req.nextUrl.pathname.startsWith('/notification.js') ||
    req.nextUrl.pathname.includes('.') ||
    req.nextUrl.searchParams.has('_rsc') ||
    req.headers.get('RSC') === '1'
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
    '/periodo-teste',
    '/instrucoes-verificacao'
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
    
    if (error || !user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Verificar se o email foi verificado
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('email_verificado, email')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError) {
      console.error('Erro ao buscar dados do usuário:', usuarioError);
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Se o email não foi verificado, redirecionar para instruções de verificação
    if (usuario && !usuario.email_verificado) {
      const instrucoesUrl = new URL('/instrucoes-verificacao', req.url);
      instrucoesUrl.searchParams.set('email', usuario.email);
      return NextResponse.redirect(instrucoesUrl);
    }

    return NextResponse.next();
  } catch (error) {
    // Em caso de erro, redirecionar para login
    console.error('Erro no middleware:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
  */
}

// export const config = {
//   matcher: [],
// };
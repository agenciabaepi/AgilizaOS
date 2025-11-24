import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Listar tickets do usuário logado (empresa)
 * GET /api/tickets
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Debug: verificar cookies
    const sbCookies = cookieStore.getAll().filter(c => c.name.includes('supabase') || c.name.includes('sb-'));
    console.log('🍪 Cookies encontrados:', sbCookies.length);
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const value = cookieStore.get(name)?.value;
            if (name.includes('supabase') || name.includes('sb-')) {
              console.log(`🍪 Cookie ${name}:`, value ? 'presente' : 'ausente');
            }
            return value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ Erro de autenticação GET:', authError);
      return NextResponse.json(
        { ok: false, message: 'Erro de autenticação', error: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('❌ Usuário não encontrado na autenticação GET');
      return NextResponse.json(
        { ok: false, message: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Buscar usuário e empresa
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError) {
      console.error('❌ Erro ao buscar usuário GET:', usuarioError);
      return NextResponse.json(
        { ok: false, message: 'Erro ao buscar usuário', error: usuarioError.message },
        { status: 500 }
      );
    }

    if (!usuario) {
      console.error('❌ Usuário não encontrado na tabela usuarios GET, auth_user_id:', user.id);
      return NextResponse.json(
        { ok: false, message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Buscar tickets da empresa
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets_suporte')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .order('created_at', { ascending: false });

    if (ticketsError) {
      console.error('Erro ao buscar tickets:', ticketsError);
      return NextResponse.json(
        { ok: false, message: 'Erro ao buscar tickets', error: ticketsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      tickets: tickets || []
    });

  } catch (error: any) {
    console.error('Erro ao listar tickets:', error);
    return NextResponse.json(
      { ok: false, message: 'Erro interno do servidor', error: error?.message },
      { status: 500 }
    );
  }
}

/**
 * Criar novo ticket
 * POST /api/tickets
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ Erro de autenticação POST:', authError);
      return NextResponse.json(
        { ok: false, message: 'Erro de autenticação', error: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('❌ Usuário não encontrado na autenticação POST');
      return NextResponse.json(
        { ok: false, message: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Buscar usuário e empresa
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError) {
      console.error('❌ Erro ao buscar usuário POST:', usuarioError);
      return NextResponse.json(
        { ok: false, message: 'Erro ao buscar usuário', error: usuarioError.message },
        { status: 500 }
      );
    }

    if (!usuario) {
      console.error('❌ Usuário não encontrado na tabela usuarios POST, auth_user_id:', user.id);
      return NextResponse.json(
        { ok: false, message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { titulo, descricao, categoria, prioridade, anexos_url } = body;

    if (!titulo || !descricao) {
      return NextResponse.json(
        { ok: false, message: 'Título e descrição são obrigatórios' },
        { status: 400 }
      );
    }

    // Criar ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets_suporte')
      .insert({
        empresa_id: usuario.empresa_id,
        usuario_id: usuario.id,
        titulo,
        descricao,
        categoria: categoria || 'bug',
        prioridade: prioridade || 'media',
        anexos_url: anexos_url || [],
        status: 'aberto'
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Erro ao criar ticket:', ticketError);
      return NextResponse.json(
        { ok: false, message: 'Erro ao criar ticket', error: ticketError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      ticket
    });

  } catch (error: any) {
    console.error('Erro ao criar ticket:', error);
    return NextResponse.json(
      { ok: false, message: 'Erro interno do servidor', error: error?.message },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/produtos-servicos/listar?empresaId=xxx&tipo=produto|servico
 * Lista produtos/serviços da empresa do usuário logado.
 * Aceita sessão via cookies ou via header Authorization: Bearer <access_token>.
 */
export async function GET(req: NextRequest) {
  try {
    let user: { id: string } | null = null;

    const supabase = await createServerSupabaseClient();
    const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
    if (!authError && cookieUser) {
      user = cookieUser;
    }

    if (!user) {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (token) {
        const supabaseAuth = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user: tokenUser }, error: tokenError } = await supabaseAuth.auth.getUser(token);
        if (!tokenError && tokenUser) user = tokenUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: usuario, error: usuarioError } = await admin
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !usuario?.empresa_id) {
      return NextResponse.json(
        { error: 'Usuário ou empresa não encontrados' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const queryEmpresaId = url.searchParams.get('empresaId');
    const tipo = url.searchParams.get('tipo'); // 'produto' | 'servico' | null = todos

    // Usar sempre a empresa do usuário logado (segurança)
    const empresaId = usuario.empresa_id;

    // Se o front enviou empresaId, validar que é a mesma do usuário
    if (queryEmpresaId && queryEmpresaId !== empresaId) {
      return NextResponse.json(
        { error: 'Acesso negado a dados de outra empresa' },
        { status: 403 }
      );
    }

    let query = admin
      .from('produtos_servicos')
      .select('*, grupos_produtos(nome)')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (tipo === 'produto' || tipo === 'servico') {
      query = query.eq('tipo', tipo);
    }

    const { data, error } = await query;

    if (error) {
      // Se a relação grupos_produtos não existir, listar sem join
      const isJoinError =
        error.message?.includes('grupos_produtos') ||
        (error as { code?: string }).code === 'PGRST204';
      if (isJoinError) {
        let fallbackQuery = admin
          .from('produtos_servicos')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('nome');
        if (tipo === 'produto' || tipo === 'servico') {
          fallbackQuery = fallbackQuery.eq('tipo', tipo);
        }
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (!fallbackError) return NextResponse.json(fallbackData ?? []);
      }
      console.error('Erro ao listar produtos/serviços:', error);
      return NextResponse.json(
        { error: (error as { message?: string }).message || 'Erro ao listar' },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Erro em produtos-servicos/listar:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

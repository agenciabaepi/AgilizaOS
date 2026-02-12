import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * PUT /api/produtos-servicos/atualizar?produtoId=xxx
 * Atualiza um produto/serviço por ID, somente se pertencer à empresa do usuário logado.
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const url = new URL(req.url);
    const produtoId = url.searchParams.get('produtoId');
    if (!produtoId) {
      return NextResponse.json(
        { error: 'produtoId é obrigatório' },
        { status: 400 }
      );
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

    const body = await req.json();

    // Garantir que não altera empresa_id
    const {
      empresa_id: _empresaId,
      id: _id,
      created_at: _createdAt,
      ...payload
    } = body;

    // Campos permitidos para atualização (evitar injetar colunas indevidas)
    const allowed: Record<string, unknown> = {};
    const allowList = [
      'nome', 'tipo', 'codigo', 'grupo_id', 'categoria_id', 'subcategoria_id',
      'fornecedor_id', 'custo', 'preco', 'unidade', 'marca',
      'estoque_min', 'estoque_max', 'estoque_atual', 'estoque_minimo',
      'situacao', 'ncm', 'cfop', 'cst', 'cest',
      'largura_cm', 'altura_cm', 'profundidade_cm', 'peso_g',
      'obs', 'ativo', 'codigo_barras', 'imagens_url', 'imagens',
    ];
    for (const key of allowList) {
      if (payload[key] !== undefined) {
        if (key === 'imagens') {
          allowed.imagens_url = Array.isArray(payload[key]) ? payload[key] : payload.imagens_url;
        } else {
          (allowed as Record<string, unknown>)[key] = payload[key];
        }
      }
    }

    const { data, error } = await admin
      .from('produtos_servicos')
      .update(allowed)
      .eq('id', produtoId)
      .eq('empresa_id', usuario.empresa_id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar produto:', error);
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar produto' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Produto não encontrado ou sem permissão' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Erro em produtos-servicos/atualizar:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

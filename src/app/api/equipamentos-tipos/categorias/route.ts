import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { listCategoriasEquipamentoComChecklist } from '@/lib/equipamentos-categorias-server';

/**
 * GET /api/equipamentos-tipos/categorias?empresa_id=xxx
 * Tipos de equipamento (catálogo Consert + custom) com contagem de itens de checklist.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autenticado', categorias: [] },
        { status: 401 }
      );
    }

    const empresaDoUsuario = await getEmpresaIdForUser(userId);
    if (!empresaDoUsuario) {
      return NextResponse.json(
        { error: 'Usuário ou empresa não encontrados', categorias: [] },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id');

    if (!empresaId) {
      return NextResponse.json(
        { error: 'empresa_id é obrigatório', categorias: [] },
        { status: 400 }
      );
    }

    if (empresaId !== empresaDoUsuario) {
      return NextResponse.json(
        { error: 'Acesso negado a dados de outra empresa', categorias: [] },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();
    const categorias = await listCategoriasEquipamentoComChecklist(admin, empresaId);

    return NextResponse.json({ categorias });
  } catch (err) {
    console.error('Erro GET /api/equipamentos-tipos/categorias:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Erro interno',
        categorias: [],
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * Atualiza recursos customizados de uma empresa
 * POST /api/admin-saas/empresas/[id]/recursos
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId } = await params;
    const body = await req.json();
    const { recursos } = body;

    if (!recursos || typeof recursos !== 'object') {
      return NextResponse.json(
        { ok: false, message: 'recursos deve ser um objeto' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Validar que todos os valores são booleanos
    const recursosValidados: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(recursos)) {
      if (typeof value === 'boolean') {
        recursosValidados[key] = value;
      }
    }

    // Atualizar recursos customizados
    // Se o objeto estiver vazio, definir como NULL para usar recursos do plano
    const recursosParaSalvar = Object.keys(recursosValidados).length > 0 
      ? recursosValidados 
      : null;

    const { error: updateError } = await supabase
      .from('empresas')
      .update({ recursos_customizados: recursosParaSalvar })
      .eq('id', empresaId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Recursos atualizados com sucesso',
      recursos: recursosParaSalvar,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}

/**
 * Busca recursos customizados de uma empresa
 * GET /api/admin-saas/empresas/[id]/recursos
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('recursos_customizados')
      .eq('id', empresaId)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      recursos: empresa.recursos_customizados || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}


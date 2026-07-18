import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import {
  deleteEmpresaPermanente,
  validateDeleteConfirmation,
} from '@/lib/admin/deleteEmpresaPermanente';

export const dynamic = 'force-dynamic';
/** Exclusão em cascata pode demorar (storage + muitas tabelas). */
export const maxDuration = 300;

/**
 * Exclui permanentemente a empresa e todos os dados vinculados.
 * POST /api/admin-saas/empresas/[id]/excluir
 *
 * Body obrigatório:
 * - confirmacaoNome: nome exato da empresa
 * - confirmacaoTexto: "EXCLUIR PERMANENTEMENTE"
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
    if (!empresaId) {
      return NextResponse.json({ ok: false, message: 'ID da empresa obrigatório' }, { status: 400 });
    }

    let body: { confirmacaoNome?: string; confirmacaoTexto?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, message: 'Body JSON inválido' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome')
      .eq('id', empresaId)
      .maybeSingle();

    if (empresaError || !empresa) {
      return NextResponse.json(
        { ok: false, message: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const confirm = validateDeleteConfirmation({
      empresaNome: empresa.nome,
      confirmacaoNome: body.confirmacaoNome || '',
      confirmacaoTexto: body.confirmacaoTexto || '',
    });

    if (!confirm.ok) {
      return NextResponse.json({ ok: false, message: confirm.message }, { status: 400 });
    }

    console.warn(
      `[admin-saas] Exclusão permanente solicitada: empresa=${empresaId} nome="${empresa.nome}"`
    );

    const result = await deleteEmpresaPermanente(supabase, empresaId);

    if (!result.ok) {
      console.error('[admin-saas] Exclusão permanente falhou:', result.message, result.steps);
      return NextResponse.json(
        {
          ok: false,
          message: result.message,
          steps: result.steps,
        },
        { status: 500 }
      );
    }

    console.warn(
      `[admin-saas] Empresa excluída com sucesso: ${empresaId} (${empresa.nome}) — ${result.steps.length} passos`
    );

    return NextResponse.json({
      ok: true,
      message: `Empresa "${empresa.nome}" e todos os dados vinculados foram excluídos permanentemente.`,
      steps: result.steps,
    });
  } catch (err) {
    console.error('[admin-saas] Erro ao excluir empresa:', err);
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : 'Erro interno ao excluir empresa',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { computeAdminEmpresaStorageMb } from '@/lib/adminEmpresaStorageMb';

/**
 * GET /api/admin-saas/empresas/[id]/storage
 * Calcula uso de storage em endpoint separado para não bloquear a página de detalhes.
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
      .select('id')
      .eq('id', empresaId)
      .maybeSingle();

    if (error || !empresa) {
      return NextResponse.json({ ok: false, message: 'Empresa não encontrada' }, { status: 404 });
    }

    const usoMb = await computeAdminEmpresaStorageMb(supabase, empresaId);
    return NextResponse.json({ ok: true, usoMb });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

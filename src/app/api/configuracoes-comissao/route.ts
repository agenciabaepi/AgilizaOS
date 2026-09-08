import { NextResponse } from 'next/server';
import { getAuthUserIdFromRequest } from '@/lib/supabase/authFromRequest';
import { createAdminClient } from '@/lib/supabaseClient';
import { assertEmpresaTemRecurso } from '@/lib/billing/assertPlanResource';

export async function GET(request: Request) {
  try {
    const authUserId = await getAuthUserIdFromRequest(request);
    if (!authUserId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (userError || !usuario?.empresa_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const planGate = await assertEmpresaTemRecurso(usuario.empresa_id, 'lucro_desempenho');
    if (!planGate.ok) return planGate.response;

    const { data, error } = await supabase
      .from('configuracoes_comissao')
      .select('*')
      .eq('empresa_id', usuario.empresa_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    return NextResponse.json({ data, success: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserIdFromRequest } from '@/lib/supabase/authFromRequest';
import { createAdminClient } from '@/lib/supabaseClient';

function parseNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isNaN(n) ? fallback : Math.max(0, n);
}

export async function POST(request: NextRequest) {
  try {
    const authUserId = await getAuthUserIdFromRequest(request);
    if (!authUserId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { dadosCompletos } = body;

    if (!dadosCompletos?.empresa_id) {
      return NextResponse.json(
        { error: 'Dados incompletos. empresa_id é obrigatório.' },
        { status: 400 }
      );
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

    if (dadosCompletos.empresa_id !== usuario.empresa_id) {
      return NextResponse.json(
        { error: 'Sem permissão para alterar configurações desta empresa.' },
        { status: 403 }
      );
    }

    const payload = {
      empresa_id: dadosCompletos.empresa_id,
      markup_percent: parseNum(dadosCompletos.markup_percent),
      imposto_percent: parseNum(dadosCompletos.imposto_percent),
      juros_parcelamento_percent: parseNum(dadosCompletos.juros_parcelamento_percent),
      frete_valor: parseNum(dadosCompletos.frete_valor),
      configurado: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('configuracoes_precificacao')
      .upsert(payload, { onConflict: 'empresa_id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Erro ao salvar configurações', code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json({ data, success: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

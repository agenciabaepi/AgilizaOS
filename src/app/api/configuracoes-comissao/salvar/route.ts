import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserIdFromRequest } from '@/lib/supabase/authFromRequest';
import { createAdminClient } from '@/lib/supabaseClient';

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

    const payload = { ...dadosCompletos };
    delete payload.id;

    const { data, error } = await supabase
      .from('configuracoes_comissao')
      .upsert(payload, { onConflict: 'empresa_id' })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao salvar configuração de comissão:', error);

      let mensagemErro = error.message || 'Erro desconhecido';
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        mensagemErro = 'Erro de permissão ao salvar configurações de comissão.';
      }

      return NextResponse.json(
        { error: mensagemErro, code: error.code },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Nenhum dado retornado após salvar' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('❌ Erro ao processar requisição:', error);

    if (error instanceof Error && (error.message.includes('JSON') || error.message.includes('Unexpected token'))) {
      return NextResponse.json(
        { error: 'Erro ao processar dados. Verifique os dados enviados.' },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

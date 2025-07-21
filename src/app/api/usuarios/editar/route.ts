import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, nome, email, usuario, telefone, cpf, whatsapp, nivel, permissoes, senha, auth_user_id } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID do usuário não informado' }, { status: 400 });
    }

    // Atualiza senha no Supabase Auth se fornecida
    if (senha && auth_user_id) {
      const { error: senhaError } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { password: senha });
      if (senhaError) {
        return NextResponse.json({ error: 'Erro ao atualizar senha: ' + senhaError.message }, { status: 400 });
      }
    }

    // Atualiza dados na tabela usuarios
    const { error: dbError } = await supabaseAdmin.from('usuarios').update({
      nome,
      email,
      usuario,
      telefone,
      cpf,
      whatsapp,
      nivel,
      permissoes,
    }).eq('id', id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro desconhecido' }, { status: 500 });
  }
} 
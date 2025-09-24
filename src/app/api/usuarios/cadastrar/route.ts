'use server'

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, email, senha, cpf, nivel, empresa_id, whatsapp, usuario } = body;
    if (!empresa_id) {

      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Normalizar dados
    const emailNormalizado = email.trim().toLowerCase();
    const usuarioNormalizado = usuario.trim().toLowerCase();
    const cpfNormalizado = cpf ? cpf.replace(/\D/g, '') : null;
    
    // Verifica se já existe um usuário com esse e-mail na mesma empresa
    const { data: existingUser } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', emailNormalizado)
      .eq('empresa_id', empresa_id)
      .maybeSingle();

    if (existingUser) {
      console.error('E-mail já cadastrado:', emailNormalizado);
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
    }

    // Verifica se já existe um usuário com esse nome de usuário na mesma empresa
    const { data: existingUsuario } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('usuario', usuarioNormalizado)
      .eq('empresa_id', empresa_id)
      .maybeSingle();

    if (existingUsuario) {
      console.error('Usuário já cadastrado:', usuarioNormalizado);
      return NextResponse.json({ error: 'Nome de usuário já existe.' }, { status: 409 });
    }

    // Verifica se já existe um usuário com esse CPF na mesma empresa (apenas se CPF foi fornecido)
    if (cpfNormalizado && cpfNormalizado.trim()) {
      const { data: existingCPF } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('cpf', cpfNormalizado)
        .eq('empresa_id', empresa_id)
        .maybeSingle();

      if (existingCPF) {
        console.error('CPF já cadastrado:', cpfNormalizado);
        return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 });
      }
    }

    if (!nome || !email || !senha || !usuario) {
      console.error('Campos obrigatórios ausentes:', { nome, email, senha, usuario });
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Cria o usuário no Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailNormalizado,
      password: senha,
      email_confirm: true,
    });

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', JSON.stringify(authError));
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authUser.user?.id) {
      console.error('ID do usuário não retornado:', authUser);
      return NextResponse.json({ error: 'Falha ao obter ID do usuário' }, { status: 400 });
    }

    const { error: dbError } = await supabaseAdmin.from('usuarios').insert([
      {
        nome,
        email: emailNormalizado,
        usuario: usuarioNormalizado,
        auth_user_id: authUser.user?.id,
        cpf: cpfNormalizado,
        nivel,
        empresa_id,
        whatsapp,
        // Adicionar tecnico_id igual ao auth_user_id para técnicos
        tecnico_id: nivel === 'tecnico' ? authUser.user?.id : null,
      },
    ]);

    if (dbError) {
      console.error('Erro ao salvar usuário no banco de dados:', dbError);
      return NextResponse.json(
        { error: dbError.message || JSON.stringify(dbError) || 'Erro ao salvar usuário no banco de dados' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Erro inesperado no try/catch:', error instanceof Error ? error.message : JSON.stringify(error));
    return NextResponse.json(
      { error: error instanceof Error ? error.message : JSON.stringify(error) || 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
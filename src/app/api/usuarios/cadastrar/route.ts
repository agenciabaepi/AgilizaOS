import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Payload recebido no backend:', body);
    const { nome, email, senha, plano, whatsapp, cpf } = body;

    // Verifica se já existe um usuário com esse e-mail
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.error('E-mail já cadastrado:', email);
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
    }

    // Verifica se já existe um usuário com esse CPF
    const { data: existingCPF, error: cpfError } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('cpf', cpf)
      .single();

    if (existingCPF) {
      console.error('CPF já cadastrado:', cpf);
      return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 409 });
    }

    if (!nome || !email || !senha || !plano || !whatsapp || !cpf) {
      console.error('Campos obrigatórios ausentes:', { nome, email, senha, plano, whatsapp, cpf });
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Cria o usuário no Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });

    console.log('authUser:', authUser);

    if (authError) {
      console.error('Erro ao criar usuário:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authUser.user?.id) {
      console.error('ID do usuário não retornado:', authUser);
      return NextResponse.json({ error: 'Falha ao obter ID do usuário' }, { status: 400 });
    }

    console.log('Dados para inserção:', {
      nome, email, auth_user_id: authUser.user.id, plano, whatsapp
    });

    // Sanitiza o campo whatsapp
    const whatsappFormatado = whatsapp.replace(/\D/g, '');

    // Salva o usuário na tabela `usuarios`
    const { error: dbError } = await supabaseAdmin.from('usuarios').insert([
      {
        nome,
        email,
        auth_user_id: authUser.user?.id,
        plano,
        whatsapp: whatsappFormatado,
        cpf,
        tipo: 'principal', // valor padrão
      },
    ]);

    if (dbError) {
      console.error('Erro ao salvar usuário:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Erro inesperado:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Erro desconhecido' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const body = await request.json();
  console.log('DADOS RECEBIDOS NO BACKEND:', body);

  const {
    nome,
    email,
    // senha, // Não precisamos mais da senha aqui
    nomeEmpresa,
    cidade,
    cnpj: cnpjOriginal,
    cpf: cpfOriginal,
    endereco,
    whatsapp,
    website,
    plano
  } = body;

  // Normalizar cpf e cnpj
  const cpf = cpfOriginal?.replace(/\D/g, '') || null;
  const cnpj = cnpjOriginal?.replace(/\D/g, '') || null;

  // Verificar se o email já existe
  const { data: emailExistente } = await supabase
    .from('empresas')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (emailExistente) {
    return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 400 });
  }

  // Verificar se o CPF já existe
  if (cpf) {
    const { data: cpfExistente } = await supabase
      .from('empresas')
      .select('id')
      .eq('cpf', cpf)
      .maybeSingle();

    if (cpfExistente) {
      return NextResponse.json({ error: 'CPF já cadastrado.' }, { status: 400 });
    }
  }

  // Verificar se o CNPJ já existe
  if (cnpj) {
    const { data: cnpjExistente } = await supabase
      .from('empresas')
      .select('id')
      .eq('cnpj', cnpj)
      .maybeSingle();

    if (cnpjExistente) {
      return NextResponse.json({ error: 'CNPJ já cadastrado.' }, { status: 400 });
    }
  }

  // Obter usuário autenticado
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
  }
  const user_id = user.id;

  // 2. Criar empresa
  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .insert({
      nome: nomeEmpresa,
      cidade,
      cnpj,
      cpf,
      endereco,
      telefone: whatsapp,
      email,
      website,
      plano,
      maxusuarios: plano === 'basico' ? 2 : plano === 'pro' ? 5 : 10,
      user_id
    })
    .select()
    .single();

  if (empresaError || !empresa) {
    console.error('Erro ao criar empresa:', empresaError);
    return NextResponse.json({ error: 'Erro ao criar empresa', details: empresaError }, { status: 500 });
  }
  console.log('Empresa criada:', empresa);

  // 3. Cadastrar usuário na tabela 'usuarios'
  const { error: usuarioError } = await supabase
    .from('usuarios')
    .insert({
      id: user_id,
      auth_user_id: user_id,
      nome,
      email,
      empresa_id: empresa.id,
      nivel: 'admin',
      tipo: 'principal'
    });

  if (usuarioError) {
    console.error('Erro ao salvar usuário:', usuarioError);
    return NextResponse.json({ error: 'Erro ao salvar usuário', details: usuarioError }, { status: 500 });
  }
  console.log('Usuário vinculado à empresa com sucesso');

  return NextResponse.json({ sucesso: true, empresa_id: empresa.id });
}
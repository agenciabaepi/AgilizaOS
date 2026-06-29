import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { MS_TRIAL_GRATIS } from '@/config/trial';
import { enviarEmailVerificacao, normalizeEmail } from '@/lib/email';
import { isSmtpConfigured } from '@/lib/smtp-config';
import { issueVerificationCode } from '@/lib/verification-code';

export async function POST(request: Request) {
  const body = await request.json();
  const supabaseAdmin = getSupabaseAdmin();
  const {
    nome,
    email: emailRaw,
    senha,
    nomeEmpresa,
    cidade,
    cnpj: cnpjOriginal,
    cpf: cpfOriginal,
    endereco,
    whatsapp,
    website,
    plano
  } = body;

  const email = normalizeEmail(String(emailRaw || ''));
  if (!email) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }

  // Normalizar cpf e cnpj
  const cpf = cpfOriginal?.replace(/\D/g, '') || null;
  const cnpj = cnpjOriginal?.replace(/\D/g, '') || null;

  // Verificar se o email já existe
  const { data: emailExistente } = await supabaseAdmin
    .from('empresas')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (emailExistente) {
    return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 400 });
  }

  // Verificar se o CPF já existe
  if (cpf) {
    const { data: cpfExistente } = await supabaseAdmin
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
    const { data: cnpjExistente } = await supabaseAdmin
      .from('empresas')
      .select('id')
      .eq('cnpj', cnpj)
      .maybeSingle();

    if (cnpjExistente) {
      return NextResponse.json({ error: 'CNPJ já cadastrado.' }, { status: 400 });
    }
  }

  // Criar usuário no Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (authError) {
    console.error('Erro ao criar usuário no Auth:', authError);
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!authUser.user?.id) {
    console.error('ID do usuário não retornado:', authUser);
    return NextResponse.json({ error: 'Falha ao obter ID do usuário' }, { status: 400 });
  }

  const user_id = authUser.user.id;

  // 2. Criar empresa
  const { data: empresa, error: empresaError } = await supabaseAdmin
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
  // 3. Cadastrar usuário na tabela 'usuarios'
  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from('usuarios')
    .insert({
      id: user_id,
      auth_user_id: user_id,
      nome,
      email,
      usuario: email.split('@')[0], // Usar parte do email como usuário
      empresa_id: empresa.id,
      nivel: 'admin',
      email_verificado: false // Email ainda não verificado
    })
    .select()
    .single();

  if (usuarioError || !usuario) {
    console.error('Erro ao salvar usuário:', usuarioError);
    return NextResponse.json({ error: 'Erro ao salvar usuário', details: usuarioError }, { status: 500 });
  }
  // 4. Criar assinatura trial
  try {
          // Buscar plano trial
      const { data: planoTrial } = await supabaseAdmin
        .from('planos')
        .select('*')
        .eq('nome', 'Trial')
        .single();

      if (planoTrial) {
        // Alinhar ao trial implícito (empresa.created_at + DIAS_TRIAL_GRATIS), não ao relógio do request
        const dataInicio = empresa.created_at
          ? new Date(empresa.created_at as string)
          : new Date();
        const dataTrialFim = new Date(dataInicio.getTime() + MS_TRIAL_GRATIS);

        const { error: assinaturaError } = await supabaseAdmin
          .from('assinaturas')
          .insert({
            empresa_id: empresa.id,
            plano_id: planoTrial.id,
            status: 'trial',
            data_inicio: dataInicio.toISOString(),
            data_trial_fim: dataTrialFim.toISOString(),
            valor: 0
          });

      if (assinaturaError) {
        console.error('Erro ao criar assinatura trial:', assinaturaError);
        // Não falhar a criação da empresa por causa da assinatura
      } else {
        }
    }
  } catch (error) {
    console.error('Erro ao criar assinatura trial:', error);
    // Não falhar a criação da empresa por causa da assinatura
  }

  // 5. Enviar código de verificação por email
  let emailEnviado = false;
  try {
    if (!isSmtpConfigured()) {
      console.error('❌ Cadastro sem envio de e-mail: SMTP_PASS/EMAIL_PASS não configurado');
    } else {
      const issued = await issueVerificationCode(supabaseAdmin, usuario.id, email);

      if (!issued.ok) {
        console.error('Erro ao salvar código de verificação:', issued.error);
      } else {
        emailEnviado = await enviarEmailVerificacao(email, issued.codigo, nomeEmpresa);
        if (!emailEnviado) {
          console.error('Erro ao enviar email de verificação para:', email);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao enviar código de verificação:', error);
  }

  return NextResponse.json({
    sucesso: true,
    empresa_id: empresa.id,
    usuario_id: usuario.id,
    email_enviado: emailEnviado,
    message: emailEnviado
      ? 'Cadastro realizado com sucesso! Verifique seu email para ativar sua conta.'
      : 'Cadastro realizado! Use "Reenviar código" na tela de login se não receber o e-mail em alguns minutos.',
  });
}
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { nome, email, senha, empresa_id } = req.body;

  try {
    // ✅ Cria o usuário no Supabase Auth com metadata de nível técnico e confirma e-mail
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nivel: 'tecnico' }
    });

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError);
      return res.status(400).json({ error: authError.message });
    }

    const auth_user_id = userData.user?.id;

    if (!auth_user_id) {
      console.error('Erro: auth_user_id indefinido');
      return res.status(500).json({ error: 'auth_user_id indefinido' });
    }

    // ✅ Insere o técnico na tabela `tecnicos`
    const { error: dbError } = await supabaseAdmin
      .from('tecnicos')
      .insert({
        nome,
        email,
        empresa_id,
        auth_user_id
      });

    if (dbError) {
      console.error('Erro ao inserir técnico na tabela:', dbError);
      return res.status(400).json({ error: dbError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Técnico cadastrado com sucesso!',
      auth_user_id
    });

  } catch (err) {
    console.error('Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
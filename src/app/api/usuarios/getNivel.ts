// /pages/api/usuarios/getNivel.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { usuario_id } = req.query;

  if (!usuario_id) return res.status(400).json({ error: 'usuario_id obrigatório' });

  const { data, error } = await supabase
    .from('usuarios')
    .select('nivel')
    .eq('auth_user_id', usuario_id)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar nível do usuário:', error);
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  res.status(200).json({ nivel: data.nivel });
}
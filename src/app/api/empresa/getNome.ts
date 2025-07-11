// /pages/api/empresa/getNome.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { empresa_id } = req.query;

  if (!empresa_id) return res.status(400).json({ error: 'empresa_id obrigatório' });

  const { data, error } = await supabase
    .from('empresas')
    .select('nome')
    .eq('id', empresa_id)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ nome: data.nome });
}
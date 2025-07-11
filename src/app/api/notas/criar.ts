// src/pages/api/notas/criar.ts
import { supabase } from '@/lib/supabaseClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { titulo, texto, cor, prioridade, coluna, empresa_id, responsavel } = req.body;

  if (!titulo || !empresa_id || !coluna) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  const { error } = await supabase.from('notas_dashboard').insert([{
    titulo,
    texto,
    cor,
    prioridade,
    coluna,
    empresa_id,
    responsavel,
    data_criacao: new Date().toISOString(),
  }]);

  if (error) return res.status(500).json({ error: 'Erro ao salvar nota' });

  return res.status(200).json({ message: 'Nota salva com sucesso!' });
}
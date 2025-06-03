import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'ID da nota é obrigatório' });
  }

  const { error } = await supabase.from('notas').delete().eq('id', id);

  if (error) {
    console.error('Erro ao deletar nota:', error);
    return res.status(500).json({ message: 'Erro ao deletar nota' });
  }

  return res.status(200).json({ message: 'Nota deletada com sucesso' });
}
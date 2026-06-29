import { createAdminClient } from '@/lib/supabaseClient';
import type { WhatsAppAtendente } from './types';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const NIVEIS_ATENDIMENTO = ['atendente', 'admin', 'financeiro'] as const;

export async function listAtendentesEmpresa(
  supabase: SupabaseAdmin,
  empresaId: string
): Promise<WhatsAppAtendente[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, nivel')
    .eq('empresa_id', empresaId)
    .in('nivel', [...NIVEIS_ATENDIMENTO])
    .order('nome', { ascending: true });

  if (error) throw error;

  if (data?.length) {
    return data.map((u) => ({
      id: u.id,
      nome: u.nome || 'Sem nome',
      nivel: u.nivel,
    }));
  }

  const { data: todos, error: errTodos } = await supabase
    .from('usuarios')
    .select('id, nome, nivel')
    .eq('empresa_id', empresaId)
    .order('nome', { ascending: true });

  if (errTodos) throw errTodos;

  return (todos ?? []).map((u) => ({
    id: u.id,
    nome: u.nome || 'Sem nome',
    nivel: u.nivel,
  }));
}

export const CONVERSA_USUARIO_JOIN =
  'usuarios!atribuido_usuario_id ( id, nome, nivel )';

import { createAdminClient } from '@/lib/supabaseClient';
import { findClienteByPhone } from './conversations';
import type { WhatsAppOrdemResumo } from './types';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/** Lista OS do cliente vinculado à conversa (por cliente_id ou telefone). */
export async function listOrdensClienteConversa(
  supabase: SupabaseAdmin,
  empresaId: string,
  params: { cliente_id?: string | null; telefone?: string | null }
): Promise<WhatsAppOrdemResumo[]> {
  let clienteId = params.cliente_id ?? null;

  if (!clienteId && params.telefone) {
    const cliente = await findClienteByPhone(supabase, empresaId, params.telefone);
    clienteId = cliente?.id ?? null;
  }

  if (!clienteId) return [];

  const { data, error } = await supabase
    .from('ordens_servico')
    .select(
      'id, numero_os, status, status_tecnico, equipamento, marca, modelo, cor, valor_faturado, valor_servico, valor_peca, created_at, data_entrega'
    )
    .eq('empresa_id', empresaId)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw error;
  return (data ?? []) as WhatsAppOrdemResumo[];
}

export type { SupabaseAdmin };

import { createAdminClient } from '@/lib/supabaseClient';
import type { WhatsAppOsContexto } from './types';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const STATUS_FINALIZADOS = ['CONCLUIDO', 'CONCLUÍDO', 'ENTREGUE', 'REPARO CONCLUÍDO', 'REPARO CONCLUIDO'];

function isFinalizado(status: string | null | undefined): boolean {
  if (!status) return false;
  const n = status.trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return STATUS_FINALIZADOS.some((s) => n.includes(s.replace(/\p{Diacritic}/gu, '')));
}

/** Sincroniza contexto da OS na conversa (status, pagamento, NF) */
export async function syncOsContexto(
  supabase: SupabaseAdmin,
  params: {
    conversa_id: string;
    os_id: string;
    empresa_id: string;
    overrides?: Partial<Pick<WhatsAppOsContexto, 'pago' | 'nota_fiscal_emitida' | 'nota_fiscal_numero'>>;
  }
): Promise<WhatsAppOsContexto | null> {
  const { data: os } = await supabase
    .from('ordens_servico')
    .select('id, status, status_tecnico, valor_faturado, valor_servico, valor_peca, cliente_id')
    .eq('id', params.os_id)
    .eq('empresa_id', params.empresa_id)
    .maybeSingle();

  if (!os) return null;

  const finalizado = isFinalizado(os.status) || isFinalizado(os.status_tecnico);
  const valor =
    os.valor_faturado ??
    (Number(os.valor_servico || 0) + Number(os.valor_peca || 0)) ||
    null;

  const { data: venda } = await supabase
    .from('vendas')
    .select('id, status, data_venda')
    .eq('empresa_id', params.empresa_id)
    .eq('cliente_id', os.cliente_id)
    .ilike('observacoes', `%${params.os_id}%`)
    .order('data_venda', { ascending: false })
    .limit(1)
    .maybeSingle();

  const pago = params.overrides?.pago ?? (venda?.status === 'concluida' || venda?.status === 'finalizada');
  const now = new Date().toISOString();

  const payload = {
    conversa_id: params.conversa_id,
    os_id: params.os_id,
    empresa_id: params.empresa_id,
    status_os: os.status,
    status_tecnico: os.status_tecnico,
    finalizado,
    finalizado_em: finalizado ? now : null,
    pago: !!pago,
    pago_em: pago ? (venda?.data_venda ?? now) : null,
    nota_fiscal_emitida: params.overrides?.nota_fiscal_emitida ?? false,
    nota_fiscal_numero: params.overrides?.nota_fiscal_numero ?? null,
    nota_fiscal_emitida_em: params.overrides?.nota_fiscal_emitida ? now : null,
    valor_faturado: valor,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('whatsapp_os_contexto')
    .upsert(payload, { onConflict: 'conversa_id,os_id' })
    .select()
    .single();

  if (error) throw error;
  return data as WhatsAppOsContexto;
}

export async function getOsContextoByConversa(
  supabase: SupabaseAdmin,
  conversaId: string
): Promise<WhatsAppOsContexto[]> {
  const { data, error } = await supabase
    .from('whatsapp_os_contexto')
    .select('*')
    .eq('conversa_id', conversaId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as WhatsAppOsContexto[];
}

export async function updateOsContextoFlags(
  supabase: SupabaseAdmin,
  contextoId: string,
  flags: Partial<Pick<WhatsAppOsContexto, 'pago' | 'nota_fiscal_emitida' | 'nota_fiscal_numero'>>
) {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (flags.pago !== undefined) {
    updates.pago = flags.pago;
    updates.pago_em = flags.pago ? now : null;
  }
  if (flags.nota_fiscal_emitida !== undefined) {
    updates.nota_fiscal_emitida = flags.nota_fiscal_emitida;
    updates.nota_fiscal_emitida_em = flags.nota_fiscal_emitida ? now : null;
  }
  if (flags.nota_fiscal_numero !== undefined) {
    updates.nota_fiscal_numero = flags.nota_fiscal_numero;
  }

  const { data, error } = await supabase
    .from('whatsapp_os_contexto')
    .update(updates)
    .eq('id', contextoId)
    .select()
    .single();

  if (error) throw error;
  return data as WhatsAppOsContexto;
}

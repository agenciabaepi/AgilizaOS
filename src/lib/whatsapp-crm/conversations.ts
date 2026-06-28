import { createAdminClient } from '@/lib/supabaseClient';
import { phonesMatch, toWhatsAppId } from './normalize-phone';
import type { WhatsAppConversa, WhatsAppEmpresaConfig } from './types';
import { AUTOMACOES_PADRAO } from './template-vars';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export async function getEmpresaConfig(
  supabase: SupabaseAdmin,
  empresaId: string
): Promise<WhatsAppEmpresaConfig | null> {
  const { data } = await supabase
    .from('whatsapp_empresa_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  return data;
}

export async function upsertEmpresaConfig(
  supabase: SupabaseAdmin,
  empresaId: string,
  payload: Partial<WhatsAppEmpresaConfig>
) {
  const { data, error } = await supabase
    .from('whatsapp_empresa_config')
    .upsert(
      { empresa_id: empresaId, ...payload, updated_at: new Date().toISOString() },
      { onConflict: 'empresa_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as WhatsAppEmpresaConfig;
}

export async function seedAutomacoesPadrao(supabase: SupabaseAdmin, empresaId: string) {
  const { count } = await supabase
    .from('whatsapp_automacoes')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId);

  if (count && count > 0) return;

  await supabase.from('whatsapp_automacoes').insert(
    AUTOMACOES_PADRAO.map((a) => ({
      empresa_id: empresaId,
      ...a,
      ativo: false,
    }))
  );
}

export async function findClienteByPhone(
  supabase: SupabaseAdmin,
  empresaId: string,
  phone: string
) {
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome, telefone, celular, email')
    .eq('empresa_id', empresaId);

  if (!clientes?.length) return null;

  return (
    clientes.find(
      (c) =>
        (c.telefone && phonesMatch(c.telefone, phone)) ||
        (c.celular && phonesMatch(c.celular, phone))
    ) ?? null
  );
}

export async function getOrCreateConversa(
  supabase: SupabaseAdmin,
  params: {
    empresa_id: string;
    telefone: string;
    wa_id?: string;
    nome_contato?: string;
    cliente_id?: string | null;
    os_id?: string | null;
  }
): Promise<WhatsAppConversa> {
  const waId = params.wa_id || toWhatsAppId(params.telefone);
  const telefone = toWhatsAppId(params.telefone);

  const { data: existing } = await supabase
    .from('whatsapp_conversas')
    .select('*')
    .eq('empresa_id', params.empresa_id)
    .eq('wa_id', waId)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (params.nome_contato && !existing.nome_contato) updates.nome_contato = params.nome_contato;
    if (params.cliente_id && !existing.cliente_id) updates.cliente_id = params.cliente_id;
    if (params.os_id && !existing.os_id) updates.os_id = params.os_id;

    if (Object.keys(updates).length > 1) {
      const { data: updated } = await supabase
        .from('whatsapp_conversas')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();
      return updated as WhatsAppConversa;
    }
    return existing as WhatsAppConversa;
  }

  let clienteId = params.cliente_id;
  if (!clienteId) {
    const cliente = await findClienteByPhone(supabase, params.empresa_id, telefone);
    clienteId = cliente?.id ?? null;
  }

  const { data: created, error } = await supabase
    .from('whatsapp_conversas')
    .insert({
      empresa_id: params.empresa_id,
      wa_id: waId,
      telefone,
      nome_contato: params.nome_contato ?? null,
      cliente_id: clienteId,
      os_id: params.os_id ?? null,
      status: 'aberta',
    })
    .select()
    .single();

  if (error) throw error;
  return created as WhatsAppConversa;
}

export async function listConversas(
  supabase: SupabaseAdmin,
  empresaId: string,
  opts?: { status?: string; limit?: number }
) {
  let query = supabase
    .from('whatsapp_conversas')
    .select(
      `*,
      clientes ( id, nome, telefone, celular, email ),
      ordens_servico ( id, numero_os, status, equipamento, marca, modelo )`
    )
    .eq('empresa_id', empresaId)
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    .limit(opts?.limit ?? 50);

  if (opts?.status) query = query.eq('status', opts.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WhatsAppConversa[];
}

export async function appendMensagem(
  supabase: SupabaseAdmin,
  params: {
    conversa_id: string;
    empresa_id: string;
    direcao: 'entrada' | 'saida';
    tipo?: string;
    conteudo: string;
    meta_message_id?: string;
    status_entrega?: string;
    os_id?: string;
    automacao_id?: string;
    enviado_por_usuario_id?: string;
  }
) {
  const preview = params.conteudo.slice(0, 120);
  const now = new Date().toISOString();

  const { data: msg, error } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      conversa_id: params.conversa_id,
      empresa_id: params.empresa_id,
      direcao: params.direcao,
      tipo: params.tipo ?? 'texto',
      conteudo: params.conteudo,
      meta_message_id: params.meta_message_id ?? null,
      status_entrega: params.status_entrega ?? null,
      os_id: params.os_id ?? null,
      automacao_id: params.automacao_id ?? null,
      enviado_por_usuario_id: params.enviado_por_usuario_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  const { data: conv } = await supabase
    .from('whatsapp_conversas')
    .select('nao_lidas')
    .eq('id', params.conversa_id)
    .single();

  await supabase
    .from('whatsapp_conversas')
    .update({
      ultima_mensagem_preview: preview,
      ultima_mensagem_em: now,
      updated_at: now,
      nao_lidas:
        params.direcao === 'entrada' ? (conv?.nao_lidas ?? 0) + 1 : conv?.nao_lidas ?? 0,
    })
    .eq('id', params.conversa_id);

  return msg;
}

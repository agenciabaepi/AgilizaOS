import { createAdminClient } from '@/lib/supabaseClient';
import { WHATSAPP_AUTOMATION_ENABLED } from '@/config/whatsapp-config';
import { sendWhatsAppTextMessage } from './graph-api';
import { getOrCreateConversa, appendMensagem, getEmpresaConfig } from './conversations';
import { syncOsContexto } from './os-context';
import { renderAutomacaoTemplate } from './template-vars';
import type { AutomacaoTemplateVars, DispatchAutomacaoPayload, WhatsAppAutomacaoEvento } from './types';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

function normalizeStatus(s: string): string {
  return s.trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function mapStatusToEvento(status: string): WhatsAppAutomacaoEvento | null {
  const n = normalizeStatus(status);
  if (n.includes('APROVADO')) return 'os_aprovada';
  if (n.includes('CONCLUIDO') || n.includes('REPARO CONCLUIDO')) return 'os_concluida';
  if (n.includes('ENTREGUE')) return 'os_entregue';
  if (n.includes('ORCAMENTO') && n.includes('CONCLUIDO')) return 'os_orcamento_enviado';
  if (n.includes('AGUARDANDO') && n.includes('PECA')) return 'os_aguardando_peca';
  return 'os_status_alterado';
}

function formatValor(valor: number | null | undefined): string {
  if (valor == null) return '';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Dispara automações de mensagem ao cliente quando eventos da OS ocorrem.
 * Usa WhatsApp Cloud API (Meta) — https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export async function dispatchAutomacaoOs(
  payload: DispatchAutomacaoPayload
): Promise<{ sent: boolean; reason?: string }> {
  if (!WHATSAPP_AUTOMATION_ENABLED) {
    return { sent: false, reason: 'automation_disabled' };
  }

  const supabase = createAdminClient();

  const config = await getEmpresaConfig(supabase, payload.empresa_id);
  if (!config?.ativo) {
    return { sent: false, reason: 'whatsapp_not_configured' };
  }

  const { data: os, error: osError } = await supabase
    .from('ordens_servico')
    .select(
      `id, numero_os, status, status_tecnico, equipamento, marca, modelo,
       valor_faturado, valor_servico, valor_peca, cliente_id, empresa_id,
       clientes ( id, nome, telefone, celular ),
       empresas ( nome )`
    )
    .eq('id', payload.os_id)
    .eq('empresa_id', payload.empresa_id)
    .maybeSingle();

  if (osError || !os) {
    return { sent: false, reason: 'os_not_found' };
  }

  const cliente = os.clientes as { id: string; nome: string; telefone?: string; celular?: string } | null;
  const telefone = cliente?.celular || cliente?.telefone;
  if (!telefone) {
    return { sent: false, reason: 'cliente_sem_telefone' };
  }

  const evento =
    payload.evento === 'os_status_alterado' && payload.status_novo
      ? mapStatusToEvento(payload.status_novo)
      : payload.evento;

  let query = supabase
    .from('whatsapp_automacoes')
    .select('*')
    .eq('empresa_id', payload.empresa_id)
    .eq('evento', evento)
    .eq('ativo', true)
    .order('ordem');

  if (payload.status_novo) {
    const statusNorm = normalizeStatus(payload.status_novo);
    query = query.or(`status_trigger.is.null,status_trigger.ilike.%${statusNorm}%`);
  }

  const { data: automacoes } = await query;

  if (!automacoes?.length) {
    return { sent: false, reason: 'no_matching_automation' };
  }

  const automacao = automacoes[0];
  const valor =
    os.valor_faturado ??
    Number(os.valor_servico || 0) + Number(os.valor_peca || 0);

  const vars: AutomacaoTemplateVars = {
    cliente_nome: cliente?.nome ?? 'Cliente',
    numero_os: os.numero_os,
    status: payload.status_novo ?? os.status,
    equipamento: os.equipamento ?? '',
    marca: os.marca ?? '',
    modelo: os.modelo ?? '',
    valor: formatValor(valor),
    empresa_nome: (os.empresas as { nome?: string } | null)?.nome ?? '',
  };

  const mensagem = renderAutomacaoTemplate(automacao.mensagem_template, vars);

  const conversa = await getOrCreateConversa(supabase, {
    empresa_id: payload.empresa_id,
    telefone,
    nome_contato: cliente?.nome,
    cliente_id: cliente?.id,
    os_id: os.id,
  });

  await syncOsContexto(supabase, {
    conversa_id: conversa.id,
    os_id: os.id,
    empresa_id: payload.empresa_id,
  });

  const sendResult = await sendWhatsAppTextMessage({
    to: telefone,
    message: mensagem,
    config,
  });

  await appendMensagem(supabase, {
    conversa_id: conversa.id,
    empresa_id: payload.empresa_id,
    direcao: 'saida',
    tipo: automacao.usar_template_meta ? 'template' : 'texto',
    conteudo: mensagem,
    meta_message_id: sendResult.messageId,
    status_entrega: sendResult.success ? 'enviada' : 'falha',
    os_id: os.id,
    automacao_id: automacao.id,
  });

  return sendResult.success
    ? { sent: true }
    : { sent: false, reason: sendResult.error ?? 'send_failed' };
}

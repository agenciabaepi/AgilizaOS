import { createAdminClient } from '@/lib/supabaseClient';
import { WHATSAPP_AUTOMATION_ENABLED } from '@/config/whatsapp-config';
import { WHATSAPP_CRM_ENABLED } from '@/config/whatsapp-crm-config';
import {
  sendWhatsAppDocumentMessage,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
  uploadWhatsAppMedia,
  type SendTextMessageResult,
} from './graph-api';
import {
  buildMetaTemplate,
  ensureMetaTemplatesOnWaba,
  isTemplateIndisponivelError,
  templateComPdf,
} from './meta-templates';
import { gerarPdfOsBuffer } from './os-pdf';
import { getOrCreateConversa, appendMensagem, getEmpresaConfig } from './conversations';
import { syncOsContexto } from './os-context';
import { LINK_AVALIACAO_GOOGLE } from '@/config/contato';
import { parseDateOnlyLocal, resolverVencimentoGarantiaOs } from '@/lib/garantiaOs';
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

function formatDataMsg(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const soData = parseDateOnlyLocal(dateString);
  if (soData) return soData.toLocaleDateString('pt-BR');
  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('pt-BR');
}

/** Gera o PDF da O.S. e sobe na Meta; falha aqui não impede o aviso de texto/template */
async function prepararPdfOs(
  supabase: SupabaseAdmin,
  osId: string,
  empresaId: string,
  config: Parameters<typeof uploadWhatsAppMedia>[0]['config']
): Promise<{ mediaId: string; filename: string } | null> {
  try {
    const gerado = await gerarPdfOsBuffer(supabase, osId, empresaId);
    if (!gerado) return null;
    const upload = await uploadWhatsAppMedia({
      buffer: gerado.buffer,
      mimeType: 'application/pdf',
      filename: gerado.filename,
      config,
    });
    if (!upload.success || !upload.mediaId) {
      console.warn('[CRM dispatch] Falha ao enviar PDF da O.S. para a Meta:', upload.error);
      return null;
    }
    return { mediaId: upload.mediaId, filename: gerado.filename };
  } catch (e) {
    console.warn('[CRM dispatch] Falha ao gerar PDF da O.S.:', e);
    return null;
  }
}

/**
 * Dispara automações de mensagem ao cliente quando eventos da OS ocorrem.
 * Usa WhatsApp Cloud API (Meta) — https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export async function dispatchAutomacaoOs(
  payload: DispatchAutomacaoPayload
): Promise<{ sent: boolean; reason?: string }> {
  if (!WHATSAPP_CRM_ENABLED) {
    return { sent: false, reason: 'crm_disabled' };
  }

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
       data_entrega, vencimento_garantia, cliente_recusou,
       clientes ( id, nome, telefone, celular ),
       empresas ( nome )`
    )
    .eq('id', payload.os_id)
    .eq('empresa_id', payload.empresa_id)
    .maybeSingle();

  if (osError || !os) {
    return { sent: false, reason: 'os_not_found' };
  }

  const cliente = os.clientes as unknown as {
    id: string;
    nome: string;
    telefone?: string;
    celular?: string;
  } | null;
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

  const vencimentoGarantia = resolverVencimentoGarantiaOs({
    vencimento_garantia: os.vencimento_garantia as string | null,
    data_entrega: os.data_entrega as string | null,
    cliente_recusou: os.cliente_recusou as boolean | null,
    status: os.status,
    status_tecnico: os.status_tecnico,
  });

  const vars: AutomacaoTemplateVars = {
    cliente_nome: cliente?.nome ?? 'Cliente',
    numero_os: os.numero_os,
    status: payload.status_novo ?? os.status,
    equipamento: os.equipamento ?? '',
    marca: os.marca ?? '',
    modelo: os.modelo ?? '',
    valor: formatValor(valor),
    empresa_nome: (os.empresas as { nome?: string } | null)?.nome ?? '',
    data_retirada: formatDataMsg(os.data_entrega as string | null),
    vencimento_garantia: formatDataMsg(vencimentoGarantia),
    link_avaliacao: LINK_AVALIACAO_GOOGLE,
  };

  const metaTemplate =
    automacao.usar_template_meta && automacao.meta_template_name
      ? buildMetaTemplate(automacao.meta_template_name, {
          id: os.id,
          numero_os: os.numero_os,
          cliente_nome: cliente?.nome ?? 'Cliente',
          equipamento: os.equipamento ?? '',
          marca: os.marca ?? '',
          modelo: os.modelo ?? '',
          status: payload.status_novo ?? os.status ?? '',
          status_tecnico: os.status_tecnico ?? '',
        })
      : null;

  if (automacao.usar_template_meta && !metaTemplate) {
    return { sent: false, reason: `template_meta_desconhecido:${automacao.meta_template_name ?? ''}` };
  }

  const mensagem = metaTemplate
    ? metaTemplate.preview
    : renderAutomacaoTemplate(automacao.mensagem_template, vars);

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

  const pdfTemplateName =
    metaTemplate && evento === 'os_criada' ? templateComPdf(metaTemplate.templateName) : null;
  const pdf = pdfTemplateName ? await prepararPdfOs(supabase, os.id, payload.empresa_id, config) : null;

  let enviadoComoTemplate = false;
  let pdfEnviado = false;
  let templateIndisponivel = false;
  let sendResult: SendTextMessageResult | null = null;

  if (metaTemplate && pdf && pdfTemplateName) {
    sendResult = await sendWhatsAppTemplateMessage({
      to: telefone,
      templateName: pdfTemplateName,
      languageCode: metaTemplate.languageCode,
      bodyParams: metaTemplate.bodyParams,
      urlButtons: metaTemplate.urlButtons,
      headerDocument: pdf,
      config,
    });
    if (sendResult.success) {
      enviadoComoTemplate = true;
      pdfEnviado = true;
    } else if (isTemplateIndisponivelError(sendResult.error)) {
      templateIndisponivel = true;
    }
  }

  if (metaTemplate && !sendResult?.success) {
    sendResult = await sendWhatsAppTemplateMessage({
      to: telefone,
      templateName: metaTemplate.templateName,
      languageCode: metaTemplate.languageCode,
      bodyParams: metaTemplate.bodyParams,
      urlButtons: metaTemplate.urlButtons,
      config,
    });
    if (sendResult.success) enviadoComoTemplate = true;
    else if (isTemplateIndisponivelError(sendResult.error)) templateIndisponivel = true;
  }

  if (!metaTemplate) {
    sendResult = await sendWhatsAppTextMessage({ to: telefone, message: mensagem, config });
  }

  // Template ainda não existe/aprovado na WABA da loja: cria em segundo plano
  if (templateIndisponivel) {
    const wabaId = config.waba_id || config.business_account_id;
    if (wabaId && config.access_token) {
      void ensureMetaTemplatesOnWaba(wabaId, config.access_token).catch((e) =>
        console.warn('[CRM dispatch] Falha ao criar templates Meta:', e)
      );
    }
  }

  // Sem template disponível, tenta como texto (só é entregue se o cliente falou com a loja nas últimas 24h)
  if (metaTemplate && !sendResult?.success && templateIndisponivel) {
    const textoResult = await sendWhatsAppTextMessage({ to: telefone, message: mensagem, config });
    if (textoResult.success) sendResult = textoResult;
  }

  // Aviso saiu sem o PDF no cabeçalho: manda o PDF como documento (também depende da janela de 24h)
  if (pdf && sendResult?.success && !pdfEnviado) {
    const docResult = await sendWhatsAppDocumentMessage({
      to: telefone,
      mediaId: pdf.mediaId,
      filename: pdf.filename,
      config,
    });
    pdfEnviado = docResult.success;
  }

  if (!sendResult) {
    return { sent: false, reason: 'send_failed' };
  }

  await appendMensagem(supabase, {
    conversa_id: conversa.id,
    empresa_id: payload.empresa_id,
    direcao: 'saida',
    tipo: enviadoComoTemplate ? 'template' : 'texto',
    conteudo: pdfEnviado && pdf ? `${mensagem}\n\n📎 ${pdf.filename}` : mensagem,
    meta_message_id: sendResult.messageId,
    status_entrega: sendResult.success ? 'enviada' : 'falha',
    erro_entrega: sendResult.success ? undefined : sendResult.error ?? 'Falha ao enviar',
    os_id: os.id,
    automacao_id: automacao.id,
  });

  return sendResult.success
    ? { sent: true }
    : { sent: false, reason: sendResult.error ?? 'send_failed' };
}

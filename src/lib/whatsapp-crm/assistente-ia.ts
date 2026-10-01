import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabaseClient';
import { sendWhatsAppTextMessage } from './graph-api';
import { appendMensagem, getEmpresaConfig, updateMensagemEntrega } from './conversations';
import type { WhatsAppIaConfig, WhatsAppIaFaqItem } from './types';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const MODELO = 'gpt-4o-mini';
const HISTORICO_MAX = 16;
/** Espera o cliente terminar de digitar várias mensagens seguidas antes de responder uma vez só */
const DEBOUNCE_MS = 4_000;
const PAUSA_APOS_TRANSFERENCIA_MS = 12 * 60 * 60 * 1000;

export const IA_CONFIG_PADRAO: Omit<WhatsAppIaConfig, 'empresa_id'> = {
  ativo: false,
  nome_assistente: 'Assistente virtual',
  modo_resposta: 'sempre',
  pausa_apos_humano_min: 60,
  endereco: null,
  horario_funcionamento: null,
  servicos: null,
  formas_pagamento: null,
  garantia: null,
  instrucoes: null,
  faq: [],
};

const TEXTO_MAX = 4000;

function texto(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, TEXTO_MAX);
  return t || null;
}

/** Normaliza o que vem do formulário de treinamento (também usado no teste sem salvar). */
export function sanitizarIaConfig(body: Record<string, unknown>): Omit<WhatsAppIaConfig, 'empresa_id'> {
  const faq: WhatsAppIaFaqItem[] = Array.isArray(body.faq)
    ? (body.faq as unknown[])
        .map((f) => {
          const item = f as Partial<WhatsAppIaFaqItem>;
          return {
            pergunta: String(item?.pergunta ?? '').trim().slice(0, 500),
            resposta: String(item?.resposta ?? '').trim().slice(0, 1500),
          };
        })
        .filter((f) => f.pergunta && f.resposta)
        .slice(0, 50)
    : [];

  const pausa = Number(body.pausa_apos_humano_min);

  return {
    ativo: body.ativo === true,
    nome_assistente: texto(body.nome_assistente)?.slice(0, 60) || IA_CONFIG_PADRAO.nome_assistente,
    modo_resposta: body.modo_resposta === 'sem_atendente' ? 'sem_atendente' : 'sempre',
    pausa_apos_humano_min: Number.isFinite(pausa) ? Math.min(1440, Math.max(5, Math.round(pausa))) : 60,
    endereco: texto(body.endereco),
    horario_funcionamento: texto(body.horario_funcionamento),
    servicos: texto(body.servicos),
    formas_pagamento: texto(body.formas_pagamento),
    garantia: texto(body.garantia),
    instrucoes: texto(body.instrucoes),
    faq,
  };
}

export interface EmpresaBasica {
  nome: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  website: string | null;
  timezone: string | null;
}

export interface OsResumoIA {
  numero_os: number;
  status: string | null;
  status_tecnico: string | null;
  equipamento: string | null;
  marca: string | null;
  modelo: string | null;
}

export interface MensagemHistoricoIA {
  direcao: 'entrada' | 'saida';
  conteudo: string;
}

export interface RespostaIA {
  resposta: string;
  transferir: boolean;
}

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

export function iaDisponivel(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function getIaConfig(
  supabase: SupabaseAdmin,
  empresaId: string
): Promise<WhatsAppIaConfig | null> {
  const { data } = await supabase
    .from('whatsapp_ia_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  return (data as WhatsAppIaConfig | null) ?? null;
}

export async function getEmpresaBasica(
  supabase: SupabaseAdmin,
  empresaId: string
): Promise<EmpresaBasica | null> {
  const { data } = await supabase
    .from('empresas')
    .select('nome, telefone, endereco, cidade, website, timezone')
    .eq('id', empresaId)
    .maybeSingle();
  return (data as EmpresaBasica | null) ?? null;
}

function saudacaoAgora(timezone: string | null | undefined): { saudacao: string; agora: string } {
  const tz = timezone || 'America/Sao_Paulo';
  const now = new Date();
  let hora: number;
  let agora: string;
  try {
    hora = Number(
      new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(now)
    );
    agora = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    }).format(now);
  } catch {
    hora = now.getUTCHours() - 3;
    agora = now.toISOString();
  }
  const saudacao = hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite';
  return { saudacao, agora };
}

function linha(rotulo: string, valor: string | null | undefined): string {
  const v = valor?.trim();
  return v ? `- ${rotulo}: ${v}` : '';
}

function formatarFaq(faq: WhatsAppIaFaqItem[] | null | undefined): string {
  const itens = (faq ?? []).filter((f) => f.pergunta?.trim() && f.resposta?.trim());
  if (itens.length === 0) return '';
  return itens.map((f) => `P: ${f.pergunta.trim()}\nR: ${f.resposta.trim()}`).join('\n\n');
}

export function montarPromptSistema(params: {
  config: Pick<
    WhatsAppIaConfig,
    | 'nome_assistente'
    | 'endereco'
    | 'horario_funcionamento'
    | 'servicos'
    | 'formas_pagamento'
    | 'garantia'
    | 'instrucoes'
    | 'faq'
  >;
  empresa: EmpresaBasica | null;
  os?: OsResumoIA | null;
  primeiraResposta: boolean;
}): string {
  const { config, empresa, os } = params;
  const nomeLoja = empresa?.nome?.trim() || 'a assistência técnica';
  const { saudacao, agora } = saudacaoAgora(empresa?.timezone);
  const endereco =
    config.endereco?.trim() ||
    [empresa?.endereco, empresa?.cidade].filter((s) => s?.trim()).join(' - ') ||
    null;

  const dados = [
    linha('Nome da loja', nomeLoja),
    linha('Endereço', endereco),
    linha('Horário de funcionamento', config.horario_funcionamento),
    linha('Serviços', config.servicos),
    linha('Formas de pagamento', config.formas_pagamento),
    linha('Garantia', config.garantia),
    linha('Telefone', empresa?.telefone),
    linha('Site', empresa?.website),
  ]
    .filter(Boolean)
    .join('\n');

  const faq = formatarFaq(config.faq);

  const osTexto = os
    ? [
        `O.S. nº ${os.numero_os}`,
        [os.equipamento, os.marca, os.modelo].filter(Boolean).join(' ') || null,
        os.status ? `status: ${os.status}` : null,
        os.status_tecnico ? `situação técnica: ${os.status_tecnico}` : null,
      ]
        .filter(Boolean)
        .join(' | ')
    : null;

  return `Você é "${config.nome_assistente || 'Assistente virtual'}", o assistente virtual de atendimento da ${nomeLoja} no WhatsApp.

AGORA: ${agora}. Saudação adequada para este horário: "${saudacao}".

COMO RESPONDER
- Português do Brasil, educado, acolhedor e direto, no estilo de conversa de WhatsApp.
- Respostas curtas: no máximo 3 frases curtas. Use *negrito* do WhatsApp só se ajudar. Não use markdown de títulos ou listas longas.
- ${
    params.primeiraResposta
      ? `Esta é a sua primeira resposta nesta conversa: comece com "${saudacao}!", apresente-se como assistente virtual da ${nomeLoja} e então responda.`
      : 'A conversa já começou: não repita a saudação nem a apresentação, a menos que o cliente cumprimente de novo.'
  }
- Use SOMENTE as informações abaixo. Nunca invente preço, valor de orçamento, prazo, diagnóstico, disponibilidade de peça ou promoção.
- Fale apenas de assuntos da assistência técnica. Para qualquer outro assunto, diga educadamente que só pode ajudar com o atendimento da loja.
- Se você não tiver a informação, se o cliente pedir para falar com uma pessoa/atendente, reclamar, quiser negociar valores ou precisar de orçamento, marque "transferir": true e termine a resposta avisando claramente que um atendente vai continuar o atendimento por aqui em breve.

DADOS DA LOJA
${dados || '- (nenhum dado cadastrado)'}
${faq ? `\nPERGUNTAS FREQUENTES (responda de acordo)\n${faq}\n` : ''}${
    config.instrucoes?.trim() ? `\nINSTRUÇÕES DA LOJA\n${config.instrucoes.trim()}\n` : ''
  }${osTexto ? `\nORDEM DE SERVIÇO DESTE CLIENTE (pode informar o status, nunca valores)\n${osTexto}\n` : ''}
FORMATO DE SAÍDA
Responda apenas com JSON: {"resposta": "texto para o cliente", "transferir": true|false}`;
}

export async function gerarRespostaIA(params: {
  config: Parameters<typeof montarPromptSistema>[0]['config'];
  empresa: EmpresaBasica | null;
  os?: OsResumoIA | null;
  historico: MensagemHistoricoIA[];
}): Promise<RespostaIA | null> {
  const client = getOpenAI();
  if (!client) return null;

  const primeiraResposta = !params.historico.some((m) => m.direcao === 'saida');
  const system = montarPromptSistema({
    config: params.config,
    empresa: params.empresa,
    os: params.os,
    primeiraResposta,
  });

  const completion = await client.chat.completions.create({
    model: MODELO,
    temperature: 0.4,
    max_tokens: 350,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      ...params.historico.slice(-HISTORICO_MAX).map((m) => ({
        role: m.direcao === 'entrada' ? ('user' as const) : ('assistant' as const),
        content: m.conteudo,
      })),
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RespostaIA>;
    const resposta = typeof parsed.resposta === 'string' ? parsed.resposta.trim() : '';
    if (!resposta) return null;
    return { resposta, transferir: parsed.transferir === true };
  } catch {
    return { resposta: raw.trim(), transferir: false };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ResultadoRespostaIA =
  | 'respondido'
  | 'inativo'
  | 'pausado'
  | 'com_atendente'
  | 'mensagem_mais_nova'
  | 'sem_resposta'
  | 'falha_envio';

/**
 * Responde automaticamente a uma mensagem recebida, se o assistente da empresa estiver ativo.
 * Deve rodar fora do caminho crítico do webhook (via `after`).
 */
export async function responderComIA(params: {
  empresaId: string;
  conversaId: string;
  mensagemId: string;
}): Promise<ResultadoRespostaIA> {
  const supabase = createAdminClient();

  const config = await getIaConfig(supabase, params.empresaId);
  if (!config?.ativo || !iaDisponivel()) return 'inativo';

  await sleep(DEBOUNCE_MS);

  const { data: conversa } = await supabase
    .from('whatsapp_conversas')
    .select('id, telefone, os_id, atribuido_usuario_id, ia_pausada_ate')
    .eq('id', params.conversaId)
    .maybeSingle();
  if (!conversa) return 'sem_resposta';

  if (conversa.ia_pausada_ate && new Date(conversa.ia_pausada_ate).getTime() > Date.now()) {
    return 'pausado';
  }
  if (config.modo_resposta === 'sem_atendente' && conversa.atribuido_usuario_id) {
    return 'com_atendente';
  }

  const { data: recentes } = await supabase
    .from('whatsapp_mensagens')
    .select('id, direcao, conteudo, tipo')
    .eq('conversa_id', params.conversaId)
    .order('created_at', { ascending: false })
    .limit(HISTORICO_MAX);

  const ultima = recentes?.[0];
  if (!ultima || ultima.id !== params.mensagemId) return 'mensagem_mais_nova';

  const historico: MensagemHistoricoIA[] = (recentes ?? [])
    .filter((m) => m.tipo !== 'nota_interna' && m.conteudo?.trim())
    .reverse()
    .map((m) => ({ direcao: m.direcao, conteudo: m.conteudo }));

  const [empresa, os] = await Promise.all([
    getEmpresaBasica(supabase, params.empresaId),
    conversa.os_id
      ? supabase
          .from('ordens_servico')
          .select('numero_os, status, status_tecnico, equipamento, marca, modelo')
          .eq('id', conversa.os_id)
          .eq('empresa_id', params.empresaId)
          .maybeSingle()
          .then((r) => (r.data as OsResumoIA | null) ?? null)
      : Promise.resolve(null),
  ]);

  const resultado = await gerarRespostaIA({ config, empresa, os, historico });
  if (!resultado) return 'sem_resposta';

  const waConfig = await getEmpresaConfig(supabase, params.empresaId);
  if (!waConfig?.ativo) return 'inativo';

  const msg = await appendMensagem(supabase, {
    conversa_id: params.conversaId,
    empresa_id: params.empresaId,
    direcao: 'saida',
    tipo: 'texto',
    conteudo: resultado.resposta,
    status_entrega: 'enviada',
    os_id: conversa.os_id ?? undefined,
    enviado_por_ia: true,
  });

  const nome = config.nome_assistente.replace(/[*_~`]/g, '').trim() || 'Assistente virtual';
  const envio = await sendWhatsAppTextMessage({
    to: conversa.telefone,
    message: `*${nome}:*\n${resultado.resposta}`,
    config: waConfig,
  });

  await updateMensagemEntrega(supabase, msg.id, {
    meta_message_id: envio.messageId ?? null,
    status_entrega: envio.success ? 'enviada' : 'falha',
    erro_entrega: envio.success ? null : envio.error ?? 'Falha ao enviar',
  });

  if (resultado.transferir) {
    await supabase
      .from('whatsapp_conversas')
      .update({ ia_pausada_ate: new Date(Date.now() + PAUSA_APOS_TRANSFERENCIA_MS).toISOString() })
      .eq('id', params.conversaId);
  }

  return envio.success ? 'respondido' : 'falha_envio';
}

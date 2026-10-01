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
  prazo_entrega?: string | null;
  data_entrega?: string | null;
}

export type ConsultaOsIA =
  | { numero: number; resultado: 'encontrada'; os: OsResumoIA; osId: string }
  | { numero: number; resultado: 'telefone_diferente' | 'nao_encontrada' };

const OS_CAMPOS_IA = 'numero_os, status, status_tecnico, equipamento, marca, modelo, prazo_entrega, data_entrega';

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

const REGEX_OS_EXPLICITA =
  /(?:\bo\.?\s?s(?![a-zà-ú])\.?|\bordem(?:\s+de\s+servi[cç]o)?|\bn[ºo°]\.?|\bn[uú]mero)\s*(?:d[ae]\s+)?(?:o\.?\s?s\.?\s*)?[:#nº°.\-\s]*(\d{1,7})\b/gi;
const REGEX_SO_NUMERO = /^\s*(?:#|n[ºo°]\.?)?\s*(\d{1,7})\s*[.!]?\s*$/i;
const REGEX_NUMERO_SOLTO = /(?<![\d.,/])\b(\d{1,7})\b(?![.,/]?\d)/g;
const REGEX_PEDIU_OS = /ordem de servi[cç]o|\bo\.?\s?s\b/i;

/** Números de O.S. citados nas últimas mensagens do cliente (no máximo 3, mais recentes primeiro). */
export function extrairNumerosOS(historico: MensagemHistoricoIA[]): number[] {
  const entradas: { conteudo: string; respondendoPedidoOs: boolean }[] = [];
  let pediuOs = false;
  for (const m of historico) {
    if (m.direcao === 'saida') pediuOs = REGEX_PEDIU_OS.test(m.conteudo);
    else entradas.push({ conteudo: m.conteudo, respondendoPedidoOs: pediuOs });
  }

  const numeros: number[] = [];
  for (const m of entradas.slice(-4).reverse()) {
    const candidatos: string[] = [];
    const so = m.conteudo.match(REGEX_SO_NUMERO);
    if (so) candidatos.push(so[1]);
    for (const r of m.conteudo.matchAll(REGEX_OS_EXPLICITA)) candidatos.push(r[1]);
    if (m.respondendoPedidoOs) {
      for (const r of m.conteudo.matchAll(REGEX_NUMERO_SOLTO)) candidatos.push(r[1]);
    }
    for (const c of candidatos) {
      const n = Number(c);
      if (n > 0 && !numeros.includes(n)) numeros.push(n);
    }
  }
  return numeros.slice(0, 3);
}

function mesmoTelefone(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = (a ?? '').replace(/\D/g, '');
  const db = (b ?? '').replace(/\D/g, '');
  if (da.length < 8 || db.length < 8) return false;
  return da.slice(-8) === db.slice(-8);
}

/**
 * Consulta as O.S. citadas pelo cliente. Só libera os dados quando o telefone do cadastro do cliente
 * da O.S. bate com o WhatsApp da conversa; `telefoneConversa` null (teste no painel) libera sempre.
 */
export async function consultarOsCitadas(
  supabase: SupabaseAdmin,
  empresaId: string,
  historico: MensagemHistoricoIA[],
  telefoneConversa: string | null
): Promise<ConsultaOsIA[]> {
  const numeros = extrairNumerosOS(historico);
  if (numeros.length === 0) return [];

  const { data: ordens } = await supabase
    .from('ordens_servico')
    .select(`id, cliente_id, ${OS_CAMPOS_IA}`)
    .eq('empresa_id', empresaId)
    .in('numero_os', numeros);

  const clienteIds = [...new Set((ordens ?? []).map((o) => o.cliente_id).filter(Boolean))];
  const { data: clientes } = clienteIds.length
    ? await supabase
        .from('clientes')
        .select('id, telefone, celular')
        .eq('empresa_id', empresaId)
        .in('id', clienteIds)
    : { data: [] as { id: string; telefone: string | null; celular: string | null }[] };

  return numeros.map((numero): ConsultaOsIA => {
    const ordem = (ordens ?? []).find((o) => Number(o.numero_os) === numero);
    if (!ordem) return { numero, resultado: 'nao_encontrada' };
    const cliente = (clientes ?? []).find((c) => c.id === ordem.cliente_id);
    const confere =
      telefoneConversa === null ||
      mesmoTelefone(cliente?.celular, telefoneConversa) ||
      mesmoTelefone(cliente?.telefone, telefoneConversa);
    if (!confere) return { numero, resultado: 'telefone_diferente' };
    const { id, cliente_id: _c, ...os } = ordem;
    return { numero, resultado: 'encontrada', os: os as OsResumoIA, osId: id };
  });
}

function formatarData(iso: string | null | undefined, timezone: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: timezone || 'America/Sao_Paulo',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

function descreverOs(os: OsResumoIA, timezone: string | null | undefined): string {
  return [
    `O.S. nº ${os.numero_os}`,
    [os.equipamento, os.marca, os.modelo].filter(Boolean).join(' ') || null,
    os.status ? `status: ${os.status}` : null,
    os.status_tecnico ? `situação técnica: ${os.status_tecnico}` : null,
    os.data_entrega
      ? `entregue ao cliente em ${formatarData(os.data_entrega, timezone)}`
      : os.prazo_entrega && new Date(os.prazo_entrega).getTime() >= Date.now()
        ? `previsão de entrega: ${formatarData(os.prazo_entrega, timezone)}`
        : os.prazo_entrega
          ? 'previsão de entrega já passou (não informe data; diga que a equipe vai atualizar o prazo)'
          : null,
  ]
    .filter(Boolean)
    .join(' | ');
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
  consultas?: ConsultaOsIA[];
  primeiraResposta: boolean;
}): string {
  const { config, empresa, os, consultas = [] } = params;
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

  const osTexto =
    os && !consultas.some((c) => c.resultado === 'encontrada' && c.os.numero_os === os.numero_os)
      ? descreverOs(os, empresa?.timezone)
      : null;

  const consultasTexto = consultas
    .map((c) => {
      if (c.resultado === 'encontrada') return `- ${descreverOs(c.os, empresa?.timezone)}`;
      if (c.resultado === 'telefone_diferente') {
        return `- O.S. nº ${c.numero}: existe, mas NÃO está no cadastro deste número de WhatsApp. Por segurança, não informe nada sobre ela (nem se existe); diga que um atendente vai confirmar os dados e marque "transferir": true.`;
      }
      return `- O.S. nº ${c.numero}: não encontrada nesta loja. Peça para o cliente conferir o número no comprovante da O.S.`;
    })
    .join('\n');

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
- Se o cliente perguntar sobre um aparelho que deixou na loja e não houver O.S. consultada abaixo, peça o número da ordem de serviço (fica no comprovante entregue na loja).
- Status, situação ou previsão de uma O.S. só podem vir das seções de O.S. abaixo, preenchidas pelo sistema. Se o cliente informou um número e não há resultado do sistema para ele, NÃO deduza nada: diga que um atendente vai verificar e marque "transferir": true.
- Ao informar uma O.S., escreva de forma natural (sem copiar o formato do sistema nem os status em maiúsculas), citando o aparelho e explicando a situação em palavras simples. Nunca informe valores, mesmo que o cliente peça.
- Se você não tiver a informação, se o cliente pedir para falar com uma pessoa/atendente, reclamar, quiser negociar valores ou precisar de orçamento, marque "transferir": true e termine a resposta avisando claramente que um atendente vai continuar o atendimento por aqui em breve.

DADOS DA LOJA
${dados || '- (nenhum dado cadastrado)'}
${faq ? `\nPERGUNTAS FREQUENTES (responda de acordo)\n${faq}\n` : ''}${
    config.instrucoes?.trim() ? `\nINSTRUÇÕES DA LOJA\n${config.instrucoes.trim()}\n` : ''
  }${osTexto ? `\nORDEM DE SERVIÇO DESTE CLIENTE (pode informar o status, nunca valores)\n${osTexto}\n` : ''}${
    consultasTexto ? `\nCONSULTA DAS O.S. CITADAS PELO CLIENTE (resultado do sistema agora; use só se o cliente estiver de fato informando o número de uma O.S.)\n${consultasTexto}\n` : ''
  }
FORMATO DE SAÍDA
Responda apenas com JSON: {"resposta": "texto para o cliente", "transferir": true|false}`;
}

export async function gerarRespostaIA(params: {
  config: Parameters<typeof montarPromptSistema>[0]['config'];
  empresa: EmpresaBasica | null;
  os?: OsResumoIA | null;
  consultas?: ConsultaOsIA[];
  historico: MensagemHistoricoIA[];
}): Promise<RespostaIA | null> {
  const client = getOpenAI();
  if (!client) return null;

  const primeiraResposta = !params.historico.some((m) => m.direcao === 'saida');
  const system = montarPromptSistema({
    config: params.config,
    empresa: params.empresa,
    os: params.os,
    consultas: params.consultas,
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

  const [empresa, os, consultas] = await Promise.all([
    getEmpresaBasica(supabase, params.empresaId),
    conversa.os_id
      ? supabase
          .from('ordens_servico')
          .select(OS_CAMPOS_IA)
          .eq('id', conversa.os_id)
          .eq('empresa_id', params.empresaId)
          .maybeSingle()
          .then((r) => (r.data as OsResumoIA | null) ?? null)
      : Promise.resolve(null),
    consultarOsCitadas(supabase, params.empresaId, historico, conversa.telefone),
  ]);

  const resultado = await gerarRespostaIA({ config, empresa, os, consultas, historico });
  if (!resultado) return 'sem_resposta';

  const osEncontrada = consultas.find((c) => c.resultado === 'encontrada');
  if (osEncontrada && !conversa.os_id) {
    await supabase
      .from('whatsapp_conversas')
      .update({ os_id: osEncontrada.osId })
      .eq('id', params.conversaId);
    conversa.os_id = osEncontrada.osId;
  }

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
      .update({
        ia_pausada_ate: new Date(Date.now() + PAUSA_APOS_TRANSFERENCIA_MS).toISOString(),
        ia_pausa_motivo: 'transferencia',
      })
      .eq('id', params.conversaId);
  }

  return envio.success ? 'respondido' : 'falha_envio';
}

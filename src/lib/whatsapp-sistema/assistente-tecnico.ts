import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabaseClient';
import type { Usuario } from '@/lib/user-data/types';
import {
  formatComissoesMessage,
  formatResumoOsMessage,
  formatSenhaOSMessage,
  getComissoesTecnico,
  getOsDoTecnico,
  getSenhaOSPorNumero,
  listarFotosOs,
  LIMITE_FOTOS_OS,
} from '@/lib/whatsapp-commands';
import { baixarMidiaSistema } from './send';
import { atualizarSessao, carregarSessao } from './sessao';
import {
  ehCancelamento,
  ehConfirmacao,
  executarAcao,
  listarStatusTecnico,
  prepararLaudo,
  prepararStatus,
} from './acoes';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const MODELO = process.env.OPENAI_ASSISTENTE_TECNICO_MODEL?.trim() || 'gpt-5.4-mini';
const HISTORICO_MAX = 20;
/** Conversas mais antigas que isso são outro assunto e não entram no contexto */
const JANELA_HISTORICO_MS = 12 * 60 * 60 * 1000;
const MAX_RODADAS_FERRAMENTAS = 4;
const CONTEXTO_MAX_CHARS = 3000;
const MODELO_PESQUISA = process.env.OPENAI_PESQUISA_MODEL?.trim() || 'gpt-5.4-mini';
const MAX_PESQUISAS_POR_MENSAGEM = 2;
const MAX_FONTES = 3;

/** Só a foto mais recente volta a ser enviada ao modelo, e só se a conversa ainda estiver nela. */
const FOTO_RECENTE_MAX_MENSAGENS = 6;
const MARCADOR_FOTO = /^\[Foto mídia:([^\]]+)\]\s*/;

export interface RespostaTecnico {
  message: string;
  images: string[];
}

export interface EntradaTecnico {
  /** Foto enviada pelo técnico nesta mensagem */
  foto?: { mediaId: string; buffer: Buffer; mimeType: string };
  /** O texto veio da transcrição de um áudio */
  audio?: boolean;
}

function dataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType.split(';')[0] || 'image/jpeg'};base64,${buffer.toString('base64')}`;
}

function conteudoComFoto(
  texto: string,
  url: string
): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  return [
    { type: 'text', text: texto },
    { type: 'image_url', image_url: { url, detail: 'high' } },
  ];
}

const FERRAMENTAS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'listar_minhas_os',
      description: 'Lista as ordens de serviço mais recentes atribuídas ao técnico, com status.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dados_os',
      description:
        'Dados completos de uma O.S. do técnico: cliente, status, datas (entrada, prazo, entrega, garantia), aparelho (tipo, marca, modelo, cor, nº de série/IMEI, acessórios, condições), relato do cliente, observação, checklist de entrada (o que funciona e o que não funciona), laudo e orçamento.',
      parameters: {
        type: 'object',
        properties: { numero_os: { type: 'string', description: 'Número da O.S., ex.: 890' } },
        required: ['numero_os'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enviar_fotos_os',
      description: 'Envia ao técnico as fotos da O.S. (entrada e bancada).',
      parameters: {
        type: 'object',
        properties: { numero_os: { type: 'string' } },
        required: ['numero_os'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enviar_senha_os',
      description: 'Envia ao técnico a senha/padrão de desbloqueio do aparelho da O.S.',
      parameters: {
        type: 'object',
        properties: { numero_os: { type: 'string' } },
        required: ['numero_os'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pesquisar_internet',
      description:
        'Pesquisa na internet informação técnica de manutenção: defeitos comuns de um modelo, causas de um sintoma, procedimento de reparo/teste, código/compatibilidade de peça, esquema, boletim do fabricante. Use quando precisar de informação externa ou atual; não use para dados da O.S.',
      parameters: {
        type: 'object',
        properties: {
          consulta: {
            type: 'string',
            description:
              'O que pesquisar, com marca, modelo exato e sintoma. Ex.: "DualShock 4 CUH-ZCT2 analógico com drift causa e peça de reposição"',
          },
        },
        required: ['consulta'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'preparar_laudo',
      description:
        'Prepara o laudo técnico de uma O.S. para salvar: o sistema corrige o texto e pede confirmação ao técnico (SIM/NÃO). Nada é salvo sem a confirmação dele. Chame de novo com o texto ajustado se ele pedir mudança.',
      parameters: {
        type: 'object',
        properties: {
          numero_os: { type: 'string' },
          texto: {
            type: 'string',
            description: 'Texto do laudo com o que o técnico escreveu/ditou (pode juntar várias mensagens dele). Não invente testes nem conclusões.',
          },
          modo: {
            type: 'string',
            enum: ['substituir', 'acrescentar'],
            description: 'Só quando a O.S. já tem laudo: substituir o atual ou acrescentar ao final.',
          },
        },
        required: ['numero_os', 'texto'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'preparar_status',
      description:
        'Prepara a mudança do status técnico de uma O.S.; o sistema pede confirmação ao técnico (SIM/NÃO) antes de alterar.',
      parameters: {
        type: 'object',
        properties: {
          numero_os: { type: 'string' },
          status: { type: 'string', description: 'Um dos status técnicos válidos listados nas instruções.' },
        },
        required: ['numero_os', 'status'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'comissoes',
      description: 'Resumo das comissões do técnico (total, pagas, pendentes e últimas).',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
];

function promptSistema(usuario: Usuario, minhasOs: string, statusValidos: string[], pendente: string | null): string {
  const primeiroNome = usuario.nome?.trim().split(/\s+/)[0] || 'técnico';
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short' });
  return `Você é o assistente do sistema Gestão Consert no WhatsApp, conversando com o técnico ${usuario.nome} (chame de ${primeiroNome}). Agora é ${agora}.

Seu papel é ser um colega experiente de bancada: conversa natural, entende o contexto e ajuda de verdade.
- Consulta as O.S. atribuídas a ele e os dados de cada uma: cliente, datas e prazo, aparelho (marca, modelo, cor, nº de série/IMEI, acessórios que vieram, condições/estado físico), relato do cliente, observação, checklist de entrada, laudo e orçamento. Também envia fotos e a senha do aparelho e mostra comissões. Use as ferramentas para buscar dados; nunca invente. Se um dado não estiver cadastrado, diga que não foi informado na O.S.
- Cada campo da O.S. é uma coisa diferente; não use um no lugar do outro. *Laudo* é o diagnóstico escrito pelo técnico (campo "Laudo do técnico"). *Checklist de entrada* é a triagem da recepção ao receber o aparelho. *Relato do cliente* é o que o cliente disse. Se perguntarem do laudo e ele estiver "ainda não preenchido", diga que ainda não tem laudo.
- Responda só o que ele perguntou (ex.: "qual a cor?" → só a cor), sem despejar a ficha inteira, a menos que ele peça os dados da O.S.
- Ajuda com dúvidas técnicas de manutenção (diagnóstico, peças, testes, procedimentos), cruzando com os dados da O.S. quando fizer sentido. Ex.: se ele pergunta "o que pode ser?", use o defeito relatado da O.S. em conversa.
- Pode pesquisar na internet (ferramenta pesquisar_internet) para achar defeitos comuns, causas de sintomas, procedimentos, peças e compatibilidade. Pesquise quando a dúvida depender de modelo específico, de informação que você não tem certeza ou quando ele pedir; para dúvida básica, responda direto. Monte a consulta com marca, modelo e sintoma da O.S. em conversa.
- Ao usar a pesquisa: resuma para WhatsApp (causas prováveis em ordem, testes antes de trocar peça, peça indicada) e termine com até 2 links de fonte, em linha própria, URL pura. Não invente links.
- Analisa fotos que ele manda ("[Foto enviada]"): placas, componentes, conectores, etiquetas, telas de erro, danos. Leia serigrafia, códigos de CI, números de peça, modelos e etiquetas; identifique componentes pela função provável (PMIC, CI de carga, regulador, bobina, capacitor, conector, flat); aponte danos visíveis (oxidação, componente queimado/estufado, trilha rompida, solda fria, impacto). Traduza textos em outros idiomas quando pedido. Diga o que conseguiu ler com segurança e o que está ilegível ou é suposição — nunca diga só "não consigo identificar"; liste o que viu e dê uma hipótese fundamentada. Se a foto não permitir conclusão, peça outra mais próxima, com luz ou de outro ângulo. Se ler um código de CI ou peça, pode pesquisar na internet o que é.
- Mensagens "[Áudio transcrito]" vieram de áudio e podem ter erro de transcrição: interprete o sentido técnico.
- Responde normalmente a cumprimentos, agradecimentos e conversa curta, sem repetir o que já foi feito.

Contexto:
- O histórico é a conversa real com ele. Use para entender referências como "essa", "ela", "o cliente", "e a outra", "e o laudo?". Se ficar ambíguo qual O.S., pergunte.
- Blocos <contexto>...</contexto> no histórico são dados que você já consultou; use-os para responder perguntas de acompanhamento sem chamar a ferramenta de novo, a menos que precise de dado atualizado ou que não esteja ali. Nunca escreva esses blocos.
- Linhas "[Entregue: ...]" registram senhas/fotos já enviadas. Não reenvie a menos que ele peça de novo e não escreva essas linhas.
- Só existem as O.S. atribuídas a este técnico. Se a ferramenta não encontrar, diga que a O.S. não existe ou não está com ele.

Laudo e status pelo chat:
- Quando ele escrever ou ditar um laudo para uma O.S. (ou pedir "coloca no laudo", "salva o laudo"), chame preparar_laudo com o texto dele. Se não ficar claro de qual O.S. é, pergunte antes. Se ele mandar o laudo em partes, junte o que ele disse.
- Quando ele pedir para mudar o status ("passa a 1891 para em execução", "terminei a 1891"), chame preparar_status com um destes status: ${statusValidos.join(', ')}. Se não der para saber qual status, pergunte.
- Você nunca salva nada direto: o sistema mostra a prévia e pede SIM/NÃO. Não diga que salvou; quem confirma é o sistema depois do SIM.
${pendente ? `- Aguardando confirmação agora: ${pendente}. Se ele pedir ajuste, chame a ferramenta de novo com a versão ajustada.` : ''}

Senha e fotos:
- A senha chega ao técnico pela própria ferramenta: não escreva a senha nem confirme o envio. Depois de enviar fotos, no máximo uma frase curta.

Estilo:
- Português do Brasil, tom de colega, direto e curto para WhatsApp (sem textão). *Negrito* do WhatsApp com moderação, sem títulos markdown.
- Assuntos sem nenhuma relação com trabalho de assistência técnica: recuse com educação em uma frase.

O.S. em aberto deste técnico agora:
${minhasOs}`;
}

async function carregarHistorico(
  supabase: SupabaseAdmin,
  telefone: string
): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
  const desde = new Date(Date.now() - JANELA_HISTORICO_MS).toISOString();
  const { data, error } = await supabase
    .from('whatsapp_sistema_mensagens')
    .select('papel, conteudo')
    .eq('telefone', telefone)
    .gte('created_at', desde)
    .order('created_at', { ascending: false })
    .limit(HISTORICO_MAX);

  if (error) {
    console.warn('[Assistente técnico] Histórico indisponível:', error.message);
    return [];
  }

  const linhas = (data ?? []).reverse();
  let indiceFoto = -1;
  linhas.forEach((m, i) => {
    if (m.papel === 'user' && MARCADOR_FOTO.test(m.conteudo)) indiceFoto = i;
  });
  const reenviarFoto = indiceFoto >= 0 && linhas.length - indiceFoto <= FOTO_RECENTE_MAX_MENSAGENS;
  const fotoAnterior = reenviarFoto
    ? await baixarMidiaSistema(linhas[indiceFoto].conteudo.match(MARCADOR_FOTO)![1])
    : null;

  return linhas.map((m, i): OpenAI.Chat.Completions.ChatCompletionMessageParam => {
    if (m.papel === 'assistant') return { role: 'assistant', content: m.conteudo };
    const foto = m.conteudo.match(MARCADOR_FOTO);
    if (!foto) return { role: 'user', content: m.conteudo };
    const texto = `[Foto enviada] ${m.conteudo.replace(MARCADOR_FOTO, '')}`.trim();
    if (i === indiceFoto && fotoAnterior) {
      return { role: 'user', content: conteudoComFoto(texto, dataUrl(fotoAnterior.buffer, fotoAnterior.mimeType)) };
    }
    return { role: 'user', content: texto };
  });
}

async function salvarHistorico(
  supabase: SupabaseAdmin,
  telefone: string,
  usuarioId: string,
  linhas: { papel: 'user' | 'assistant'; conteudo: string }[]
) {
  // Mesmo insert = mesmo now(); sem horários distintos a ordem pergunta/resposta se perde.
  const base = Date.now() - linhas.length;
  const { error } = await supabase.from('whatsapp_sistema_mensagens').insert(
    linhas.map((l, i) => ({
      telefone,
      usuario_id: usuarioId,
      papel: l.papel,
      conteudo: l.conteudo.slice(0, 6000),
      created_at: new Date(base + i).toISOString(),
    }))
  );
  if (error) console.warn('[Assistente técnico] Falha ao salvar histórico:', error.message);
}

async function listarMinhasOs(supabase: SupabaseAdmin, empresaId: string, authUserId: string): Promise<string> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('numero_os, status, status_tecnico, equipamento, marca, modelo, clientes:cliente_id ( nome )')
    .eq('empresa_id', empresaId)
    .eq('tecnico_id', authUserId)
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) return 'Erro ao buscar as O.S.';
  if (!data?.length) return 'Nenhuma O.S. atribuída a este técnico.';

  const linha = (os: (typeof data)[number]) => {
    const cliente = os.clientes as { nome?: string } | { nome?: string }[] | null;
    const nome = Array.isArray(cliente) ? cliente[0]?.nome : cliente?.nome;
    const aparelho = [os.equipamento, os.marca, os.modelo].filter(Boolean).join(' ');
    return `OS #${os.numero_os} | ${nome || 'sem cliente'} | ${aparelho || 'sem aparelho'} | status: ${os.status || '-'} | técnico: ${os.status_tecnico || '-'}`;
  };

  const entregue = (status: string | null) => /entreg|cancel/i.test(status || '');
  const abertas = data.filter((os) => !entregue(os.status)).slice(0, 15);
  const fechadas = data.filter((os) => entregue(os.status)).slice(0, 5);

  return [
    `EM ABERTO (${abertas.length}):`,
    abertas.length ? abertas.map(linha).join('\n') : 'nenhuma',
    `ENTREGUES/CANCELADAS RECENTES (mostre só se ele pedir):`,
    fechadas.length ? fechadas.map(linha).join('\n') : 'nenhuma',
  ].join('\n');
}

function limparUrl(url: string): string {
  try {
    const u = new URL(url);
    [...u.searchParams.keys()].filter((k) => k.startsWith('utm_')).forEach((k) => u.searchParams.delete(k));
    return u.toString().replace(/\?$/, '');
  } catch {
    return url;
  }
}

async function pesquisarInternet(client: OpenAI, consulta: string): Promise<string> {
  const resposta = await client.responses.create({
    model: MODELO_PESQUISA,
    tools: [{ type: 'web_search' }],
    instructions:
      'Você pesquisa para um técnico de assistência técnica de eletrônicos no Brasil. Responda em português, direto e técnico, em no máximo 12 linhas: causas prováveis em ordem de probabilidade, testes antes de trocar peça, peça/código quando houver. Prefira fontes do fabricante, fóruns técnicos e iFixit. Não invente; se não achar, diga.',
    input: consulta,
    max_output_tokens: 1200,
  });

  const fontes = new Set<string>();
  for (const item of resposta.output) {
    if (item.type !== 'message') continue;
    for (const parte of item.content) {
      if (parte.type !== 'output_text') continue;
      for (const a of parte.annotations ?? []) {
        if (a.type === 'url_citation') fontes.add(limparUrl(a.url));
      }
    }
  }

  const texto = resposta.output_text?.replace(/\s*\(\[[^\]]+\]\([^)]+\)\)/g, '').trim();
  if (!texto) return 'A pesquisa não trouxe resultado.';
  const links = [...fontes].slice(0, MAX_FONTES);
  return `${texto}${links.length ? `\n\nFontes:\n${links.join('\n')}` : ''}`;
}

/** WhatsApp usa *negrito* simples; o modelo às vezes manda **markdown**. */
function formatoWhatsApp(texto: string): string {
  return texto
    .replace(/<contexto>[\s\S]*?<\/contexto>/g, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, rotulo: string, url: string) =>
      rotulo.trim() === url.trim() || /^https?:/.test(rotulo) ? url : `${rotulo}: ${url}`
    )
    .replace(/^\[Entregue:.*\]\s*$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Conversa do técnico com o assistente do sistema (GPT com consultas travadas ao técnico).
 * Retorna null se a OpenAI não estiver configurada ou falhar, para o webhook usar os comandos fixos.
 */
export async function responderTecnicoComIA(
  usuario: Usuario,
  telefone: string,
  texto: string,
  entrada: EntradaTecnico = {}
): Promise<RespostaTecnico | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!usuario.empresa_id || !usuario.auth_user_id) {
    return {
      message: '❌ Não consegui identificar sua empresa ou seu usuário de técnico. Fale com o administrador.',
      images: [],
    };
  }

  const empresaId = usuario.empresa_id;
  const authUserId = usuario.auth_user_id;
  const supabase = createAdminClient();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const mensagensDiretas: string[] = [];
  const imagens: string[] = [];
  const entregues: string[] = [];
  const contextos: string[] = [];
  /** Prévias de laudo/status: vão ao técnico e ao histórico (a senha do aparelho não vai ao histórico) */
  const confirmacoes: string[] = [];
  let pesquisas = 0;

  const continuacao = /^\s*(e|e\s+a|e\s+da|e\s+do|agora)\b/i.test(texto) && texto.length <= 40;
  let pediuSenha = /senha|password|padr[aã]o|desbloq/i.test(texto);
  // Com foto anexada, "essa imagem" fala da foto enviada, não das fotos da O.S.
  let pediuFotos = entrada.foto
    ? /fotos?\s+(da|de)\s+o\.?s/i.test(texto)
    : /foto|imagem|imagens|pic/i.test(texto);
  const numerosNoTexto = (texto.match(/\d+/g) ?? []).map((n) => n.replace(/^0+(?=\d)/, ''));

  async function executar(nome: string, args: Record<string, unknown>): Promise<string> {
    const numero = String(args.numero_os ?? '').replace(/\D/g, '');

    if (nome === 'enviar_senha_os' && !pediuSenha) {
      return 'A última mensagem não pede senha. Não envie senha; responda só o que foi perguntado.';
    }
    if (nome === 'enviar_fotos_os' && !pediuFotos) {
      return 'A última mensagem não pede fotos. Não envie fotos; responda só o que foi perguntado.';
    }
    if (nome === 'enviar_senha_os' || nome === 'enviar_fotos_os') {
      if (entregues.includes(`${nome}:${numero}`)) return 'Já entregue nesta resposta.';
      if (numerosNoTexto.length && !numerosNoTexto.includes(numero)) {
        return `A última mensagem não fala da OS #${numero}. Não envie.`;
      }
    }

    switch (nome) {
      case 'listar_minhas_os':
        return listarMinhasOs(supabase, empresaId, authUserId);

      case 'dados_os': {
        if (!numero) return 'Número da O.S. não informado.';
        const os = await getOsDoTecnico(numero, empresaId, authUserId);
        if (!os) return `OS #${numero} não encontrada entre as O.S. deste técnico.`;
        const resumo = formatResumoOsMessage(os);
        contextos.push(`Dados da OS #${numero}:\n${resumo}`.slice(0, CONTEXTO_MAX_CHARS));
        return resumo;
      }

      case 'enviar_fotos_os': {
        if (!numero) return 'Número da O.S. não informado.';
        const os = await getOsDoTecnico(numero, empresaId, authUserId);
        if (!os) return `OS #${numero} não encontrada entre as O.S. deste técnico.`;
        const fotos = listarFotosOs(os);
        if (!fotos.length) return `A OS #${numero} não tem fotos.`;
        const enviar = fotos.slice(0, LIMITE_FOTOS_OS).filter((f) => !imagens.includes(f));
        imagens.push(...enviar);
        entregues.push(`enviar_fotos_os:${numero}`);
        return fotos.length > LIMITE_FOTOS_OS
          ? `Enviadas ${LIMITE_FOTOS_OS} de ${fotos.length} fotos da OS #${numero}.`
          : `Enviadas ${fotos.length} foto(s) da OS #${numero}.`;
      }

      case 'enviar_senha_os': {
        if (!numero) return 'Número da O.S. não informado.';
        const dados = await getSenhaOSPorNumero(numero, empresaId, authUserId);
        if (!dados) return `OS #${numero} não encontrada entre as O.S. deste técnico.`;
        mensagensDiretas.push(formatSenhaOSMessage(dados));
        entregues.push(`enviar_senha_os:${numero}`);
        return `Senha da OS #${numero} entregue ao técnico.`;
      }

      case 'preparar_laudo': {
        if (!numero) return 'Número da O.S. não informado; pergunte de qual O.S. é o laudo.';
        const modo = args.modo === 'substituir' || args.modo === 'acrescentar' ? args.modo : undefined;
        const r = await prepararLaudo(usuario, telefone, numero, String(args.texto ?? ''), modo);
        if (r.paraTecnico) confirmacoes.splice(0, confirmacoes.length, r.paraTecnico);
        return r.paraModelo;
      }

      case 'preparar_status': {
        if (!numero) return 'Número da O.S. não informado; pergunte de qual O.S. é.';
        const r = await prepararStatus(usuario, telefone, numero, String(args.status ?? ''));
        if (r.paraTecnico) confirmacoes.splice(0, confirmacoes.length, r.paraTecnico);
        return r.paraModelo;
      }

      case 'pesquisar_internet': {
        const consulta = String(args.consulta ?? '').trim();
        if (!consulta) return 'Consulta vazia.';
        if (pesquisas >= MAX_PESQUISAS_POR_MENSAGEM) {
          return 'Limite de pesquisas desta mensagem atingido; responda com o que já tem.';
        }
        pesquisas++;
        try {
          const resultado = await pesquisarInternet(client, consulta);
          contextos.push(`Pesquisa na internet: "${consulta}"\n${resultado}`.slice(0, CONTEXTO_MAX_CHARS));
          return resultado;
        } catch (err) {
          console.error('[Assistente técnico] Falha na pesquisa:', err instanceof Error ? err.message : err);
          return 'A pesquisa na internet falhou agora; responda com seu conhecimento e avise que não conseguiu pesquisar.';
        }
      }

      case 'comissoes': {
        const { comissoes, total, totalPago, totalPendente } = await getComissoesTecnico(usuario.id, 10);
        return formatComissoesMessage(comissoes, total, totalPago, totalPendente, usuario.nome);
      }

      default:
        return 'Ferramenta desconhecida.';
    }
  }

  try {
    const sessao = await carregarSessao(telefone);
    const pendente =
      sessao?.acao_pendente && sessao.acao_expira_em && new Date(sessao.acao_expira_em).getTime() > Date.now()
        ? sessao.acao_pendente
        : null;

    // SIM/NÃO de uma ação pendente é decidido pelo código, não pelo modelo
    if (pendente && !entrada.foto && (ehConfirmacao(texto) || ehCancelamento(texto))) {
      const confirmou = ehConfirmacao(texto);
      await atualizarSessao(telefone, usuario.id, { acao_pendente: null, acao_expira_em: null });
      const message = confirmou
        ? await executarAcao(usuario, pendente)
        : `Ok, cancelado. Nada foi alterado na OS #${pendente.numero_os}.`;
      await salvarHistorico(supabase, telefone, usuario.id, [
        { papel: 'user', conteudo: texto },
        { papel: 'assistant', conteudo: message },
      ]);
      return { message, images: [] };
    }

    const descricaoPendente = pendente
      ? pendente.tipo === 'laudo'
        ? `laudo da OS #${pendente.numero_os}`
        : `mudança de status da OS #${pendente.numero_os} para ${pendente.status}`
      : null;

    const [historico, minhasOs, statusValidos] = await Promise.all([
      carregarHistorico(supabase, telefone),
      listarMinhasOs(supabase, empresaId, authUserId),
      listarStatusTecnico(empresaId),
    ]);
    const anterior = [...historico].reverse().find((m) => m.role === 'assistant');
    const conteudoAnterior = typeof anterior?.content === 'string' ? anterior.content : '';
    if (continuacao) {
      if (/\[Entregue:[^\]]*senha/i.test(conteudoAnterior)) pediuSenha = true;
      if (/\[Entregue:[^\]]*fotos/i.test(conteudoAnterior)) pediuFotos = true;
    }
    const afirmativa = /^\s*(sim|s|isso|manda|pode|quero|pode mandar|manda a[ií]|ok|blz|beleza)\b/i.test(texto) && texto.length <= 40;
    if (afirmativa) {
      const ultimaFala = formatoWhatsApp(conteudoAnterior);
      if (/senha|padr[aã]o/i.test(ultimaFala) && /\?/.test(ultimaFala)) pediuSenha = true;
      if (/foto|imagem/i.test(ultimaFala) && /\?/.test(ultimaFala)) pediuFotos = true;
    }
    const mensagens: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: promptSistema(usuario, minhasOs, statusValidos, descricaoPendente) },
      ...historico,
      {
        role: 'user',
        content: entrada.foto
          ? conteudoComFoto(
              `[Foto enviada] ${texto || '(sem legenda: analise a imagem no contexto da conversa)'}`,
              dataUrl(entrada.foto.buffer, entrada.foto.mimeType)
            )
          : entrada.audio
            ? `[Áudio transcrito] ${texto}`
            : texto,
      },
    ];

    let resposta = '';
    for (let rodada = 0; rodada <= MAX_RODADAS_FERRAMENTAS; rodada++) {
      const completion = await client.chat.completions.create({
        model: MODELO,
        messages: mensagens,
        tools: FERRAMENTAS,
        tool_choice: rodada === MAX_RODADAS_FERRAMENTAS ? 'none' : 'auto',
        ...(MODELO.startsWith('gpt-5')
          ? // Chat Completions só aceita tools na família gpt-5 sem raciocínio
            { reasoning_effort: 'none' as unknown as 'low', max_completion_tokens: 1200 }
          : { temperature: 0.4, max_tokens: 800 }),
      });

      const msg = completion.choices[0]?.message;
      if (!msg) break;

      const chamadas = msg.tool_calls?.filter((c) => c.type === 'function') ?? [];
      if (!chamadas.length) {
        resposta = formatoWhatsApp(msg.content?.trim() ?? '');
        break;
      }

      mensagens.push({ role: 'assistant', content: msg.content ?? null, tool_calls: chamadas });
      for (const chamada of chamadas) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(chamada.function.arguments || '{}');
        } catch {
          args = {};
        }
        const resultado = await executar(chamada.function.name, args);
        mensagens.push({ role: 'tool', tool_call_id: chamada.id, content: resultado });
      }
    }

    if (mensagensDiretas.length) {
      resposta = resposta
        .split('\n')
        .filter((l) => !/senha.*(na tela|enviad)|(na tela|enviad).*senha/i.test(l))
        .join('\n')
        .trim();
    }

    // Com prévia de laudo/status, a fala do modelo é só ruído ("Pronto.", "Beleza")
    if (confirmacoes.length) resposta = '';
    const message = [...mensagensDiretas, resposta, ...confirmacoes].filter(Boolean).join('\n\n');
    if (!message && !imagens.length) return null;

    await salvarHistorico(supabase, telefone, usuario.id, [
      {
        papel: 'user',
        conteudo: entrada.foto
          ? `[Foto mídia:${entrada.foto.mediaId}] ${texto}`.trim()
          : entrada.audio
            ? `[Áudio transcrito] ${texto}`
            : texto,
      },
      {
        papel: 'assistant',
        conteudo: [
          contextos.length ? `<contexto>\n${contextos.join('\n\n')}\n</contexto>` : '',
          entregues.length
            ? `[Entregue: ${entregues
                .map((e) => e.replace('enviar_senha_os:', 'senha da OS #').replace('enviar_fotos_os:', 'fotos da OS #'))
                .join(', ')}]`
            : '',
          resposta,
          ...confirmacoes,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ]);

    return { message, images: imagens };
  } catch (err) {
    console.error('[Assistente técnico] Erro na IA:', err instanceof Error ? err.message : err);
    return null;
  }
}

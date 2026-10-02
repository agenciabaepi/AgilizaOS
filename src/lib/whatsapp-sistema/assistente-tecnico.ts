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

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const MODELO = 'gpt-4o-mini';
const HISTORICO_MAX = 12;
/** Conversas mais antigas que isso são outro assunto e não entram no contexto */
const JANELA_HISTORICO_MS = 6 * 60 * 60 * 1000;
const MAX_RODADAS_FERRAMENTAS = 4;

export interface RespostaTecnico {
  message: string;
  images: string[];
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
      description: 'Dados de uma O.S. do técnico: cliente, aparelho, status, problema, laudo e orçamento.',
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
      name: 'comissoes',
      description: 'Resumo das comissões do técnico (total, pagas, pendentes e últimas).',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
];

function promptSistema(usuario: Usuario): string {
  const primeiroNome = usuario.nome?.trim().split(/\s+/)[0] || 'técnico';
  return `Você é o assistente do sistema Gestão Consert no WhatsApp, falando com o técnico ${usuario.nome} (chame de ${primeiroNome}).

O que você faz:
- Consultar as O.S. atribuídas a ele, dados de uma O.S., enviar fotos e senha do aparelho, e mostrar comissões. Use sempre as ferramentas; nunca invente dados.
- Tirar dúvidas técnicas rápidas de bancada (diagnóstico, peças, testes).

Regras:
- Só existem as O.S. atribuídas a este técnico. Se a ferramenta disser que não encontrou, diga que a O.S. não existe ou não está atribuída a ele.
- Se faltar o número da O.S., pergunte. Se ele disser "essa", "ela", use a O.S. da conversa.
- Atenda só o pedido da última mensagem; o histórico serve para entender "essa", "ela", "e da OS X". Linhas "[Entregue: ...]" no histórico registram o que já foi entregue: não repita isso e não escreva essas linhas.
- A senha chega ao técnico pela própria ferramenta: não escreva a senha nem confirme o envio dela. Depois de enviar fotos, no máximo uma frase curta.
- Ao listar O.S., mostre as em aberto; entregues só se ele pedir.
- Recuse assuntos sem relação com o trabalho na assistência.
- Português do Brasil, tom de colega, respostas curtas para WhatsApp. Use *negrito* do WhatsApp com moderação.`;
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

  return (data ?? [])
    .reverse()
    .map((m) => ({ role: m.papel as 'user' | 'assistant', content: m.conteudo }));
}

async function salvarHistorico(
  supabase: SupabaseAdmin,
  telefone: string,
  usuarioId: string,
  linhas: { papel: 'user' | 'assistant'; conteudo: string }[]
) {
  const { error } = await supabase.from('whatsapp_sistema_mensagens').insert(
    linhas.map((l) => ({ telefone, usuario_id: usuarioId, papel: l.papel, conteudo: l.conteudo.slice(0, 4000) }))
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

/** WhatsApp usa *negrito* simples; o modelo às vezes manda **markdown**. */
function formatoWhatsApp(texto: string): string {
  return texto
    .replace(/^\[Entregue:.*\]\s*$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/^#{1,6}\s+/gm, '');
}

/**
 * Conversa do técnico com o assistente do sistema (GPT com consultas travadas ao técnico).
 * Retorna null se a OpenAI não estiver configurada ou falhar, para o webhook usar os comandos fixos.
 */
export async function responderTecnicoComIA(
  usuario: Usuario,
  telefone: string,
  texto: string
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

  const continuacao = /^\s*(e|e\s+a|e\s+da|e\s+do|agora)\b/i.test(texto) && texto.length <= 40;
  let pediuSenha = /senha|password|padr[aã]o|desbloq/i.test(texto);
  let pediuFotos = /foto|imagem|imagens|pic/i.test(texto);
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
        return formatResumoOsMessage(os);
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

      case 'comissoes': {
        const { comissoes, total, totalPago, totalPendente } = await getComissoesTecnico(usuario.id, 10);
        return formatComissoesMessage(comissoes, total, totalPago, totalPendente, usuario.nome);
      }

      default:
        return 'Ferramenta desconhecida.';
    }
  }

  try {
    const historico = await carregarHistorico(supabase, telefone);
    if (continuacao) {
      const anterior = [...historico].reverse().find((m) => m.role === 'assistant');
      const conteudo = typeof anterior?.content === 'string' ? anterior.content : '';
      if (/\[Entregue:[^\]]*senha/i.test(conteudo)) pediuSenha = true;
      if (/\[Entregue:[^\]]*fotos/i.test(conteudo)) pediuFotos = true;
    }
    const mensagens: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: promptSistema(usuario) },
      ...historico,
      { role: 'user', content: texto },
    ];

    let resposta = '';
    for (let rodada = 0; rodada <= MAX_RODADAS_FERRAMENTAS; rodada++) {
      const completion = await client.chat.completions.create({
        model: MODELO,
        messages: mensagens,
        tools: FERRAMENTAS,
        tool_choice: rodada === MAX_RODADAS_FERRAMENTAS ? 'none' : 'auto',
        temperature: 0.3,
        max_tokens: 600,
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

    const message = [...mensagensDiretas, resposta].filter(Boolean).join('\n\n');
    if (!message && !imagens.length) return null;

    await salvarHistorico(supabase, telefone, usuario.id, [
      { papel: 'user', conteudo: texto },
      {
        papel: 'assistant',
        conteudo: [
          entregues.length
            ? `[Entregue: ${entregues
                .map((e) => e.replace('enviar_senha_os:', 'senha da OS #').replace('enviar_fotos_os:', 'fotos da OS #'))
                .join(', ')}]`
            : '',
          resposta,
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

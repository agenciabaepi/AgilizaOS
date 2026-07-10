import OpenAI, { toFile } from 'openai';
import type { DadosUsuario } from './user-data';
import type { AparelhoInfoIA } from '@/types/aparelhos';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Cliente OpenAI (ChatGPT)
 */
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY não configurada - ChatGPT desabilitado');
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

/**
 * Constrói contexto do sistema para TÉCNICO
 */
function buildTecnicoContext(userName: string, dados: any): string {
  let context = `\n\n👨‍🔧 DADOS DO TÉCNICO ${userName}:`;
  
  if (dados.comissoes) {
    context += `\n\n💰 COMISSÕES:
- Total: R$ ${dados.comissoes.total.toFixed(2).replace('.', ',')}
- Pagas: R$ ${dados.comissoes.totalPago.toFixed(2).replace('.', ',')}
- Pendentes: R$ ${dados.comissoes.totalPendente.toFixed(2).replace('.', ',')}`;
    
    if (dados.comissoes.ultimas?.length > 0) {
      context += `\n\nÚltimas comissões:`;
      dados.comissoes.ultimas.forEach((c: any, i: number) => {
        context += `\n${i + 1}. OS #${c.numero_os} - ${c.cliente} - R$ ${c.valor.toFixed(2).replace('.', ',')} - ${c.status}`;
      });
    }
  }
  
  if (dados.osPendentes?.length > 0) {
    context += `\n\n📋 OS PENDENTES (${dados.totalOSPendentes || dados.osPendentes.length}):`;
    dados.osPendentes.slice(0, 5).forEach((os: any, i: number) => {
      context += `\n${i + 1}. OS #${os.numero_os} - ${os.cliente} - ${os.servico}`;
    });
  }
  
  return context;
}

/**
 * Constrói contexto do sistema para FINANCEIRO
 */
function buildFinanceiroContext(userName: string, dados: any): string {
  let context = `\n\n💼 DADOS DO FINANCEIRO - ${userName}:`;
  
  if (dados.contasAPagar) {
    const c = dados.contasAPagar;
    context += `\n\n💰 CONTAS A PAGAR:
- Total de contas: ${c.total}
- Pendentes: ${c.pendentes} (R$ ${c.valorPendente.toFixed(2).replace('.', ',')})
- Pagas: ${c.pagas} (R$ ${c.valorPago.toFixed(2).replace('.', ',')})
- Vencidas: ${c.vencidas} (R$ ${c.valorVencido.toFixed(2).replace('.', ',')})`;
    
    if (c.proximasVencer?.length > 0) {
      context += `\n\n⚠️ PRÓXIMAS A VENCER (7 dias):`;
      c.proximasVencer.forEach((conta: any, i: number) => {
        context += `\n${i + 1}. ${conta.descricao} - R$ ${conta.valor.toFixed(2).replace('.', ',')} - ${conta.vencimento}`;
      });
    }
  }
  
  if (dados.resumoMensal) {
    const r = dados.resumoMensal;
    context += `\n\n📊 RESUMO DO MÊS:
- Receita: R$ ${r.receita.toFixed(2).replace('.', ',')}
- Despesas: R$ ${r.despesas.toFixed(2).replace('.', ',')}
- Lucro: R$ ${r.lucro.toFixed(2).replace('.', ',')}`;
  }
  
  return context;
}

/**
 * Constrói contexto do sistema para ATENDENTE
 */
function buildAtendenteContext(userName: string, dados: any): string {
  let context = `\n\n👥 DADOS DO ATENDENTE - ${userName}:`;
  
  if (dados.osAbertas) {
    const os = dados.osAbertas;
    context += `\n\n📋 ORDENS DE SERVIÇO:
- Total abertas: ${os.total}
- Aguardando aprovação: ${os.aguardandoAprovacao}
- Em andamento: ${os.emAndamento}`;
    
    if (os.ultimas?.length > 0) {
      context += `\n\nÚltimas OS abertas:`;
      os.ultimas.forEach((ordem: any, i: number) => {
        context += `\n${i + 1}. OS #${ordem.numero_os} - ${ordem.cliente} - ${ordem.status}`;
      });
    }
  }
  
  if (dados.clientesRecentes?.length > 0) {
    context += `\n\n👤 CLIENTES RECENTES:`;
    dados.clientesRecentes.slice(0, 3).forEach((cliente: any, i: number) => {
      context += `\n${i + 1}. ${cliente.nome}${cliente.ultimaOS ? ` - OS #${cliente.ultimaOS}` : ''}`;
    });
  }
  
  return context;
}

/**
 * Constrói contexto do sistema para ADMIN
 */
function buildAdminContext(userName: string, dados: any): string {
  let context = `\n\n👨‍💼 DADOS DO ADMINISTRADOR - ${userName}:`;
  
  if (dados.resumoGeral) {
    const r = dados.resumoGeral;
    context += `\n\n📊 RESUMO GERAL:
- Total de OS: ${r.totalOS} (${r.osAbertas} abertas, ${r.osFechadas} fechadas)
- Técnicos: ${r.totalTecnicos}
- Clientes: ${r.totalClientes}`;
  }
  
  if (dados.financeiro) {
    const f = dados.financeiro;
    context += `\n\n💰 FINANCEIRO DO MÊS:
- Receita: R$ ${f.receitaMes.toFixed(2).replace('.', ',')}
- Despesas: R$ ${f.despesasMes.toFixed(2).replace('.', ',')}
- Lucro: R$ ${f.lucroMes.toFixed(2).replace('.', ',')}`;
    
    if (f.contasVencidas > 0) {
      context += `\n⚠️ Contas vencidas: ${f.contasVencidas} (R$ ${f.valorVencido.toFixed(2).replace('.', ',')})`;
    }
  }
  
  if (dados.osUrgentes?.length > 0) {
    context += `\n\n🚨 OS URGENTES (15+ dias abertas):`;
    dados.osUrgentes.forEach((os: any, i: number) => {
      context += `\n${i + 1}. OS #${os.numero_os} - ${os.cliente} - ${os.diasAberta} dias`;
    });
  }
  
  return context;
}

/**
 * Gera resposta do ChatGPT para uma mensagem do WhatsApp
 * @param userMessage - Mensagem do usuário
 * @param userName - Nome do usuário
 * @param userData - Dados específicos do usuário baseado no nível
 * @returns Resposta do ChatGPT ou null em caso de erro
 */
export async function getChatGPTResponse(
  userMessage: string,
  userName: string,
  userData: DadosUsuario | null
): Promise<string | null> {
  try {
    const client = getOpenAIClient();
    
    if (!client) {
      return null;
    }

    // Mensagem base do sistema
    let systemMessage = `Você é um assistente virtual inteligente do sistema Consert, um sistema de gestão de ordens de serviço.

IMPORTANTE:
- Use emojis moderadamente para tornar a comunicação mais amigável
- Mantenha respostas concisas e objetivas (máximo 400 caracteres)
- Responda sempre em português brasileiro
- Seja educado e profissional
- Use as informações fornecidas para dar respostas precisas e úteis`;

    // Adicionar contexto específico baseado no nível do usuário
    if (userData) {
      switch (userData.nivel) {
        case 'tecnico':
          systemMessage += buildTecnicoContext(userName, userData.dados);
          systemMessage += `\n\nResponda perguntas sobre comissões, OS pendentes e status de trabalhos.`;
          break;
        
        case 'financeiro':
          systemMessage += buildFinanceiroContext(userName, userData.dados);
          systemMessage += `\n\nResponda perguntas sobre contas a pagar, receitas, despesas e saúde financeira.`;
          break;
        
        case 'atendente':
          systemMessage += buildAtendenteContext(userName, userData.dados);
          systemMessage += `\n\nResponda perguntas sobre OS abertas, clientes e status de atendimentos.`;
          break;
        
        case 'admin':
          systemMessage += buildAdminContext(userName, userData.dados);
          systemMessage += `\n\nResponda perguntas sobre dados gerais, performance, financeiro e gestão geral.`;
          break;
      }
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemMessage,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ];

    console.log('🤖 Chamando ChatGPT API:', {
      nivel: userData?.nivel || 'desconhecido',
      messageLength: userMessage.length,
      hasData: !!userData,
    });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 400,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      console.error('❌ ChatGPT retornou resposta vazia');
      return null;
    }

    console.log('✅ ChatGPT resposta gerada:', {
      length: response.length,
      preview: response.substring(0, 100),
    });

    return response.trim();

  } catch (error: any) {
    console.error('❌ Erro ao chamar ChatGPT:', {
      error: error.message,
      code: error.code,
      status: error.status,
    });
    
    return 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente mais tarde ou entre em contato com o administrador.';
  }
}

/**
 * Verifica se o ChatGPT está disponível (API key configurada)
 */
export function isChatGPTAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Corrige e melhora o texto do laudo técnico usando ChatGPT
 * @param textoOriginal - Texto do laudo a ser corrigido (pode ser HTML ou texto simples)
 * @returns Texto corrigido em HTML ou null em caso de erro
 */
export async function corrigirLaudoTecnico(textoOriginal: string): Promise<string | null> {
  try {
    const client = getOpenAIClient();
    
    if (!client) {
      console.warn('⚠️ ChatGPT não disponível - OPENAI_API_KEY não configurada');
      return null;
    }

    // Remover tags HTML para análise (preservar apenas o texto)
    const textoLimpo = textoOriginal
      .replace(/<[^>]*>/g, ' ') // Remove tags HTML
      .replace(/\s+/g, ' ') // Remove espaços múltiplos
      .trim();

    if (!textoLimpo || textoLimpo.length < 10) {
      console.warn('⚠️ Texto muito curto para correção');
      return null;
    }

    const systemMessage = `Você é um assistente especializado em correção de laudos técnicos para assistência técnica de equipamentos eletrônicos.

INSTRUÇÕES:
1. Corrija erros de ortografia e gramática
2. Melhore a clareza e objetividade do texto
3. Mantenha todos os termos técnicos e informações técnicas exatas
4. Preserve a estrutura e formatação do texto original
5. Use linguagem técnica profissional e clara
6. Mantenha parágrafos e quebras de linha quando apropriado
7. NÃO adicione informações que não estavam no texto original
8. Retorne APENAS o texto corrigido, sem explicações ou comentários

O texto deve ser retornado em formato HTML simples, usando tags como <p>, <strong>, <em>, <ul>, <ol>, <li> quando apropriado para melhor formatação.`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemMessage,
      },
      {
        role: 'user',
        content: `Corrija e melhore o seguinte laudo técnico:\n\n${textoLimpo}`,
      },
    ];

    console.log('🤖 Corrigindo laudo técnico com ChatGPT:', {
      textoLength: textoLimpo.length,
      preview: textoLimpo.substring(0, 100),
    });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 2000,
      temperature: 0.3, // Temperatura baixa para manter precisão técnica
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      console.error('❌ ChatGPT retornou resposta vazia para correção de laudo');
      return null;
    }

    console.log('✅ Laudo técnico corrigido:', {
      length: response.length,
      preview: response.substring(0, 100),
    });

    // Retornar o texto corrigido (já em HTML se o modelo retornou)
    return response.trim();

  } catch (error: any) {
    console.error('❌ Erro ao corrigir laudo técnico com ChatGPT:', {
      error: error.message,
      code: error.code,
      status: error.status,
    });
    
    return null;
  }
}

const infoCache = new Map<string, { data: AparelhoInfoIA; ts: number }>();
const INFO_CACHE_TTL = 60 * 60 * 1000; // 1h

function parseInfoJson(raw: string): AparelhoInfoIA | null {
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    const obj = JSON.parse(raw.slice(start, end + 1));
    return {
      imagem_url: typeof obj.imagem_url === 'string' ? obj.imagem_url : null,
      preco_medio:
        obj.preco_medio &&
        typeof obj.preco_medio.min === 'number' &&
        typeof obj.preco_medio.max === 'number'
          ? { min: obj.preco_medio.min, max: obj.preco_medio.max }
          : null,
      especificacoes:
        obj.especificacoes && typeof obj.especificacoes === 'object'
          ? Object.fromEntries(
              Object.entries(obj.especificacoes).map(([k, v]) => [k, String(v)])
            )
          : {},
      descricao: typeof obj.descricao === 'string' ? obj.descricao : null,
      ano_lancamento: obj.ano_lancamento != null ? String(obj.ano_lancamento) : null,
    };
  } catch {
    return null;
  }
}

const INFO_SYSTEM_PROMPT = `Você é um assistente que retorna informações técnicas sobre aparelhos eletrônicos em formato JSON.
Este sistema é usado por assistências técnicas de eletrônicos no Brasil.

INSTRUÇÕES:
- Busque na internet informações atualizadas sobre o aparelho solicitado
- Retorne APENAS um objeto JSON válido, sem markdown, sem explicações
- Para imagem_url, forneça uma URL direta de imagem do aparelho (JPG/PNG/WebP) de um site confiável (fabricante, gsmarena, loja oficial, etc.)
- Especificações devem ser concisas e em português

REGRAS DE PREÇO:
- preco_medio deve refletir o valor ATUAL de mercado no Brasil para o aparelho USADO/SEMINOVO em bom estado
- Pesquise em sites como OLX, Mercado Livre, BackMarket para referência de preço de usados
- Se o aparelho tem mais de 3 anos, o preço de usado é muito menor que o de novo
- Se não conseguir estimar um preço confiável, retorne null para preco_medio

Formato JSON esperado:
{
  "imagem_url": "https://...",
  "preco_medio": { "min": 800, "max": 1200 },
  "especificacoes": {
    "Tela": "6.1 pol AMOLED 120Hz",
    "Processador": "Snapdragon 8 Gen 3",
    "RAM": "8 GB",
    "Armazenamento": "128 GB",
    "Bateria": "4000 mAh",
    "Câmera": "50 MP + 12 MP + 10 MP",
    "Sistema": "Android 14"
  },
  "descricao": "Descrição curta do aparelho",
  "ano_lancamento": "2024"
}

Se o aparelho for um notebook, adapte as especificações para: Tela, Processador, RAM, Armazenamento, Bateria, Placa de Vídeo, Sistema.
Se não encontrar alguma informação, use null para o campo.`;

function dbRowToInfo(row: any): AparelhoInfoIA {
  return {
    imagem_url: row.imagem_url || null,
    preco_medio:
      row.preco_min != null && row.preco_max != null
        ? { min: Number(row.preco_min), max: Number(row.preco_max) }
        : null,
    especificacoes: row.especificacoes || {},
    descricao: row.descricao || null,
    ano_lancamento: row.ano_lancamento || null,
  };
}

async function buscarCacheDB(marca: string, modelo: string): Promise<AparelhoInfoIA | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('aparelhos_info_ia_cache')
      .select('*')
      .ilike('marca', marca)
      .ilike('modelo', modelo)
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') return null; // table doesn't exist yet
      console.warn('⚠️ Erro ao buscar cache IA no banco:', error.message);
      return null;
    }
    if (!data) return null;
    return dbRowToInfo(data);
  } catch {
    return null;
  }
}

async function salvarCacheDB(marca: string, modelo: string, tipo: string | undefined, info: AparelhoInfoIA): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    await admin
      .from('aparelhos_info_ia_cache')
      .upsert(
        {
          marca: marca.toUpperCase(),
          modelo: modelo.toUpperCase(),
          tipo: tipo?.toUpperCase() || null,
          imagem_url: info.imagem_url,
          preco_min: info.preco_medio?.min ?? null,
          preco_max: info.preco_medio?.max ?? null,
          especificacoes: info.especificacoes,
          descricao: info.descricao,
          ano_lancamento: info.ano_lancamento,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'marca,modelo' }
      );
  } catch {
    // silently ignore — cache is best-effort
  }
}

/**
 * Busca informações de um aparelho via OpenAI (com web search quando disponível).
 * Primeiro verifica cache no banco, depois em memória, só então chama a API.
 */
export async function buscarInfoAparelho(
  marca: string,
  modelo: string,
  tipo?: string
): Promise<AparelhoInfoIA | null> {
  const cacheKey = `${marca}|${modelo}|${tipo || ''}`.toLowerCase();

  // 1) Cache em memória
  const memCached = infoCache.get(cacheKey);
  if (memCached && Date.now() - memCached.ts < INFO_CACHE_TTL) {
    return memCached.data;
  }

  // 2) Cache no banco (Supabase)
  const dbCached = await buscarCacheDB(marca, modelo);
  if (dbCached) {
    infoCache.set(cacheKey, { data: dbCached, ts: Date.now() });
    console.log('✅ Info do aparelho obtida do cache (banco):', { marca, modelo });
    return dbCached;
  }

  // 3) Buscar via OpenAI
  const client = getOpenAIClient();
  if (!client) return null;

  const userPrompt = `Busque informações completas sobre: ${marca} ${modelo}${tipo ? ` (tipo: ${tipo})` : ''}. Inclua uma URL de imagem real do produto, preço de usado/seminovo no Brasil, especificações técnicas e ano de lançamento.`;

  console.log('🔍 Buscando info do aparelho via IA:', { marca, modelo, tipo });

  let info: AparelhoInfoIA | null = null;

  try {
    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      instructions: INFO_SYSTEM_PROMPT,
      input: userPrompt,
      tools: [{ type: 'web_search' as const }],
    });

    const text = response.output_text;
    if (text) {
      info = parseInfoJson(text);
      if (info) {
        console.log('✅ Info do aparelho obtida via Responses API:', {
          marca, modelo,
          temImagem: !!info.imagem_url,
          temPreco: !!info.preco_medio,
          specs: Object.keys(info.especificacoes).length,
        });
      } else {
        console.warn('⚠️ Não foi possível parsear resposta da IA:', text.substring(0, 200));
      }
    }
  } catch (responsesErr: any) {
    if (responsesErr?.status === 429 || responsesErr?.code === 'insufficient_quota') {
      console.error('❌ OpenAI quota excedida — verifique os créditos da conta');
      return null;
    }

    console.warn('⚠️ Responses API falhou, tentando Chat Completions:', responsesErr.message);

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: INFO_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0]?.message?.content;
      if (text) info = parseInfoJson(text);
      if (info) {
        console.log('✅ Info do aparelho obtida via Chat Completions (fallback):', { marca, modelo });
      }
    } catch (chatErr: any) {
      console.error('❌ Erro ao buscar info do aparelho:', chatErr.message);
      return null;
    }
  }

  if (info) {
    infoCache.set(cacheKey, { data: info, ts: Date.now() });
    salvarCacheDB(marca, modelo, tipo, info);
  }

  return info;
}

export type LaudoChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type LaudoChatReply = {
  message: string;
  laudo: string | null;
};

const LAUDO_ASSISTENTE_SYSTEM = `Você é um assistente especializado em laudos técnicos para assistência técnica de equipamentos eletrônicos no Brasil.

O técnico está redigindo o laudo de uma ordem de serviço e conversa com você para:
- Corrigir ortografia, gramática e clareza
- Melhorar a redação técnica profissional
- Sugerir como descrever defeitos, testes e conclusões
- Transformar ditado ou rascunho em texto adequado para laudo

REGRAS:
- Responda sempre em português brasileiro
- Mantenha termos técnicos e informações factuais do técnico
- NÃO invente defeitos, peças ou testes que o técnico não mencionou
- Quando corrigir ou reescrever texto para o laudo, apresente o texto pronto para uso em parágrafos claros
- Seja conversacional e objetivo; pode fazer perguntas curtas se faltar contexto
- Não use markdown pesado; prefira texto corrido com parágrafos separados por linha em branco
- Mensagens do usuário podem ser ditado bruto (transcrição de áudio): interprete o pedido e responda de forma conversacional
- O técnico pode enviar FOTOS de placas, aparelhos, componentes ou defeitos visíveis. Analise apenas o que é visível na imagem; não invente danos que não aparecem na foto
- Com FOTOS: leia com atenção TODOS os textos visíveis (etiquetas, silk screen, números de peça, MAC, FCC, WLAN, modelos como DW1707, conectores U.FL, etc.)
- Identifique o componente com base no que está escrito e visível (ex.: placa WLAN M.2, fonte, placa-mãe, bateria, display)
- NUNCA diga que "não consegue identificar" sem antes listar o que conseguiu ler na imagem e dar uma hipótese técnica fundamentada no que é visível

FORMATO DE RESPOSTA (OBRIGATÓRIO):
Retorne APENAS um JSON válido com esta estrutura exata:
{
  "message": "texto conversacional curto (explicação, confirmação ou pergunta)",
  "laudo": "texto técnico do laudo pronto para o documento, ou null"
}

REGRAS DO JSON:
- "message": SOMENTE a parte conversacional. NUNCA inclua o texto do laudo aqui. Sem "---", sem blocos de laudo.
- "laudo": SOMENTE o texto técnico do laudo (parágrafos claros). Sem "Claro!", sem "aqui está", sem despedidas. Use null quando não houver texto de laudo nesta resposta (ex.: só uma pergunta).`;

function toLaudoApiMessage(
  m: LaudoChatMessage,
  imageDetail: 'low' | 'high' = 'low'
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (m.role === 'assistant') {
    return { role: 'assistant', content: m.content.trim() };
  }

  const images = (m.images || []).filter((b) => typeof b === 'string' && b.length > 0).slice(0, 2);
  if (images.length === 0) {
    return { role: 'user', content: m.content.trim() };
  }

  const userQuestion = m.content.trim();
  const text = userQuestion
    ? `${userQuestion}\n\n(Leia etiquetas e códigos visíveis na foto; identifique a peça/componente com base no que aparece na imagem.)`
    : 'Analise esta imagem no contexto de assistência técnica. Leia todas as etiquetas e textos visíveis, identifique a peça/componente e descreva o que observar para o laudo.';

  return {
    role: 'user',
    content: [
      { type: 'text', text },
      ...images.map((base64) => ({
        type: 'image_url' as const,
        image_url: {
          url: `data:image/jpeg;base64,${base64}`,
          detail: imageDetail,
        },
      })),
    ],
  };
}

/**
 * Conversa com o técnico sobre o laudo (estilo ChatGPT).
 */
export async function chatLaudoTecnico(
  messages: LaudoChatMessage[],
  context?: { laudoAtual?: string; numeroOS?: string }
): Promise<LaudoChatReply | null> {
  try {
    const client = getOpenAIClient();
    if (!client) return null;

    const valid = messages.filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        (m.content.trim().length > 0 || (m.images?.length ?? 0) > 0)
    );
    if (valid.length === 0) return null;

    let systemContent = LAUDO_ASSISTENTE_SYSTEM;
    if (context?.numeroOS) {
      systemContent += `\n\nContexto: ordem de serviço #${context.numeroOS}.`;
    }
    if (context?.laudoAtual) {
      const laudoLimpo = context.laudoAtual
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (laudoLimpo.length > 0) {
        systemContent += `\n\nLaudo atual do técnico (referência):\n${laudoLimpo.slice(0, 4000)}`;
      }
    }

    const recent = valid.slice(-16);
    const lastUserImageIdx = recent.reduce(
      (found, m, i) => (m.role === 'user' && (m.images?.length ?? 0) > 0 ? i : found),
      -1
    );
    const hasVision = lastUserImageIdx >= 0;

    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...recent.map((m, i) =>
        toLaudoApiMessage(m, i === lastUserImageIdx ? 'high' : 'low')
      ),
    ];

    const completion = await client.chat.completions.create({
      model: hasVision ? 'gpt-4o' : 'gpt-4o-mini',
      messages: apiMessages,
      max_tokens: 2000,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as { message?: string; laudo?: string | null };
      const message = typeof parsed.message === 'string' ? parsed.message.trim() : '';
      const laudo =
        typeof parsed.laudo === 'string' && parsed.laudo.trim() ? parsed.laudo.trim() : null;
      if (!message && !laudo) return null;
      return { message, laudo };
    } catch {
      return { message: raw, laudo: null };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro no chat de laudo:', msg);
    return null;
  }
}

/**
 * Transcreve áudio (ditado) com Whisper e opcionalmente melhora para laudo técnico.
 */
export async function transcreverAudioLaudo(
  audioBuffer: Buffer,
  mimeType: string,
  melhorarParaLaudo = true
): Promise<string | null> {
  try {
    const client = getOpenAIClient();
    if (!client) return null;

    const ext =
      mimeType.includes('webm') ? 'webm' :
      mimeType.includes('wav') ? 'wav' :
      mimeType.includes('mp3') || mimeType.includes('mpeg') ? 'mp3' :
      mimeType.includes('mp4') ? 'mp4' :
      'm4a';

    const file = await toFile(audioBuffer, `audio.${ext}`, {
      type: mimeType || 'audio/m4a',
    });

    const transcription = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'pt',
    });

    const textoBruto = transcription.text?.trim();
    if (!textoBruto) return null;

    if (!melhorarParaLaudo) return textoBruto;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você recebe a transcrição de um técnico de assistência descrevendo um laudo.
Corrija erros de transcrição, pontuação e gramática.
Mantenha todas as informações técnicas mencionadas.
Retorne APENAS o texto corrigido, em português brasileiro, pronto para o técnico revisar.`,
        },
        { role: 'user', content: textoBruto },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content?.trim() || textoBruto;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro ao transcrever áudio do laudo:', msg);
    return null;
  }
}


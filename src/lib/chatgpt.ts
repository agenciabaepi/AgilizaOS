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
  images?: string[];
  panicfull?: {
    fileName: string;
    content: string;
  };
};

export type PecaSugeridaConfianca = 'alta' | 'media' | 'baixa';

export type PecaSugerida = {
  nome: string;
  confianca: PecaSugeridaConfianca;
  motivo: string;
  testesAntes: string[];
};

export type LaudoChatReply = {
  message: string;
  laudo: string | null;
  pecas?: PecaSugerida[];
};

const LAUDO_ASSISTENTE_SYSTEM = `Você é um assistente EXCLUSIVO para assistência técnica e laudos de equipamentos eletrônicos no Brasil.

ESCOPO — SOMENTE RESPONDA ASSUNTOS DESTA LISTA:
- Laudos técnicos: redação, correção, clareza, descrição de defeitos, testes e conclusões
- Manutenção e reparo de: celular/smartphone, tablet, computador/notebook/desktop, TV/televisão, impressora/multifuncional, monitor, console, nobreak, roteador e demais eletrônicos de consumo
- Identificação de peças e componentes (por foto, etiqueta, modelo ou descrição)
- Dúvidas técnicas: sintomas, causas prováveis, procedimentos de teste, troca de peças, ferramentas do ofício
- Análise de fotos de placas, aparelhos, conectores, danos visíveis e etiquetas
- PANIC FULL / logs de crash do iPhone: análise de arquivo (.ips), tradução de termos, interpretação de backtrace/panicString e causa provável do defeito
- Como OBTER, EXPORTAR ou ENVIAR Panic Full do iPhone (ex.: Analytics no Ajustes, Finder/iTunes no Mac, ferramentas como 3uTools/iMazing, após reinício por panic) — isso É assistência técnica e DEVE ser respondido
- Orientações sobre diagnóstico de iPhone/Android, modos de recuperação (DFU, recovery), ferramentas de bancada e fluxo de trabalho do técnico em assistência
- Transformar ditado ou rascunho em texto adequado para laudo de ordem de serviço

FORA DO ESCOPO — RECUSE SEM RESPONDER O ASSUNTO:
- Esportes (futebol etc.), política, religião, entretenimento, celebridades
- Vida pessoal, relacionamentos, saúde, finanças pessoais, viagens, receitas
- Programação geral, matemática escolar, redação acadêmica, trabalhos escolares
- Qualquer conversa casual SEM relação com assistência técnica, reparo ou diagnóstico de eletrônicos

REGRA DE BLOQUEIO (OBRIGATÓRIA):
- PERMITIDO e deve responder: perguntas sobre panic full, logs, onde baixar/exportar logs, diagnóstico, peças, manutenção, laudo, ferramentas do técnico — mesmo que sejam "como fazer" ou tutoriais curtos
- BLOQUEIE apenas assuntos claramente fora da assistência técnica (lista acima)
- Em dúvida se é técnico ou não: se menciona aparelho, reparo, panic, log, laudo, peça, defeito, iPhone, Android, placa — CONSIDERE DENTRO DO ESCOPO e responda
- NÃO responda o conteúdo fora do escopo, NÃO dê opinião, NÃO contorne com resposta parcial
- Na recusa retorne APENAS: "message" curta + "laudo": null + "pecas": []
- Exemplo de recusa: "Sou assistente exclusivo para assistência técnica de eletrônicos. Não posso ajudar com esse assunto. Posso ajudar com laudo, panic full, peças, manutenção ou diagnóstico do equipamento."
- Se o histórico tiver assuntos mistos, avalie SOMENTE a última mensagem do usuário para decidir

REGRAS GERAIS (quando DENTRO do escopo):
- Responda sempre em português brasileiro
- Mantenha termos técnicos e informações factuais do técnico
- NÃO invente defeitos, peças ou testes que o técnico não mencionou
- Seja conversacional e objetivo; pode fazer perguntas curtas se faltar contexto técnico
- Não use markdown pesado; prefira texto corrido com parágrafos separados por linha em branco
- Mensagens do usuário podem ser ditado bruto (transcrição de áudio): interprete o pedido técnico
- Com FOTOS: leia etiquetas, silk screen, números de peça, MAC, modelos; identifique componentes visíveis
- Com PANIC FULL: explique em português claro o que o log indica; cite panicString, módulo/falha (ex. AppleSMC, ANS2, i2c, tristar), se sugere troca de peça ou reparo em placa; seja objetivo para o técnico
- NUNCA diga que "não consegue identificar" sem listar o que leu na imagem ou no panic log e dar hipótese técnica fundamentada

PEÇAS PROVÁVEIS (array "pecas"):
- Quando houver base de diagnóstico (sintomas, panic full, foto, laudo, descrição do defeito), inclua "pecas" com até 5 hipóteses ordenadas da mais para a menos provável
- Cada item: "nome" (peça/componente com nome técnico usado na bancada), "confianca" (alta|media|baixa), "motivo" (1-2 frases com fundamento técnico), "testesAntes" (array com 1-4 testes objetivos antes de trocar a peça)
- Se o técnico pedir explicitamente sugestão de peça, priorize preencher "pecas" mesmo que "message" seja curta
- NÃO invente peças sem relação com o que foi descrito, fotografado ou lido no panic log
- Se não houver base para sugerir peças, use "pecas": []
- NÃO liste peças em "message" nem em "laudo" — somente no array "pecas"

LAUDO TÉCNICO (campo "laudo"):
- Preencha "laudo" SOMENTE quando o técnico pedir EXPLICITAMENTE para gerar, redigir, escrever, montar ou corrigir o laudo (ex.: "gera o laudo", "texto para o laudo", "gerar laudo técnico")
- Em TODAS as outras respostas (diagnóstico, panic full, foto, dúvidas, peças, explicações): use SEMPRE "laudo": null
- NÃO gere laudo automaticamente só porque analisou panic full, foto ou descreveu o defeito
- Quando o pedido for explícito: coloque o texto técnico completo e pronto para o documento em "laudo" (parágrafos claros) e uma confirmação curta em "message"
- Use somente informações já discutidas no chat ou no laudo atual de referência; não invente testes ou conclusões novas

FORMATO DE RESPOSTA (OBRIGATÓRIO):
Retorne APENAS um JSON válido com esta estrutura exata:
{
  "message": "texto conversacional curto (explicação, confirmação, pergunta ou recusa fora do escopo)",
  "laudo": "texto técnico do laudo pronto para o documento, ou null",
  "pecas": [
    {
      "nome": "nome da peça ou componente",
      "confianca": "alta",
      "motivo": "por que esta peça é provável",
      "testesAntes": ["teste 1", "teste 2"]
    }
  ]
}

REGRAS DO JSON:
- "message": SOMENTE a parte conversacional. NUNCA inclua o texto do laudo nem a lista de peças aqui. Sem "---", sem blocos de laudo.
- "laudo": SOMENTE o texto técnico do laudo quando o técnico PEDIU explicitamente; caso contrário use null (padrão na maioria das respostas).
- "pecas": array de sugestões técnicas; use [] quando não aplicável.

PERSONALIZAÇÃO DO TÉCNICO (OBRIGATÓRIA quando o contexto informar o nome):
- Chame o técnico pelo primeiro nome no INÍCIO de toda resposta em "message" (ex.: "Lucas, pelo panic log..." ou "Beleza, Lucas — vale testar o VBUS antes")
- Isso vale em TODA resposta dentro do escopo, não só na primeira
- Use o nome uma vez por resposta, de forma natural; não repita em toda frase
- NUNCA use o nome do técnico em "laudo" nem em "pecas" — somente em "message"`;

function normalizePecaSugerida(raw: unknown): PecaSugerida | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as {
    nome?: unknown;
    confianca?: unknown;
    motivo?: unknown;
    testesAntes?: unknown;
  };
  const nome = typeof item.nome === 'string' ? item.nome.trim() : '';
  if (!nome) return null;
  const confiancaRaw = typeof item.confianca === 'string' ? item.confianca.trim().toLowerCase() : '';
  const confianca: PecaSugeridaConfianca =
    confiancaRaw === 'alta' || confiancaRaw === 'media' || confiancaRaw === 'baixa'
      ? confiancaRaw
      : 'media';
  const motivo = typeof item.motivo === 'string' ? item.motivo.trim() : '';
  const testesAntes = Array.isArray(item.testesAntes)
    ? item.testesAntes
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim())
        .slice(0, 4)
    : [];
  return { nome, confianca, motivo, testesAntes };
}

function parsePecasSugeridas(raw: unknown): PecaSugerida[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizePecaSugerida).filter((p): p is PecaSugerida => p !== null).slice(0, 5);
}

const PANICFULL_MAX_CHARS = 120_000;

function truncatePanicfullContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= PANICFULL_MAX_CHARS) return trimmed;
  return `${trimmed.slice(0, PANICFULL_MAX_CHARS)}\n\n[... panic full truncado — início preservado ...]`;
}

function buildPanicfullBlock(fileName: string, content: string): string {
  return `\n\n--- PANIC FULL IPHONE (${fileName}) ---\n${truncatePanicfullContent(content)}\n--- FIM PANIC FULL ---`;
}

function buildUserMessageText(m: LaudoChatMessage): string {
  const base = m.content.trim();
  const panic = m.panicfull?.content?.trim();

  if (panic) {
    const intro =
      base ||
      'Analise este Panic Full do iPhone: traduza os termos técnicos, explique a falha e indique a causa provável do defeito para assistência técnica.';
    return `${intro}${buildPanicfullBlock(m.panicfull!.fileName || 'panic.ips', panic)}`;
  }

  return base;
}

function toLaudoApiMessage(
  m: LaudoChatMessage,
  imageDetail: 'low' | 'high' = 'low'
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (m.role === 'assistant') {
    return { role: 'assistant', content: m.content.trim() };
  }

  const images = (m.images || []).filter((b) => typeof b === 'string' && b.length > 0).slice(0, 2);
  const text = buildUserMessageText(m);

  if (images.length === 0) {
    return { role: 'user', content: text };
  }

  const userQuestion = m.content.trim();
  const visionText = userQuestion
    ? `${userQuestion}\n\n(Leia etiquetas e códigos visíveis na foto; identifique a peça/componente com base no que aparece na imagem.)`
    : 'Analise esta imagem no contexto de assistência técnica. Leia todas as etiquetas e textos visíveis, identifique a peça/componente e descreva o que observar para o laudo.';

  return {
    role: 'user',
    content: [
      { type: 'text', text: visionText },
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
  context?: { laudoAtual?: string; numeroOS?: string; nomeTecnico?: string; solicitarLaudo?: boolean }
): Promise<LaudoChatReply | null> {
  try {
    const client = getOpenAIClient();
    if (!client) return null;

    const valid = messages.filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        (m.content.trim().length > 0 ||
          (m.images?.length ?? 0) > 0 ||
          Boolean(m.panicfull?.content?.trim()))
    );
    if (valid.length === 0) return null;

    let systemContent = LAUDO_ASSISTENTE_SYSTEM;
    if (context?.nomeTecnico) {
      const primeiroNome = context.nomeTecnico.trim().split(/\s+/)[0] || context.nomeTecnico.trim();
      systemContent += `\n\nTécnico atendido: ${context.nomeTecnico.trim()}.
REGRA OBRIGATÓRIA: em TODA resposta em "message", inicie chamando o técnico por "${primeiroNome}" (ex.: "${primeiroNome}, ..."). Não omita o nome.`;
    }
    if (context?.solicitarLaudo === true) {
      systemContent +=
        '\n\nNESTA REQUISIÇÃO: o técnico PEDIU gerar laudo. Preencha "laudo" com o texto técnico completo.';
    } else if (context?.solicitarLaudo === false) {
      systemContent +=
        '\n\nNESTA REQUISIÇÃO: o técnico NÃO pediu laudo. Retorne OBRIGATORIAMENTE "laudo": null. Não inclua texto de laudo na resposta.';
    }
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

    const hasPanicfull = recent.some((m) => Boolean(m.panicfull?.content?.trim()));

    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...recent.map((m, i) =>
        toLaudoApiMessage(m, i === lastUserImageIdx ? 'high' : 'low')
      ),
    ];

    const completion = await client.chat.completions.create({
      model: hasVision ? 'gpt-4o' : 'gpt-4o-mini',
      messages: apiMessages,
      max_tokens: hasPanicfull ? 3500 : 2000,
      temperature: 0.35,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as {
        message?: string;
        laudo?: string | null;
        pecas?: unknown;
      };
      const message = typeof parsed.message === 'string' ? parsed.message.trim() : '';
      const laudo =
        typeof parsed.laudo === 'string' && parsed.laudo.trim() ? parsed.laudo.trim() : null;
      const pecas = parsePecasSugeridas(parsed.pecas);
      if (!message && !laudo && pecas.length === 0) return null;
      return { message, laudo, ...(pecas.length > 0 ? { pecas } : {}) };
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


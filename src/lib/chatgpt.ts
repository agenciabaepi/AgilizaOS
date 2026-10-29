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

const LAUDO_ASSISTENTE_SYSTEM = `Você é um assistente de assistência técnica e laudos de equipamentos eletrônicos no Brasil.

ESCOPO — RESPONDA estes assuntos (lista NÃO exaustiva):
- Laudos técnicos: redação, correção, clareza, descrição de defeitos, testes e conclusões
- Manutenção e reparo de celular, tablet, computador/notebook, TV, impressora, monitor, console, nobreak, roteador e eletrônicos de consumo
- Peças, componentes, compatibilidade, códigos e procedimentos de teste/troca
- Sintomas, causas prováveis, fluxos de diagnóstico e ferramentas de bancada
- Fotos de placas/aparelhos/etiquetas e Panic Full / logs de crash (.ips)
- Como obter/exportar Panic Full, DFU, recovery e fluxos do técnico
- Atualizações de sistema (iOS, iPadOS, macOS, Android, Windows, firmware) e bugs recentes
- Problemas conhecidos de modelos, boletins, recalls e relatos de campo
- Conectividade e recursos do aparelho: Wi‑Fi, 5G, eSIM, satélite, Starlink (antena Wi‑Fi vs Direct to Cell), Emergency SOS, operadoras, disponibilidade no Brasil
- “Funciona X no iPhone/Android?”, compatibilidade, o que já existe vs o que ainda não chegou ao Brasil
- Transformar ditado/rascunho em texto de laudo

FORA DO ESCOPO — recuse só o que for claramente alheio à assistência técnica:
- Esportes, política, religião, celebridades, entretenimento casual
- Vida pessoal, relacionamentos, saúde humana, finanças pessoais, viagens, receitas
- Programação geral, matemática escolar, redação acadêmica
- Conversa casual SEM aparelho, rede, satélite, reparo, diagnóstico, peça, log ou manutenção

REGRA DE BLOQUEIO:
- Em dúvida: se menciona aparelho, iPhone, Android, Starlink, satélite, rede, update, bug, panic, laudo, peça — está DENTRO do escopo; responda
- Na recusa: "message" curta + "laudo": null + "pecas": []
- Avalie a ÚLTIMA mensagem do usuário

FERRAMENTAS (use quando ajudar):
- pesquisar_internet: OBRIGATÓRIA para fatos que mudam com o tempo — updates, “funciona X?”, disponibilidade no Brasil, Starlink/satélite/eSIM/5G, boletins, peças/compatibilidade quando houver dúvida
- Prefira fabricante, Apple/Google/SpaceX/Starlink, operadoras e fontes recentes. Inclua o ano atual na consulta
- dados_os / casos_similares: dados internos da empresa
- NUNCA invente disponibilidade, versão ou “não existe” sem base na pesquisa desta conversa
- Se pesquisou: responda como um técnico bem informado — separe só o essencial (ex.: antena Wi‑Fi vs Direct to Cell), diga o status no Brasil, e no máximo 1–2 links. Não invente links

REGRAS GERAIS (dentro do escopo):
- Português brasileiro; RESPOSTA CURTA no celular: ideal 4–8 linhas, no máximo ~900 caracteres em "message"
- Vá direto ao ponto; 3–5 bullets com • se precisar; SEM markdown (** ## etc.)
- Não faça texto de marketing nem lista longa de planos/preços — só o que o técnico precisa saber
- NÃO invente fatos que a pesquisa/banco não suportem
- No máximo UMA pergunta curta no final, se faltar contexto
- Com FOTOS / PANIC FULL: hipóteses fundamentadas no que leu
- NUNCA diga que “não consegue identificar” sem listar o que leu e dar hipótese

PEÇAS PROVÁVEIS (array "pecas"):
- Com base de diagnóstico (sintomas, panic, foto, laudo, pesquisa), até 5 hipóteses ordenadas
- Campos: nome, confianca (alta|media|baixa), motivo, testesAntes (1–4)
- Sem base: "pecas": []. Não liste peças em "message"/"laudo"

LAUDO TÉCNICO (campo "laudo"):
- Preencha "laudo" SÓ se o técnico pedir explicitamente gerar/redigir/corrigir o laudo
- Caso contrário: "laudo": null
- Não invente testes/conclusões novas além do discutido/pesquisado

FORMATO DE RESPOSTA FINAL (OBRIGATÓRIO — só na resposta ao usuário, não em tool calls):
Retorne APENAS JSON válido:
{
  "message": "texto conversacional",
  "laudo": null,
  "pecas": []
}

PERSONALIZAÇÃO:
- Se o contexto informar o nome do técnico, inicie "message" pelo primeiro nome
- Nunca use o nome em "laudo" nem em "pecas"`;

const LAUDO_CHAT_MAX_TOOL_ROUNDS = 4;
const LAUDO_CHAT_MAX_SEARCHES = 2;

const LAUDO_CHAT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'pesquisar_internet',
      description:
        'Pesquisa na internet informação técnica atual: bugs de atualização iOS/Android, defeitos comuns, causas de sintomas, procedimentos, peças/compatibilidade, boletins do fabricante e relatos em fóruns técnicos.',
      parameters: {
        type: 'object',
        properties: {
          consulta: {
            type: 'string',
            description:
              'Consulta com marca, modelo e sintoma. Ex.: "iPhone 15 iOS 18.1 reiniciando sozinho problemas conhecidos"',
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
      name: 'dados_os',
      description:
        'Busca no banco da empresa os dados de uma ordem de serviço (cliente, aparelho, status, relato, observação, laudo).',
      parameters: {
        type: 'object',
        properties: {
          numero_os: { type: 'string', description: 'Número da O.S., ex.: 890' },
        },
        required: ['numero_os'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'casos_similares',
      description:
        'Busca O.S. recentes da empresa com marca/modelo parecidos e laudo preenchido, para reutilizar diagnósticos internos.',
      parameters: {
        type: 'object',
        properties: {
          marca: { type: 'string' },
          modelo: { type: 'string' },
          sintoma: {
            type: 'string',
            description: 'Palavras-chave do defeito (opcional), ex.: "não carrega", "sem imagem"',
          },
        },
        required: ['marca'],
        additionalProperties: false,
      },
    },
  },
];

function limparUrlFonte(url: string): string {
  try {
    const u = new URL(url);
    [...u.searchParams.keys()]
      .filter((k) => k.startsWith('utm_'))
      .forEach((k) => u.searchParams.delete(k));
    return u.toString().replace(/\?$/, '');
  } catch {
    return url;
  }
}

function precisaPesquisaAtual(texto: string): boolean {
  const t = texto.toLowerCase();
  // Acks curtos / só laudo: não força busca
  if (/^(ok|blz|beleza|valeu|obrigado|obrigada|sim|n[aã]o|ss|kkk+)\.?$/i.test(t.trim())) {
    return false;
  }
  if (/\b(gerar|gera|gere|redigir|escrever)\b.*\blaudo\b|\blaudo\b.*\b(gerar|gera|gere)\b/.test(t)) {
    return false;
  }

  return (
    /atualiza|update|vers[aã]o|ios\s*\d|ipados|android\s*\d|watchos|firmware|patch|release|changelog/.test(
      t
    ) ||
    /bug conhecido|problema conhecido|est[aá] dando|reinici|superaquec|boot\s*loop|depois (da|do) update/.test(
      t
    ) ||
    /202[4-9]|hoje|recente|nova atualiza|mais recente|dispon[ií]vel|j[aá] (tem|existe|lan[cç]ou)/.test(
      t
    ) ||
    // Compatibilidade / recursos / “funciona X?”
    /funciona|compat[ií]vel|suporta|consegue|d[aá] pra|da pra|sem antena|direto (no|no celular|no iphone)/.test(
      t
    ) ||
    /starlink|sat[eé]lite|direct\s*to\s*cell|emergency\s*sos|esim|5g|wi-?fi\s*7|carrier\s*lock|operadora/.test(
      t
    ) ||
    /iphone|android|apple|samsung|xiaomi|motorola/.test(t)
  );
}

function extrairTextoUltimaMsgUsuario(messages: LaudoChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'user' && typeof m.content === 'string' && m.content.trim()) {
      return m.content
        .replace(/\[NÃO gere laudo[\s\S]*$/i, '')
        .replace(/\[O técnico pediu laudo[\s\S]*$/i, '')
        .replace(/\[Chame o técnico[\s\S]*$/i, '')
        .trim();
    }
  }
  return '';
}

async function pesquisarInternetLaudo(client: OpenAI, consulta: string): Promise<string> {
  const ano = new Date().getFullYear();
  const hoje = new Date().toISOString().slice(0, 10);
  const resposta = await client.responses.create({
    model: process.env.OPENAI_PESQUISA_MODEL?.trim() || 'gpt-4o-mini',
    tools: [{ type: 'web_search' as const }],
    instructions: `Hoje é ${hoje} (ano ${ano}). Pesquisa para técnico de eletrônicos no Brasil.

Regras:
- Use informação ATUAL da web (${ano}/${ano - 1}). Não invente.
- Se a pergunta tiver variantes (ex.: Starlink Wi‑Fi via antena Mini vs Starlink Direct to Cell no celular sem antena), SEPARE os casos com clareza.
- Digite o que já existe no Brasil vs o que ainda depende de operadora/lançamento.
- Inclua limitações práticas só se forem decisivas (ex.: SMS vs internet plena; depende de operadora).
- Prefira fabricante (Apple, Google, SpaceX/Starlink), operadoras e sites confiáveis.
- Resumo em português, bem objetivo, no máximo ~12 linhas (o chat final ainda será enxugado).
- Inclua até 3 links no final.
- Se não achar dado atual, diga explicitamente.`,
    input: `${consulta}\n\nContexto: técnico no Brasil em ${ano}. Priorize fontes de ${ano}/${ano - 1}. Seja factual e curto.`,
    max_output_tokens: 1200,
  });

  const fontes = new Set<string>();
  for (const item of resposta.output ?? []) {
    if (item.type !== 'message') continue;
    for (const parte of item.content ?? []) {
      if (parte.type !== 'output_text') continue;
      for (const a of parte.annotations ?? []) {
        if (a.type === 'url_citation' && 'url' in a && typeof a.url === 'string') {
          fontes.add(limparUrlFonte(a.url));
        }
      }
    }
  }

  const texto = resposta.output_text?.replace(/\s*\(\[[^\]]+\]\([^)]+\)\)/g, '').trim();
  if (!texto) return 'A pesquisa não trouxe resultado útil.';
  const links = [...fontes].slice(0, 5);
  return `${texto}${links.length ? `\n\nFontes:\n${links.join('\n')}` : ''}`;
}

async function buscarDadosOsEmpresa(empresaId: string, numeroOs: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const numero = numeroOs.replace(/\D/g, '');
  if (!numero) return 'Número da O.S. inválido.';

  const { data, error } = await admin
    .from('ordens_servico')
    .select(
      `
      numero_os, status, status_tecnico, categoria, marca, modelo, cor,
      problema_relatado, observacao, laudo, servico, created_at,
      cliente:cliente_id ( nome, telefone )
    `
    )
    .eq('empresa_id', empresaId)
    .eq('numero_os', numero)
    .maybeSingle();

  if (error) {
    console.error('[laudo-chat] dados_os:', error.message);
    return 'Não foi possível consultar a O.S. no banco.';
  }
  if (!data) return `OS #${numero} não encontrada nesta empresa.`;

  const cliente = data.cliente as { nome?: string; telefone?: string } | { nome?: string; telefone?: string }[] | null;
  const nomeCliente = Array.isArray(cliente) ? cliente[0]?.nome : cliente?.nome;
  const tel = Array.isArray(cliente) ? cliente[0]?.telefone : cliente?.telefone;
  const aparelho = [data.marca, data.modelo || data.categoria, data.cor].filter(Boolean).join(' ');
  const laudoTexto =
    typeof data.laudo === 'string'
      ? data.laudo.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200)
      : '';

  return [
    `OS #${data.numero_os}`,
    `Cliente: ${nomeCliente || '—'} ${tel ? `(${tel})` : ''}`.trim(),
    `Aparelho: ${aparelho || '—'}`,
    `Status OS: ${data.status || '—'} | Status técnico: ${data.status_tecnico || '—'}`,
    `Serviço: ${data.servico || '—'}`,
    `Relato: ${data.problema_relatado || '—'}`,
    `Observação: ${data.observacao || '—'}`,
    `Laudo: ${laudoTexto || '—'}`,
    `Entrada: ${data.created_at || '—'}`,
  ].join('\n');
}

async function buscarCasosSimilaresEmpresa(
  empresaId: string,
  marca: string,
  modelo?: string,
  sintoma?: string
): Promise<string> {
  const admin = getSupabaseAdmin();
  const marcaQ = marca.trim();
  if (!marcaQ) return 'Informe a marca.';

  let query = admin
    .from('ordens_servico')
    .select('numero_os, marca, modelo, status_tecnico, problema_relatado, laudo, created_at')
    .eq('empresa_id', empresaId)
    .ilike('marca', `%${marcaQ}%`)
    .not('laudo', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (modelo?.trim()) {
    query = query.ilike('modelo', `%${modelo.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[laudo-chat] casos_similares:', error.message);
    return 'Não foi possível buscar casos similares.';
  }
  if (!data?.length) return 'Nenhum caso similar com laudo encontrado na empresa.';

  const sintomaQ = sintoma?.trim().toLowerCase();
  const filtrados = sintomaQ
    ? data.filter((os) => {
        const blob = `${os.problema_relatado || ''} ${os.laudo || ''}`.toLowerCase();
        return blob.includes(sintomaQ) || sintomaQ.split(/\s+/).some((t) => t.length > 3 && blob.includes(t));
      })
    : data;

  const lista = (filtrados.length ? filtrados : data).slice(0, 6);
  return lista
    .map((os, i) => {
      const laudo = String(os.laudo || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 280);
      return `${i + 1}. OS #${os.numero_os} | ${[os.marca, os.modelo].filter(Boolean).join(' ')} | técnico: ${os.status_tecnico || '-'}\nRelato: ${os.problema_relatado || '—'}\nLaudo: ${laudo || '—'}`;
    })
    .join('\n\n');
}

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

function unwrapLaudoJsonPayload(raw: string): {
  message?: string;
  laudo?: string | null;
  pecas?: unknown;
} | null {
  let text = raw.trim();
  if (!text) return null;

  // Remove cercas markdown ```json ... ```
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence?.[1]) text = fence[1].trim();

  const tryParse = (s: string) => {
    try {
      const parsed = JSON.parse(s) as {
        message?: unknown;
        laudo?: unknown;
        pecas?: unknown;
      };
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  };

  let parsed = tryParse(text);
  if (!parsed) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      parsed = tryParse(text.slice(start, end + 1));
    }
  }
  if (!parsed) return null;

  // Se "message" veio como JSON stringificado de novo, desembrulha
  let message = typeof parsed.message === 'string' ? parsed.message.trim() : '';
  if (message.startsWith('{') && /"message"\s*:/.test(message)) {
    const nested = tryParse(message);
    if (nested && typeof nested.message === 'string') {
      message = nested.message.trim();
      if (parsed.laudo == null && nested.laudo != null) parsed.laudo = nested.laudo;
      if (parsed.pecas == null && nested.pecas != null) parsed.pecas = nested.pecas;
    }
  }

  return {
    message,
    laudo: typeof parsed.laudo === 'string' ? parsed.laudo : parsed.laudo === null ? null : undefined,
    pecas: parsed.pecas,
  };
}

function parseLaudoChatReply(raw: string): LaudoChatReply | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const unwrapped = unwrapLaudoJsonPayload(trimmed);
  if (unwrapped) {
    const message = (unwrapped.message || '').trim();
    const laudo =
      typeof unwrapped.laudo === 'string' && unwrapped.laudo.trim()
        ? unwrapped.laudo.trim()
        : null;
    const pecas = parsePecasSugeridas(unwrapped.pecas);
    if (!message && !laudo && pecas.length === 0) return null;
    return { message, laudo, ...(pecas.length > 0 ? { pecas } : {}) };
  }

  // Texto puro (sem JSON): usa como message
  if (!trimmed.startsWith('{')) {
    return { message: trimmed, laudo: null };
  }

  // JSON quebrado: tenta extrair "message":"..." com regex
  const msgMatch = trimmed.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (msgMatch?.[1]) {
    try {
      const message = JSON.parse(`"${msgMatch[1]}"`) as string;
      if (message.trim()) return { message: message.trim(), laudo: null };
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Conversa com o técnico sobre o laudo (estilo ChatGPT), com busca web e consulta ao banco.
 */
export async function chatLaudoTecnico(
  messages: LaudoChatMessage[],
  context?: {
    laudoAtual?: string;
    numeroOS?: string;
    nomeTecnico?: string;
    solicitarLaudo?: boolean;
    empresaId?: string;
  }
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
      systemContent += `\n\nContexto: ordem de serviço #${context.numeroOS}. Se precisar de detalhes, use a ferramenta dados_os.`;
    }
    if (context?.empresaId) {
      systemContent +=
        '\n\nFerramentas de banco disponíveis para esta empresa: dados_os e casos_similares.';
    } else {
      systemContent +=
        '\n\nFerramenta de banco indisponível nesta sessão; use pesquisar_internet quando precisar de informação externa.';
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
    const model = hasVision ? 'gpt-4o' : 'gpt-4o-mini';

    const tools = context?.empresaId
      ? LAUDO_CHAT_TOOLS
      : LAUDO_CHAT_TOOLS.filter((t) => t.type === 'function' && t.function.name === 'pesquisar_internet');

    const ultimaPergunta = extrairTextoUltimaMsgUsuario(recent);
    const forcarPesquisa = precisaPesquisaAtual(ultimaPergunta);

    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContent },
      ...recent.map((m, i) => toLaudoApiMessage(m, i === lastUserImageIdx ? 'high' : 'low')),
    ];

    let pesquisas = 0;

    const executarTool = async (nome: string, args: Record<string, unknown>): Promise<string> => {
      if (nome === 'pesquisar_internet') {
        const consulta = String(args.consulta ?? '').trim();
        if (!consulta) return 'Consulta vazia.';
        if (pesquisas >= LAUDO_CHAT_MAX_SEARCHES) {
          return 'Limite de pesquisas desta mensagem atingido; responda com o que já tem da pesquisa anterior.';
        }
        pesquisas += 1;
        try {
          return await pesquisarInternetLaudo(client, consulta);
        } catch (err) {
          console.error(
            '[laudo-chat] pesquisar_internet:',
            err instanceof Error ? err.message : err
          );
          return 'Falha ao pesquisar na internet. Avise o técnico que a busca falhou e NÃO invente versões/datas.';
        }
      }

      if (!context?.empresaId) {
        return 'Consulta ao banco indisponível nesta sessão.';
      }

      if (nome === 'dados_os') {
        return buscarDadosOsEmpresa(context.empresaId, String(args.numero_os ?? ''));
      }

      if (nome === 'casos_similares') {
        return buscarCasosSimilaresEmpresa(
          context.empresaId,
          String(args.marca ?? ''),
          typeof args.modelo === 'string' ? args.modelo : undefined,
          typeof args.sintoma === 'string' ? args.sintoma : undefined
        );
      }

      return `Ferramenta desconhecida: ${nome}`;
    };

    // Fatos atuais / “funciona X?”: pesquisa já, antes do modelo chutar dado antigo
    if (forcarPesquisa) {
      const consultaSeed =
        ultimaPergunta.replace(/\s+/g, ' ').slice(0, 320) ||
        'recursos e compatibilidade mais recentes de iPhone no Brasil';
      try {
        const resultado = await executarTool('pesquisar_internet', {
          consulta: `${consultaSeed} — Brasil ${new Date().getFullYear()}; separar variantes do serviço se houver (ex.: antena Wi‑Fi vs conexão direta ao celular)`,
        });
        apiMessages.push({
          role: 'system',
          content: `RESULTADO OBRIGATÓRIO DA PESQUISA WEB (fonte principal desta resposta):
${resultado.slice(0, 7000)}

Na "message": resposta CURTA (4–8 linhas, ~900 caracteres), só o essencial, bullets com • se precisar, sem markdown **, no máximo 1–2 links. Separe casos só se forem diferentes na prática. Não contradiga a pesquisa.`,
        });
      } catch (err) {
        console.error('[laudo-chat] pesquisa prévia:', err instanceof Error ? err.message : err);
      }
    }

    let rawFinal: string | null = null;

    for (let rodada = 0; rodada <= LAUDO_CHAT_MAX_TOOL_ROUNDS; rodada++) {
      const isLast = rodada === LAUDO_CHAT_MAX_TOOL_ROUNDS;
      const forceSearchTool =
        !isLast && forcarPesquisa && pesquisas === 0 && rodada === 0
          ? ({
              type: 'function' as const,
              function: { name: 'pesquisar_internet' },
            } as const)
          : null;

      const completion = await client.chat.completions.create({
        model,
        messages: apiMessages,
        ...(isLast
          ? { response_format: { type: 'json_object' as const } }
          : {
              tools,
              tool_choice: forceSearchTool
                ? forceSearchTool
                : forcarPesquisa && pesquisas === 0
                  ? 'required'
                  : 'auto',
            }),
        max_tokens: hasPanicfull ? 3500 : 2200,
        temperature: 0.3,
      });

      const msg = completion.choices[0]?.message;
      if (!msg) break;

      const chamadas = !isLast ? msg.tool_calls?.filter((c) => c.type === 'function') ?? [] : [];
      if (!chamadas.length) {
        rawFinal = msg.content?.trim() || null;
        break;
      }

      apiMessages.push({
        role: 'assistant',
        content: msg.content ?? null,
        tool_calls: chamadas,
      });

      for (const chamada of chamadas) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(chamada.function.arguments || '{}');
        } catch {
          args = {};
        }
        const resultado = await executarTool(chamada.function.name, args);
        apiMessages.push({
          role: 'tool',
          tool_call_id: chamada.id,
          content: resultado.slice(0, 8000),
        });
      }
    }

    if (!rawFinal || rawFinal.startsWith('{') && !unwrapLaudoJsonPayload(rawFinal)) {
      const formatCompletion = await client.chat.completions.create({
        model,
        messages: [
          ...apiMessages,
          {
            role: 'user',
            content:
              'Com base no que já foi obtido (incluindo RESULTADO da pesquisa web), retorne AGORA apenas o JSON final {"message":"...","laudo":null,"pecas":[]}. Em "message": texto CURTO (4–8 linhas, ~900 caracteres), português, sem JSON aninhado, sem markdown **. Só o essencial + no máx. 1–2 links. Use a pesquisa atual.',
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: hasPanicfull ? 3500 : 2200,
        temperature: 0.25,
      });
      rawFinal = formatCompletion.choices[0]?.message?.content?.trim() || rawFinal;
    }

    if (!rawFinal) return null;

    const parsed = parseLaudoChatReply(rawFinal);
    if (parsed?.message) return parsed;

    // Conteúdo não-JSON após tools: força formatação
    const wrap = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Converta no JSON {"message":"...","laudo":null,"pecas":[]}. Em message coloque APENAS o texto humano (sem chaves JSON, sem markdown). Se a entrada já for JSON com campo message, copie só o valor de message.',
        },
        { role: 'user', content: rawFinal.slice(0, 6000) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.1,
    });
    const wrapped = wrap.choices[0]?.message?.content?.trim();
    const wrappedParsed = wrapped ? parseLaudoChatReply(wrapped) : null;
    if (wrappedParsed?.message) return wrappedParsed;

    // Último recurso: nunca devolver JSON cru ao app
    const fallbackMsg =
      unwrapLaudoJsonPayload(rawFinal)?.message?.trim() ||
      rawFinal.replace(/^[\s\S]*?"message"\s*:\s*"/, '').replace(/"\s*,\s*"laudo"[\s\S]*$/, '').trim();
    return {
      message:
        fallbackMsg && !fallbackMsg.startsWith('{')
          ? fallbackMsg
          : 'Não consegui formatar a resposta. Tente perguntar de novo.',
      laudo: null,
    };
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
      mimeType.includes('ogg') || mimeType.includes('opus') ? 'ogg' :
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


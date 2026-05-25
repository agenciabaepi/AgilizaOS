import OpenAI from 'openai';
import type { DadosUsuario } from './user-data';
import type { AparelhoInfoIA } from '@/types/aparelhos';

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

INSTRUÇÕES:
- Busque na internet informações atualizadas sobre o aparelho solicitado
- Retorne APENAS um objeto JSON válido, sem markdown, sem explicações
- Para imagem_url, forneça uma URL direta de imagem do aparelho (JPG/PNG/WebP) de um site confiável (fabricante, loja oficial, gsmarena, etc.)
- Preços devem ser em Reais (BRL), valores aproximados do mercado brasileiro atual
- Especificações devem ser concisas e em português

Formato JSON esperado:
{
  "imagem_url": "https://...",
  "preco_medio": { "min": 1999, "max": 2499 },
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

/**
 * Busca informações de um aparelho via OpenAI (com web search quando disponível).
 * Retorna specs, preço e imagem ou null em caso de falha.
 */
export async function buscarInfoAparelho(
  marca: string,
  modelo: string,
  tipo?: string
): Promise<AparelhoInfoIA | null> {
  const cacheKey = `${marca}|${modelo}|${tipo || ''}`.toLowerCase();
  const cached = infoCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < INFO_CACHE_TTL) {
    return cached.data;
  }

  const client = getOpenAIClient();
  if (!client) return null;

  const userPrompt = `Busque informações completas sobre: ${marca} ${modelo}${tipo ? ` (tipo: ${tipo})` : ''}. Inclua uma URL de imagem real do produto, preço no Brasil, especificações técnicas e ano de lançamento.`;

  console.log('🔍 Buscando info do aparelho via IA:', { marca, modelo, tipo });

  try {
    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      instructions: INFO_SYSTEM_PROMPT,
      input: userPrompt,
      tools: [{ type: 'web_search' as const }],
    });

    const text = response.output_text;
    if (!text) {
      console.error('❌ OpenAI retornou resposta vazia para busca de aparelho');
      return null;
    }

    const info = parseInfoJson(text);
    if (info) {
      infoCache.set(cacheKey, { data: info, ts: Date.now() });
      console.log('✅ Info do aparelho obtida via Responses API:', {
        marca,
        modelo,
        temImagem: !!info.imagem_url,
        temPreco: !!info.preco_medio,
        specs: Object.keys(info.especificacoes).length,
      });
      return info;
    }

    console.warn('⚠️ Não foi possível parsear resposta da IA:', text.substring(0, 200));
    return null;
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
      if (!text) return null;

      const info = parseInfoJson(text);
      if (info) {
        infoCache.set(cacheKey, { data: info, ts: Date.now() });
        console.log('✅ Info do aparelho obtida via Chat Completions (fallback):', {
          marca,
          modelo,
          temImagem: !!info.imagem_url,
        });
        return info;
      }
      return null;
    } catch (chatErr: any) {
      console.error('❌ Erro ao buscar info do aparelho:', chatErr.message);
      return null;
    }
  }
}


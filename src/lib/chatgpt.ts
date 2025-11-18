import OpenAI from 'openai';

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
 * Gera resposta do ChatGPT para uma mensagem do WhatsApp
 * @param userMessage - Mensagem do usuário
 * @param context - Contexto adicional (opcional)
 * @returns Resposta do ChatGPT ou null em caso de erro
 */
export async function getChatGPTResponse(
  userMessage: string,
  context?: {
    userName?: string;
    isTecnico?: boolean;
    tecnicoData?: {
      comissoes?: {
        total: number;
        totalPago: number;
        totalPendente: number;
        ultimas: Array<{
          numero_os: number;
          cliente: string;
          valor: number;
          status: string;
          data: string;
        }>;
      };
      osPendentes?: Array<{
        numero_os: number;
        cliente: string;
        servico: string;
        status: string;
        status_tecnico: string;
      }>;
      osRecentes?: Array<{
        numero_os: number;
        cliente: string;
        status: string;
        status_tecnico: string;
      }>;
      contagemStatus?: Record<string, number>;
      totalOSPendentes?: number;
      totalOS?: number;
    };
  }
): Promise<string | null> {
  try {
    const client = getOpenAIClient();
    
    if (!client) {
      return null;
    }

    // Construir mensagem do sistema com contexto dinâmico
    let systemMessage = `Você é um assistente virtual inteligente do sistema Consert, um sistema de gestão de ordens de serviço.

Sua função é ajudar técnicos com perguntas sobre suas ordens de serviço, comissões e status de trabalhos.

IMPORTANTE:
- Use emojis moderadamente para tornar a comunicação mais amigável
- Mantenha respostas concisas e objetivas (máximo 400 caracteres)
- Responda sempre em português brasileiro
- Seja educado e profissional`;

    // Adicionar dados do técnico se disponíveis
    if (context?.tecnicoData) {
      const dados = context.tecnicoData;
      
      systemMessage += `\n\nDADOS ATUAIS DO TÉCNICO ${context.userName || 'TÉCNICO'}:`;
      
      if (dados.comissoes) {
        systemMessage += `\n\n💰 COMISSÕES:
- Total: R$ ${dados.comissoes.total.toFixed(2).replace('.', ',')}
- Pagas: R$ ${dados.comissoes.totalPago.toFixed(2).replace('.', ',')}
- Pendentes: R$ ${dados.comissoes.totalPendente.toFixed(2).replace('.', ',')}`;
        
        if (dados.comissoes.ultimas && dados.comissoes.ultimas.length > 0) {
          systemMessage += `\n\nÚltimas comissões:`;
          dados.comissoes.ultimas.forEach((c, i) => {
            systemMessage += `\n${i + 1}. OS #${c.numero_os} - ${c.cliente} - R$ ${c.valor.toFixed(2).replace('.', ',')} - ${c.status}`;
          });
        }
      }
      
      if (dados.osPendentes && dados.osPendentes.length > 0) {
        systemMessage += `\n\n📋 ORDENS DE SERVIÇO PENDENTES (${dados.totalOSPendentes || dados.osPendentes.length}):`;
        dados.osPendentes.slice(0, 5).forEach((os, i) => {
          systemMessage += `\n${i + 1}. OS #${os.numero_os} - ${os.cliente} - ${os.servico} - Status: ${os.status}`;
        });
      }
      
      if (dados.contagemStatus) {
        systemMessage += `\n\n📊 RESUMO DE OS:
- Total de OS: ${dados.totalOS || 0}
- Pendentes: ${dados.totalOSPendentes || 0}`;
        
        const statusMaisComuns = Object.entries(dados.contagemStatus)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        
        if (statusMaisComuns.length > 0) {
          systemMessage += `\nStatus mais comuns:`;
          statusMaisComuns.forEach(([status, count]) => {
            systemMessage += `\n- ${status}: ${count}`;
          });
        }
      }
      
      systemMessage += `\n\nUse essas informações para responder perguntas específicas do técnico sobre suas comissões, OS pendentes, status de trabalhos, etc.`;
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
      messageLength: userMessage.length,
      hasContext: !!context,
    });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Modelo mais econômico e rápido
      messages,
      max_tokens: 300, // Limitar tamanho da resposta
      temperature: 0.7, // Criatividade moderada
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
    
    // Retornar mensagem de erro amigável
    return 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente mais tarde ou entre em contato com o administrador.';
  }
}

/**
 * Verifica se o ChatGPT está disponível (API key configurada)
 */
export function isChatGPTAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}


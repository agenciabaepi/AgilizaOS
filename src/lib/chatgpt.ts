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
  }
): Promise<string | null> {
  try {
    const client = getOpenAIClient();
    
    if (!client) {
      return null;
    }

    // Construir mensagem do sistema com contexto
    const systemMessage = `Você é um assistente virtual do sistema Consert, um sistema de gestão de ordens de serviço.

Sua função é ajudar usuários (principalmente técnicos) com perguntas sobre:
- Ordens de serviço
- Comissões
- Status de serviços
- Dúvidas gerais sobre o sistema

Seja sempre educado, objetivo e útil. Se não souber a resposta, oriente o usuário a entrar em contato com o administrador.

IMPORTANTE: 
- Use emojis moderadamente para tornar a comunicação mais amigável
- Mantenha respostas concisas (máximo 500 caracteres)
- Se o usuário perguntar sobre comandos, mencione que pode usar /comissoes para ver suas comissões
- Responda sempre em português brasileiro`;

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


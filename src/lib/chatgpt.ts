import OpenAI from 'openai';
import type { DadosUsuario } from './user-data';

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


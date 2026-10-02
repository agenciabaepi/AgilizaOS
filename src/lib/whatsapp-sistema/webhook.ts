import {
  getTecnicoByWhatsApp,
  getComissoesTecnico,
  formatComissoesMessage,
  getSenhaOSPorNumero,
  formatSenhaOSMessage,
  extrairNumeroOs,
  pedidoDeFotos,
  pedidoDeResumoOs,
  getOsDoTecnico,
  formatResumoOsMessage,
  listarFotosOs,
  LIMITE_FOTOS_OS,
} from '@/lib/whatsapp-commands';
import { getUsuarioByWhatsApp } from '@/lib/user-data';
import { isUsuarioTecnico } from '@/lib/tecnicos';
import { isWhatsAppSistemaPhoneNumber } from './phone';
import { sendSistemaImagem, sendSistemaTexto } from './send';
import { responderTecnicoComIA } from './assistente-tecnico';

type RespostaAssistente = { message: string | null; images?: string[] };

type MetaMensagem = {
  id?: string;
  from?: string;
  type?: string;
  timestamp?: string;
  text?: { body?: string };
};

type MetaWebhookBody = {
  object?: string;
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        messages?: MetaMensagem[];
      };
    }[];
  }[];
};

const MENSAGEM_BLOQUEIO =
  '🚫 *Acesso Restrito*\n\nEste WhatsApp é o assistente do sistema, exclusivo para técnicos cadastrados.\n\nPeça ao administrador para cadastrar o seu WhatsApp no seu usuário.';

const ACESSO_NEGADO_OS = (numero: string) =>
  `❌ *Acesso Negado*\n\nA OS #${numero} não está atribuída a você.\n\nVocê só pode consultar O.S. em que é o técnico responsável.`;

/** Mensagens que chegaram há mais tempo que isso (reentrega da Meta) não são respondidas. */
const IDADE_MAXIMA_MS = 5 * 60 * 1000;

/** Há mensagem recebida no número do sistema neste payload? */
export function temMensagemParaSistema(body: MetaWebhookBody): boolean {
  return (body.entry ?? []).some((entry) =>
    (entry.changes ?? []).some(
      (change) =>
        isWhatsAppSistemaPhoneNumber(change.value?.metadata?.phone_number_id) &&
        (change.value?.messages?.length ?? 0) > 0
    )
  );
}

/** Comandos fixos, usados quando a OpenAI não está disponível ou falha. */
async function responderSemIA(
  usuario: NonNullable<Awaited<ReturnType<typeof getUsuarioByWhatsApp>>>,
  telefone: string,
  texto: string
): Promise<RespostaAssistente> {
  if (texto.toLowerCase().startsWith('/comissoes')) {
    const tecnico = await getTecnicoByWhatsApp(telefone);
    if (!tecnico) return { message: '❌ Erro ao buscar suas informações de técnico.' };
    const { comissoes, total, totalPago, totalPendente } = await getComissoesTecnico(tecnico.id, 10);
    return { message: formatComissoesMessage(comissoes, total, totalPago, totalPendente, tecnico.nome) };
  }

  if (!usuario.empresa_id || !usuario.auth_user_id) {
    return {
      message: '❌ Não consegui identificar sua empresa ou seu usuário de técnico. Fale com o administrador.',
    };
  }

  if (/senha|password/i.test(texto)) {
    const numero = extrairNumeroOs(texto);
    if (!numero) return { message: '❓ Informe o número da OS. Exemplo: "senha da OS 890"' };
    const dados = await getSenhaOSPorNumero(numero, usuario.empresa_id, usuario.auth_user_id);
    return { message: dados ? formatSenhaOSMessage(dados) : ACESSO_NEGADO_OS(numero) };
  }

  const querFotos = pedidoDeFotos(texto);
  const querResumo = pedidoDeResumoOs(texto);
  if (querFotos || querResumo) {
    const numero = extrairNumeroOs(texto);
    if (!numero) {
      return { message: '❓ Informe o número da OS.\n\nExemplos:\n"dados da OS 890"\n"fotos da OS 890"' };
    }
    const os = await getOsDoTecnico(numero, usuario.empresa_id, usuario.auth_user_id);
    if (!os) return { message: ACESSO_NEGADO_OS(numero) };

    const fotos = querFotos ? listarFotosOs(os) : [];
    const enviadas = fotos.slice(0, LIMITE_FOTOS_OS);
    const partes: string[] = [];
    if (querResumo) partes.push(formatResumoOsMessage(os));
    if (querFotos && enviadas.length === 0) {
      partes.push(`📷 A OS #${os.numero_os} não tem fotos.`);
    } else if (querFotos) {
      const extra = fotos.length > LIMITE_FOTOS_OS ? ` Mostro ${LIMITE_FOTOS_OS} de ${fotos.length}.` : '';
      partes.push(`📷 Fotos da OS #${os.numero_os}.${extra}`);
    }
    return { message: partes.join('\n\n'), images: enviadas };
  }

  return {
    message:
      '❓ Não entendi.\n\nVocê pode pedir:\n• dados da OS 890\n• fotos da OS 890\n• senha da OS 890\n• /comissoes',
  };
}

async function responderMensagem(from: string, texto: string): Promise<RespostaAssistente> {
  const telefone = from.replace(/\D/g, '');
  const usuario = await getUsuarioByWhatsApp(telefone);

  if (!usuario || !isUsuarioTecnico(usuario)) {
    console.log('[WhatsApp sistema] Acesso negado:', telefone);
    return { message: MENSAGEM_BLOQUEIO };
  }

  const respostaIA = await responderTecnicoComIA(usuario, telefone, texto);
  if (respostaIA) return respostaIA;

  return responderSemIA(usuario, telefone, texto);
}

async function enviarResposta(to: string, resposta: RespostaAssistente) {
  if (resposta.message) {
    const ok = await sendSistemaTexto(to, resposta.message);
    if (!ok) console.error('[WhatsApp sistema] Falha ao enviar resposta para', to);
  }

  const imagens = resposta.images ?? [];
  let falhas = 0;
  for (const url of imagens) {
    if (!(await sendSistemaImagem(to, url))) falhas += 1;
  }
  if (falhas > 0) {
    await sendSistemaTexto(
      to,
      falhas === imagens.length
        ? 'Não consegui enviar as fotos agora. Peça de novo em instantes.'
        : `Não consegui enviar ${falhas} de ${imagens.length} fotos. Peça de novo em instantes.`
    );
  }
}

/**
 * Atende mensagens recebidas no WhatsApp do sistema (assistente dos técnicos).
 * Eventos de outros números (CRM das empresas) são ignorados.
 */
export async function processarWebhookSistema(body: MetaWebhookBody): Promise<number> {
  if (body.object !== 'whatsapp_business_account') return 0;

  let respondidas = 0;
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value || !isWhatsAppSistemaPhoneNumber(value.metadata?.phone_number_id)) continue;

      for (const message of value.messages ?? []) {
        const from = message.from;
        if (!from || from.length < 10) continue;
        if (from === value.metadata?.display_phone_number?.replace(/\D/g, '')) continue;

        const enviadaEm = message.timestamp ? Number(message.timestamp) * 1000 : Date.now();
        if (Date.now() - enviadaEm > IDADE_MAXIMA_MS) continue;

        if (message.type !== 'text') {
          const usuario = await getUsuarioByWhatsApp(from.replace(/\D/g, ''));
          await sendSistemaTexto(
            from,
            usuario && isUsuarioTecnico(usuario)
              ? 'Por enquanto eu só leio mensagens de texto. Escreva o que precisa 🙂'
              : MENSAGEM_BLOQUEIO
          );
          continue;
        }

        const texto = message.text?.body?.trim();
        if (!texto) continue;

        try {
          const resposta = await responderMensagem(from, texto);
          await enviarResposta(from, resposta);
          respondidas += 1;
        } catch (err) {
          console.error('[WhatsApp sistema] Erro ao responder:', err);
          await sendSistemaTexto(from, '❌ Erro ao processar sua solicitação. Tente novamente em instantes.');
        }
      }
    }
  }
  return respondidas;
}

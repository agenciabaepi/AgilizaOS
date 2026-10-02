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
import { baixarMidiaSistema, sendSistemaImagem, sendSistemaTexto } from './send';
import { responderTecnicoComIA, type EntradaTecnico } from './assistente-tecnico';
import { transcreverAudioLaudo } from '@/lib/chatgpt';

type RespostaAssistente = { message: string | null; images?: string[] };

type MetaMidia = { id?: string; mime_type?: string; caption?: string };

type MetaMensagem = {
  id?: string;
  from?: string;
  type?: string;
  timestamp?: string;
  text?: { body?: string };
  image?: MetaMidia;
  audio?: MetaMidia;
  document?: MetaMidia & { filename?: string };
};

type Usuario = NonNullable<Awaited<ReturnType<typeof getUsuarioByWhatsApp>>>;

const TIPOS_ACEITOS = 'Eu leio texto, fotos e áudios. Manda por um desses que eu te ajudo 🙂';

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
  usuario: Usuario,
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

/** Texto + mídia da mensagem, já baixada/transcrita. Mensagem de texto direto quando não dá para atender. */
async function lerEntrada(
  message: MetaMensagem
): Promise<{ texto: string; entrada: EntradaTecnico } | { aviso: string } | null> {
  if (message.type === 'text') {
    const texto = message.text?.body?.trim();
    return texto ? { texto, entrada: {} } : null;
  }

  const imagem =
    message.type === 'image'
      ? message.image
      : message.type === 'document' && message.document?.mime_type?.startsWith('image/')
        ? message.document
        : null;
  if (imagem?.id) {
    const midia = await baixarMidiaSistema(imagem.id);
    if (!midia) return { aviso: 'Não consegui abrir a foto. Manda de novo, por favor.' };
    return {
      texto: imagem.caption?.trim() || '',
      entrada: { foto: { mediaId: imagem.id, buffer: midia.buffer, mimeType: midia.mimeType } },
    };
  }

  if (message.type === 'audio' && message.audio?.id) {
    const midia = await baixarMidiaSistema(message.audio.id);
    const texto = midia ? await transcreverAudioLaudo(midia.buffer, midia.mimeType, false) : null;
    if (!texto) return { aviso: 'Não consegui entender o áudio. Pode mandar de novo ou escrever?' };
    return { texto, entrada: { audio: true } };
  }

  return { aviso: TIPOS_ACEITOS };
}

async function responderMensagem(usuario: Usuario, telefone: string, message: MetaMensagem): Promise<RespostaAssistente | null> {
  const lida = await lerEntrada(message);
  if (!lida) return null;
  if ('aviso' in lida) return { message: lida.aviso };

  const respostaIA = await responderTecnicoComIA(usuario, telefone, lida.texto, lida.entrada);
  if (respostaIA) return respostaIA;

  if (lida.entrada.foto) return { message: 'Não consegui analisar a foto agora. Tenta de novo em instantes.' };
  return responderSemIA(usuario, telefone, lida.texto);
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

        // Reações, status etc. não pedem resposta
        if (!['text', 'image', 'audio', 'document', 'video', 'sticker'].includes(message.type ?? '')) continue;

        try {
          const telefone = from.replace(/\D/g, '');
          const usuario = await getUsuarioByWhatsApp(telefone);
          if (!usuario || !isUsuarioTecnico(usuario)) {
            console.log('[WhatsApp sistema] Acesso negado:', telefone);
            await sendSistemaTexto(from, MENSAGEM_BLOQUEIO);
            continue;
          }

          const resposta = await responderMensagem(usuario, telefone, message);
          if (!resposta) continue;
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

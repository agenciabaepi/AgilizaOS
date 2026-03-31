import type { SupabaseClient } from '@supabase/supabase-js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface SendPushToTecnicoOptions {
  title: string;
  body: string;
  /** Ex: { os_id: ordemId } para o app abrir a OS ao tocar na notificação */
  data?: Record<string, unknown>;
}

/** Dados mínimos da O.S. para montar a mensagem da push */
export interface OsDadosParaPush {
  numero_os?: string | number | null;
  id?: string;
  equipamento?: string | null;
  categoria?: string | null;
  marca?: string | null;
  modelo?: string | null;
  problema_relatado?: string | null;
}

const trim = (s: string | null | undefined) => (s && String(s).trim()) || '';

/**
 * Monta título e corpo da notificação push para "Nova O.S. atribuída",
 * com tipo do aparelho, modelo e defeito, usando emojis.
 */
export function buildNovaOSPushMessage(os: OsDadosParaPush): { title: string; body: string } {
  const numero = os.numero_os ?? os.id ?? '?';
  const title = `🔧 Nova O.S. #${numero} atribuída a você`;

  const partes: string[] = [];

  const equipamento = trim(os.equipamento) || trim(os.categoria);
  if (equipamento) {
    partes.push(`📱 ${equipamento}`);
  }

  const marca = trim(os.marca);
  const modelo = trim(os.modelo);
  if (marca && modelo) {
    partes.push(`📋 ${marca} ${modelo}`);
  } else if (modelo) {
    partes.push(`📋 ${modelo}`);
  } else if (marca) {
    partes.push(`📋 ${marca}`);
  }

  const defeito = trim(os.problema_relatado);
  if (defeito) {
    const texto = defeito.length > 80 ? defeito.slice(0, 77) + '...' : defeito;
    partes.push(`⚠️ ${texto}`);
  }

  const body = partes.length > 0 ? partes.join('\n') : `Você foi selecionado como técnico da O.S. #${numero}`;
  return { title, body };
}

export interface SendPushToTecnicoResult {
  sent: number;
  error?: string;
}

/**
 * Envia notificação push para um técnico (Expo).
 * tecnicoId pode ser usuarios.id ou auth_user_id.
 * Usa a tabela push_tokens; não grava em notificacoes_push (apenas admin manual grava).
 */
export async function sendPushToTecnico(
  supabase: SupabaseClient,
  tecnicoId: string,
  options: SendPushToTecnicoOptions
): Promise<SendPushToTecnicoResult> {
  if (!tecnicoId || typeof tecnicoId !== 'string' || !tecnicoId.trim()) {
    return { sent: 0, error: 'tecnico_id é obrigatório' };
  }

  const { data: usuario, error: userError } = await supabase
    .from('usuarios')
    .select('id, nome, auth_user_id')
    .or(`id.eq.${tecnicoId},auth_user_id.eq.${tecnicoId}`)
    .eq('nivel', 'tecnico')
    .limit(1)
    .maybeSingle();

  if (userError || !usuario) {
    return { sent: 0, error: 'Técnico não encontrado' };
  }

  const authUserId: string | null = usuario.auth_user_id ?? null;
  if (!authUserId || typeof authUserId !== 'string' || authUserId.trim() === '') {
    return { sent: 0, error: 'Técnico sem login vinculado' };
  }

  const { data: tokens, error: tokensError } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('auth_user_id', authUserId);

  if (tokensError || !tokens?.length) {
    return { sent: 0, error: tokensError?.message ?? 'Nenhum dispositivo registrado' };
  }

  const tokensToSend = tokens.slice(0, 10);
  const messages = tokensToSend.map((t: { token: string }) => ({
    to: t.token,
    title: options.title || 'Notificação',
    body: options.body || ' ',
    channelId: 'ordens-servico',
    data: options.data ?? undefined,
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await res.json();
    const okCount = result.data?.filter((r: { status?: string }) => r.status === 'ok').length ?? 0;
    return { sent: okCount };
  } catch (e) {
    console.warn('[push-notification-tecnico] Erro ao enviar:', e);
    return { sent: 0, error: e instanceof Error ? e.message : 'Erro ao enviar push' };
  }
}

import { supabase } from '@/lib/supabaseClient';

type UserLike = {
  id?: string | null;
  auth_user_id?: string | null;
  tecnico_id?: string | null;
  nivel?: string | null;
};

export function normOsChatNivel(n: string | null | undefined): string {
  return String(n || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function isOsChatBalcaoNivel(nivel: string | null | undefined): boolean {
  const n = normOsChatNivel(nivel);
  return n === 'admin' || n === 'atendente';
}

export function matchesOsChatUserId(user: UserLike, osUserId: string | null | undefined): boolean {
  if (!osUserId || !user) return false;
  return (
    user.id === osUserId ||
    user.auth_user_id === osUserId ||
    (user.tecnico_id != null && user.tecnico_id === osUserId)
  );
}

export function isOsChatParticipantSync(
  user: UserLike | null | undefined,
  os: { tecnico_id?: string | null; atendente_id?: string | null } | null | undefined,
  hasAuthored: boolean
): boolean {
  if (!user?.id) return false;
  if (isOsChatBalcaoNivel(user.nivel)) return true;
  if (matchesOsChatUserId(user, os?.tecnico_id) || matchesOsChatUserId(user, os?.atendente_id)) {
    return true;
  }
  return hasAuthored;
}

/**
 * Quem deve receber alerta de chat desta O.S. no web.
 * Técnico só se for o da OS ou já tiver falado; admin/atendente (balcão) sim.
 */
export async function isOsChatParticipantForUser(
  osId: string,
  user: UserLike | null | undefined
): Promise<boolean> {
  if (!osId || !user?.id) return false;

  if (isOsChatBalcaoNivel(user.nivel)) return true;

  try {
    const { data: os } = await supabase
      .from('ordens_servico')
      .select('tecnico_id, atendente_id')
      .eq('id', osId)
      .maybeSingle();

    if (matchesOsChatUserId(user, os?.tecnico_id) || matchesOsChatUserId(user, os?.atendente_id)) {
      return true;
    }

    const { data: prior } = await supabase
      .from('os_chat_mensagens')
      .select('id')
      .eq('os_id', osId)
      .eq('autor_id', user.id)
      .limit(1)
      .maybeSingle();

    return !!prior?.id;
  } catch {
    return false;
  }
}

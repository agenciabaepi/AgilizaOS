import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { SMS_VERIFICATION_ENABLED } from '@/config/sms-verification'
import { usuarioPassouVerificacaoEmail } from '@/lib/user-verification-tracking'

export type VerificationGateResult = {
  ok: boolean
  email?: string
  nivel?: string | null
  email_verificado: boolean
  empresa_verificada: boolean
  pode_entrar: boolean
  motivo?: string
}

/**
 * Fonte de verdade: usuário só entra se confirmou SMS (admin)
 * ou se a empresa já tem admin confirmado (demais níveis).
 * Liberação pelo admin-saas também conta.
 */
export async function avaliarGateVerificacao(opts: {
  authUserId?: string
  email?: string
}): Promise<VerificationGateResult> {
  if (!SMS_VERIFICATION_ENABLED) {
    return {
      ok: true,
      email_verificado: true,
      empresa_verificada: true,
      pode_entrar: true,
    }
  }

  const admin = getSupabaseAdmin()
  let query = admin
    .from('usuarios')
    .select(
      'id, auth_user_id, email, nivel, empresa_id, email_verificado, email_verificado_em, verificacao_liberada_admin'
    )

  if (opts.authUserId) {
    query = query.eq('auth_user_id', opts.authUserId)
  } else if (opts.email) {
    query = query.ilike('email', opts.email.trim().toLowerCase())
  } else {
    return {
      ok: false,
      email_verificado: false,
      empresa_verificada: false,
      pode_entrar: false,
      motivo: 'Usuário não informado',
    }
  }

  const { data: usuario, error } = await query.maybeSingle()
  if (error || !usuario) {
    return {
      ok: false,
      email_verificado: false,
      empresa_verificada: false,
      pode_entrar: false,
      motivo: 'Usuário não encontrado',
    }
  }

  const verificado = usuarioPassouVerificacaoEmail(usuario)
  let empresaVerificada = verificado

  if ((usuario.nivel || '').toLowerCase() !== 'admin' && usuario.empresa_id && !empresaVerificada) {
    const { count } = await admin
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', usuario.empresa_id)
      .eq('nivel', 'admin')
      .or('email_verificado.eq.true,verificacao_liberada_admin.eq.true')
    empresaVerificada = (count ?? 0) > 0
  }

  const isAdmin = (usuario.nivel || '').toLowerCase() === 'admin'
  const podeEntrar = isAdmin ? verificado : empresaVerificada

  return {
    ok: true,
    email: usuario.email || undefined,
    nivel: usuario.nivel,
    email_verificado: verificado,
    empresa_verificada: empresaVerificada,
    pode_entrar: podeEntrar,
    motivo: podeEntrar
      ? undefined
      : isAdmin
        ? 'Confirme sua conta com o código SMS antes de entrar.'
        : 'A conta da empresa ainda não foi confirmada por SMS.',
  }
}

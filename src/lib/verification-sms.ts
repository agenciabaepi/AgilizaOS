import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildVerificationSmsMessage,
  formatPhoneDisplay,
  isBrasilSmsConfigured,
  normalizePhoneToBrasilSms,
  sendBrasilSms,
} from '@/lib/brasilsms'
import { issueVerificationCode } from '@/lib/verification-code'
import { normalizeEmail } from '@/lib/smtp-config'
import { debitSmsSaldo } from '@/lib/sms-saldo'

export type SendVerificationSmsResult =
  | {
      ok: true
      reused: boolean
      telefone: string
      telefoneDisplay: string
      cost?: number
    }
  | { ok: false; error: string; status?: number }

async function logSmsEnvio(
  admin: SupabaseClient,
  row: {
    usuario_id?: string | null
    empresa_id?: string | null
    telefone: string
    sms_id?: number
    cost?: number
    blocks_used?: number
    sucesso: boolean
    erro?: string
  }
) {
  const { error } = await admin.from('sms_envios').insert({
    usuario_id: row.usuario_id || null,
    empresa_id: row.empresa_id || null,
    telefone: row.telefone,
    proposito: 'verificacao_cadastro',
    sms_id: row.sms_id ?? null,
    cost: row.cost ?? null,
    blocks_used: row.blocks_used ?? null,
    sucesso: row.sucesso,
    erro: row.erro || null,
  })

  if (error) {
    console.error('Falha ao registrar sms_envios (rode database/sms_envios.sql):', error.message)
  }
}

export async function resolveTelefoneVerificacao(
  admin: SupabaseClient,
  usuario: { id: string; empresa_id?: string | null; whatsapp?: string | null }
): Promise<{ telefone: string; empresaId: string | null; nomeEmpresa: string } | null> {
  let telefone = usuario.whatsapp || ''
  let empresaId = usuario.empresa_id || null
  let nomeEmpresa = 'Empresa'

  if (usuario.empresa_id) {
    const { data: empresa } = await admin
      .from('empresas')
      .select('id, nome, telefone')
      .eq('id', usuario.empresa_id)
      .maybeSingle()

    if (empresa) {
      empresaId = empresa.id
      if (empresa.nome) nomeEmpresa = empresa.nome
      if (!telefone && empresa.telefone) telefone = empresa.telefone
    }
  }

  const normalized = normalizePhoneToBrasilSms(telefone)
  if (!normalized) return null
  return { telefone: normalized, empresaId, nomeEmpresa }
}

/**
 * Gera (ou regenera) código e envia SMS.
 * Sempre emite código novo no envio para evitar texto idêntico —
 * operadoras BR frequentemente engolem SMS duplicados (status "enviado", sem entrega).
 */
export async function sendVerificationSmsToUsuario(
  admin: SupabaseClient,
  opts: {
    usuarioId: string
    email: string
    force?: boolean
  }
): Promise<SendVerificationSmsResult> {
  if (!isBrasilSmsConfigured()) {
    return {
      ok: false,
      error: 'Serviço de SMS temporariamente indisponível. Tente novamente em alguns minutos ou fale com o suporte.',
      status: 503,
    }
  }

  const emailNorm = normalizeEmail(opts.email)
  const { data: usuario, error } = await admin
    .from('usuarios')
    .select('id, email, email_verificado, empresa_id, whatsapp')
    .eq('id', opts.usuarioId)
    .maybeSingle()

  if (error || !usuario) {
    return { ok: false, error: 'Usuário não encontrado', status: 404 }
  }

  const destino = await resolveTelefoneVerificacao(admin, usuario)
  if (!destino) {
    return {
      ok: false,
      error: 'Telefone/WhatsApp da empresa inválido. Atualize o cadastro e tente novamente.',
      status: 400,
    }
  }

  // Sempre gera código novo (mesmo com force=false) — entrega > economia de SMS
  const issued = await issueVerificationCode(admin, usuario.id, emailNorm)
  if (!issued.ok) {
    return { ok: false, error: 'Erro ao gerar código de verificação', status: 500 }
  }

  const message = buildVerificationSmsMessage(issued.codigo)
  const sent = await sendBrasilSms(destino.telefone, message)

  if (!sent.ok) {
    await logSmsEnvio(admin, {
      usuario_id: usuario.id,
      empresa_id: destino.empresaId,
      telefone: destino.telefone,
      sucesso: false,
      erro: sent.error,
    })
    return {
      ok: false,
      error: sent.error.includes('saldo') || sent.error.includes('Saldo')
        ? 'Saldo de SMS insuficiente. Contate o suporte.'
        : sent.error || 'Erro ao enviar SMS de verificação',
      status: sent.status && sent.status >= 400 ? sent.status : 500,
    }
  }

  await logSmsEnvio(admin, {
    usuario_id: usuario.id,
    empresa_id: destino.empresaId,
    telefone: destino.telefone,
    sms_id: sent.smsId,
    cost: sent.cost,
    blocks_used: sent.blocksUsed,
    sucesso: true,
  })

  await debitSmsSaldo(admin, sent.cost)

  return {
    ok: true,
    reused: false,
    telefone: destino.telefone,
    telefoneDisplay: formatPhoneDisplay(destino.telefone),
    cost: sent.cost,
  }
}

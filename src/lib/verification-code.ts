import type { SupabaseClient } from '@supabase/supabase-js'
import { gerarCodigoVerificacao, normalizeEmail } from '@/lib/email'

const HORAS_VALIDADE = 24

export type IssueVerificationCodeResult =
  | { ok: true; codigo: string; id: string }
  | { ok: false; error: string }

/**
 * Gera um código novo. Só remove códigos antigos ainda não consumidos após o insert.
 * `usado: true` fica reservado para quando o usuário confirma o código de fato.
 */
export async function issueVerificationCode(
  admin: SupabaseClient,
  usuarioId: string,
  email: string
): Promise<IssueVerificationCodeResult> {
  const codigo = gerarCodigoVerificacao()
  const emailNorm = normalizeEmail(email)
  const expiraEm = new Date(Date.now() + HORAS_VALIDADE * 60 * 60 * 1000).toISOString()

  const { data: inserted, error: insertError } = await admin
    .from('codigo_verificacao')
    .insert({
      usuario_id: usuarioId,
      codigo,
      email: emailNorm,
      usado: false,
      expira_em: expiraEm,
    })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    console.error('Erro ao inserir código de verificação:', insertError)
    return { ok: false, error: insertError?.message || 'Falha ao salvar código' }
  }

  const { error: cleanupError } = await admin
    .from('codigo_verificacao')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('usado', false)
    .neq('id', inserted.id)

  if (cleanupError) {
    console.error('Erro ao limpar códigos antigos:', cleanupError)
  }

  return { ok: true, codigo, id: inserted.id }
}

/** Há código ativo (não usado e dentro da validade)? */
export async function getActiveVerificationCode(
  admin: SupabaseClient,
  usuarioId: string
): Promise<{ id: string; codigo: string } | null> {
  const { data, error } = await admin
    .from('codigo_verificacao')
    .select('id, codigo')
    .eq('usuario_id', usuarioId)
    .eq('usado', false)
    .gte('expira_em', new Date().toISOString())
    .order('expira_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar código ativo:', error)
    return null
  }

  return data?.id && data?.codigo ? { id: data.id, codigo: data.codigo } : null
}

export async function hasActiveVerificationCode(
  admin: SupabaseClient,
  usuarioId: string
): Promise<boolean> {
  const active = await getActiveVerificationCode(admin, usuarioId)
  return active !== null
}

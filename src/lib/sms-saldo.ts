import type { SupabaseClient } from '@supabase/supabase-js'

export type SmsSaldoRow = {
  saldo: number
  atualizado_em: string | null
  atualizado_por: string | null
  observacao: string | null
}

export async function getSmsSaldo(admin: SupabaseClient): Promise<SmsSaldoRow | null> {
  const { data, error } = await admin
    .from('sms_saldo')
    .select('saldo, atualizado_em, atualizado_por, observacao')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01' || error.message?.includes('sms_saldo')) {
      return null
    }
    console.error('getSmsSaldo:', error.message)
    return null
  }

  if (!data) return null
  return {
    saldo: Number(data.saldo) || 0,
    atualizado_em: data.atualizado_em,
    atualizado_por: data.atualizado_por,
    observacao: data.observacao,
  }
}

export async function setSmsSaldo(
  admin: SupabaseClient,
  saldo: number,
  atualizadoPor?: string | null
): Promise<{ ok: true; saldo: number } | { ok: false; error: string }> {
  if (!Number.isFinite(saldo) || saldo < 0) {
    return { ok: false, error: 'Saldo inválido' }
  }

  const agora = new Date().toISOString()
  const { data, error } = await admin
    .from('sms_saldo')
    .upsert(
      {
        id: 1,
        saldo: Math.round(saldo * 10000) / 10000,
        atualizado_em: agora,
        atualizado_por: atualizadoPor || null,
        observacao: 'Atualizado manualmente a partir do painel BrasilSMS',
      },
      { onConflict: 'id' }
    )
    .select('saldo')
    .single()

  if (error) {
    return {
      ok: false,
      error:
        error.code === '42P01' || error.message?.includes('sms_saldo')
          ? 'Tabela sms_saldo não existe. Rode database/sms_saldo.sql no Supabase.'
          : error.message,
    }
  }

  return { ok: true, saldo: Number(data.saldo) || 0 }
}

/** Desconta o custo de um envio do saldo local (não falha o fluxo de SMS). */
export async function debitSmsSaldo(admin: SupabaseClient, cost: number | undefined) {
  const valor = Number(cost)
  if (!Number.isFinite(valor) || valor <= 0) return

  const atual = await getSmsSaldo(admin)
  if (!atual) return

  const novo = Math.max(0, Math.round((atual.saldo - valor) * 10000) / 10000)
  await admin
    .from('sms_saldo')
    .update({
      saldo: novo,
      atualizado_em: new Date().toISOString(),
      observacao: `Descontado R$ ${valor.toFixed(2)} após envio SMS`,
    })
    .eq('id', 1)
}

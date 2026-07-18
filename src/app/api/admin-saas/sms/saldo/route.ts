import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isAdminAuthorized } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { fetchBrasilSmsDashboard, isBrasilSmsConfigured } from '@/lib/brasilsms'
import { getSmsSaldo, setSmsSaldo } from '@/lib/sms-saldo'

function parseSaldoInput(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw !== 'string') return null
  const cleaned = raw.trim().replace(/\s/g, '')
  let normalized = cleaned
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.')
  }
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

/**
 * GET — saldo SMS da BrasilSMS (endpoint /sms/dashboard) + métricas locais.
 */
export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req)
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const dashboard = await fetchBrasilSmsDashboard()
    const saldoLocal = await getSmsSaldo(admin)

    // Espelha o saldo real da API no banco local (para histórico/descontos)
    if (dashboard.ok) {
      await setSmsSaldo(admin, dashboard.balance, 'brasilsms_api').catch(() => null)
    }

    const saldo = dashboard.ok
      ? dashboard.balance
      : saldoLocal?.saldo ?? null

    const { data, error } = await admin
      .from('sms_envios')
      .select('id, telefone, proposito, sms_id, cost, blocks_used, sucesso, erro, created_at, empresa_id')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      if (error.message?.includes('sms_envios') || error.code === '42P01') {
        return NextResponse.json({
          ok: true,
          configured: isBrasilSmsConfigured(),
          tableReady: false,
          saldoReady: true,
          saldo,
          saldoFonte: dashboard.ok ? 'brasilsms' : 'local',
          saldoAtualizadoEm: new Date().toISOString(),
          saldoAtualizadoPor: dashboard.ok ? 'BrasilSMS API' : saldoLocal?.atualizado_por ?? null,
          brasilsms: dashboard.ok
            ? {
                totalSent: dashboard.totalSent,
                sentToday: dashboard.sentToday,
                successRate: dashboard.successRate,
                pendingSMS: dashboard.pendingSMS,
                failedSMS: dashboard.failedSMS,
              }
            : null,
          dashboardError: dashboard.ok ? null : dashboard.error,
          message:
            'Tabela sms_envios ainda não existe. Rode database/sms_envios.sql no Supabase.',
          totalEnviados: dashboard.ok ? dashboard.totalSent : 0,
          totalCusto: 0,
          totalFalhas: dashboard.ok ? dashboard.failedSMS : 0,
          smsRestantesEstimados:
            typeof saldo === 'number' && saldo > 0 ? Math.floor(saldo / 0.15) : 0,
          ultimoEnvio: null,
          saldoApiDisponivel: dashboard.ok,
          painelUrl: 'https://brasilsms.com',
          recentes: [],
        })
      }
      console.error('Erro ao buscar sms_envios:', error)
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }

    const rows = data || []
    const { data: allSuccess } = await admin
      .from('sms_envios')
      .select('cost')
      .eq('sucesso', true)

    const totalCustoLocal = (allSuccess || []).reduce((sum, r) => sum + (Number(r.cost) || 0), 0)

    const { count: falhasCount } = await admin
      .from('sms_envios')
      .select('*', { count: 'exact', head: true })
      .eq('sucesso', false)

    return NextResponse.json({
      ok: true,
      configured: isBrasilSmsConfigured(),
      tableReady: true,
      saldoReady: typeof saldo === 'number',
      saldo,
      saldoFonte: dashboard.ok ? 'brasilsms' : 'local',
      saldoAtualizadoEm: new Date().toISOString(),
      saldoAtualizadoPor: dashboard.ok ? 'BrasilSMS API' : saldoLocal?.atualizado_por ?? null,
      brasilsms: dashboard.ok
        ? {
            totalSent: dashboard.totalSent,
            sentToday: dashboard.sentToday,
            successRate: dashboard.successRate,
            pendingSMS: dashboard.pendingSMS,
            failedSMS: dashboard.failedSMS,
          }
        : null,
      dashboardError: dashboard.ok ? null : dashboard.error,
      smsRestantesEstimados:
        typeof saldo === 'number' && saldo > 0 ? Math.floor(saldo / 0.15) : 0,
      totalEnviados: dashboard.ok ? dashboard.totalSent : allSuccess?.length ?? 0,
      totalCusto: Math.round(totalCustoLocal * 10000) / 10000,
      totalFalhas: dashboard.ok ? dashboard.failedSMS : falhasCount ?? 0,
      ultimoEnvio: rows[0] || null,
      saldoApiDisponivel: dashboard.ok,
      saldoNota: dashboard.ok
        ? 'Saldo sincronizado automaticamente com a BrasilSMS.'
        : `Não foi possível consultar a BrasilSMS (${dashboard.error}). Exibindo saldo local.`,
      painelUrl: 'https://brasilsms.com',
      recentes: rows,
    })
  } catch (e) {
    console.error('GET /api/admin-saas/sms/saldo:', e)
    return NextResponse.json({ ok: false, message: 'Erro interno' }, { status: 500 })
  }
}

/**
 * PATCH — override manual do saldo (fallback se a API falhar).
 * Body: { saldo: number | string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req)
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const saldo = parseSaldoInput(body.saldo)
    if (saldo === null) {
      return NextResponse.json(
        { ok: false, message: 'Informe um saldo válido (ex: 10,50)' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const adminEmail = cookieStore.get('admin_saas_email')?.value?.trim() || 'admin_saas'

    const result = await setSmsSaldo(getSupabaseAdmin(), saldo, adminEmail)
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      saldo: result.saldo,
      message: 'Saldo atualizado',
    })
  } catch (e) {
    console.error('PATCH /api/admin-saas/sms/saldo:', e)
    return NextResponse.json({ ok: false, message: 'Erro interno' }, { status: 500 })
  }
}

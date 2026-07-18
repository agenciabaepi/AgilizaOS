import { NextRequest, NextResponse } from 'next/server'
import { isBrasilSmsConfigured, sendBrasilSms, buildVerificationSmsMessage } from '@/lib/brasilsms'
import { isAdminAuthorized } from '@/lib/admin-auth'

/** Teste de SMS — apenas admin SaaS. */
export async function POST(request: NextRequest) {
  try {
    const ok = await isAdminAuthorized(request)
    if (!ok) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!isBrasilSmsConfigured()) {
      return NextResponse.json(
        { success: false, error: 'BRASILSMS_API_TOKEN não configurado' },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const telefone = typeof body.telefone === 'string' ? body.telefone : ''

    if (!telefone.trim()) {
      return NextResponse.json({ error: 'telefone é obrigatório' }, { status: 400 })
    }

    const sent = await sendBrasilSms(telefone, buildVerificationSmsMessage('000000'))

    if (!sent.ok) {
      return NextResponse.json(
        { success: false, error: sent.error, details: sent.raw },
        { status: sent.status || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SMS de teste enviado',
      smsId: sent.smsId,
      cost: sent.cost,
    })
  } catch (error) {
    console.error('Erro no teste de SMS:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

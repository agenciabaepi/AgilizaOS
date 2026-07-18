import { NextRequest, NextResponse } from 'next/server'
import { avaliarGateVerificacao } from '@/lib/verification-gate'

/**
 * POST — checa se o usuário pode entrar (confirmação SMS).
 * Body: { email?: string, auth_user_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email : undefined
    const authUserId = typeof body.auth_user_id === 'string' ? body.auth_user_id : undefined

    const result = await avaliarGateVerificacao({ email, authUserId })
    return NextResponse.json(result, { status: result.ok ? 200 : 404 })
  } catch (e) {
    console.error('POST /api/auth/verification-gate:', e)
    return NextResponse.json(
      {
        ok: false,
        email_verificado: false,
        empresa_verificada: false,
        pode_entrar: false,
        motivo: 'Erro interno',
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { normalizeEmail } from '@/lib/smtp-config'
import { SMS_VERIFICATION_ENABLED } from '@/config/sms-verification'
import { sendVerificationSmsToUsuario } from '@/lib/verification-sms'

export async function POST(request: NextRequest) {
  try {
    if (!SMS_VERIFICATION_ENABLED) {
      return NextResponse.json({ error: 'Verificação por SMS desativada' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const usuarioId = body.usuarioId
    const emailRaw = typeof body.email === 'string' ? body.email : ''

    if (!usuarioId || !emailRaw.trim()) {
      return NextResponse.json(
        { error: 'usuarioId e email são obrigatórios' },
        { status: 400 }
      )
    }

    const email = normalizeEmail(emailRaw)
    const admin = getSupabaseAdmin()

    const { data: usuario, error: usuarioError } = await admin
      .from('usuarios')
      .select('id, email')
      .eq('id', usuarioId)
      .single()

    if (usuarioError || !usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const result = await sendVerificationSmsToUsuario(admin, {
      usuarioId,
      email,
      force: true,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Código de verificação enviado por SMS',
      telefone: result.telefoneDisplay,
    })
  } catch (error) {
    console.error('Erro na API de envio de código SMS:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

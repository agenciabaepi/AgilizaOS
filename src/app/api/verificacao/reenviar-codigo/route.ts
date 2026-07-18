import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { normalizeEmail } from '@/lib/smtp-config'
import { SMS_VERIFICATION_ENABLED } from '@/config/sms-verification'
import { sendVerificationSmsToUsuario } from '@/lib/verification-sms'
import { usuarioPassouVerificacaoEmail } from '@/lib/user-verification-tracking'

async function buscarUsuarioPendenteVerificacao(email: string) {
  const emailNorm = normalizeEmail(email)
  const admin = getSupabaseAdmin()

  const { data: usuario, error } = await admin
    .from('usuarios')
    .select(
      'id, nome, email, email_verificado, email_verificado_em, verificacao_liberada_admin, empresa_id'
    )
    .ilike('email', emailNorm)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar usuário para reenvio:', error)
    throw new Error('DB_ERROR')
  }

  if (!usuario) return null
  if (usuarioPassouVerificacaoEmail(usuario)) return null
  return usuario
}

export async function POST(request: NextRequest) {
  try {
    if (!SMS_VERIFICATION_ENABLED) {
      return NextResponse.json({ error: 'Verificação por SMS desativada' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email : ''
    const force = body.force === true

    if (!email.trim()) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    const usuario = await buscarUsuarioPendenteVerificacao(email)

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuário não encontrado ou conta já confirmada' },
        { status: 404 }
      )
    }

    const result = await sendVerificationSmsToUsuario(getSupabaseAdmin(), {
      usuarioId: usuario.id,
      email: usuario.email || email,
      force,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.reused
        ? 'Código reenviado por SMS.'
        : 'Novo código de verificação enviado por SMS',
      reused: result.reused,
      telefone: result.telefoneDisplay,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'DB_ERROR') {
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
    console.error('Erro na API de reenvio de código SMS:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

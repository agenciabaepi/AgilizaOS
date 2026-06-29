import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { enviarEmailVerificacao, normalizeEmail } from '@/lib/email'
import { isSmtpConfigured } from '@/lib/smtp-config'
import { EMAIL_VERIFICATION_ENABLED } from '@/config/email-verification'
import { issueVerificationCode } from '@/lib/verification-code'

export async function POST(request: NextRequest) {
  try {
    if (!EMAIL_VERIFICATION_ENABLED) {
      return NextResponse.json({ error: 'Verificação de e-mail desativada' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const usuarioId = body.usuarioId
    const emailRaw = typeof body.email === 'string' ? body.email : ''
    const nomeEmpresa = typeof body.nomeEmpresa === 'string' ? body.nomeEmpresa : ''

    if (!usuarioId || !emailRaw.trim() || !nomeEmpresa.trim()) {
      return NextResponse.json(
        { error: 'usuarioId, email e nomeEmpresa são obrigatórios' },
        { status: 400 }
      )
    }

    if (!isSmtpConfigured()) {
      console.error('❌ Envio bloqueado: SMTP_PASS/EMAIL_PASS não configurado no servidor')
      return NextResponse.json(
        { error: 'Serviço de e-mail temporariamente indisponível. Tente novamente em alguns minutos ou fale com o suporte.' },
        { status: 503 }
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

    const issued = await issueVerificationCode(admin, usuarioId, email)
    if (!issued.ok) {
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    const emailEnviado = await enviarEmailVerificacao(email, issued.codigo, nomeEmpresa)

    if (!emailEnviado) {
      return NextResponse.json({ error: 'Erro ao enviar email de verificação' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Código de verificação enviado com sucesso',
    })
  } catch (error) {
    console.error('Erro na API de envio de código:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

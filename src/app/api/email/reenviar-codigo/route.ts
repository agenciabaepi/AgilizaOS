import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { enviarEmailVerificacao, normalizeEmail } from '@/lib/email'
import { isSmtpConfigured } from '@/lib/smtp-config'
import { getActiveVerificationCode, issueVerificationCode } from '@/lib/verification-code'

async function buscarUsuarioPendenteVerificacao(email: string) {
  const emailNorm = normalizeEmail(email)
  const admin = getSupabaseAdmin()

  const { data: usuario, error } = await admin
    .from('usuarios')
    .select('id, nome, email, email_verificado, empresa_id')
    .ilike('email', emailNorm)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar usuário para reenvio:', error)
    throw new Error('DB_ERROR')
  }

  if (!usuario) return null
  if (usuario.email_verificado === true) return null
  return usuario
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email : ''
    const force = body.force === true

    if (!email.trim()) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    if (!isSmtpConfigured()) {
      console.error('❌ Reenvio bloqueado: SMTP_PASS/EMAIL_PASS não configurado no servidor')
      return NextResponse.json(
        { error: 'Serviço de e-mail temporariamente indisponível. Tente novamente em alguns minutos ou fale com o suporte.' },
        { status: 503 }
      )
    }

    const usuario = await buscarUsuarioPendenteVerificacao(email)

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuário não encontrado ou email já verificado' },
        { status: 404 }
      )
    }

    const admin = getSupabaseAdmin()
    const emailNorm = normalizeEmail(usuario.email || email)

    let nomeEmpresa = 'Empresa'
    if (usuario.empresa_id) {
      const { data: empresa } = await admin
        .from('empresas')
        .select('nome')
        .eq('id', usuario.empresa_id)
        .single()

      if (empresa?.nome) nomeEmpresa = empresa.nome
    }

    if (!force) {
      const active = await getActiveVerificationCode(admin, usuario.id)
      if (active) {
        const emailEnviado = await enviarEmailVerificacao(emailNorm, active.codigo, nomeEmpresa)
        if (!emailEnviado) {
          return NextResponse.json(
            { error: 'Erro ao enviar email de verificação' },
            { status: 500 }
          )
        }
        return NextResponse.json({
          success: true,
          message: 'Código reenviado para seu e-mail.',
          reused: true,
        })
      }
    }

    const issued = await issueVerificationCode(admin, usuario.id, emailNorm)
    if (!issued.ok) {
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    const emailEnviado = await enviarEmailVerificacao(emailNorm, issued.codigo, nomeEmpresa)

    if (!emailEnviado) {
      return NextResponse.json(
        { error: 'Erro ao enviar email de verificação' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Novo código de verificação enviado com sucesso',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'DB_ERROR') {
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
    console.error('Erro na API de reenvio de código:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

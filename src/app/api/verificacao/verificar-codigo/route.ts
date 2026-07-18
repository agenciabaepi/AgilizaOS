import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { normalizeEmail } from '@/lib/smtp-config'
import { SMS_VERIFICATION_ENABLED } from '@/config/sms-verification'

export async function POST(request: NextRequest) {
  try {
    if (!SMS_VERIFICATION_ENABLED) {
      return NextResponse.json({ error: 'Verificação por SMS desativada' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const emailRaw = typeof body.email === 'string' ? body.email : ''
    const codigo = typeof body.codigo === 'string' ? body.codigo.trim() : ''

    if (!emailRaw.trim() || !codigo) {
      return NextResponse.json(
        { error: 'Email e código são obrigatórios' },
        { status: 400 }
      )
    }

    const email = normalizeEmail(emailRaw)

    const { data: codigoVerificacao, error: codigoError } = await getSupabaseAdmin()
      .from('codigo_verificacao')
      .select(`
        id,
        usuario_id,
        codigo,
        usado,
        expira_em,
        usuarios (
          id,
          email,
          email_verificado
        )
      `)
      .ilike('email', email)
      .eq('codigo', codigo)
      .eq('usado', false)
      .gte('expira_em', new Date().toISOString())
      .single()

    if (codigoError || !codigoVerificacao) {
      return NextResponse.json(
        { error: 'Código inválido ou expirado' },
        { status: 400 }
      )
    }

    const { error: updateCodigoError } = await getSupabaseAdmin()
      .from('codigo_verificacao')
      .update({
        usado: true,
        usado_em: new Date().toISOString(),
      })
      .eq('id', codigoVerificacao.id)

    if (updateCodigoError) {
      console.error('Erro ao marcar código como usado:', updateCodigoError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    const { error: updateUsuarioError } = await getSupabaseAdmin()
      .from('usuarios')
      .update({
        email_verificado: true,
        email_verificado_em: new Date().toISOString(),
      })
      .eq('id', codigoVerificacao.usuario_id)

    if (updateUsuarioError) {
      console.error('Erro ao marcar conta como verificada:', updateUsuarioError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Conta confirmada com sucesso',
      usuario: {
        id: codigoVerificacao.usuario_id,
        email_verificado: true,
      },
    })
  } catch (error) {
    console.error('Erro na API de verificação de código:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

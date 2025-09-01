import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    console.log('🔍 Debug - Testando autenticação SMTP para:', email)

    // Criar transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true' || true,
      auth: {
        user: process.env.SMTP_USER || 'suporte@gestaoconsert.com.br',
        pass: process.env.SMTP_PASS
      }
    })

    console.log('🔍 Debug - Configurações SMTP:', {
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: process.env.SMTP_PORT || '465',
      secure: process.env.SMTP_SECURE === 'true' || true,
      user: process.env.SMTP_USER || 'suporte@gestaoconsert.com.br',
      pass: process.env.SMTP_PASS ? '***CONFIGURADO***' : '***NÃO CONFIGURADO***'
    })

    // Testar verificação
    console.log('🔍 Debug - Testando verificação SMTP...')
    await transporter.verify()
    console.log('✅ Verificação SMTP bem-sucedida')

    // Testar envio simples
    console.log('🔍 Debug - Testando envio de email...')
    const info = await transporter.sendMail({
      from: '"Teste" <suporte@gestaoconsert.com.br>',
      to: email,
      subject: 'Teste de Configuração SMTP',
      text: 'Este é um teste de configuração SMTP.',
      html: '<p>Este é um teste de configuração SMTP.</p>'
    })

    console.log('✅ Email de teste enviado:', info.messageId)

    return NextResponse.json({
      success: true,
      message: 'Teste de autenticação SMTP bem-sucedido',
      messageId: info.messageId
    })

  } catch (error) {
    console.error('❌ Erro no teste de autenticação SMTP:', error)
    return NextResponse.json({
      success: false,
      error: 'Falha na autenticação SMTP',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

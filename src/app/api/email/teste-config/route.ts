import { NextRequest, NextResponse } from 'next/server'
import { getSmtpConfig, isSmtpConfigured } from '@/lib/smtp-config'
import { verificarConfiguracao } from '@/lib/email'

export async function GET(_request: NextRequest) {
  try {
    const smtp = getSmtpConfig()
    const configured = isSmtpConfigured()
    let smtpOk = false

    if (configured) {
      smtpOk = await verificarConfiguracao()
    }

    return NextResponse.json({
      success: true,
      configured,
      smtpOk,
      config: {
        SMTP_HOST: smtp.host,
        SMTP_PORT: String(smtp.port),
        SMTP_SECURE: String(smtp.secure),
        SMTP_USER: smtp.user,
        SMTP_PASS: smtp.pass ? '***CONFIGURADO***' : '***NÃO CONFIGURADO***',
        EMAIL_HOST: process.env.EMAIL_HOST ? '(legado definido)' : undefined,
        EMAIL_PASS: process.env.EMAIL_PASS ? '***CONFIGURADO***' : undefined,
        NODE_ENV: process.env.NODE_ENV,
      },
      message: configured
        ? smtpOk
          ? 'SMTP configurado e conexão OK'
          : 'SMTP configurado mas falha na conexão (verifique host/porta/senha)'
        : 'Defina SMTP_PASS (ou EMAIL_PASS) no Vercel — e-mails de verificação não serão enviados',
    })
  } catch (error) {
    console.error('❌ Erro ao verificar configurações:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

import nodemailer from 'nodemailer'
import { getSmtpConfig } from '@/lib/smtp-config'

export { isSmtpConfigured, normalizeEmail } from '@/lib/smtp-config'

function criarTransporter() {
  const smtp = getSmtpConfig()
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  })
}

/** Verifica se o SMTP está respondendo (usado em rotas de diagnóstico). */
export async function verificarConfiguracao(): Promise<boolean> {
  try {
    const transporter = criarTransporter()
    await transporter.verify()
    return true
  } catch (error) {
    console.error('❌ Erro na configuração SMTP:', error)
    return false
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass?: string
}

/** Lê SMTP_* com fallback para EMAIL_* (legado no env_example). */
export function getSmtpConfig(): SmtpConfig {
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465', 10)
  const secure =
    port === 465 ? true : port === 587 ? false : process.env.SMTP_SECURE !== 'false'

  return {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port,
    secure,
    user: process.env.SMTP_USER || process.env.EMAIL_USER || 'suporte@gestaoconsert.com.br',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  }
}

export function isSmtpConfigured(): boolean {
  const { pass, user } = getSmtpConfig()
  return Boolean(pass && user)
}

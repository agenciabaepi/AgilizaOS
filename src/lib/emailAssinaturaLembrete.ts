import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import { getSmtpConfig, isSmtpConfigured } from '@/lib/smtp-config'

const LOGO_CID = 'logo-consert@gestaoconsert'
const LOGO_PUBLIC_URL = 'https://gestaoconsert.com.br/assets/imagens/logobranco.png'

function criarTransporter() {
  const smtp = getSmtpConfig()
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  })
}

function getSiteBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://gestaoconsert.com.br'
  return url.replace(/\/$/, '')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getEmailLogoAttachment(): nodemailer.SendMailOptions['attachments'] {
  const logoPath = path.join(process.cwd(), 'public/assets/imagens/logobranco.png')
  if (!fs.existsSync(logoPath)) return []
  return [{ filename: 'logobranco.png', path: logoPath, cid: LOGO_CID }]
}

function getEmailLogoSrc(): string {
  const logoPath = path.join(process.cwd(), 'public/assets/imagens/logobranco.png')
  return fs.existsSync(logoPath) ? `cid:${LOGO_CID}` : LOGO_PUBLIC_URL
}

/** E-mail: assinatura vence em N dias (pagamento antecipado preserva dias restantes). */
export async function enviarEmailLembreteAssinatura(params: {
  email: string
  nomeEmpresa: string
  diasRestantes: number
  dataVencimento: string
}): Promise<boolean> {
  if (!isSmtpConfigured()) {
    console.warn('SMTP não configurado — lembrete de assinatura não enviado')
    return false
  }

  const { email, nomeEmpresa, diasRestantes, dataVencimento } = params
  const baseUrl = getSiteBaseUrl()
  const assinaturaUrl = `${baseUrl}/assinatura`
  const dataFmt = (() => {
    const m = String(dataVencimento).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
    return dataVencimento
  })()

  const titulo =
    diasRestantes <= 1
      ? diasRestantes === 0
        ? 'Sua assinatura vence hoje'
        : 'Sua assinatura vence amanhã'
      : `Sua assinatura vence em ${diasRestantes} dias`

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><body style="margin:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table width="560" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
        <tr><td style="background:#111827;padding:20px 24px;" align="center">
          <img src="${getEmailLogoSrc()}" alt="Consert" width="140" style="display:block;" />
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">${escapeHtml(titulo)}</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#374151;">
            Olá, <strong>${escapeHtml(nomeEmpresa)}</strong>!
          </p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#374151;">
            Seu acesso ao Consert vence em <strong>${escapeHtml(dataFmt)}</strong>
            (${diasRestantes === 0 ? 'hoje' : diasRestantes === 1 ? 'amanhã' : `${diasRestantes} dias`}).
          </p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#6B7280;">
            Se pagar antes do vencimento, os dias restantes são preservados —
            o novo período de 30 dias começa a partir da data atual de vencimento, não da data do pagamento.
          </p>
          <a href="${assinaturaUrl}" style="display:inline-block;background:#D1FE6E;color:#111827;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px;">
            Renovar assinatura
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const text = `Consert — ${titulo}

Olá, ${nomeEmpresa}!

Seu acesso vence em ${dataFmt}.
Se pagar antecipado, os dias restantes são preservados (30 dias a partir do vencimento atual).

Renovar: ${assinaturaUrl}
`

  try {
    const transporter = criarTransporter()
    await transporter.sendMail({
      from: '"Gestão Consert" <suporte@gestaoconsert.com.br>',
      to: email,
      subject: `${titulo} — Gestão Consert`,
      html,
      text,
      attachments: getEmailLogoAttachment(),
    })
    return true
  } catch (e) {
    console.error('enviarEmailLembreteAssinatura:', e)
    return false
  }
}

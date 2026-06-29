import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import { getSmtpConfig, isSmtpConfigured } from '@/lib/smtp-config'

export { isSmtpConfigured, normalizeEmail } from '@/lib/smtp-config'

const LOGO_CID = 'logo-consert@gestaoconsert'
const LOGO_PUBLIC_URL = 'https://gestaoconsert.com.br/assets/imagens/logobranco.png'

const BRAND = {
  green: '#D1FE6E',
  greenDark: '#9BCF4A',
  dark: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  bg: '#F3F4F6',
} as const

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

/** Logo embutido no e-mail (CID) — não depende de URL externa no Gmail/Outlook */
function getEmailLogoAttachment(): nodemailer.SendMailOptions['attachments'] {
  const logoPath = path.join(process.cwd(), 'public/assets/imagens/logobranco.png')
  if (!fs.existsSync(logoPath)) return []

  return [
    {
      filename: 'logobranco.png',
      path: logoPath,
      cid: LOGO_CID,
    },
  ]
}

function getEmailLogoSrc(): string {
  const logoPath = path.join(process.cwd(), 'public/assets/imagens/logobranco.png')
  return fs.existsSync(logoPath) ? `cid:${LOGO_CID}` : LOGO_PUBLIC_URL
}

/** Layout base para e-mails transacionais do Consert */
function buildEmailLayout(options: {
  preheader: string
  title: string
  bodyHtml: string
  footerNote?: string
}): string {
  const baseUrl = getSiteBaseUrl()
  const logoSrc = getEmailLogoSrc()
  const loginUrl = `${baseUrl}/login`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(options.title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(options.preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 4px 24px rgba(17,24,39,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${BRAND.dark} 0%, #1f2937 100%);padding:28px 32px;text-align:center;">
              <a href="${baseUrl}" style="text-decoration:none;display:inline-block;">
                <img
                  src="${logoSrc}"
                  alt="Consert — Gestão para assistências técnicas"
                  width="200"
                  style="display:block;margin:0 auto;max-width:200px;width:200px;height:auto;border:0;"
                />
              </a>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              ${options.bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.border};background-color:#FAFAFA;">
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${BRAND.muted};text-align:center;">
                ${options.footerNote ?? 'Este e-mail foi enviado automaticamente. Não responda a esta mensagem.'}
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9CA3AF;text-align:center;">
                <a href="${baseUrl}" style="color:#374151;text-decoration:none;font-weight:500;">gestaoconsert.com.br</a>
                &nbsp;·&nbsp;
                <a href="${loginUrl}" style="color:#374151;text-decoration:none;font-weight:500;">Acessar o sistema</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:#9CA3AF;text-align:center;">
          © ${new Date().getFullYear()} Gestão Consert
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function gerarCodigoVerificacao(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function enviarEmailVerificacao(
  email: string,
  codigo: string,
  nomeEmpresa: string
): Promise<boolean> {
  if (!isSmtpConfigured()) {
    console.error('❌ SMTP não configurado (SMTP_PASS ou EMAIL_PASS ausente) — e-mail não enviado')
    return false
  }

  try {
    const transporter = criarTransporter()
    const baseUrl = getSiteBaseUrl()
    const loginUrl = `${baseUrl}/login`
    const empresa = escapeHtml(nomeEmpresa)

    const bodyHtml = `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${BRAND.dark};letter-spacing:-0.02em;">
        Bem-vindo, ${empresa}!
      </h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${BRAND.muted};">
        Obrigado por se cadastrar no Consert. Para ativar sua conta e acessar o sistema,
        confirme seu e-mail com o código abaixo no primeiro login.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
        <tr>
          <td style="background-color:#F9FAFB;border:2px dashed ${BRAND.border};border-radius:12px;padding:24px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.muted};">
              Seu código de verificação
            </p>
            <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.35em;color:${BRAND.dark};font-family:'Courier New',Courier,monospace;padding-left:0.35em;">
              ${codigo}
            </p>
            <p style="margin:12px 0 0;font-size:13px;color:${BRAND.muted};">
              Válido por <strong style="color:${BRAND.dark};">24 horas</strong>
            </p>
          </td>
        </tr>
      </table>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
        <tr>
          <td style="border-radius:10px;background-color:${BRAND.green};">
            <a
              href="${loginUrl}"
              style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${BRAND.dark};text-decoration:none;"
            >
              Ir para o login
            </a>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="background-color:#FFFBEB;border-left:4px solid #F59E0B;border-radius:8px;padding:14px 16px;">
            <p style="margin:0;font-size:13px;line-height:1.55;color:#92400E;">
              <strong>Dica:</strong> Na tela de login, informe este código quando solicitado.
              Não encontrou o e-mail? Verifique a pasta de spam ou use &quot;Reenviar código&quot;.
            </p>
          </td>
        </tr>
      </table>`

    const html = buildEmailLayout({
      preheader: `Seu código de verificação Consert: ${codigo}`,
      title: 'Confirme seu cadastro',
      bodyHtml,
      footerNote:
        'Se você não solicitou este cadastro, pode ignorar este e-mail com segurança.',
    })

    const text = `Consert — Confirme seu cadastro

Olá, ${nomeEmpresa}!

Seu código de verificação: ${codigo}
(Válido por 24 horas)

Acesse ${loginUrl} e informe o código no primeiro login.

Se você não solicitou este cadastro, ignore este e-mail.

— Gestão Consert
${baseUrl}`

    await transporter.sendMail({
      from: '"Gestão Consert" <suporte@gestaoconsert.com.br>',
      to: email,
      subject: 'Confirme seu cadastro — Gestão Consert',
      html,
      text,
      attachments: getEmailLogoAttachment(),
    })

    return true
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error)
    return false
  }
}

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

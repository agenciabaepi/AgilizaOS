const DEFAULT_BASE_URL = 'https://api.brasilsms.com'

export type BrasilSmsSendResult =
  | { ok: true; smsId?: number; cost?: number; blocksUsed?: number; raw: unknown }
  | { ok: false; error: string; status?: number; raw?: unknown }

export type BrasilSmsDashboard =
  | {
      ok: true
      balance: number
      totalSent: number
      sentToday: number
      successRate: number
      pendingSMS: number
      failedSMS: number
      raw: unknown
    }
  | { ok: false; error: string }

function getBaseUrl(): string {
  return (process.env.BRASILSMS_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
}

export function getBrasilSmsToken(): string | null {
  const token = process.env.BRASILSMS_API_TOKEN?.trim()
  return token || null
}

export function isBrasilSmsConfigured(): boolean {
  return Boolean(getBrasilSmsToken())
}

/** Normaliza para DDI 55 + DDD + número (só dígitos), ex: 5511999999999 */
export function normalizePhoneToBrasilSms(phone: string): string | null {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null

  let normalized = digits
  if (normalized.startsWith('55') && normalized.length >= 12) {
    // já com DDI
  } else if (normalized.length === 10 || normalized.length === 11) {
    normalized = `55${normalized}`
  } else if (normalized.length < 12) {
    return null
  }

  if (normalized.length < 12 || normalized.length > 13) return null
  if (!normalized.startsWith('55')) return null
  return normalized
}

/** Máscara amigável para UI: (11) 99999-9999 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  const digits = String(phone || '').replace(/\D/g, '')
  const local = digits.startsWith('55') ? digits.slice(2) : digits
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return phone || '—'
}

export function buildVerificationSmsMessage(codigo: string): string {
  // Texto simples (estilo que entrega melhor nas operadoras BR).
  // Evitar prefixo "Marca:" no início — costuma ser filtrado como spam.
  // Mantém ≤ 50 chars = 1 bloco na BrasilSMS.
  const code = String(codigo).replace(/\D/g, '').slice(0, 6)
  return `Seu codigo Consert: ${code}`
}

/** Endpoint não documentado usado pelo painel web — retorna saldo real. */
export async function fetchBrasilSmsDashboard(): Promise<BrasilSmsDashboard> {
  const token = getBrasilSmsToken()
  if (!token) {
    return { ok: false, error: 'BrasilSMS não configurado (BRASILSMS_API_TOKEN ausente)' }
  }

  try {
    const response = await fetch(`${getBaseUrl()}/sms/dashboard`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    const raw = await response.json().catch(() => null)
    if (!response.ok) {
      const msg =
        (raw && typeof raw === 'object' && 'message' in raw && String((raw as { message: unknown }).message)) ||
        `Falha ao consultar dashboard (HTTP ${response.status})`
      return { ok: false, error: msg }
    }

    const data = (raw && typeof raw === 'object' && 'data' in raw
      ? (raw as { data: Record<string, unknown> }).data
      : raw) as Record<string, unknown> | null

    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'Resposta inválida do dashboard BrasilSMS' }
    }

    const balance = Number(data.balance)
    if (!Number.isFinite(balance)) {
      return { ok: false, error: 'Saldo não encontrado na resposta da BrasilSMS' }
    }

    return {
      ok: true,
      balance,
      totalSent: Number(data.totalSent) || 0,
      sentToday: Number(data.sentToday) || 0,
      successRate: Number(data.successRate) || 0,
      pendingSMS: Number(data.pendingSMS) || 0,
      failedSMS: Number(data.failedSMS) || 0,
      raw,
    }
  } catch (error) {
    console.error('BrasilSMS dashboard error:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Erro de rede ao consultar saldo',
    }
  }
}

export async function sendBrasilSms(
  recipientRaw: string,
  message: string
): Promise<BrasilSmsSendResult> {
  const token = getBrasilSmsToken()
  if (!token) {
    return { ok: false, error: 'BrasilSMS não configurado (BRASILSMS_API_TOKEN ausente)' }
  }

  const recipient = normalizePhoneToBrasilSms(recipientRaw)
  if (!recipient) {
    return { ok: false, error: 'Telefone inválido para envio de SMS' }
  }

  const text = message.trim()
  if (!text) {
    return { ok: false, error: 'Mensagem vazia' }
  }

  try {
    const response = await fetch(`${getBaseUrl()}/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ recipient, message: text }),
    })

    const raw = await response.json().catch(() => null)

    if (!response.ok) {
      const msg =
        (raw && typeof raw === 'object' && 'message' in raw && String((raw as { message: unknown }).message)) ||
        (raw && typeof raw === 'object' && 'error' in raw && String((raw as { error: unknown }).error)) ||
        `Falha ao enviar SMS (HTTP ${response.status})`
      return { ok: false, error: msg, status: response.status, raw }
    }

    const data = (raw && typeof raw === 'object' ? raw : {}) as {
      success?: boolean
      smsId?: number
      cost?: number
      blocksUsed?: number
      message?: string
    }

    if (data.success === false) {
      return { ok: false, error: data.message || 'SMS não enviado', status: response.status, raw }
    }

    return {
      ok: true,
      smsId: typeof data.smsId === 'number' ? data.smsId : undefined,
      cost: typeof data.cost === 'number' ? data.cost : undefined,
      blocksUsed: typeof data.blocksUsed === 'number' ? data.blocksUsed : undefined,
      raw,
    }
  } catch (error) {
    console.error('BrasilSMS send error:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Erro de rede ao enviar SMS',
    }
  }
}

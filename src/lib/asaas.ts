/**
 * Cliente API Asaas - cobranças PIX e clientes
 * Docs: https://docs.asaas.com/reference/criar-nova-cobranca
 */

const ASAAS_BASE_SANDBOX = 'https://api-sandbox.asaas.com';
const ASAAS_BASE_PROD = 'https://api.asaas.com';

function getConfig() {
  let apiKey = process.env.ASAAS_API_KEY?.trim();
  // Fallback: chave em base64 (evita problemas com $ em .env)
  if ((!apiKey || apiKey.length < 10) && process.env.ASAAS_API_KEY_B64) {
    try {
      const b64 = String(process.env.ASAAS_API_KEY_B64).trim();
      apiKey = Buffer.from(b64, 'base64').toString('utf-8').trim();
    } catch {
      apiKey = '';
    }
  }
  // Remove aspas que possam ter sido salvas junto (ex: ao colar no painel Vercel)
  if (apiKey && (apiKey.startsWith("'") || apiKey.startsWith('"'))) {
    apiKey = apiKey.slice(1, -1).trim();
  }
  if (!apiKey || apiKey.length < 10) {
    const hint = typeof window === 'undefined'
      ? ' (Vercel: adicione ASAAS_API_KEY em Settings > Environment Variables e faça redeploy)'
      : '';
    throw new Error('ASAAS_API_KEY não configurado' + hint);
  }
  // Asaas exige a chave COM o $ no início (faz parte da chave). Na Vercel, $ é interpretado como variável,
  // então quem cola sem $ precisa que a gente adicione aqui.
  if ((apiKey.startsWith('aact_prod_') || apiKey.startsWith('aact_hmlg_')) && !apiKey.startsWith('$')) {
    apiKey = '$' + apiKey;
  }
  const isProd = apiKey.includes('_prod_');
  const baseUrl = isProd ? ASAAS_BASE_PROD : ASAAS_BASE_SANDBOX;
  return { apiKey, baseUrl };
}

async function asaasFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ConsertOS/1.0',
      access_token: apiKey,
      ...(options.headers as Record<string, string>),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.errors?.[0] || data;
    const msg = typeof err === 'string' ? err : err?.description || err?.message || res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export interface AsaasCustomer {
  id: string;
  name?: string;
  email?: string;
  cpfCnpj?: string;
  phone?: string;
}

export interface AsaasPayment {
  id: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED' | 'DELETED' | string;
  value: number;
  dueDate: string;
  paymentDate?: string;
  customer?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

/** Criar ou reutilizar cliente no Asaas */
export async function createCustomer(params: {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}): Promise<AsaasCustomer> {
  const body: Record<string, string> = {
    name: params.name,
    email: params.email,
  };
  if (params.cpfCnpj) body.cpfCnpj = params.cpfCnpj.replace(/\D/g, '');
  if (params.phone) body.phone = params.phone.replace(/\D/g, '');
  return asaasFetch<AsaasCustomer>('/v3/customers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Criar cobrança PIX */
export async function createPaymentPix(params: {
  customer: string;
  value: number;
  dueDate: string;
  description?: string;
}): Promise<AsaasPayment> {
  const body = {
    customer: params.customer,
    billingType: 'PIX',
    value: params.value,
    dueDate: params.dueDate,
    description: params.description || undefined,
  };
  return asaasFetch<AsaasPayment>('/v3/payments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Obter status do pagamento */
export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/v3/payments/${paymentId}`);
}

/** Resposta da listagem de clientes */
export interface AsaasCustomersResponse {
  hasMore?: boolean;
  totalCount?: number;
  data: AsaasCustomer[];
}

/** Obter cliente por ID */
export async function getCustomer(customerId: string): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>(`/v3/customers/${encodeURIComponent(customerId)}`);
}

/** Listar clientes por e-mail */
export async function listCustomersByEmail(email: string): Promise<AsaasCustomer[]> {
  const encoded = encodeURIComponent(email);
  const res = await asaasFetch<AsaasCustomersResponse>(`/v3/customers?email=${encoded}`);
  return res?.data ?? [];
}

/** Resposta da listagem de cobranças */
export interface AsaasPaymentsResponse {
  hasMore?: boolean;
  totalCount?: number;
  data: AsaasPayment[];
}

/** Parâmetros para listar cobranças */
export interface ListPaymentsParams {
  offset?: number;
  limit?: number;
  status?: string;
  customer?: string;
  billingType?: string;
}

/** Listar cobranças (diretamente da API Asaas) */
export async function listPayments(params: ListPaymentsParams = {}): Promise<AsaasPaymentsResponse> {
  const search = new URLSearchParams();
  if (params.offset != null) search.set('offset', String(params.offset));
  if (params.limit != null) search.set('limit', String(Math.min(params.limit, 100)));
  if (params.status) search.set('status', params.status);
  if (params.customer) search.set('customer', params.customer);
  if (params.billingType) search.set('billingType', params.billingType);
  const qs = search.toString();
  return asaasFetch<AsaasPaymentsResponse>(`/v3/payments${qs ? `?${qs}` : ''}`);
}

/** Listar cobranças de um cliente */
export async function listPaymentsByCustomer(customerId: string): Promise<AsaasPayment[]> {
  const res = await listPayments({ customer: customerId, limit: 100 });
  return res?.data ?? [];
}

/** Obter QR Code PIX da cobrança */
export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return asaasFetch<AsaasPixQrCode>(`/v3/payments/${paymentId}/pixQrCode`);
}

/** Status considerado "pago" para liberar acesso */
export function isPaymentConfirmed(status: string): boolean {
  return status === 'CONFIRMED' || status === 'RECEIVED';
}

/**
 * Datas YYYY-MM-DD do Asaas: meio-dia UTC evita o dia “voltar” no fuso local.
 * ISO com horário é interpretado normalmente.
 */
export function parseAsaasBillingDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/** Ordenação do “último pago”: data de pagamento, ou vencimento se ainda não veio paymentDate. */
function effectiveSortTimeMs(p: AsaasPayment): number {
  const fromPay = parseAsaasBillingDate(p.paymentDate);
  const fromDue = parseAsaasBillingDate(p.dueDate);
  const ref = fromPay ?? fromDue;
  return ref ? ref.getTime() : 0;
}

/** Entre cobranças CONFIRMED/RECEIVED, escolhe a mais recente (para renovar 30 dias a partir dela). */
export function pickLatestConfirmedAsaasPayment(payments: AsaasPayment[]): AsaasPayment | null {
  let best: AsaasPayment | null = null;
  let bestT = -Infinity;
  for (const p of payments) {
    if (!isPaymentConfirmed(p.status || '')) continue;
    const t = effectiveSortTimeMs(p);
    if (t > bestT) {
      bestT = t;
      best = p;
    } else if (best && t === bestT && t > 0) {
      if (p.paymentDate && !best.paymentDate) best = p;
    }
  }
  return best;
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { getCustomer, getPayment, type AsaasPayment } from '@/lib/asaas';

function digitsOnly(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function empresaIdFromAsaasMetadata(payment?: AsaasPayment | null): string | null {
  if (!payment) return null;
  const candidates = [payment.externalReference, payment.description];
  for (const raw of candidates) {
    const text = String(raw || '').trim();
    if (!text) continue;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
      return text.toLowerCase();
    }
    const tagged = text.match(/empresa[_:=\s]+([0-9a-f-]{36})/i);
    if (tagged?.[1] && UUID_RE.test(tagged[1])) return tagged[1].toLowerCase();
    const anyUuid = text.match(UUID_RE);
    if (anyUuid?.[0]) return anyUuid[0].toLowerCase();
  }
  return null;
}

async function findEmpresaByDocumento(
  supabase: SupabaseClient,
  doc: string
): Promise<string | null> {
  if (doc.length < 11) return null;
  const last = doc.slice(-8);
  const { data: empresas } = await supabase
    .from('empresas')
    .select('id, cnpj, cpf')
    .or(`cnpj.ilike.%${last}%,cpf.ilike.%${last}%`)
    .limit(50);

  const match = (empresas || []).find((e) => {
    const cnpj = digitsOnly(e.cnpj as string);
    const cpf = digitsOnly(e.cpf as string);
    return cnpj === doc || cpf === doc;
  });
  return match?.id ? String(match.id) : null;
}

/**
 * Descobre a empresa de um pagamento Asaas:
 * 1) linha local em `pagamentos`
 * 2) externalReference / description com o UUID da empresa
 * 3) e-mail do cliente Asaas = empresas.email / usuarios.email
 * 4) CNPJ/CPF do cliente Asaas
 */
export async function resolverEmpresaIdPorPagamentoAsaas(
  supabase: SupabaseClient,
  asaasPaymentId: string,
  payment?: AsaasPayment | null
): Promise<string | null> {
  const paymentId = String(asaasPaymentId || '').trim();
  if (!paymentId) return null;

  const { data: local } = await supabase
    .from('pagamentos')
    .select('empresa_id')
    .eq('mercadopago_payment_id', paymentId)
    .maybeSingle();
  if (local?.empresa_id) return String(local.empresa_id);

  let asaas = payment;
  if (!asaas) {
    try {
      asaas = await getPayment(paymentId);
    } catch {
      return null;
    }
  }

  const fromMeta = empresaIdFromAsaasMetadata(asaas);
  if (fromMeta) {
    const { data: empresaMeta } = await supabase
      .from('empresas')
      .select('id')
      .eq('id', fromMeta)
      .maybeSingle();
    if (empresaMeta?.id) return String(empresaMeta.id);
  }

  const customerId = asaas?.customer ? String(asaas.customer).trim() : '';
  if (!customerId) return null;

  let email = '';
  let doc = '';
  let phone = '';
  try {
    const customer = await getCustomer(customerId);
    email = typeof customer.email === 'string' ? customer.email.trim().toLowerCase() : '';
    doc = digitsOnly(customer.cpfCnpj);
    phone = digitsOnly(customer.phone);
  } catch {
    return null;
  }

  if (email) {
    const { data: empresaEmail } = await supabase
      .from('empresas')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();
    if (empresaEmail?.id) return String(empresaEmail.id);

    const { data: usuarioEmail } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .ilike('email', email)
      .not('empresa_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (usuarioEmail?.empresa_id) return String(usuarioEmail.empresa_id);
  }

  if (doc.length >= 11) {
    const byDoc = await findEmpresaByDocumento(supabase, doc);
    if (byDoc) return byDoc;
  }

  if (phone.length >= 10) {
    const lastPhone = phone.slice(-8);
    const { data: porTelefone } = await supabase
      .from('empresas')
      .select('id, telefone')
      .ilike('telefone', `%${lastPhone}%`)
      .limit(20);
    const matchPhone = (porTelefone || []).find(
      (e) => digitsOnly(e.telefone as string).slice(-8) === lastPhone
    );
    if (matchPhone?.id) return String(matchPhone.id);
  }

  return null;
}

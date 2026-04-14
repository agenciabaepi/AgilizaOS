import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  listCustomersByEmail,
  listPaymentsByCustomer,
  pickLatestConfirmedAsaasPayment,
  parseAsaasBillingDate,
  type AsaasPayment,
} from '@/lib/asaas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DIAS_ACESSO_PAGAMENTO = 30;

async function ativarAssinaturaPorEmpresa(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  empresaId: string,
  now: string,
  dataFim: Date
) {
  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('id')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (assinatura?.id) {
    await supabase
      .from('assinaturas')
      .update({
        status: 'active',
        data_inicio: now,
        data_fim: dataFim.toISOString(),
        data_trial_fim: null,
        proxima_cobranca: dataFim.toISOString(),
        updated_at: now,
      })
      .eq('id', assinatura.id);
    return true;
  }

  const { data: plano } = await supabase
    .from('planos')
    .select('id')
    .limit(1)
    .single();

  if (plano?.id) {
    const { error } = await supabase.from('assinaturas').insert({
      empresa_id: empresaId,
      plano_id: plano.id,
      status: 'active',
      data_inicio: now,
      data_fim: dataFim.toISOString(),
      data_trial_fim: null,
      proxima_cobranca: dataFim.toISOString(),
      valor: 0,
      updated_at: now,
    });
    return !error;
  }
  return false;
}

/**
 * Sincroniza a assinatura com o Asaas: busca o último pagamento pago da empresa
 * (por e-mail do cliente no Asaas) e ativa a assinatura por 30 dias.
 * Útil quando o usuário já pagou mas o sistema não liberou (ex.: polling falhou).
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let user: { id: string } | null = null;

    if (bearerToken) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabaseAuth.auth.getUser(bearerToken);
      if (!error && data.user) user = data.user;
    }

    if (!user) {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set() {},
            remove() {},
          },
        }
      );
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && cookieUser) user = cookieUser;
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: usuario, error: usuarioError } = await admin
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !usuario?.empresa_id) {
      return NextResponse.json({ ok: false, error: 'Usuário ou empresa não encontrados' }, { status: 403 });
    }

    const { data: empresa, error: empresaError } = await admin
      .from('empresas')
      .select('id, email')
      .eq('id', usuario.empresa_id)
      .single();

    if (empresaError || !empresa?.email) {
      return NextResponse.json(
        { ok: false, error: 'E-mail da empresa não encontrado. Cadastre o e-mail da empresa.' },
        { status: 400 }
      );
    }

    const email = String(empresa.email).trim();
    const customers = await listCustomersByEmail(email);
    if (!customers.length) {
      return NextResponse.json(
        { ok: false, error: 'Nenhum cliente encontrado no Asaas com o e-mail da empresa.' },
        { status: 404 }
      );
    }

    // Todas as cobranças dos clientes com esse e-mail (pode haver mais de um customer id no Asaas)
    const todasCobrancas: AsaasPayment[] = [];
    for (const customer of customers) {
      const payments = await listPaymentsByCustomer(customer.id);
      todasCobrancas.push(...payments);
    }

    const ultimoPago = pickLatestConfirmedAsaasPayment(todasCobrancas);

    if (!ultimoPago) {
      return NextResponse.json(
        { ok: false, error: 'Nenhum pagamento aprovado encontrado no Asaas para esta empresa.' },
        { status: 404 }
      );
    }

    // 30 dias a partir da data de pagamento (Asaas); se ainda não veio paymentDate, usa vencimento da cobrança
    const dataInicio =
      parseAsaasBillingDate(ultimoPago.paymentDate) ??
      parseAsaasBillingDate(ultimoPago.dueDate) ??
      new Date();
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + DIAS_ACESSO_PAGAMENTO);
    const now = dataInicio.toISOString();

    const ativou = await ativarAssinaturaPorEmpresa(admin, empresa.id, now, dataFim);

    if (!ativou) {
      return NextResponse.json(
        { ok: false, error: 'Não foi possível ativar a assinatura (tabela assinaturas/planos).' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Assinatura ativada por 30 dias. Atualize a página para acessar o sistema.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao sincronizar';
    console.error('GET /api/assinatura/sincronizar:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

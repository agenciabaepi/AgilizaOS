import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  getPayment,
  getCustomer,
  isPaymentConfirmed,
  listPaymentsByCustomer,
  pickLatestConfirmedAsaasPayment,
  parseAsaasBillingDate,
  type AsaasPayment,
} from '@/lib/asaas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 1 mês de acesso após pagamento confirmado */
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
    return;
  }

  // Empresa sem assinatura: criar uma com o primeiro plano e ativar por 1 mês
  const { data: plano } = await supabase
    .from('planos')
    .select('id')
    .limit(1)
    .single();

  if (plano?.id) {
    await supabase.from('assinaturas').insert({
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
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id') || url.searchParams.get('pagamento_id');
    const mockApprove = url.searchParams.get('mock_approve') === '1';

    if (!paymentId) {
      return NextResponse.json(
        { error: 'payment_id ou pagamento_id obrigatório' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (mockApprove && paymentId.startsWith('mock_')) {
      return NextResponse.json({ status: 'approved' });
    }

    const payment = await getPayment(paymentId);
    const statusAsaas = payment?.status || 'PENDING';
    const approvedThisPayment = isPaymentConfirmed(statusAsaas);

    // Tentar descobrir a empresa associada a esse paymentId
    const { data: pagamentoRow } = await supabase
      .from('pagamentos')
      .select('id, empresa_id, status, paid_at, valor')
      .eq('mercadopago_payment_id', paymentId)
      .single();

    let empresaIdParaAssinatura: string | null = pagamentoRow?.empresa_id ?? null;

    // Se ainda não temos empresa mas o pagamento tem customer, tenta descobrir pelo e-mail do cliente Asaas
    const customerId = payment?.customer;
    if (!empresaIdParaAssinatura && customerId) {
      try {
        const customer = await getCustomer(customerId);
        const email = customer?.email?.trim();
        if (email) {
          // Busca exata primeiro; depois case-insensitive (ilike) se não achar
          let { data: empresa } = await supabase
            .from('empresas')
            .select('id')
            .eq('email', email)
            .limit(1)
            .single();

          if (!empresa?.id) {
            const { data: list } = await supabase
              .from('empresas')
              .select('id')
              .ilike('email', email)
              .limit(1);
            empresa = list?.[0] ?? null;
          }

          if (empresa?.id) {
            empresaIdParaAssinatura = empresa.id;
          } else {
            console.warn('pagamentos/status: empresa não encontrada para email Asaas:', email);
          }
        }
      } catch (e) {
        console.warn('pagamentos/status: erro ao buscar empresa por cliente Asaas:', e);
      }
    }

    // Se não achamos empresa, apenas devolve o status atual do pagamento
    if (!empresaIdParaAssinatura) {
      const statusFront = approvedThisPayment ? 'approved' : statusAsaas;
      return NextResponse.json({ status: statusFront });
    }

    let ultimoPago: AsaasPayment | null = null;
    if (customerId) {
      try {
        const payments = await listPaymentsByCustomer(customerId);
        ultimoPago = pickLatestConfirmedAsaasPayment(payments);
      } catch (e) {
        console.warn('pagamentos/status: erro ao listar pagamentos do cliente Asaas:', e);
      }
    }

    if (!ultimoPago && approvedThisPayment && payment) {
      ultimoPago = payment;
    }

    // Se ainda assim não houver pagamento confirmado, apenas retorna o status atual
    if (!ultimoPago) {
      const statusFront = approvedThisPayment ? 'approved' : statusAsaas;
      return NextResponse.json({ status: statusFront });
    }

    const dataInicio =
      parseAsaasBillingDate(ultimoPago.paymentDate) ??
      parseAsaasBillingDate(ultimoPago.dueDate) ??
      new Date();
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + DIAS_ACESSO_PAGAMENTO);

    const nowIso = dataInicio.toISOString();

    // Atualizar/registrar pagamento localmente na tabela `pagamentos`
    try {
      const valor = typeof ultimoPago.value === 'number' ? ultimoPago.value : 0;
      const { error: upsertErr } = await supabase
        .from('pagamentos')
        .upsert(
          {
            empresa_id: empresaIdParaAssinatura,
            mercadopago_payment_id: ultimoPago.id,
            status: 'approved',
            paid_at: nowIso,
            valor,
          },
          { onConflict: 'mercadopago_payment_id' }
        )
        .select()
        .single();
      if (upsertErr) console.warn('pagamentos/status: upsert pagamento (assinatura):', upsertErr.message);
    } catch (e) {
      console.warn('pagamentos/status: erro ao registrar pagamento local:', e);
    }

    // Ativar/renovar assinatura por 30 dias a partir da data de pagamento
    await ativarAssinaturaPorEmpresa(supabase, empresaIdParaAssinatura, nowIso, dataFim);

    return NextResponse.json({ status: 'approved' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar status';
    console.error('GET /api/admin-saas/pagamentos/status:', err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

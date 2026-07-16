import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { loadAssinaturaGovernanteAdmin } from '@/lib/billing/adminEmpresaAssinatura';
import {
  addCalendarDaysPagamento,
  assinaturaDesatualizadaEmRelacaoACobertura,
  buildCiclosMensais,
  toDateOnlyPagamento,
} from '@/lib/billing/verificarCiclosPagamento';
import { DIAS_ACESSO_PAGAMENTO } from '@/lib/billing/ativarAssinaturaSegura';
import { reconciliarPagamentosPendentesEmpresa } from '@/lib/billing/ativarAssinaturaSegura';
import {
  getPayment,
  listCustomersByEmail,
  listPaymentsByCustomer,
  type AsaasPayment,
} from '@/lib/asaas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PagamentoUnificado = {
  id: string;
  empresa_id: string;
  mercadopago_payment_id: string | null;
  status: string | null;
  valor: number | null;
  plano_slug: string | null;
  created_at: string | null;
  paid_at: string | null;
  due_date: string | null;
  fonte: 'asaas' | 'db' | 'ambos';
  billing_type: string | null;
  description: string | null;
};

function normalizeStatus(status: string | null | undefined): string {
  return String(status || '').trim().toUpperCase();
}

/**
 * GET /api/admin-saas/empresas/[id]/pagamentos
 * Fonte: Asaas. Corrige assinatura se datas no banco estiverem à frente da cobertura real.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: empresa, error: empErr } = await supabase
      .from('empresas')
      .select('id, nome, email, created_at, dias_trial, sistema_liberado')
      .eq('id', empresaId)
      .maybeSingle();

    if (empErr || !empresa) {
      return NextResponse.json({ ok: false, message: 'Empresa não encontrada' }, { status: 404 });
    }

    const [{ data: rows, error: pagErr }, assinatura] = await Promise.all([
      supabase
        .from('pagamentos')
        .select('id, empresa_id, mercadopago_payment_id, status, valor, plano_slug, created_at, paid_at')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(200),
      loadAssinaturaGovernanteAdmin(
        supabase,
        empresaId,
        empresa.created_at,
        empresa.dias_trial
      ),
    ]);

    if (pagErr) {
      console.error('GET empresas/[id]/pagamentos db:', pagErr);
      return NextResponse.json({ ok: false, message: 'Erro ao listar pagamentos' }, { status: 500 });
    }

    const dbByAsaasId = new Map<string, (typeof rows)[number]>();
    for (const row of rows || []) {
      const asaasId = row.mercadopago_payment_id ? String(row.mercadopago_payment_id).trim() : '';
      if (asaasId) dbByAsaasId.set(asaasId, row);
    }

    let asaasError: string | null = null;
    const email = typeof empresa.email === 'string' ? empresa.email.trim() : '';
    const asaasById = new Map<string, AsaasPayment>();

    if (email) {
      try {
        const customers = await listCustomersByEmail(email);
        for (const customer of customers) {
          const payments = await listPaymentsByCustomer(customer.id);
          for (const p of payments) {
            if (!p?.id) continue;
            asaasById.set(p.id, p);
          }
        }
      } catch (e) {
        asaasError = e instanceof Error ? e.message : 'Falha ao consultar Asaas';
        console.error('GET empresas/[id]/pagamentos asaas email:', e);
      }
    }

    const localAsaasIds = [...dbByAsaasId.keys()].filter((id) => !asaasById.has(id));
    if (localAsaasIds.length > 0) {
      await Promise.all(
        localAsaasIds.slice(0, 50).map(async (id) => {
          try {
            const p = await getPayment(id);
            if (p?.id) asaasById.set(p.id, p);
          } catch {
            /* ignore */
          }
        })
      );
    }

    const asaasPayments = [...asaasById.values()];
    const pagamentos: PagamentoUnificado[] = [];
    const usedDbIds = new Set<string>();

    for (const p of asaasPayments) {
      const local = dbByAsaasId.get(p.id);
      if (local?.id) usedDbIds.add(String(local.id));

      pagamentos.push({
        id: local?.id ? String(local.id) : p.id,
        empresa_id: empresaId,
        mercadopago_payment_id: p.id,
        status: normalizeStatus(p.status) || (local?.status as string | null) || null,
        valor: p.value != null && Number.isFinite(Number(p.value)) ? Number(p.value) : null,
        plano_slug: (local?.plano_slug as string | null) ?? null,
        created_at:
          (p as { dateCreated?: string }).dateCreated ||
          (local?.created_at as string | null) ||
          null,
        paid_at: p.paymentDate || (local?.paid_at as string | null) || null,
        due_date: p.dueDate || null,
        fonte: local ? 'ambos' : 'asaas',
        billing_type: (p as { billingType?: string }).billingType || null,
        description: (p as { description?: string }).description || null,
      });
    }

    for (const row of rows || []) {
      if (usedDbIds.has(String(row.id))) continue;
      pagamentos.push({
        id: String(row.id),
        empresa_id: empresaId,
        mercadopago_payment_id: (row.mercadopago_payment_id as string | null) ?? null,
        status: normalizeStatus(row.status as string | null) || null,
        valor: row.valor != null ? Number(row.valor) : null,
        plano_slug: (row.plano_slug as string | null) ?? null,
        created_at: (row.created_at as string | null) ?? null,
        paid_at: (row.paid_at as string | null) ?? null,
        due_date: null,
        fonte: 'db',
        billing_type: null,
        description: null,
      });
    }

    pagamentos.sort((a, b) => {
      const da = a.paid_at || a.due_date || a.created_at || '';
      const dbDate = b.paid_at || b.due_date || b.created_at || '';
      return String(dbDate).localeCompare(String(da));
    });

    const { ciclos, resumo } = buildCiclosMensais(pagamentos);

    let assinaturaAtual = assinatura;
    let sincronizado = false;
    let sincronizacaoMsg: string | null = null;

    // Se há pagamento confirmado cobrindo hoje, mas assinatura ainda bloqueia → forçar reconciliação
    if (resumo.emDia && resumo.coberturaAte) {
      const syncResult = await reconciliarPagamentosPendentesEmpresa(supabase, empresaId);
      if (syncResult.ok) {
        sincronizado = true;
        sincronizacaoMsg =
          'Assinatura liberada a partir do pagamento confirmado no Asaas (reconciliação automática).';
        const reloaded = await loadAssinaturaGovernanteAdmin(
          supabase,
          empresaId,
          empresa.created_at,
          empresa.dias_trial
        );
        if (reloaded) assinaturaAtual = reloaded;
      }
    }

    // Se datas no banco estão à frente da cobertura real → encurtar
    if (
      assinaturaAtual?.id &&
      resumo.coberturaAte &&
      (assinaturaAtual.status === 'active' || assinaturaAtual.status === 'ativa') &&
      assinaturaDesatualizadaEmRelacaoACobertura(
        resumo.coberturaAte,
        assinaturaAtual.proxima_cobranca,
        assinaturaAtual.data_fim
      )
    ) {
      const coberturaIso = `${resumo.coberturaAte}T12:00:00.000Z`;
      const { error: syncErr } = await supabase
        .from('assinaturas')
        .update({
          data_fim: coberturaIso,
          proxima_cobranca: coberturaIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assinaturaAtual.id);

      if (!syncErr) {
        sincronizado = true;
        sincronizacaoMsg = `Assinatura corrigida: cobertura real até ${resumo.coberturaAte} (último pagamento + ${DIAS_ACESSO_PAGAMENTO} dias). Datas no banco estavam à frente do Asaas.`;
        assinaturaAtual = {
          ...assinaturaAtual,
          data_fim: coberturaIso,
          proxima_cobranca: coberturaIso,
        };
      } else {
        sincronizacaoMsg = `Falha ao corrigir assinatura: ${syncErr.message}`;
        console.error('sync assinatura cobertura:', syncErr);
      }
    }

    // Se há cobertura real (pago) e assinatura está expired/atrasada → alinhar datas + active
    if (
      assinaturaAtual?.id &&
      resumo.coberturaAte &&
      resumo.emDia &&
      (assinaturaAtual.status === 'expired' ||
        assinaturaAtual.status === 'cancelled' ||
        (() => {
          const prox = assinaturaAtual.proxima_cobranca || assinaturaAtual.data_fim;
          if (!prox) return true;
          return toDateOnlyPagamento(prox) < resumo.coberturaAte!;
        })())
    ) {
      const coberturaIso = `${resumo.coberturaAte}T12:00:00.000Z`;
      const { error: extErr } = await supabase
        .from('assinaturas')
        .update({
          status: 'active',
          data_fim: coberturaIso,
          proxima_cobranca: coberturaIso,
          updated_at: new Date().toISOString(),
          observacoes: '[auto] Liberada: pagamento confirmado cobrindo o período atual',
        })
        .eq('id', assinaturaAtual.id);

      if (!extErr) {
        sincronizado = true;
        sincronizacaoMsg =
          (sincronizacaoMsg ? sincronizacaoMsg + ' ' : '') +
          `Assinatura ativada até ${resumo.coberturaAte} com base no último pagamento.`;
        assinaturaAtual = {
          ...assinaturaAtual,
          status: 'active',
          data_fim: coberturaIso,
          proxima_cobranca: coberturaIso,
        };
      }
    }

    if (
      assinaturaAtual?.id &&
      (assinaturaAtual.status === 'active' || assinaturaAtual.status === 'ativa') &&
      !resumo.coberturaAte &&
      !assinaturaAtual.proxima_cobranca &&
      !assinaturaAtual.data_fim
    ) {
      const hojeIso = toDateOnlyPagamento(new Date().toISOString());
      const ontem = addCalendarDaysPagamento(hojeIso, -1);
      const ontemIso = `${ontem}T12:00:00.000Z`;
      await supabase
        .from('assinaturas')
        .update({
          data_fim: ontemIso,
          proxima_cobranca: ontemIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assinaturaAtual.id);
      sincronizado = true;
      sincronizacaoMsg =
        (sincronizacaoMsg ? sincronizacaoMsg + ' ' : '') +
        'Assinatura active sem data e sem pagamento: marcada como vencida.';
      assinaturaAtual = {
        ...assinaturaAtual,
        data_fim: ontemIso,
        proxima_cobranca: ontemIso,
      };
    }

    return NextResponse.json({
      ok: true,
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        email: empresa.email ?? null,
        sistema_liberado: empresa.sistema_liberado === true,
      },
      assinatura: assinaturaAtual
        ? {
            id: assinaturaAtual.id,
            status: assinaturaAtual.status,
            valor: assinaturaAtual.valor != null ? Number(assinaturaAtual.valor) : null,
            created_at: assinaturaAtual.created_at ?? null,
            data_fim: assinaturaAtual.data_fim ?? null,
            proxima_cobranca: assinaturaAtual.proxima_cobranca ?? null,
          }
        : null,
      pagamentos,
      ciclos,
      resumo,
      diasCiclo: DIAS_ACESSO_PAGAMENTO,
      fonte: asaasPayments.length > 0 ? 'asaas' : email ? 'db' : 'db_sem_email',
      asaasError,
      asaasCount: asaasPayments.length,
      sincronizado,
      sincronizacaoMsg,
    });
  } catch (e) {
    console.error('GET empresas/[id]/pagamentos:', e);
    return NextResponse.json({ ok: false, message: 'Erro interno' }, { status: 500 });
  }
}

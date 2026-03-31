import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { listPayments, getCustomer, type AsaasPayment } from '@/lib/asaas';
import { isAdminAuthorized } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 100);
    const status = url.searchParams.get('status') || '';
    const search = (url.searchParams.get('search') || '').trim();

    const offset = (page - 1) * pageSize;

    // Buscar pagamentos diretamente da API Asaas
    const res = await listPayments({
      offset,
      limit: pageSize,
      ...(status ? { status } : {}),
    });

    const payments: AsaasPayment[] = res?.data ?? [];
    const total = res?.totalCount ?? payments.length;

    // Filtrar por busca (ID ou parte do ID) se informado
    let filtered = payments;
    if (search) {
      const s = search.toLowerCase();
      filtered = payments.filter(
        (p) =>
          (p.id && p.id.toLowerCase().includes(s)) ||
          (p.customer && p.customer.toLowerCase().includes(s))
      );
    }

    // Mapear customer ID -> empresa (via email)
    const customerIds = Array.from(new Set(filtered.map((p) => p.customer).filter(Boolean))) as string[];
    const customerMap: Record<string, { email?: string; name?: string }> = {};
    await Promise.all(
      customerIds.map(async (cid) => {
        try {
          const c = await getCustomer(cid);
          customerMap[cid] = { email: c.email, name: c.name };
        } catch {
          customerMap[cid] = {};
        }
      })
    );

    const emails = Object.values(customerMap)
      .map((c) => c.email)
      .filter(Boolean) as string[];
    const empresaMap: Record<string, { id: string; nome: string; email: string | null }> = {};
    if (emails.length) {
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id,nome,email')
        .in('email', emails);
      for (const e of empresas || []) {
        if (e.email) empresaMap[e.email.toLowerCase().trim()] = e;
      }
    }

    const items = filtered.map((p) => {
      const cust = customerMap[p.customer || ''] || {};
      const email = (cust.email || '').toLowerCase().trim();
      const empresa = email ? empresaMap[email] : null;
      return {
        id: p.id,
        empresa_id: empresa?.id ?? null,
        mercadopago_payment_id: p.id,
        status: p.status,
        valor: p.value ?? 0,
        created_at: (p as any).dateCreated || null,
        paid_at: p.paymentDate || null,
        empresa: empresa
          ? { id: empresa.id, nome: empresa.nome, email: empresa.email }
          : { id: '', nome: cust.name || 'Cliente Asaas', email: cust.email || null },
        asaas: {
          status: p.status,
          value: p.value,
          dueDate: p.dueDate,
          paymentDate: p.paymentDate,
          date_created: (p as any).dateCreated || null,
          date_approved: p.paymentDate || null,
          date_last_updated: p.paymentDate || p.dueDate || null,
          external_reference: (p as any).description || null,
          transaction_amount: p.value ?? null,
        },
      };
    });

    return NextResponse.json({ ok: true, items, page, pageSize, total });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Erro inesperado' }, { status: 500 });
  }
}



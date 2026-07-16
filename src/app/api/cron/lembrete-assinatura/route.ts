import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { BILLING_TIME_ZONE } from '@/lib/billing/billingTimeZone';
import { enviarEmailLembreteAssinatura } from '@/lib/emailAssinaturaLembrete';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DIAS_LEMBRETE = 7;

function hojeYmdSp(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BILLING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function isoToYmd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function authorizeCron(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const tokenHeader = req.headers.get('x-internal-token');
  const internal = process.env.INTERNAL_ADMIN_TOKEN?.trim();
  if (internal && tokenHeader === internal) return true;

  // Vercel Cron (sem secret configurado) envia este header
  if (req.headers.get('x-vercel-cron') === '1') return true;

  return false;
}

/**
 * Cron diário: e-mail 7 dias antes do vencimento (e também 1 dia antes).
 * GET /api/cron/lembrete-assinatura
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const hoje = hojeYmdSp();
  const alvo7 = addDaysYmd(hoje, DIAS_LEMBRETE);
  const alvo1 = addDaysYmd(hoje, 1);

  const { data: rows, error } = await admin
    .from('assinaturas')
    .select('id, empresa_id, status, proxima_cobranca, data_fim, observacoes')
    .in('status', ['active', 'ativa'])
    .limit(2000);

  if (error) {
    console.error('cron lembrete-assinatura:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const candidatos = (rows || []).filter((r) => {
    const venc = isoToYmd(r.proxima_cobranca as string) || isoToYmd(r.data_fim as string);
    return venc === alvo7 || venc === alvo1;
  });

  let enviados = 0;
  let pulados = 0;
  let falhas = 0;
  const detalhes: Array<{ empresaId: string; dias: number; ok: boolean }> = [];

  for (const row of candidatos) {
    const empresaId = row.empresa_id as string;
    const venc =
      isoToYmd(row.proxima_cobranca as string) || isoToYmd(row.data_fim as string) || alvo7;
    const diasRestantes = venc === alvo1 ? 1 : venc === hoje ? 0 : DIAS_LEMBRETE;
    const tipo = diasRestantes <= 1 ? '1d' : '7d';
    const marker = `[lembrete:${tipo}:${venc}]`;

    const obs = String(row.observacoes || '');
    if (obs.includes(marker)) {
      pulados++;
      continue;
    }

    const { data: empresa } = await admin
      .from('empresas')
      .select('id, nome, email, sistema_liberado')
      .eq('id', empresaId)
      .maybeSingle();

    if (!empresa?.email || empresa.sistema_liberado === true) {
      pulados++;
      continue;
    }

    const ok = await enviarEmailLembreteAssinatura({
      email: String(empresa.email).trim(),
      nomeEmpresa: String(empresa.nome || 'Cliente'),
      diasRestantes,
      dataVencimento: venc,
    });

    if (ok) {
      enviados++;
      await admin
        .from('assinaturas')
        .update({
          observacoes: `${obs} ${marker}`.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      detalhes.push({ empresaId, dias: diasRestantes, ok: true });
    } else {
      falhas++;
      detalhes.push({ empresaId, dias: diasRestantes, ok: false });
    }
  }

  return NextResponse.json({
    ok: true,
    hoje,
    alvos: { d7: alvo7, d1: alvo1 },
    candidatos: candidatos.length,
    enviados,
    pulados,
    falhas,
    detalhes: detalhes.slice(0, 50),
  });
}

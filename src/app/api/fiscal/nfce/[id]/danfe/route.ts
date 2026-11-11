import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess } from '@/modules/fiscal';
import { logoParaNotas } from '@/modules/fiscal/logo-empresa';
import { gerarDanfeNfceCupom } from '@/modules/fiscal/nfce/danfe';

/** DANFE NFC-e em cupom 80mm (leiaute oficial; NFC-e não usa DANFE A4 — isso é NF-e). */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const userId = await getSessionUserId(req);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await ctx.params;
    const admin = getSupabaseAdmin();
    const { data: nfce, error } = await admin
      .from('fiscal_nfce')
      .select(
        'id, chave_acesso, numero, serie, protocolo, valor_total, tipo_ambiente, dh_emi, xml_nfce'
      )
      .eq('empresa_id', empresaId)
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!nfce) return NextResponse.json({ error: 'NFC-e não encontrada' }, { status: 404 });

    const logo = await logoParaNotas(admin, empresaId);
    const pdf = await gerarDanfeNfceCupom({
      chaveAcesso: nfce.chave_acesso,
      numero: nfce.numero,
      serie: nfce.serie,
      protocolo: nfce.protocolo,
      valorTotal: nfce.valor_total,
      tipoAmbiente: Number(nfce.tipo_ambiente) || 2,
      dhEmi: nfce.dh_emi,
      xmlNfce: nfce.xml_nfce,
      logo,
    });

    const filename = `DANFE-NFCe-${nfce.numero || nfce.chave_acesso}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('danfe-nfce:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar DANFE NFC-e' },
      { status: 500 }
    );
  }
}

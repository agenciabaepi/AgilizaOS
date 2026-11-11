import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess } from '@/modules/fiscal';
import { logoParaNotas } from '@/modules/fiscal/logo-empresa';
import { gerarDanfeNfeA4 } from '@/modules/fiscal/nfe/danfe';

/** DANFE NF-e padrão A4 (modelo 55). */
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
    const { data: nfe, error } = await admin
      .from('fiscal_nfe')
      .select(
        'id, chave_acesso, numero, serie, protocolo, valor_total, tipo_ambiente, dh_emi, xml_nfe'
      )
      .eq('empresa_id', empresaId)
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!nfe) return NextResponse.json({ error: 'NF-e não encontrada' }, { status: 404 });

    const logo = await logoParaNotas(admin, empresaId);
    const pdf = await gerarDanfeNfeA4({
      chaveAcesso: nfe.chave_acesso,
      numero: nfe.numero,
      serie: nfe.serie,
      protocolo: nfe.protocolo,
      valorTotal: nfe.valor_total,
      tipoAmbiente: Number(nfe.tipo_ambiente) || 2,
      dhEmi: nfe.dh_emi,
      xmlNfe: nfe.xml_nfe,
      logo,
    });

    const filename = `DANFE-NFe-${nfe.numero || nfe.chave_acesso}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('danfe-nfe:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar DANFE NF-e' },
      { status: 500 }
    );
  }
}

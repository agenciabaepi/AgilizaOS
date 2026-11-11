import { NextRequest, NextResponse } from 'next/server';
import { Ambiente, parseNfseXml } from 'open-nfse';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess } from '@/modules/fiscal';
import { logoParaNotas } from '@/modules/fiscal/logo-empresa';
import { gerarCupomNfse } from '@/modules/fiscal/nfse/cupom';
import { gerarDanfseNacional } from '@/modules/fiscal/nfse/danfse';

/**
 * Gera PDF da NFS-e.
 * - `?formato=cupom` (padrão): bobina 80mm
 * - `?formato=a4`: DANFSe nacional v2.0 (NT 008/2026)
 */
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
    const formato = String(new URL(req.url).searchParams.get('formato') || 'cupom')
      .trim()
      .toLowerCase();
    const admin = getSupabaseAdmin();
    const { data: nfse, error } = await admin
      .from('fiscal_nfse')
      .select('id, xml_nfse, tipo_ambiente, chave_acesso, numero_nfse')
      .eq('empresa_id', empresaId)
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!nfse?.xml_nfse) {
      return NextResponse.json({ error: 'NFS-e ou XML não encontrado' }, { status: 404 });
    }

    const parsed = parseNfseXml(nfse.xml_nfse);
    // Fonte da verdade: tpAmb do XML autorizado (1=produção, 2=homologação)
    const tpAmb = String(parsed.infNFSe.DPS.infDPS.tpAmb);
    const ambiente = tpAmb === '2' ? Ambiente.ProducaoRestrita : Ambiente.Producao;
    const logo = await logoParaNotas(admin, empresaId);

    const pdf =
      formato === 'a4'
        ? await gerarDanfseNacional(parsed, { ambiente, logoEmpresa: logo })
        : await gerarCupomNfse(parsed, { logo });

    const prefix = formato === 'a4' ? 'DANFSe' : 'Cupom-NFSe';
    const filename = `${prefix}-${nfse.numero_nfse || nfse.chave_acesso}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('danfse:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar DANFSe' },
      { status: 500 }
    );
  }
}

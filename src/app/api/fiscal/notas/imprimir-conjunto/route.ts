import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { Ambiente, parseNfseXml } from 'open-nfse';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess } from '@/modules/fiscal';
import { logoParaNotas } from '@/modules/fiscal/logo-empresa';
import { gerarCupomNfse } from '@/modules/fiscal/nfse/cupom';
import { gerarDanfseNacional } from '@/modules/fiscal/nfse/danfse';
import { gerarDanfeNfceCupom } from '@/modules/fiscal/nfce/danfe';

/**
 * PDF único: NFS-e + NFC-e em páginas separadas.
 * Query: ?nfseId=&nfceId=&formato=cupom|a4
 * - cupom: NFS-e 80mm + NFC-e 80mm
 * - a4: DANFSe A4 + NFC-e sempre em cupom 80mm (NFC-e não tem DANFE A4)
 */
export async function GET(req: NextRequest) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const userId = await getSessionUserId(req);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const nfseId = String(searchParams.get('nfseId') || '').trim();
    const nfceId = String(searchParams.get('nfceId') || '').trim();
    const formato = String(searchParams.get('formato') || 'cupom').trim().toLowerCase();
    const a4 = formato === 'a4';
    if (!nfseId && !nfceId) {
      return NextResponse.json({ error: 'Informe nfseId e/ou nfceId' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const merged = await PDFDocument.create();
    const logo = await logoParaNotas(admin, empresaId);

    if (nfseId) {
      const { data: nfse, error } = await admin
        .from('fiscal_nfse')
        .select('id, xml_nfse, chave_acesso, numero_nfse')
        .eq('empresa_id', empresaId)
        .eq('id', nfseId)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!nfse?.xml_nfse) {
        return NextResponse.json({ error: 'NFS-e ou XML não encontrado' }, { status: 404 });
      }
      const parsed = parseNfseXml(nfse.xml_nfse);
      const tpAmb = String(parsed.infNFSe.DPS.infDPS.tpAmb);
      const ambiente = tpAmb === '2' ? Ambiente.ProducaoRestrita : Ambiente.Producao;
      const danfseBuf = a4
        ? await gerarDanfseNacional(parsed, { ambiente, logoEmpresa: logo })
        : await gerarCupomNfse(parsed, { logo });
      const danfseDoc = await PDFDocument.load(danfseBuf);
      const pages = await merged.copyPages(danfseDoc, danfseDoc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }

    if (nfceId) {
      const { data: nfce, error } = await admin
        .from('fiscal_nfce')
        .select(
          'id, chave_acesso, numero, serie, protocolo, valor_total, tipo_ambiente, dh_emi, xml_nfce'
        )
        .eq('empresa_id', empresaId)
        .eq('id', nfceId)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!nfce) return NextResponse.json({ error: 'NFC-e não encontrada' }, { status: 404 });

      const input = {
        chaveAcesso: nfce.chave_acesso,
        numero: nfce.numero,
        serie: nfce.serie,
        protocolo: nfce.protocolo,
        valorTotal: nfce.valor_total,
        tipoAmbiente: Number(nfce.tipo_ambiente) || 2,
        dhEmi: nfce.dh_emi,
        xmlNfce: nfce.xml_nfce,
        logo,
      };
      // NFC-e: somente cupom 80mm (DANFE A4 é modelo NF-e 55)
      const danfeBuf = await gerarDanfeNfceCupom(input);
      const danfeDoc = await PDFDocument.load(danfeBuf);
      const pages = await merged.copyPages(danfeDoc, danfeDoc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }

    const bytes = await merged.save();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="notas-fiscais.pdf"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('imprimir-conjunto:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar PDF conjunto' },
      { status: 500 }
    );
  }
}

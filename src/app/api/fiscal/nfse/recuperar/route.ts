import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess } from '@/modules/fiscal';
import { createFiscalNfseClient } from '@/modules/fiscal/nfse/client';

/** Recupera NFS-e já autorizada na SEFIN (ex.: falha de persistência local). */
export async function POST(req: NextRequest) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const userId = await getSessionUserId(req);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const chave = String(body.chaveAcesso || '').replace(/\D/g, '');
    if (chave.length !== 50) {
      return NextResponse.json({ error: 'chaveAcesso deve ter 50 dígitos' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const existing = await admin
      .from('fiscal_nfse')
      .select('id, chave_acesso, numero_nfse')
      .eq('empresa_id', empresaId)
      .eq('chave_acesso', chave)
      .maybeSingle();
    if (existing.data) {
      return NextResponse.json({ success: true, data: existing.data, already: true });
    }

    const bundle = await createFiscalNfseClient(admin, empresaId);
    try {
      const r = await bundle.client.fetchByChave(chave);
      const xml = r.xmlNfse;
      const idDps = String(r.idDps || `NFS${chave}`).slice(0, 60);
      const numero =
        (r as { nfse?: { infNFSe?: { nNFSe?: string } } }).nfse?.infNFSe?.nNFSe ?? null;
      const tipoAmbiente = Number(r.tipoAmbiente) === 1 ? 1 : 2;
      const dhProc = r.dataHoraProcessamento
        ? new Date(r.dataHoraProcessamento).toISOString()
        : new Date().toISOString();

      const { data, error } = await admin
        .from('fiscal_nfse')
        .insert({
          empresa_id: empresaId,
          chave_acesso: chave,
          id_dps: idDps,
          numero_nfse: numero,
          status: 'autorizada',
          tipo_ambiente: tipoAmbiente,
          xml_nfse: xml,
          dh_proc: dhProc,
        })
        .select('id, chave_acesso, numero_nfse, status')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data });
    } finally {
      await bundle.close();
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

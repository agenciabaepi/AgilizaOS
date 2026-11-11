import { NextRequest, NextResponse } from 'next/server';
import {
  getEmpresaIdForUser,
  getSessionUserId,
  getUsuarioForAuth,
} from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess, emitirNfseNacional } from '@/modules/fiscal';

export async function POST(req: NextRequest) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const userId = await getSessionUserId(req);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const usuario = await getUsuarioForAuth(userId);
    const body = await req.json();

    const admin = getSupabaseAdmin();
    const result = await emitirNfseNacional(
      admin,
      empresaId,
      {
        valorServico: Number(body.valorServico),
        descricao: body.descricao,
        cTribNac: body.cTribNac,
        cNbs: body.cNbs,
        aliqIss: body.aliqIss != null ? Number(body.aliqIss) : undefined,
        pTotTribSN: body.pTotTribSN != null ? Number(body.pTotTribSN) : undefined,
        tomador: {
          documento: String(body.tomador?.documento || ''),
          nome: String(body.tomador?.nome || ''),
          email: body.tomador?.email,
          telefone: body.tomador?.telefone,
          endereco: body.tomador?.endereco,
        },
        ordemServicoId: body.ordemServicoId || undefined,
        vendaId: body.vendaId || undefined,
      },
      { usuarioId: usuario?.id ?? null }
    );

    if (!result.ok) {
      const status = result.status === 'rejeitada' ? 422 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, status: 'erro', message: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

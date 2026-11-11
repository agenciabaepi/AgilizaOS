import { NextRequest, NextResponse } from 'next/server';
import {
  getEmpresaIdForUser,
  getSessionUserId,
  getUsuarioForAuth,
} from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess } from '@/modules/fiscal';
import { emitirNfceNacional } from '@/modules/fiscal/nfce/emitir';

export const runtime = 'nodejs';
export const preferredRegion = 'gru1';
export const maxDuration = 120;

/** Emissão manual de NFC-e (itens + tomador opcional). */
export async function POST(req: NextRequest) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const userId = await getSessionUserId(req);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const usuario = await getUsuarioForAuth(userId);
    const body = await req.json().catch(() => ({}));
    const itensRaw = Array.isArray(body.itens) ? body.itens : [];
    const itens = itensRaw
      .map((it: Record<string, unknown>) => ({
        codigo: it.codigo != null ? String(it.codigo) : undefined,
        descricao: String(it.descricao || '').trim(),
        quantidade: Number(it.quantidade),
        valorUnitario: Number(it.valorUnitario),
        ncm: it.ncm != null ? String(it.ncm) : undefined,
        cfop: it.cfop != null ? String(it.cfop) : undefined,
        unidade: it.unidade != null ? String(it.unidade) : undefined,
      }))
      .filter((it: { descricao: string; quantidade: number; valorUnitario: number }) =>
        it.descricao && it.quantidade > 0 && it.valorUnitario >= 0
      );

    if (itens.length === 0) {
      return NextResponse.json(
        { ok: false, status: 'erro', message: 'Informe ao menos um item válido.' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const result = await emitirNfceNacional(
      admin,
      empresaId,
      {
        itens,
        valorPago: body.valorPago != null ? Number(body.valorPago) : undefined,
        formaPagamento: body.formaPagamento != null ? String(body.formaPagamento) : undefined,
        tomador: body.tomador
          ? {
              documento: body.tomador.documento != null ? String(body.tomador.documento) : undefined,
              nome: body.tomador.nome != null ? String(body.tomador.nome) : undefined,
            }
          : undefined,
        ordemServicoId: body.ordemServicoId || undefined,
        vendaId: body.vendaId || undefined,
        informacoes: body.informacoes != null ? String(body.informacoes) : undefined,
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

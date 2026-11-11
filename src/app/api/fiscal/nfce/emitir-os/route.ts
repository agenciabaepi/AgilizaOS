import { NextRequest, NextResponse } from 'next/server';
import {
  getEmpresaIdForUser,
  getSessionUserId,
  getUsuarioForAuth,
} from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess, onlyDigitsDoc } from '@/modules/fiscal';
import { emitirNfceNacional } from '@/modules/fiscal/nfce/emitir';

/**
 * Emite NFC-e (modelo 65) apenas com o valor das peças da O.S.
 */
export async function POST(req: NextRequest) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const userId = await getSessionUserId(req);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ordemId = String(body.ordemServicoId || '').trim();
    if (!ordemId) {
      return NextResponse.json({ error: 'ordemServicoId é obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: ja } = await admin
      .from('fiscal_nfce')
      .select('id, chave_acesso, numero, status, protocolo')
      .eq('empresa_id', empresaId)
      .eq('ordem_servico_id', ordemId)
      .eq('status', 'autorizada')
      .maybeSingle();

    if (ja && !body.forcar) {
      return NextResponse.json(
        {
          ok: false,
          status: 'ja_emitida',
          message: 'Já existe NFC-e autorizada para as peças desta O.S.',
          nfce: ja,
        },
        { status: 409 }
      );
    }

    const { data: ordem, error: osErr } = await admin
      .from('ordens_servico')
      .select(
        `
        id,
        numero_os,
        empresa_id,
        peca,
        valor_peca,
        qtd_peca,
        desconto,
        valor_servico,
        qtd_servico,
        cliente:cliente_id (nome, cpf, documento)
      `
      )
      .eq('id', ordemId)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (osErr) return NextResponse.json({ error: osErr.message }, { status: 500 });
    if (!ordem) return NextResponse.json({ error: 'O.S. não encontrada' }, { status: 404 });

    const qtd = Number(ordem.qtd_peca || 1) || 1;
    const unit = Number(ordem.valor_peca || 0);
    const totalPeca = unit * qtd;
    const totalServico =
      Number(ordem.valor_servico || 0) * (Number(ordem.qtd_servico || 1) || 1);
    const desconto = Math.max(0, Number(ordem.desconto || 0));
    const bruto = totalPeca + totalServico;
    const descontoNaPeca =
      bruto > 0 ? Math.min(totalPeca, desconto * (totalPeca / bruto)) : 0;
    const valorLiquido = Math.round((totalPeca - descontoNaPeca) * 100) / 100;

    if (valorLiquido <= 0) {
      return NextResponse.json(
        {
          ok: false,
          status: 'erro',
          message: 'Esta O.S. não tem valor de peças para emitir NFC-e.',
        },
        { status: 400 }
      );
    }

    const clienteRaw = ordem.cliente as
      | { nome?: string | null; cpf?: string | null; documento?: string | null }
      | Array<{ nome?: string | null; cpf?: string | null; documento?: string | null }>
      | null;
    const cliente = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw;

    let vendaId: string | undefined = String(body.vendaId || '').trim() || undefined;
    if (!vendaId && ordem.numero_os != null) {
      const { data: vendaRow } = await admin
        .from('vendas')
        .select('id, forma_pagamento, observacoes')
        .eq('empresa_id', empresaId)
        .ilike('observacoes', `%O.S. #${ordem.numero_os}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (vendaRow?.id) vendaId = vendaRow.id;
    }

    let formaPagamento = String(body.formaPagamento || '');
    if (!formaPagamento && vendaId) {
      const { data: v } = await admin
        .from('vendas')
        .select('forma_pagamento')
        .eq('id', vendaId)
        .maybeSingle();
      formaPagamento = String(v?.forma_pagamento || '');
    }

    const usuario = await getUsuarioForAuth(userId);
    const descricaoPeca = String(ordem.peca || 'Peça / componente').slice(0, 120);
    const unitLiq = Math.round((valorLiquido / qtd) * 1e10) / 1e10;

    const result = await emitirNfceNacional(
      admin,
      empresaId,
      {
        itens: [
          {
            codigo: `OS${ordem.numero_os}`,
            descricao: descricaoPeca,
            quantidade: qtd,
            valorUnitario: unitLiq,
          },
        ],
        valorPago: valorLiquido,
        formaPagamento,
        tomador: {
          documento: onlyDigitsDoc(String(cliente?.documento || cliente?.cpf || '')),
          nome: String(cliente?.nome || '').trim() || undefined,
        },
        ordemServicoId: ordemId,
        vendaId,
        informacoes: `O.S. n. ${ordem.numero_os} - somente pecas (mao de obra em NFS-e).`,
      },
      { usuarioId: usuario?.id ?? null }
    );

    if (!result.ok) {
      const status = result.status === 'rejeitada' ? 422 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json({
      ...result,
      meta: {
        valorPecas: valorLiquido,
        valorServicoNaoIncluido: Math.round(totalServico * 100) / 100,
        numeroOs: ordem.numero_os,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, status: 'erro', message: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  getEmpresaIdForUser,
  getSessionUserId,
  getUsuarioForAuth,
} from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess, onlyDigitsDoc } from '@/modules/fiscal';
import { emitirNfceNacional } from '@/modules/fiscal/nfce/emitir';
import { extrairNumeroOSDaObservacao } from '@/utils/extrairNumeroOSDaObservacao';

export const runtime = 'nodejs';
export const preferredRegion = 'gru1';
export const maxDuration = 120;

/**
 * Emite NFC-e das peças a partir de uma venda vinculada a O.S.
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
    const vendaId = String(body.vendaId || '').trim();
    if (!vendaId) {
      return NextResponse.json({ error: 'vendaId é obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data: venda, error: vendaErr } = await admin
      .from('vendas')
      .select('id, observacoes, forma_pagamento')
      .eq('id', vendaId)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (vendaErr) return NextResponse.json({ error: vendaErr.message }, { status: 500 });
    if (!venda) return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });

    const { data: nfVenda } = await admin
      .from('fiscal_nfce')
      .select('id, chave_acesso, numero, status, protocolo')
      .eq('empresa_id', empresaId)
      .eq('venda_id', vendaId)
      .eq('status', 'autorizada')
      .maybeSingle();

    if (nfVenda && !body.forcar) {
      return NextResponse.json(
        {
          ok: false,
          status: 'ja_emitida',
          message: 'Já existe NFC-e autorizada para esta venda.',
          nfce: nfVenda,
        },
        { status: 409 }
      );
    }

    const { data: nfeVenda } = await admin
      .from('fiscal_nfe')
      .select('id, numero')
      .eq('empresa_id', empresaId)
      .eq('venda_id', vendaId)
      .eq('status', 'autorizada')
      .maybeSingle();
    if (nfeVenda && !body.forcar) {
      return NextResponse.json(
        {
          ok: false,
          status: 'erro',
          message: `Já existe NF-e nº ${nfeVenda.numero} para esta venda. Use a DANFE A4 ou force a emissão.`,
        },
        { status: 409 }
      );
    }

    const numeroOs = extrairNumeroOSDaObservacao(venda.observacoes);
    if (!numeroOs) {
      return NextResponse.json(
        {
          ok: false,
          status: 'erro',
          message: 'Esta venda não está vinculada a uma O.S.',
        },
        { status: 400 }
      );
    }

    const { data: ordem, error: osErr } = await admin
      .from('ordens_servico')
      .select(
        `
        id,
        numero_os,
        peca,
        valor_peca,
        qtd_peca,
        desconto,
        valor_servico,
        qtd_servico,
        cliente:cliente_id (nome, cpf, documento)
      `
      )
      .eq('empresa_id', empresaId)
      .eq('numero_os', Number(numeroOs))
      .maybeSingle();

    if (osErr) return NextResponse.json({ error: osErr.message }, { status: 500 });
    if (!ordem) {
      return NextResponse.json(
        { ok: false, status: 'erro', message: `O.S. #${numeroOs} não encontrada.` },
        { status: 404 }
      );
    }

    const { data: jaOs } = await admin
      .from('fiscal_nfce')
      .select('id, chave_acesso, numero, status, protocolo')
      .eq('empresa_id', empresaId)
      .eq('ordem_servico_id', ordem.id)
      .eq('status', 'autorizada')
      .maybeSingle();

    if (jaOs && !body.forcar) {
      if (!nfVenda) {
        await admin
          .from('fiscal_nfce')
          .update({ venda_id: vendaId })
          .eq('id', jaOs.id)
          .is('venda_id', null);
      }
      return NextResponse.json(
        {
          ok: false,
          status: 'ja_emitida',
          message: 'Já existe NFC-e autorizada para a O.S. desta venda.',
          nfce: jaOs,
        },
        { status: 409 }
      );
    }

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
          message: 'A O.S. desta venda não tem valor de peças para emitir NFC-e.',
        },
        { status: 400 }
      );
    }

    const clienteRaw = ordem.cliente as
      | { nome?: string | null; cpf?: string | null; documento?: string | null }
      | Array<{ nome?: string | null; cpf?: string | null; documento?: string | null }>
      | null;
    const cliente = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw;
    const usuario = await getUsuarioForAuth(userId);
    const unitLiq = Math.round((valorLiquido / qtd) * 1e10) / 1e10;

    const result = await emitirNfceNacional(
      admin,
      empresaId,
      {
        itens: [
          {
            codigo: `OS${ordem.numero_os}`,
            descricao: String(ordem.peca || 'Peça / componente').slice(0, 120),
            quantidade: qtd,
            valorUnitario: unitLiq,
          },
        ],
        valorPago: valorLiquido,
        formaPagamento: String(venda.forma_pagamento || ''),
        tomador: {
          documento: onlyDigitsDoc(String(cliente?.documento || cliente?.cpf || '')),
          nome: String(cliente?.nome || '').trim() || undefined,
        },
        ordemServicoId: ordem.id,
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
        vendaId,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, status: 'erro', message: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

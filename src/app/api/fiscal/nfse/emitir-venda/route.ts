import { NextRequest, NextResponse } from 'next/server';
import {
  getEmpresaIdForUser,
  getSessionUserId,
  getUsuarioForAuth,
} from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess, emitirNfseNacional, onlyDigitsDoc } from '@/modules/fiscal';
import { extrairNumeroOSDaObservacao } from '@/utils/extrairNumeroOSDaObservacao';

function digits(doc: string | null | undefined): string {
  return onlyDigitsDoc(String(doc || ''));
}

/**
 * Emite NFS-e Nacional a partir de uma venda vinculada a O.S. (mão de obra).
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
      .select('id, observacoes, empresa_id')
      .eq('id', vendaId)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (vendaErr) return NextResponse.json({ error: vendaErr.message }, { status: 500 });
    if (!venda) return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });

    const { data: nfVenda } = await admin
      .from('fiscal_nfse')
      .select('id, chave_acesso, numero_nfse, status')
      .eq('empresa_id', empresaId)
      .eq('venda_id', vendaId)
      .eq('status', 'autorizada')
      .maybeSingle();

    if (nfVenda && !body.forcar) {
      return NextResponse.json(
        {
          ok: false,
          status: 'ja_emitida',
          message: 'Já existe NFS-e autorizada para esta venda.',
          nfse: nfVenda,
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
          message:
            'Esta venda não está vinculada a uma O.S. Emita a NFS-e pela ordem de serviço.',
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
        empresa_id,
        servico,
        valor_servico,
        qtd_servico,
        valor_peca,
        qtd_peca,
        desconto,
        modelo,
        marca,
        cliente:cliente_id (
          nome,
          cpf,
          documento,
          email,
          telefone
        )
      `
      )
      .eq('empresa_id', empresaId)
      .eq('numero_os', Number(numeroOs))
      .maybeSingle();

    if (osErr) return NextResponse.json({ error: osErr.message }, { status: 500 });
    if (!ordem) {
      return NextResponse.json(
        {
          ok: false,
          status: 'erro',
          message: `O.S. #${numeroOs} não encontrada para emitir a NFS-e.`,
        },
        { status: 404 }
      );
    }

    const { data: jaEmitidaOs } = await admin
      .from('fiscal_nfse')
      .select('id, chave_acesso, numero_nfse, status')
      .eq('empresa_id', empresaId)
      .eq('ordem_servico_id', ordem.id)
      .eq('status', 'autorizada')
      .maybeSingle();

    if (jaEmitidaOs && !body.forcar) {
      // Vincula a nota existente à venda se ainda não estiver
      if (!nfVenda) {
        await admin
          .from('fiscal_nfse')
          .update({ venda_id: vendaId })
          .eq('id', jaEmitidaOs.id)
          .is('venda_id', null);
      }
      return NextResponse.json(
        {
          ok: false,
          status: 'ja_emitida',
          message: 'Já existe NFS-e autorizada para a O.S. desta venda.',
          nfse: jaEmitidaOs,
        },
        { status: 409 }
      );
    }

    const valorServicoUnit = Number(ordem.valor_servico || 0);
    const qtdServico = Number(ordem.qtd_servico || 1) || 1;
    const totalServico = valorServicoUnit * qtdServico;
    const totalPeca = Number(ordem.valor_peca || 0) * (Number(ordem.qtd_peca || 1) || 1);
    const desconto = Math.max(0, Number(ordem.desconto || 0));
    const bruto = totalServico + totalPeca;

    if (totalServico <= 0) {
      return NextResponse.json(
        {
          ok: false,
          status: 'erro',
          message: 'A O.S. desta venda não tem valor de serviço (mão de obra) para emitir NFS-e.',
        },
        { status: 400 }
      );
    }

    const descontoNoServico =
      bruto > 0 ? Math.min(totalServico, desconto * (totalServico / bruto)) : 0;
    const valorNfse = Math.round((totalServico - descontoNoServico) * 100) / 100;

    if (valorNfse <= 0) {
      return NextResponse.json(
        {
          ok: false,
          status: 'erro',
          message: 'Valor líquido do serviço ficou zerado após o desconto.',
        },
        { status: 400 }
      );
    }

    const clienteRaw = ordem.cliente as
      | {
          nome?: string | null;
          cpf?: string | null;
          documento?: string | null;
          email?: string | null;
          telefone?: string | null;
        }
      | Array<{
          nome?: string | null;
          cpf?: string | null;
          documento?: string | null;
          email?: string | null;
          telefone?: string | null;
        }>
      | null;

    const cliente = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw;
    const doc = digits(cliente?.documento) || digits(cliente?.cpf);
    const nome = String(cliente?.nome || '').trim();

    if (!nome || (doc.length !== 11 && doc.length !== 14)) {
      return NextResponse.json(
        {
          ok: false,
          status: 'erro',
          message:
            'Cliente sem CPF/CNPJ válido. Cadastre o documento do cliente antes de emitir a NFS-e.',
        },
        { status: 400 }
      );
    }

    const aparelho = [ordem.marca, ordem.modelo].filter(Boolean).join(' ').trim();
    const servicoDesc = String(ordem.servico || '').trim();
    const descricao =
      [
        servicoDesc || 'Serviço de assistência técnica',
        aparelho ? `— ${aparelho}` : '',
        `O.S. nº ${ordem.numero_os}`,
      ]
        .filter(Boolean)
        .join(' ')
        .slice(0, 2000);

    const usuario = await getUsuarioForAuth(userId);
    const result = await emitirNfseNacional(
      admin,
      empresaId,
      {
        valorServico: valorNfse,
        descricao,
        tomador: {
          documento: doc,
          nome,
          email: cliente?.email || undefined,
          telefone: cliente?.telefone || undefined,
        },
        ordemServicoId: ordem.id,
        vendaId,
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
        valorServico: valorNfse,
        valorPecasNaoIncluidas: Math.round(totalPeca * 100) / 100,
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

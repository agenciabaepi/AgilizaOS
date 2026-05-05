import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

function parseValorMonetarioInput(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const normalized = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Altera o plano de uma empresa
 * POST /api/admin-saas/empresas/[id]/alterar-plano
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId } = await params;
    const body = await req.json();
    const { plano_id, observacoes, valor_mensal } = body;

    if (!plano_id) {
      return NextResponse.json(
        { ok: false, message: 'plano_id é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verificar se o plano existe
    const { data: plano, error: planoError } = await supabase
      .from('planos')
      .select('id, nome, preco')
      .eq('id', plano_id)
      .single();

    if (planoError || !plano) {
      return NextResponse.json(
        { ok: false, message: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    let valorCobranca = Number(plano.preco);
    const manual = parseValorMonetarioInput(valor_mensal);
    if (manual != null) {
      valorCobranca = manual;
    }

    const obsExtra =
      valorCobranca !== Number(plano.preco)
        ? ` Valor mensal manual: R$ ${valorCobranca.toFixed(2)} (preço do plano: R$ ${Number(plano.preco).toFixed(2)}).`
        : '';

    // Buscar assinatura atual da empresa
    const { data: assinaturaAtual, error: assinaturaError } = await supabase
      .from('assinaturas')
      .select('id, status, data_fim')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const agora = new Date();
    const dataFim = new Date(agora);
    dataFim.setMonth(dataFim.getMonth() + 1); // Próximo mês

    // Se já existe assinatura, atualizar
    if (assinaturaAtual) {
      const { error: updateError } = await supabase
        .from('assinaturas')
        .update({
          plano_id: plano_id,
          valor: valorCobranca,
          status: 'active',
          data_fim: dataFim.toISOString(),
          proxima_cobranca: dataFim.toISOString(),
          observacoes:
            (observacoes || `Plano alterado para ${plano.nome} pelo admin`) + obsExtra,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assinaturaAtual.id);

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message },
          { status: 500 }
        );
      }

      // Atualizar também a coluna plano na tabela empresas (compatibilidade)
      await supabase
        .from('empresas')
        .update({ plano: plano.nome.toLowerCase() })
        .eq('id', empresaId);

      return NextResponse.json({
        ok: true,
        message: `Plano alterado para ${plano.nome} com sucesso`,
      });
    }

    // Se não existe assinatura, criar nova
    const { error: createError } = await supabase.from('assinaturas').insert({
      empresa_id: empresaId,
      plano_id: plano_id,
      status: 'active',
      valor: valorCobranca,
      data_inicio: agora.toISOString(),
      data_fim: dataFim.toISOString(),
      proxima_cobranca: dataFim.toISOString(),
      observacoes: (observacoes || `Assinatura criada para ${plano.nome} pelo admin`) + obsExtra,
    });

    if (createError) {
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
    }

    // Atualizar também a coluna plano na tabela empresas (compatibilidade)
    await supabase
      .from('empresas')
      .update({ plano: plano.nome.toLowerCase() })
      .eq('id', empresaId);

    return NextResponse.json({
      ok: true,
      message: `Assinatura criada para ${plano.nome} com sucesso`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { computeAdminEmpresaTrialFields } from '@/lib/adminEmpresaTrialBilling';
import { loadAssinaturaGovernanteAdmin } from '@/lib/billing/adminEmpresaAssinatura';

/**
 * Busca detalhes completos de uma empresa
 * GET /api/admin-saas/empresas/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId } = await params;
    const supabase = getSupabaseAdmin();

    // Buscar empresa
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json(
        { ok: false, message: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Contadores
    async function countBy(table: string, empresaId: string) {
      const { count } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId);
      return count || 0;
    }
    async function countProdutos(empresaId: string) {
      const { count } = await supabase
        .from('produtos_servicos')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('tipo', 'produto');
      return count || 0;
    }
    async function countServicos(empresaId: string) {
      const { count } = await supabase
        .from('produtos_servicos')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('tipo', 'servico');
      return count || 0;
    }

    const [usuarios, produtos, servicos, ordens] = await Promise.all([
      countBy('usuarios', empresaId),
      countProdutos(empresaId),
      countServicos(empresaId),
      countBy('ordens_servico', empresaId),
    ]);

    // Assinatura e cobrança (mesma linha governante do app — evita divergência com múltiplas linhas)
    const assinatura = await loadAssinaturaGovernanteAdmin(
      supabase,
      empresaId,
      empresa.created_at,
      empresa.dias_trial
    );

    const tf = computeAdminEmpresaTrialFields(assinatura, empresa.created_at, empresa.dias_trial);

    let planoNome = 'Assinatura';
    let planoSlug: string | null = null;
    if (assinatura?.plano_id) {
      try {
        const { data: plano } = await supabase
          .from('planos')
          .select('nome, slug')
          .eq('id', assinatura.plano_id)
          .limit(1)
          .single();
        if (plano?.nome) planoNome = plano.nome;
        if (plano?.slug) planoSlug = plano.slug;
      } catch {}
    }
    if (tf.trialImplicito && tf.dataTrialFim && !planoSlug) {
      planoNome = 'Trial';
    }

    let ultimoPagamento: any = null;
    try {
      const { data } = await supabase
        .from('pagamentos')
        .select('status,paid_at,created_at,valor')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      ultimoPagamento = data || null;
    } catch {}

    // Cálculo de vencimento (trial na assinatura ou implícito pela data da empresa)
    let vencido = false;
    let cobrancaStatus = '—';
    const hoje = new Date();
    if (empresa.sistema_liberado === true) {
      cobrancaStatus = 'Sistema liberado';
    } else if (tf.emTrialAtivo) {
      cobrancaStatus = 'Trial';
    } else if ((assinatura?.status === 'trial' || tf.trialImplicito) && tf.trialExpirado) {
      cobrancaStatus = 'Trial encerrado';
      vencido = true;
    } else if (assinatura?.status === 'active' || assinatura?.status === 'ativa') {
      cobrancaStatus = 'Em dia';
      if (assinatura?.proxima_cobranca) {
        const prox = new Date(assinatura.proxima_cobranca);
        if (prox < new Date(hoje.toDateString())) {
          vencido = true;
          cobrancaStatus = 'Vencido';
        }
      }
    } else if (assinatura?.status) {
      cobrancaStatus = assinatura.status;
    }

    const valorMensal =
      assinatura?.valor != null && assinatura.valor !== ''
        ? Number(assinatura.valor)
        : null;

    const billing = {
      plano: { id: assinatura?.plano_id || null, nome: planoNome, slug: planoSlug },
      assinaturaStatus: assinatura?.status || null,
      valorMensal: Number.isFinite(valorMensal as number) ? (valorMensal as number) : null,
      proximaCobranca: assinatura?.proxima_cobranca || null,
      vencido,
      cobrancaStatus,
      ultimoPagamentoStatus: ultimoPagamento?.status || null,
      ultimoPagamentoPagoEm: ultimoPagamento?.paid_at || null,
      ultimoPagamentoValor: ultimoPagamento?.valor || null,
      dataTrialFim: tf.dataTrialFim,
      diasTrialRestantes: tf.diasTrialRestantes,
      diasTrial: empresa.dias_trial ?? null,
      trialImplicito: tf.trialImplicito,
    };

    const empresaCompleta = {
      ...empresa,
      metrics: { usuarios, produtos, servicos, ordens, usoMb: null as number | null },
      billing,
    };

    return NextResponse.json({ ok: true, empresa: empresaCompleta });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}

/**
 * Atualiza uma empresa (ativo, status aprovação, dados cadastrais).
 * PATCH /api/admin-saas/empresas/[id]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};
    if (typeof body.ativo === 'boolean') updateData.ativo = body.ativo;
    if (typeof body.sistema_liberado === 'boolean') updateData.sistema_liberado = body.sistema_liberado;
    if (typeof body.status === 'string' && ['pendente', 'aprovada', 'reprovada'].includes(body.status)) {
      updateData.status = body.status;
    }

    // Colunas que existem no cadastro base de `empresas` no projeto (sem logos claro/escuro — dependem de migration opcional).
    const stringFields = [
      'nome',
      'email',
      'cnpj',
      'cpf',
      'telefone',
      'endereco',
      'cidade',
      'website',
      'logo_url',
    ] as const;

    for (const key of stringFields) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
      const v = body[key];
      if (v === null) {
        updateData[key] = null;
      } else if (typeof v === 'string') {
        updateData[key] = v.trim();
      }
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'nome')) {
      const n = String(updateData.nome ?? '').trim();
      if (!n) {
        return NextResponse.json({ ok: false, message: 'Nome da empresa não pode ficar vazio' }, { status: 400 });
      }
      updateData.nome = n;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ ok: false, message: 'Nenhum campo válido para atualizar' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: empresa, error } = await supabase
      .from('empresas')
      .update(updateData)
      .eq('id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('[admin-saas/empresas] Erro PATCH:', error);
      return NextResponse.json(
        { ok: false, message: (error as { message?: string }).message || 'Falha ao atualizar' },
        { status: 500 }
      );
    }
    if (!empresa) {
      return NextResponse.json({ ok: false, message: 'Empresa não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, empresa });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}

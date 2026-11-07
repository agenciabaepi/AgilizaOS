import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { forcarLiberacaoPorUltimoPagamentoAsaas } from '@/modules/assinatura/servicos/processarPagamentoConfirmado';
import { carregarEstadoAssinaturaEmpresa } from '@/modules/assinatura/servicos/estado';
import { calcularDataFimTrialYmd, toYmd } from '@/modules/assinatura';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Resumo da assinatura (sistema novo: trial 30d → pró-rata → dia 10).
 * Se bloqueado mas houver PIX confirmado, libera na hora e responde.
 */
export async function GET(req: NextRequest) {
  try {
    let authUserId: string | null = null;

    const bearer = req.headers.get('Authorization')?.startsWith('Bearer ')
      ? req.headers.get('Authorization')!.slice(7)
      : null;
    if (bearer) {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await sb.auth.getUser(bearer);
      if (!error && data.user) authUserId = data.user.id;
    }

    if (!authUserId) {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error && user) authUserId = user.id;
    }

    if (!authUserId) {
      return NextResponse.json({ assinatura: null, error: 'Não autenticado' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: usuario, error: uErr } = await admin
      .from('usuarios')
      .select('empresa_id')
      .or(`auth_user_id.eq.${authUserId},id.eq.${authUserId}`)
      .maybeSingle();

    if (uErr || !usuario?.empresa_id) {
      return NextResponse.json({ assinatura: null, empresa_created_at: null });
    }

    const empresaId = usuario.empresa_id as string;
    let estado = await carregarEstadoAssinaturaEmpresa(admin, empresaId);

    if (estado.acesso_bloqueado && !estado.sistemaLiberado) {
      const reparo = await forcarLiberacaoPorUltimoPagamentoAsaas(admin, empresaId);
      if (reparo.ok) {
        estado = await carregarEstadoAssinaturaEmpresa(admin, empresaId);
      }
    }

    const row = estado.assinatura as Record<string, unknown> | null;
    let planos: Record<string, unknown> | null = null;
    const planoId = row?.plano_id as string | undefined;
    if (planoId) {
      const { data: p } = await admin
        .from('planos')
        .select(
          'nome, descricao, preco, slug, limite_usuarios, limite_produtos, limite_clientes, limite_fornecedores, recursos_disponiveis'
        )
        .eq('id', planoId)
        .maybeSingle();
      planos = p as Record<string, unknown> | null;
    }

    const contratacao = toYmd((row?.data_inicio as string) || estado.empresaCreatedAt);
    const trialFim =
      estado.trial_fim_ymd || (contratacao ? calcularDataFimTrialYmd(contratacao) : null);

    return NextResponse.json({
      assinatura: row ? { ...row, planos } : null,
      resumo: {
        fase: estado.fase,
        motivo: estado.motivo,
        vencimento_ymd: estado.vencimento_ymd,
        trial_fim_ymd: trialFim,
        tipo_cobranca: estado.tipo_cobranca,
        cotacao: estado.cotacao,
      },
      empresa_created_at: estado.empresaCreatedAt,
      sistema_liberado: estado.sistemaLiberado,
      recursos_customizados: null,
      acesso_bloqueado: estado.acesso_bloqueado,
    });
  } catch (e) {
    console.error('GET /api/assinatura/minha:', e);
    return NextResponse.json({ assinatura: null, error: 'Erro interno' }, { status: 500 });
  }
}

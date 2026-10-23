import { NextRequest, NextResponse } from 'next/server';
import { assertEmpresaTemRecurso } from '@/lib/billing/assertPlanResource';
import { gerarComissoesPendentesEmpresa } from '@/lib/gerarComissoesPendentes';

/**
 * POST /api/comissoes/gerar-pendentes
 * Busca OS finalizadas que ainda não têm comissão e gera os registros faltantes.
 * Body: { empresa_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const empresa_id = body.empresa_id;

    if (!empresa_id) {
      return NextResponse.json(
        { error: 'empresa_id é obrigatório' },
        { status: 400 }
      );
    }

    const planGate = await assertEmpresaTemRecurso(String(empresa_id), 'lucro_desempenho');
    if (!planGate.ok) return planGate.response;

    const resultado = await gerarComissoesPendentesEmpresa(String(empresa_id), {
      notificarPush: true,
    });

    return NextResponse.json({
      success: true,
      message:
        resultado.geradas > 0
          ? `${resultado.geradas} comissão(ões) gerada(s).`
          : 'Nenhuma comissão pendente para gerar.',
      geradas: resultado.geradas,
      totalPendentes: resultado.totalPendentes,
      erros: resultado.erros.length ? resultado.erros : undefined,
    });
  } catch (error: any) {
    console.error('Erro ao gerar comissões pendentes:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar comissões pendentes' },
      { status: 500 }
    );
  }
}

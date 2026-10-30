import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import {
  resolveTecnicoFromRequest,
  tecnicoIdOrFilter,
} from '@/lib/gclist/resolveTecnicoFromRequest';

type TestResultPayload = {
  id: string;
  label: string;
  category: 'auto' | 'manual';
  status: 'pass' | 'fail' | 'skip' | 'pending';
  note?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * POST /api/gclist/submit
 * Salva checklist_entrega somente se a OS for do técnico autenticado.
 * Auth: Authorization: Bearer <access_token>
 * Body: { numero_os | osId, report }
 */
export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveTecnicoFromRequest(request);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { tecnico } = resolved;

    const body = await request.json();
    const numeroOs = body?.numero_os != null ? String(body.numero_os).trim() : '';
    const osId = body?.osId != null ? String(body.osId).trim() : '';
    const report = body?.report;

    if (!numeroOs && !osId) {
      return NextResponse.json({ error: 'Informe numero_os ou osId' }, { status: 400 });
    }

    if (!report || typeof report !== 'object') {
      return NextResponse.json({ error: 'Relatório inválido' }, { status: 400 });
    }

    const tests = Array.isArray(report.tests) ? (report.tests as TestResultPayload[]) : [];
    if (tests.length === 0) {
      return NextResponse.json({ error: 'Nenhum teste no relatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const isUuid =
      !!osId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(osId);

    let query = supabase
      .from('ordens_servico')
      .select('id, numero_os, empresa_id, status, tecnico_id')
      .eq('empresa_id', tecnico.empresaId)
      .or(tecnicoIdOrFilter(tecnico.tecnicoIds))
      .limit(1);

    if (isUuid) {
      query = query.eq('id', osId);
    } else if (numeroOs) {
      query = query.eq('numero_os', numeroOs);
    } else {
      query = query.eq('id', osId);
    }

    let { data: os, error: buscaError } = await query.maybeSingle();

    if ((!os || buscaError) && numeroOs && /^\d+$/.test(numeroOs) && !isUuid) {
      const res = await supabase
        .from('ordens_servico')
        .select('id, numero_os, empresa_id, status, tecnico_id')
        .eq('empresa_id', tecnico.empresaId)
        .or(tecnicoIdOrFilter(tecnico.tecnicoIds))
        .eq('numero_os', parseInt(numeroOs, 10))
        .limit(1)
        .maybeSingle();
      os = res.data;
      buscaError = res.error;
    }

    if (buscaError) {
      console.error('[gclist/submit] busca', buscaError);
      return NextResponse.json({ error: 'Erro ao buscar OS' }, { status: 500 });
    }

    if (!os) {
      return NextResponse.json(
        { error: 'OS não encontrada entre as suas ordens' },
        { status: 404 }
      );
    }

    if (String(os.status || '').toUpperCase() === 'ENTREGUE') {
      return NextResponse.json(
        { error: 'Esta O.S. já foi entregue e está bloqueada.' },
        { status: 409 }
      );
    }

    const passed = tests.filter((t) => t.status === 'pass').length;
    const failed = tests.filter((t) => t.status === 'fail').length;
    const skipped = tests.filter((t) => t.status === 'skip').length;

    const payload = {
      version: 1,
      source: 'gclist',
      submitted_at: new Date().toISOString(),
      submitted_by: {
        usuario_id: tecnico.usuarioId,
        auth_user_id: tecnico.authUserId,
        nome: tecnico.nome,
      },
      summary: {
        total: tests.length,
        passed,
        failed,
        skipped,
        ...(report.summary && typeof report.summary === 'object' ? report.summary : {}),
      },
      device: report.device ?? null,
      technician_note: report.technician_note ?? null,
      tests,
    };

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('ordens_servico')
      .update({
        checklist_entrega: JSON.stringify(payload),
        checklist_entrega_em: now,
        updated_at: now,
      })
      .eq('id', os.id)
      .eq('empresa_id', tecnico.empresaId)
      .select('id, numero_os')
      .single();

    if (updateError) {
      console.error('[gclist/submit] update', updateError);
      return NextResponse.json({ error: 'Erro ao salvar checklist' }, { status: 500 });
    }

    try {
      await supabase.from('os_historico').insert({
        os_id: os.id,
        empresa_id: os.empresa_id,
        acao: 'CHECKLIST_ENTREGA',
        descricao: `Checklist de entrega (GCList) por ${tecnico.nome || 'técnico'} — ${passed} OK, ${failed} falha(s), ${skipped} pulado(s)`,
        created_at: now,
      });
    } catch (histErr) {
      console.warn('[gclist/submit] histórico ignorado', histErr);
    }

    return NextResponse.json({
      ok: true,
      osId: updated.id,
      numeroOs: updated.numero_os,
      summary: payload.summary,
      submittedAt: now,
    });
  } catch (e) {
    console.error('[gclist/submit]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

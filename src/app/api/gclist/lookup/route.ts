import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import {
  resolveTecnicoFromRequest,
  tecnicoIdOrFilter,
} from '@/lib/gclist/resolveTecnicoFromRequest';

/**
 * GET /api/gclist/lookup?numero_os=123 | ?osId=uuid
 * Busca uma OS do técnico autenticado (empresa + tecnico_id).
 * Auth: Authorization: Bearer <access_token>
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveTecnicoFromRequest(request);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { tecnico } = resolved;
    const numeroOs = request.nextUrl.searchParams.get('numero_os')?.trim();
    const osIdParam = request.nextUrl.searchParams.get('osId')?.trim();

    if (!numeroOs && !osIdParam) {
      return NextResponse.json({ error: 'Informe numero_os ou osId' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const isUuid =
      !!osIdParam &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        osIdParam
      );

    let query = supabase
      .from('ordens_servico')
      .select(
        'id, numero_os, empresa_id, status, status_tecnico, equipamento, marca, modelo, cor, checklist_entrega, checklist_entrega_em, cliente:cliente_id(nome)'
      )
      .eq('empresa_id', tecnico.empresaId)
      .or(tecnicoIdOrFilter(tecnico.tecnicoIds))
      .limit(1);

    if (isUuid) {
      query = query.eq('id', osIdParam!);
    } else if (numeroOs) {
      query = query.eq('numero_os', numeroOs);
    } else if (osIdParam) {
      query = query.eq('id', osIdParam);
    }

    let { data: os, error } = await query.maybeSingle();

    if ((!os || error) && numeroOs && /^\d+$/.test(numeroOs) && !isUuid) {
      const res = await supabase
        .from('ordens_servico')
        .select(
          'id, numero_os, empresa_id, status, status_tecnico, equipamento, marca, modelo, cor, checklist_entrega, checklist_entrega_em, cliente:cliente_id(nome)'
        )
        .eq('empresa_id', tecnico.empresaId)
        .or(tecnicoIdOrFilter(tecnico.tecnicoIds))
        .eq('numero_os', parseInt(numeroOs, 10))
        .limit(1)
        .maybeSingle();
      os = res.data;
      error = res.error;
    }

    if (error) {
      console.error('[gclist/lookup]', error);
      return NextResponse.json({ error: 'Erro ao buscar OS' }, { status: 500 });
    }

    if (!os) {
      return NextResponse.json(
        { error: 'OS não encontrada entre as suas ordens', notFound: true },
        { status: 404 }
      );
    }

    const status = String(os.status || '').toUpperCase();
    if (status === 'ENTREGUE') {
      return NextResponse.json(
        { error: 'Esta O.S. já foi entregue e não pode receber novo checklist.' },
        { status: 409 }
      );
    }

    let empresaNome = '';
    const { data: empresa } = await supabase
      .from('empresas')
      .select('nome')
      .eq('id', tecnico.empresaId)
      .maybeSingle();
    empresaNome = empresa?.nome ?? '';

    const cliente = os.cliente as { nome?: string } | { nome?: string }[] | null;
    const clienteNome = Array.isArray(cliente) ? cliente[0]?.nome : cliente?.nome;

    return NextResponse.json({
      ok: true,
      osId: os.id,
      numeroOs: os.numero_os,
      empresaId: os.empresa_id,
      empresaNome,
      status: os.status,
      statusTecnico: os.status_tecnico,
      equipamento: os.equipamento,
      marca: os.marca,
      modelo: os.modelo,
      cor: os.cor,
      clienteNome: clienteNome ?? null,
      jaTemChecklist: !!os.checklist_entrega,
      checklistEntregaEm: os.checklist_entrega_em,
    });
  } catch (e) {
    console.error('[gclist/lookup]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

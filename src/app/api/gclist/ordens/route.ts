import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import {
  resolveTecnicoFromRequest,
  tecnicoIdOrFilter,
} from '@/lib/gclist/resolveTecnicoFromRequest';

/**
 * GET /api/gclist/ordens?q=opcional
 * Lista OS do técnico autenticado na empresa dele (não entregues).
 * Auth: Authorization: Bearer <access_token>
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveTecnicoFromRequest(request);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { tecnico } = resolved;
    const q = request.nextUrl.searchParams.get('q')?.trim() || '';
    const supabase = createAdminClient();

    // Escopo explícito no .or: (empresa AND tecnico_id=A) OR (empresa AND tecnico_id=B)
    // evita ambiguidade do PostgREST ao misturar .eq + .or em filtros distintos.
    const scopedOr = tecnico.tecnicoIds
      .map(
        (id) =>
          `and(empresa_id.eq.${tecnico.empresaId},tecnico_id.eq.${id})`
      )
      .join(',');

    const { data, error } = await supabase
      .from('ordens_servico')
      .select(
        'id, numero_os, empresa_id, status, status_tecnico, equipamento, marca, modelo, cor, checklist_entrega, checklist_entrega_em, cliente:cliente_id(nome)'
      )
      .or(scopedOr || tecnicoIdOrFilter(tecnico.tecnicoIds))
      .neq('status', 'ENTREGUE')
      .order('created_at', { ascending: false })
      .limit(120);

    if (error) {
      console.error('[gclist/ordens]', error);
      return NextResponse.json({ error: 'Erro ao listar OS' }, { status: 500 });
    }

    let empresaNome = '';
    const { data: empresa } = await supabase
      .from('empresas')
      .select('nome')
      .eq('id', tecnico.empresaId)
      .maybeSingle();
    empresaNome = empresa?.nome ?? '';

    const qNorm = q.toLowerCase();
    const ordens = (data || [])
      .map((os: any) => {
        const cliente = os.cliente as { nome?: string } | { nome?: string }[] | null;
        const clienteNome = Array.isArray(cliente) ? cliente[0]?.nome : cliente?.nome;
        return {
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
        };
      })
      .filter((os) => {
        if (!qNorm) return true;
        const hay = [
          String(os.numeroOs ?? ''),
          os.modelo,
          os.marca,
          os.equipamento,
          os.clienteNome,
          os.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(qNorm);
      });

    return NextResponse.json({
      ok: true,
      tecnico: { id: tecnico.usuarioId, nome: tecnico.nome, empresaId: tecnico.empresaId },
      empresaNome,
      ordens,
    });
  } catch (e) {
    console.error('[gclist/ordens]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

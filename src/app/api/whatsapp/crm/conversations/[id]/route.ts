import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import { getOsContextoByConversa } from '@/lib/whatsapp-crm/os-context';
import { listOrdensClienteConversa } from '@/lib/whatsapp-crm/client-orders';
import { CONVERSA_USUARIO_JOIN } from '@/lib/whatsapp-crm/atendentes';
import { assertWhatsAppCrmAccess } from '@/lib/whatsapp-crm/guard';

async function resolveEmpresa(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return null;
  const empresaId = await getEmpresaIdForUser(userId);
  if (!empresaId) return null;
  return { userId, empresaId };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: conversa, error } = await supabase
      .from('whatsapp_conversas')
      .select(
        `*,
        clientes ( id, nome, telefone, celular, email, documento, observacoes ),
        ordens_servico ( id, numero_os, status, status_tecnico, equipamento, marca, modelo, valor_faturado, valor_servico, valor_peca ),
        ${CONVERSA_USUARIO_JOIN}`
      )
      .eq('id', id)
      .eq('empresa_id', auth.empresaId)
      .maybeSingle();

    if (error) throw error;
    if (!conversa) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });

    const { data: mensagens } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('conversa_id', id)
      .order('created_at', { ascending: true });

    const { data: notas } = await supabase
      .from('whatsapp_conversa_notas')
      .select('*')
      .eq('conversa_id', id)
      .order('created_at', { ascending: false });

    const osContexto = await getOsContextoByConversa(supabase, id);

    const ordensCliente = await listOrdensClienteConversa(supabase, auth.empresaId, {
      cliente_id: conversa.cliente_id,
      telefone: conversa.telefone,
    });

    await supabase
      .from('whatsapp_conversas')
      .update({ nao_lidas: 0 })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      data: {
        conversa,
        mensagens: mensagens ?? [],
        notas: notas ?? [],
        os_contexto: osContexto,
        ordens_cliente: ordensCliente,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const supabase = createAdminClient();

    const allowed = ['status', 'os_id', 'cliente_id', 'atribuido_usuario_id'];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from('whatsapp_conversas')
      .update(updates)
      .eq('id', id)
      .eq('empresa_id', auth.empresaId)
      .select(
        `*,
        clientes ( id, nome, telefone, celular, email ),
        ordens_servico ( id, numero_os, status, equipamento, marca, modelo ),
        ${CONVERSA_USUARIO_JOIN}`
      )
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

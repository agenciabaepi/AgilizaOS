import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import { getOsContextoByConversa } from '@/lib/whatsapp-crm/os-context';

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
    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: conversa, error } = await supabase
      .from('whatsapp_conversas')
      .select(
        `*,
        clientes ( id, nome, telefone, celular, email, documento, observacoes ),
        ordens_servico ( id, numero_os, status, status_tecnico, equipamento, marca, modelo, valor_faturado, valor_servico, valor_peca )`
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
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

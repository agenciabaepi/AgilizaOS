import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import { getOsContextoByConversa } from '@/lib/whatsapp-crm/os-context';
import { listOrdensClienteConversa } from '@/lib/whatsapp-crm/client-orders';
import { CONVERSA_USUARIO_JOIN } from '@/lib/whatsapp-crm/atendentes';
import { markConversaLida } from '@/lib/whatsapp-crm/conversations';
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
    const { searchParams } = new URL(req.url);
    /** light=1 → só chat (rápido). full → inclui OS/sidebar. */
    const light = searchParams.get('light') === '1';
    const markRead = searchParams.get('mark_read') !== '0';
    const msgLimit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '120', 10) || 120, 20),
      300
    );

    const supabase = createAdminClient();

    const conversaPromise = supabase
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

    const mensagensPromise = supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('conversa_id', id)
      .order('created_at', { ascending: false })
      .limit(msgLimit);

    const notasPromise = supabase
      .from('whatsapp_conversa_notas')
      .select('*')
      .eq('conversa_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    const [{ data: conversa, error }, mensagensRes, notasRes] = await Promise.all([
      conversaPromise,
      mensagensPromise,
      notasPromise,
    ]);

    if (error) throw error;
    if (!conversa) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });

    // Buscamos as mais recentes (desc) e devolvemos em ordem cronológica
    const mensagens = [...(mensagensRes.data ?? [])].reverse();
    const notas = notasRes.data ?? [];

    let osContexto: Awaited<ReturnType<typeof getOsContextoByConversa>> = [];
    let ordensCliente: Awaited<ReturnType<typeof listOrdensClienteConversa>> = [];

    if (!light) {
      const [osCtx, ordens] = await Promise.all([
        getOsContextoByConversa(supabase, id),
        listOrdensClienteConversa(supabase, auth.empresaId, {
          cliente_id: conversa.cliente_id,
          telefone: conversa.telefone,
        }),
      ]);
      osContexto = osCtx;
      ordensCliente = ordens;
    }

    if (markRead) {
      // Não bloqueia a resposta — leitura em paralelo
      void markConversaLida(supabase, {
        conversaId: id,
        empresaId: auth.empresaId,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          conversa: { ...conversa, nao_lidas: 0, ultima_leitura_em: new Date().toISOString() },
          mensagens,
          notas,
          os_contexto: osContexto,
          ordens_cliente: ordensCliente,
        },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
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

    if (body?.nao_lidas === 0 || body?.mark_read === true) {
      const data = await markConversaLida(supabase, {
        conversaId: id,
        empresaId: auth.empresaId,
      });
      return NextResponse.json({ success: true, data });
    }

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

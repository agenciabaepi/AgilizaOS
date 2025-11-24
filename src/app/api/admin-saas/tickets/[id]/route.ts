import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { criarNotificacaoTicket, formatarMensagemNotificacao } from '@/lib/notificacoes-tickets';

/**
 * Buscar ticket específico
 * GET /api/admin-saas/tickets/[id]
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

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // Buscar ticket com relacionamentos
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets_suporte')
      .select(`
        *,
        empresa:empresas(id, nome, email, logo_url, telefone),
        usuario:usuarios!tickets_suporte_usuario_id_fkey(id, nome, email),
        resolvido_por_usuario:usuarios!tickets_suporte_resolvido_por_fkey(id, nome, email)
      `)
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { ok: false, message: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    // Buscar comentários
    const { data: comentarios, error: comentariosError } = await supabase
      .from('tickets_comentarios')
      .select(`
        *,
        usuario:usuarios(id, nome, email)
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      ok: true,
      ticket: {
        ...ticket,
        comentarios: comentarios || []
      }
    });

  } catch (error) {
    console.error('Erro ao buscar ticket:', error);
    return NextResponse.json(
      { ok: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Atualizar ticket
 * PATCH /api/admin-saas/tickets/[id]
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

    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    // Buscar usuário admin atual
    const authHeader = req.headers.get('authorization');
    let adminUserId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: adminUser } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
        adminUserId = adminUser?.id || null;
      }
    }

    const updateData: any = {};
    
    if (body.status !== undefined) {
      updateData.status = body.status;
      
      // Se marcado como resolvido, atualizar campos de resolução
      if (body.status === 'resolvido' && adminUserId) {
        updateData.resolvido_por = adminUserId;
        updateData.resolvido_em = new Date().toISOString();
        if (body.resposta_suporte) {
          updateData.resposta_suporte = body.resposta_suporte;
        }
      }
    }
    
    if (body.prioridade !== undefined) {
      updateData.prioridade = body.prioridade;
    }
    
    if (body.categoria !== undefined) {
      updateData.categoria = body.categoria;
    }
    
    if (body.resposta_suporte !== undefined && body.status !== 'resolvido') {
      updateData.resposta_suporte = body.resposta_suporte;
    }

    // Sempre atualizar updated_at quando houver mudanças
    updateData.updated_at = new Date().toISOString();

    // Buscar ticket atual antes de atualizar para ter os dados da empresa
    const { data: ticketAntes, error: errorAntes } = await supabase
      .from('tickets_suporte')
      .select('empresa_id, titulo, status')
      .eq('id', id)
      .single();

    if (errorAntes || !ticketAntes) {
      console.error('Erro ao buscar ticket antes da atualização:', errorAntes);
      return NextResponse.json(
        { ok: false, message: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    const { data: ticket, error } = await supabase
      .from('tickets_suporte')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        empresa:empresas(id, nome, email, logo_url),
        usuario:usuarios!tickets_suporte_usuario_id_fkey(id, nome, email),
        resolvido_por_usuario:usuarios!tickets_suporte_resolvido_por_fkey(id, nome, email)
      `)
      .single();

    if (error) {
      console.error('Erro ao atualizar ticket:', error);
      return NextResponse.json(
        { ok: false, message: 'Erro ao atualizar ticket' },
        { status: 500 }
      );
    }

    // Criar notificações baseado no que foi alterado
    try {
      // Se houve resposta do suporte
      if (body.resposta_suporte !== undefined && body.resposta_suporte) {
        await criarNotificacaoTicket({
          empresa_id: ticketAntes.empresa_id,
          ticket_id: id,
          tipo: 'ticket_resposta',
          mensagem: formatarMensagemNotificacao('ticket_resposta', ticketAntes.titulo),
          ticket_titulo: ticketAntes.titulo
        });
      }

      // Se houve mudança de status
      if (body.status !== undefined && body.status !== ticketAntes.status) {
        await criarNotificacaoTicket({
          empresa_id: ticketAntes.empresa_id,
          ticket_id: id,
          tipo: 'ticket_status',
          mensagem: formatarMensagemNotificacao('ticket_status', ticketAntes.titulo, {
            status: body.status
          }),
          ticket_titulo: ticketAntes.titulo
        });
      }
    } catch (notifError) {
      // Não falhar a requisição se a notificação falhar
      console.error('Erro ao criar notificação (não crítico):', notifError);
    }

    return NextResponse.json({
      ok: true,
      ticket
    });

  } catch (error) {
    console.error('Erro ao atualizar ticket:', error);
    return NextResponse.json(
      { ok: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}


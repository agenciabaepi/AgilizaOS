import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { criarNotificacaoTicket } from '@/lib/notificacoes-tickets';

/**
 * Adicionar comentário ao ticket
 * POST /api/admin-saas/tickets/[id]/comentarios
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: ticketId } = await params;
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

    if (!body.comentario) {
      return NextResponse.json(
        { ok: false, message: 'Comentário é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar dados do ticket para criar notificação
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets_suporte')
      .select('empresa_id, titulo')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticketData) {
      console.error('Erro ao buscar ticket para comentário:', ticketError);
      return NextResponse.json({ ok: false, message: 'Ticket não encontrado' }, { status: 404 });
    }

    // Criar comentário
    const { data: comentario, error } = await supabase
      .from('tickets_comentarios')
      .insert({
        ticket_id: ticketId,
        usuario_id: adminUserId,
        comentario: body.comentario,
        anexos_url: body.anexos_url || [],
        tipo: 'suporte'
      })
      .select(`
        *,
        usuario:usuarios(id, nome, email)
      `)
      .single();

    if (error) {
      console.error('Erro ao criar comentário:', error);
      return NextResponse.json(
        { ok: false, message: 'Erro ao criar comentário' },
        { status: 500 }
      );
    }

    // Criar notificação para a empresa
    try {
      await criarNotificacaoTicket({
        empresa_id: ticketData.empresa_id,
        ticket_id: ticketId,
        tipo: 'ticket_comentario',
        mensagem: `O suporte adicionou um comentário ao seu ticket #${ticketData.titulo}.`,
        ticket_titulo: ticketData.titulo
      });
    } catch (notifError) {
      // Não falhar a requisição se a notificação falhar
      console.error('Erro ao criar notificação de comentário (não crítico):', notifError);
    }

    return NextResponse.json({
      ok: true,
      comentario
    });

  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return NextResponse.json(
      { ok: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}


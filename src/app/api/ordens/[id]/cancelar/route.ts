import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUserId, getUsuarioForAuth } from '@/lib/api/routeAuthEmpresa';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isStatusCancelada, isStatusEntregue } from '@/lib/statusEmpresa';

function isAdminNivel(nivel: string | null | undefined): boolean {
  const n = String(nivel || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  return n === 'admin';
}

async function resolveAuthEmail(request: NextRequest, userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user?.id === userId && user.email) return user.email;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === userId && user.email) return user.email;

  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data?.user?.email || null;
}

/**
 * POST /api/ordens/[id]/cancelar
 * Cancela O.S. (status CANCELADA). Somente admin da empresa + senha do login.
 * Body: { senha: string, motivo?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: osId } = await params;
    if (!osId) {
      return NextResponse.json({ error: 'ID da O.S. é obrigatório' }, { status: 400 });
    }

    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const usuario = await getUsuarioForAuth(userId);
    if (!usuario?.empresa_id) {
      return NextResponse.json({ error: 'Usuário sem empresa vinculada' }, { status: 403 });
    }

    if (!isAdminNivel(usuario.nivel)) {
      return NextResponse.json(
        { error: 'Apenas administradores podem cancelar ordens de serviço' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const senha = typeof body.senha === 'string' ? body.senha : '';
    const motivo =
      typeof body.motivo === 'string' && body.motivo.trim()
        ? body.motivo.trim().slice(0, 500)
        : 'O.S. cancelada pelo administrador';

    if (!senha) {
      return NextResponse.json(
        { error: 'Informe a senha do administrador para confirmar o cancelamento' },
        { status: 400 }
      );
    }

    const email = await resolveAuthEmail(request, userId);
    if (!email) {
      return NextResponse.json({ error: 'E-mail do administrador não encontrado' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const verifyClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (signInError) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 400 });
    }

    const { data: os, error: osError } = await supabaseAdmin
      .from('ordens_servico')
      .select('id, numero_os, empresa_id, status, status_tecnico')
      .eq('id', osId)
      .eq('empresa_id', usuario.empresa_id)
      .maybeSingle();

    if (osError || !os) {
      return NextResponse.json({ error: 'O.S. não encontrada' }, { status: 404 });
    }

    if (isStatusEntregue(os.status)) {
      return NextResponse.json(
        { error: 'Não é possível cancelar uma O.S. já entregue' },
        { status: 409 }
      );
    }

    if (isStatusCancelada(os.status)) {
      return NextResponse.json({ error: 'Esta O.S. já está cancelada' }, { status: 409 });
    }

    const agora = new Date().toISOString();
    const { data: atualizada, error: updateError } = await supabaseAdmin
      .from('ordens_servico')
      .update({
        status: 'CANCELADA',
        status_tecnico: 'CANCELADA',
        updated_at: agora,
      })
      .eq('id', os.id)
      .eq('empresa_id', usuario.empresa_id)
      .select('id, numero_os, status, status_tecnico')
      .single();

    if (updateError || !atualizada) {
      console.error('Erro ao cancelar O.S.:', updateError);
      return NextResponse.json(
        { error: 'Erro ao cancelar a O.S.: ' + (updateError?.message || 'falha desconhecida') },
        { status: 500 }
      );
    }

    const registroHistorico = {
      os_id: os.id,
      status_anterior: os.status,
      status_novo: 'CANCELADA',
      status_tecnico_anterior: os.status_tecnico,
      status_tecnico_novo: 'CANCELADA',
      usuario_nome: usuario.nome || null,
      motivo,
      created_at: agora,
    };

    let { error: historicoError } = await supabaseAdmin
      .from('status_historico')
      .insert({ ...registroHistorico, usuario_id: usuario.id });
    if (historicoError) {
      ({ error: historicoError } = await supabaseAdmin
        .from('status_historico')
        .insert(registroHistorico));
    }
    if (historicoError) {
      console.warn('Histórico de cancelamento não registrado:', historicoError);
    }

    try {
      await supabaseAdmin.from('comissoes_historico').delete().eq('ordem_servico_id', os.id);
    } catch (comissaoErr) {
      console.warn('Falha ao remover comissão da O.S. cancelada:', comissaoErr);
    }

    return NextResponse.json({
      success: true,
      message: `O.S. #${os.numero_os ?? ''} cancelada com sucesso`,
      ordem: atualizada,
    });
  } catch (error: unknown) {
    console.error('Erro POST /api/ordens/[id]/cancelar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}

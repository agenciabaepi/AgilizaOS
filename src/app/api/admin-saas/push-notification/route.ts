import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * POST /api/admin-saas/push-notification
 * Envia notificação push personalizada para um técnico escolhido.
 * Body: { tecnico_id: string, title: string, body: string }
 * tecnico_id pode ser usuarios.id ou auth_user_id.
 */
export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { tecnico_id, title, body: messageBody } = body;

    if (!tecnico_id || typeof tecnico_id !== 'string' || !tecnico_id.trim()) {
      return NextResponse.json(
        { error: 'tecnico_id é obrigatório' },
        { status: 400 }
      );
    }

    const titleStr = typeof title === 'string' ? title.trim() : 'Notificação';
    const bodyStr = typeof messageBody === 'string' ? messageBody.trim() : '';

    const supabase = getSupabaseAdmin();

    // Resolver auth_user_id: tecnico_id pode ser usuarios.id ou auth_user_id
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, nome, auth_user_id')
      .or(`id.eq.${tecnico_id},auth_user_id.eq.${tecnico_id}`)
      .eq('nivel', 'tecnico')
      .limit(1)
      .maybeSingle();

    if (userError || !usuario) {
      return NextResponse.json(
        { error: 'Técnico não encontrado ou não é técnico' },
        { status: 404 }
      );
    }

    // Usar SOMENTE auth_user_id (auth.users.id). Nunca usuario.id – push_tokens é indexado por auth_user_id.
    // Se passarmos undefined/null no .eq(), o Supabase pode ignorar o filtro e retornar TODOS os tokens.
    const authUserId: string | null = usuario.auth_user_id ?? null;
    if (!authUserId || typeof authUserId !== 'string' || authUserId.trim() === '') {
      return NextResponse.json(
        { error: 'Técnico não possui login vinculado; não é possível enviar notificação push.' },
        { status: 400 }
      );
    }

    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('auth_user_id', authUserId);

    if (tokensError) {
      console.error('[admin-saas/push-notification] Erro ao buscar tokens:', tokensError);
      return NextResponse.json(
        { error: 'Erro ao buscar tokens de push' },
        { status: 500 }
      );
    }

    if (!tokens?.length) {
      return NextResponse.json(
        {
          error: 'Nenhum dispositivo registrado',
          hint: 'O técnico precisa abrir o app mobile e fazer login para registrar o token de notificação.',
        },
        { status: 400 }
      );
    }

    // Proteção: nunca enviar para mais que 10 dispositivos por técnico (evita envio em massa por bug).
    const tokensToSend = tokens.slice(0, 10);
    if (tokens.length > 10) {
      console.warn('[admin-saas/push-notification] Técnico com muitos dispositivos, enviando só aos 10 primeiros:', usuario.nome, tokens.length);
    }

    // Salvar no histórico para listagem no admin e para o app marcar "aberto"
    const { data: notifRow, error: insertError } = await supabase
      .from('notificacoes_push')
      .insert({
        auth_user_id: authUserId,
        usuario_id: usuario.id,
        titulo: titleStr || 'Notificação',
        mensagem: bodyStr || null,
        enviado_por: 'admin',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[admin-saas/push-notification] Erro ao salvar histórico:', insertError);
      // Continua e envia a push mesmo assim; histórico fica faltando só esta
    }

    const notificacaoId = notifRow?.id ?? null;

    const messages = tokensToSend.map((t: { token: string }) => ({
      to: t.token,
      title: titleStr || 'Notificação',
      body: bodyStr || ' ',
      channelId: 'ordens-servico',
      data: notificacaoId ? { notificacao_id: notificacaoId } : undefined,
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    const hasError = result.data?.some((r: { status?: string }) => r.status !== 'ok');

    if (hasError) {
      console.error('[admin-saas/push-notification] Resposta Expo:', result);
      return NextResponse.json(
        {
          ok: false,
          error: 'Falha ao enviar para um ou mais dispositivos',
          expo: result,
          sent_count: result.data?.filter((r: { status?: string }) => r.status === 'ok').length ?? 0,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      sent_count: messages.length,
      tecnico_nome: usuario.nome,
    });
  } catch (e) {
    console.error('[admin-saas/push-notification] Erro:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao enviar notificação' },
      { status: 500 }
    );
  }
}

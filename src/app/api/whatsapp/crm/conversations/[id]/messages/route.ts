import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId, getUsuarioForAuth } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import {
  appendMensagem,
  getEmpresaConfig,
  updateMensagemEntrega,
} from '@/lib/whatsapp-crm/conversations';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp-crm/graph-api';

async function resolveEmpresa(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return null;
  const empresaId = await getEmpresaIdForUser(userId);
  if (!empresaId) return null;
  return { userId, empresaId };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id: conversaId } = await params;
    const body = await req.json();
    const { conteudo, tipo = 'texto' } = body;

    if (!conteudo?.trim()) {
      return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: conversa, error: convError } = await supabase
      .from('whatsapp_conversas')
      .select('*')
      .eq('id', conversaId)
      .eq('empresa_id', auth.empresaId)
      .maybeSingle();

    if (convError || !conversa) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    const isNotaInterna = tipo === 'nota_interna';

    if (isNotaInterna) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('nome')
        .or(`auth_user_id.eq.${auth.userId},id.eq.${auth.userId}`)
        .maybeSingle();

      const { data: nota, error } = await supabase
        .from('whatsapp_conversa_notas')
        .insert({
          conversa_id: conversaId,
          empresa_id: auth.empresaId,
          conteudo: conteudo.trim(),
          autor_usuario_id: auth.userId,
          autor_nome: usuario?.nome ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: nota, tipo: 'nota_interna' });
    }

    const config = await getEmpresaConfig(supabase, auth.empresaId);
    if (!config?.ativo) {
      return NextResponse.json({ error: 'WhatsApp não configurado ou inativo' }, { status: 400 });
    }

    const texto = conteudo.trim();
    const usuario = await getUsuarioForAuth(auth.userId);

    const msg = await appendMensagem(supabase, {
      conversa_id: conversaId,
      empresa_id: auth.empresaId,
      direcao: 'saida',
      tipo: 'texto',
      conteudo: texto,
      status_entrega: 'enviada',
      os_id: conversa.os_id,
      enviado_por_usuario_id: usuario?.id ?? null,
    });

    const sendResult = await sendWhatsAppTextMessage({
      to: conversa.telefone,
      message: texto,
      config,
    });

    const msgFinal = await updateMensagemEntrega(supabase, msg.id, {
      meta_message_id: sendResult.messageId ?? null,
      status_entrega: sendResult.success ? 'enviada' : 'falha',
      erro_entrega: sendResult.success ? null : sendResult.error ?? 'Falha ao enviar',
    });

    return NextResponse.json({
      success: true,
      data: msgFinal,
      enviado_whatsapp: sendResult.success,
      erro: sendResult.success ? undefined : sendResult.error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

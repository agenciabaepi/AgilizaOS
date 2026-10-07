import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import { getEmpresaConfig, listConversas, whatsappConectado } from '@/lib/whatsapp-crm/conversations';
import { assertWhatsAppCrmAccess } from '@/lib/whatsapp-crm/guard';
import { getIaConfig, iaDisponivel } from '@/lib/whatsapp-crm/assistente-ia';
import type { WhatsAppIaResumo } from '@/lib/whatsapp-crm/types';

async function resolveEmpresa(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return null;
  const empresaId = await getEmpresaIdForUser(userId);
  if (!empresaId) return null;
  return { empresaId };
}

export async function GET(req: NextRequest) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;

    const supabase = createAdminClient();
    if (!whatsappConectado(await getEmpresaConfig(supabase, auth.empresaId))) {
      return NextResponse.json(
        { success: true, conectado: false, data: [] },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const [conversas, iaConfig] = await Promise.all([
      listConversas(supabase, auth.empresaId, { status }),
      getIaConfig(supabase, auth.empresaId),
    ]);
    const ia: WhatsAppIaResumo = {
      ativo: !!iaConfig?.ativo && iaDisponivel(),
      modo_resposta: iaConfig?.modo_resposta ?? 'sempre',
      nome_assistente: iaConfig?.nome_assistente ?? 'Assistente virtual',
    };

    return NextResponse.json(
      { success: true, conectado: true, data: conversas, ia },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

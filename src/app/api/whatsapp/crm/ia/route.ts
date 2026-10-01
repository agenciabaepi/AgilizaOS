import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import { assertWhatsAppCrmAccess } from '@/lib/whatsapp-crm/guard';
import {
  IA_CONFIG_PADRAO,
  getEmpresaBasica,
  getIaConfig,
  iaDisponivel,
  sanitizarIaConfig,
} from '@/lib/whatsapp-crm/assistente-ia';

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

    const supabase = createAdminClient();
    const [config, empresa] = await Promise.all([
      getIaConfig(supabase, auth.empresaId),
      getEmpresaBasica(supabase, auth.empresaId),
    ]);

    return NextResponse.json({
      success: true,
      data: config ?? { ...IA_CONFIG_PADRAO, empresa_id: auth.empresaId },
      empresa,
      ia_disponivel: iaDisponivel(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = (await req.json()) as Record<string, unknown>;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('whatsapp_ia_config')
      .upsert(
        {
          empresa_id: auth.empresaId,
          ...sanitizarIaConfig(body),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'empresa_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import { listAtendentesEmpresa } from '@/lib/whatsapp-crm/atendentes';
import { assertWhatsAppCrmAccess } from '@/lib/whatsapp-crm/guard';

export async function GET(req: NextRequest) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const userId = await getSessionUserId(req);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = createAdminClient();
    const atendentes = await listAtendentesEmpresa(supabase, empresaId);

    return NextResponse.json({ success: true, data: atendentes });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

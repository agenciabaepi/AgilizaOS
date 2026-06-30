import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import { listConversas } from '@/lib/whatsapp-crm/conversations';
import { assertWhatsAppCrmAccess } from '@/lib/whatsapp-crm/guard';

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
    const conversas = await listConversas(supabase, auth.empresaId, { status });

    return NextResponse.json({ success: true, data: conversas });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

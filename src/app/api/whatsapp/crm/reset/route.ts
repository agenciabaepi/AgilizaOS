import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import { clearEmpresaWhatsAppData } from '@/lib/whatsapp-crm/conversations';

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = createAdminClient();
    await clearEmpresaWhatsAppData(supabase, empresaId);

    return NextResponse.json({
      success: true,
      message: 'Dados do WhatsApp removidos para esta empresa.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

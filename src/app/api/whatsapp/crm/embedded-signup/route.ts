import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { completeEmbeddedSignup } from '@/lib/whatsapp-crm/embedded-signup';
import { assertWhatsAppCrmAccess } from '@/lib/whatsapp-crm/guard';

export async function POST(req: NextRequest) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const body = await req.json();
    const { code, waba_id, phone_number_id, business_id, connection_mode } = body;

    if (!code || !waba_id || !phone_number_id) {
      return NextResponse.json(
        { error: 'code, waba_id e phone_number_id são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await completeEmbeddedSignup({
      empresaId,
      code,
      wabaId: waba_id,
      phoneNumberId: phone_number_id,
      businessId: business_id,
      connectionMode: connection_mode,
    });

    return NextResponse.json({
      success: true,
      data: {
        display_phone_number: result.displayPhone,
        connection_mode: result.connectionMode,
        phone_number_id: phone_number_id,
        waba_id: waba_id,
        ativo: true,
      },
    });
  } catch (err) {
    console.error('Embedded Signup error:', err);
    const message = err instanceof Error ? err.message : 'Erro ao conectar WhatsApp';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

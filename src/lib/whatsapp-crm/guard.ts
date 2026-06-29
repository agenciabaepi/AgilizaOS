import { NextResponse } from 'next/server';
import { WHATSAPP_CRM_ENABLED } from '@/config/whatsapp-crm-config';

/** Bloqueia handlers da API CRM quando o recurso está desligado (deploy oficial). */
export function assertWhatsAppCrmEnabled(): NextResponse | null {
  if (!WHATSAPP_CRM_ENABLED) {
    return NextResponse.json({ error: 'Recurso indisponível' }, { status: 404 });
  }
  return null;
}

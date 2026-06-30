import { NextRequest, NextResponse } from 'next/server';
import { WHATSAPP_CRM_ENABLED } from '@/config/whatsapp-crm-config';
import { assertTemRecurso } from '@/lib/billing/assertPlanResource';

/** Bloqueia handlers da API CRM quando o recurso está desligado por env (rollout). */
export function assertWhatsAppCrmEnabled(): NextResponse | null {
  if (!WHATSAPP_CRM_ENABLED) {
    return NextResponse.json({ error: 'Recurso indisponível' }, { status: 404 });
  }
  return null;
}

/** Env + plano Completo (ou trial / override admin). */
export async function assertWhatsAppCrmAccess(req: NextRequest): Promise<NextResponse | null> {
  const envBlock = assertWhatsAppCrmEnabled();
  if (envBlock) return envBlock;

  const plan = await assertTemRecurso(req, 'whatsapp_crm');
  if (!plan.ok) return plan.response;
  return null;
}

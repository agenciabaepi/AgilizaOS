import { NextRequest, NextResponse } from 'next/server';
import { assertTemRecurso } from '@/lib/billing/assertPlanResource';
import { hasVaultKeyConfigured } from './crypto/vault';

/** Plano Completo / trial / override admin + cofre de certificado configurado. */
export async function assertFiscalAccess(req: NextRequest): Promise<NextResponse | null> {
  const plan = await assertTemRecurso(req, 'nota_fiscal');
  if (!plan.ok) return plan.response;

  if (!hasVaultKeyConfigured()) {
    return NextResponse.json(
      {
        error:
          'Cofre fiscal não configurado no servidor (FISCAL_CERT_ENCRYPTION_KEY). Contate o suporte.',
      },
      { status: 503 }
    );
  }

  return null;
}

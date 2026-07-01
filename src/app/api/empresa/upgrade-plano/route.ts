import { NextResponse } from 'next/server';

/**
 * Rota legada desativada — ativação de plano sem pagamento não é permitida via API pública.
 * Use o checkout PIX ou o painel admin SaaS.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Endpoint desativado por segurança. Assinaturas só são ativadas após pagamento confirmado ou pelo admin SaaS.',
    },
    { status: 403 }
  );
}

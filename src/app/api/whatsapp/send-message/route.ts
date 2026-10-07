import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { enviarMensagemWhatsAppMeta } from '@/lib/whatsapp-meta-envio';

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const resultado = await enviarMensagemWhatsAppMeta(body);
  return NextResponse.json(resultado.body, { status: resultado.status });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getUsuarioForAuth } from '@/lib/api/routeAuthEmpresa';
import { atualizarStatusOs } from '@/lib/ordens/atualizarStatusOs';

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const usuario = await getUsuarioForAuth(userId);
  if (!usuario?.empresa_id) {
    return NextResponse.json({ error: 'Usuário sem empresa vinculada' }, { status: 403 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
  }

  const { status, body: resultado } = await atualizarStatusOs(
    {
      ...body,
      usuario_id: body.usuario_id || usuario.id,
      usuario_nome: body.usuario_nome || usuario.nome,
    },
    { empresaIdAutorizado: usuario.empresa_id }
  );
  return NextResponse.json(resultado, { status });
}

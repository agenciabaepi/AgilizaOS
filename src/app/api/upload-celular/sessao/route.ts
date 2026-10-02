import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { criarTokenUploadCelular } from '@/lib/uploadCelularServer';

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa não encontrada para o usuário' }, { status: 403 });
    }

    const { token, sessao } = criarTokenUploadCelular(empresaId);
    return NextResponse.json({ token, expiraEm: sessao.expiraEm });
  } catch (error) {
    console.error('[upload-celular/sessao]', error);
    return NextResponse.json({ error: 'Erro ao criar sessão de upload' }, { status: 500 });
  }
}

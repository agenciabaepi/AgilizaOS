import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { buscarInfoAparelho, isChatGPTAvailable } from '@/lib/chatgpt';
import { assertTemRecurso } from '@/lib/billing/assertPlanResource';

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 3000;

export async function GET(request: NextRequest) {
  try {
    const access = await assertTemRecurso(request, 'ia');
    if (!access.ok) return access.response;

    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!isChatGPTAvailable()) {
      return NextResponse.json(
        { error: 'IA não configurada' },
        { status: 503 }
      );
    }

    const last = rateLimitMap.get(userId);
    if (last && Date.now() - last < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: 'Aguarde antes de fazer outra consulta' },
        { status: 429 }
      );
    }
    rateLimitMap.set(userId, Date.now());

    const { searchParams } = new URL(request.url);
    const marca = searchParams.get('marca')?.trim();
    const modelo = searchParams.get('modelo')?.trim();
    const tipo = searchParams.get('tipo')?.trim() || undefined;

    if (!marca || !modelo) {
      return NextResponse.json(
        { error: 'Parâmetros marca e modelo são obrigatórios' },
        { status: 400 }
      );
    }

    const info = await buscarInfoAparelho(marca, modelo, tipo);

    if (!info) {
      return NextResponse.json(
        { error: 'Não foi possível obter informações do aparelho. Verifique os créditos da API OpenAI.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ info });
  } catch (error) {
    console.error('Erro na busca de info do aparelho:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

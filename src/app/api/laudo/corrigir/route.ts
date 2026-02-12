import { NextRequest, NextResponse } from 'next/server';
import { corrigirLaudoTecnico, isChatGPTAvailable } from '@/lib/chatgpt';

/**
 * POST /api/laudo/corrigir
 * Corrige e melhora o texto do laudo técnico usando IA (ChatGPT).
 * Body: { texto: string }
 * Resposta: { success: true, textoCorrigido: string } ou { success: false, message: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const texto = typeof body.texto === 'string' ? body.texto : '';

    if (!texto || texto.trim().length < 10) {
      return NextResponse.json(
        { success: false, message: 'O texto deve ter pelo menos 10 caracteres.' },
        { status: 400 }
      );
    }

    if (!isChatGPTAvailable()) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Correção com IA não está disponível. Configure OPENAI_API_KEY nas variáveis de ambiente.',
        },
        { status: 503 }
      );
    }

    const textoCorrigido = await corrigirLaudoTecnico(texto);

    if (!textoCorrigido) {
      return NextResponse.json(
        { success: false, message: 'Não foi possível corrigir o texto. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      textoCorrigido,
    });
  } catch (err) {
    console.error('Erro em /api/laudo/corrigir:', err);
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error ? err.message : 'Erro ao corrigir texto. Tente novamente.',
      },
      { status: 500 }
    );
  }
}

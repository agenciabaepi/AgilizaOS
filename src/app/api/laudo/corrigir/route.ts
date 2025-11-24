import { NextRequest, NextResponse } from 'next/server';
import { corrigirLaudoTecnico } from '@/lib/chatgpt';
import { useAuth } from '@/context/AuthContext';

/**
 * API Route para corrigir texto do laudo técnico usando ChatGPT
 * POST /api/laudo/corrigir
 * Body: { texto: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texto } = body;

    if (!texto || typeof texto !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Texto é obrigatório',
          message: 'Forneça o texto do laudo a ser corrigido'
        },
        { status: 400 }
      );
    }

    if (texto.trim().length < 10) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Texto muito curto',
          message: 'O texto deve ter pelo menos 10 caracteres'
        },
        { status: 400 }
      );
    }

    console.log('📝 Iniciando correção de laudo técnico:', {
      textoLength: texto.length,
      preview: texto.substring(0, 100),
    });

    const textoCorrigido = await corrigirLaudoTecnico(texto);

    if (!textoCorrigido) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao corrigir texto',
          message: 'Não foi possível corrigir o texto. Verifique se o ChatGPT está configurado corretamente.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      textoCorrigido,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro na API de correção de laudo:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno',
        message: error.message || 'Erro inesperado ao corrigir texto'
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { isChatGPTAvailable, transcreverAudioLaudo } from '@/lib/chatgpt';
import { assertTemRecurso } from '@/lib/billing/assertPlanResource';

export const runtime = 'nodejs';

const MAX_BYTES = 25 * 1024 * 1024;

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return !!value && typeof value === 'object' && 'arrayBuffer' in value;
}

/**
 * POST /api/laudo/transcrever
 * Transcreve áudio (ditado) e melhora o texto para laudo técnico.
 * Aceita multipart (campo "audio") ou JSON { audioBase64, mimeType }.
 */
export async function POST(req: NextRequest) {
  try {
    const access = await assertTemRecurso(req, 'ia');
    if (!access.ok) return access.response;

    if (!isChatGPTAvailable()) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Transcrição com IA não está disponível. Configure OPENAI_API_KEY nas variáveis de ambiente.',
        },
        { status: 503 }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    let buffer: Buffer | null = null;
    let mimeType = 'audio/m4a';
    let melhorar = true;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64 : '';
      mimeType = typeof body.mimeType === 'string' ? body.mimeType : mimeType;
      melhorar = body.melhorar !== false;

      if (!audioBase64) {
        return NextResponse.json(
          { success: false, message: 'Envie o áudio em audioBase64.' },
          { status: 400 }
        );
      }

      buffer = Buffer.from(audioBase64, 'base64');
    } else {
      const formData = await req.formData();
      const file = formData.get('audio');
      melhorar = formData.get('melhorar') !== 'false';

      if (!isUploadFile(file)) {
        return NextResponse.json(
          { success: false, message: 'Envie um arquivo de áudio no campo "audio".' },
          { status: 400 }
        );
      }

      mimeType = file.type || mimeType;
      buffer = Buffer.from(await file.arrayBuffer());
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Arquivo de áudio vazio.' },
        { status: 400 }
      );
    }

    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { success: false, message: 'Áudio muito grande. Máximo 25 MB.' },
        { status: 400 }
      );
    }

    const texto = await transcreverAudioLaudo(buffer, mimeType, melhorar);

    if (!texto) {
      return NextResponse.json(
        { success: false, message: 'Não foi possível transcrever o áudio. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      texto,
    });
  } catch (err) {
    console.error('Erro em /api/laudo/transcrever:', err);
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error ? err.message : 'Erro ao transcrever áudio. Tente novamente.',
      },
      { status: 500 }
    );
  }
}

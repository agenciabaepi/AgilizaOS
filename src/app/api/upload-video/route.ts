import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB por vídeo

export async function POST(request: NextRequest) {
  try {
    // Vercel limita o body a ~4.5 MB. Para vídeos maiores use upload direto no cliente (bancada já faz isso).
    const contentLength = request.headers.get('content-length');
    const bodyLimit = 4.5 * 1024 * 1024; // 4.5 MB
    if (contentLength && Number(contentLength) > bodyLimit) {
      return NextResponse.json(
        { error: 'Arquivo muito grande para enviar pelo servidor. O upload de vídeos é feito direto no navegador; recarregue a página e tente novamente.' },
        { status: 413 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const osId = formData.get('osId') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    if (!osId) {
      return NextResponse.json(
        { error: 'ID da OS é obrigatório' },
        { status: 400 }
      );
    }

    const uploadedFiles: { name: string; url: string; size: number; type: string }[] = [];

    for (const file of files) {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
        return NextResponse.json(
          { error: 'Apenas vídeos são permitidos (MP4, WebM, MOV, AVI)' },
          { status: 400 }
        );
      }

      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'Vídeo muito grande. Máximo 50MB por arquivo.' },
          { status: 400 }
        );
      }

      const timestamp = Date.now();
      const rawName = file.name;
      const safeName = rawName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${osId}/videos/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('ordens-imagens')
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        console.error('Erro no upload do vídeo:', uploadError);
        const isSizeError = /maximum allowed size|exceeded|too large|file size/i.test(uploadError.message);
        const message = isSizeError
          ? 'Vídeo muito grande. Máximo 50MB por arquivo.'
          : 'Erro ao fazer upload do vídeo: ' + uploadError.message;
        return NextResponse.json(
          { error: message },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage
        .from('ordens-imagens')
        .getPublicUrl(filePath);

      uploadedFiles.push({
        name: file.name,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Erro geral no upload de vídeo:', error);
    return NextResponse.json(
      { error: 'Erro inesperado no upload do vídeo' },
      { status: 500 }
    );
  }
}

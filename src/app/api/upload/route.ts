import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
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

    const uploadedFiles = [];

    for (const file of files) {
      const nomeLower = (file.name || '').toLowerCase();
      const isImage = file.type.startsWith('image/');
      const isPdf =
        file.type === 'application/pdf' ||
        nomeLower.endsWith('.pdf');

      if (!isImage && !isPdf) {
        return NextResponse.json(
          { error: 'Apenas imagens ou PDF são permitidos' },
          { status: 400 }
        );
      }

      // Verificar tamanho (10MB) e rejeitar vazio (RN/Expo web às vezes manda 0 bytes)
      if (!file.size || file.size < 200) {
        return NextResponse.json(
          { error: 'Arquivo inválido ou vazio. Tente outro.' },
          { status: 400 }
        );
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Arquivo muito grande. Máximo 10MB por arquivo' },
          { status: 400 }
        );
      }

      // Gerar nome de arquivo seguro
      const timestamp = Date.now();
      const rawName = file.name;
      const safeName = rawName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = `${osId}/${timestamp}_${safeName}`;

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('ordens-imagens')
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        return NextResponse.json(
          { error: 'Erro ao fazer upload da imagem: ' + uploadError.message },
          { status: 500 }
        );
      }

      // Obter URL pública
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
    console.error('Erro geral no upload:', error);
    return NextResponse.json(
      { error: 'Erro inesperado no upload' },
      { status: 500 }
    );
  }
}

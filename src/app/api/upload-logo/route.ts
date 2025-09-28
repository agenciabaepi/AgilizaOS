import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Usar service role key diretamente para upload
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined; },
          set() {},
          remove() {},
        },
      }
    );

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `logo-${timestamp}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    // Fazer upload usando service role
    const { error: uploadError } = await supabaseAdmin.storage
      .from('logos')
      .upload(filePath, file);

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('logos')
      .getPublicUrl(filePath);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName: fileName
    });

  } catch (error: unknown) {
    console.error('❌ Erro na API upload-logo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

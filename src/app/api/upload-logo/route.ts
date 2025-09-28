import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    // Verificar autenticação
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // Criar cliente com service role para upload
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
    const fileName = `${user.id}-${timestamp}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    console.log('📤 Upload via API:', { fileName, filePath, size: file.size });

    // Fazer upload usando service role
    const { error: uploadError } = await supabaseAdmin.storage
      .from('logos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('logos')
      .getPublicUrl(filePath);

    console.log('✅ Upload concluído:', publicUrl);

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

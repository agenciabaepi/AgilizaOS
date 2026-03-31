import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = (formData.get('userId') as string | null) ?? undefined;
    const authUserId = (formData.get('authUserId') as string | null) ?? undefined;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não informado' }, { status: 400 });
    }

    // Opcional: validar tipo/tamanho aqui também
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Apenas imagens são permitidas' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'A imagem deve ter no máximo 5MB' }, { status: 400 });
    }

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

    const sanitizeFilename = (name: string) => {
      const normalized = name.normalize('NFD').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      return normalized || `avatar-${Date.now()}.png`;
    };

    const safeName = sanitizeFilename(file.name || 'avatar');
    const timestamp = Date.now();
    const filePath = `user-${userId}/${timestamp}_${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload do avatar:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (!publicData?.publicUrl) {
      return NextResponse.json({ error: 'Não foi possível gerar URL pública' }, { status: 500 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({ foto_url: publicData.publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao atualizar foto_url no banco (service):', updateError);
      return NextResponse.json({ error: 'Falha ao atualizar usuário' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      publicUrl: publicData.publicUrl,
      filePath,
      userId,
      authUserId,
    });
  } catch (error) {
    console.error('Erro inesperado no upload-avatar service:', error);
    return NextResponse.json({ error: 'Erro inesperado ao enviar avatar' }, { status: 500 });
  }
}

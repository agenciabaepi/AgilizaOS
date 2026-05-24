import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

export const runtime = 'nodejs';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function sanitizeFilename(name: string): string {
  const base = name.normalize('NFD').replace(/[^a-zA-Z0-9.\-_]/g, '_');
  return base || `imagem-${Date.now()}.png`;
}

export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'Apenas imagens são permitidas' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ ok: false, error: 'Arquivo vazio' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: 'A imagem deve ter no máximo 5MB' }, { status: 400 });
    }

    const safeName = sanitizeFilename(file.name);
    const filePath = `global/${Date.now()}_${safeName}`;

    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage.from('aparelhos').upload(filePath, file, {
      upsert: false,
      cacheControl: '3600',
      contentType: file.type,
    });

    if (uploadError) {
      console.error('Upload aparelhos_catalogo:', uploadError);
      const hint =
        uploadError.message?.toLowerCase().includes('not found') ||
        uploadError.message?.toLowerCase().includes('bucket')
          ? 'Crie o bucket público "aparelhos" no Supabase Storage (veja database/aparelhos_storage.sql).'
          : undefined;
      return NextResponse.json(
        { ok: false, error: uploadError.message || 'Erro ao fazer upload', hint },
        { status: 500 }
      );
    }

    const { data: bucket } = await supabase.storage.getBucket('aparelhos');
    const isPublic = bucket?.public === true;

    const { data: publicData } = supabase.storage.from('aparelhos').getPublicUrl(filePath);
    let url = publicData?.publicUrl || '';

    if (!isPublic) {
      const { data: signed, error: signError } = await supabase.storage
        .from('aparelhos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (signError || !signed?.signedUrl) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Bucket "aparelhos" não é público. Execute database/aparelhos_storage.sql ou use URL assinada.',
            hint: signError?.message,
          },
          { status: 500 }
        );
      }
      url = signed.signedUrl;
    }

    if (!url) {
      return NextResponse.json({ ok: false, error: 'Não foi possível gerar URL da imagem' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      url,
      path: filePath,
      bucketPublic: isPublic,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

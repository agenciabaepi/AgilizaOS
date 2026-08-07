import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

export const runtime = 'nodejs';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const BUCKET = 'aparelhos';

function sanitizeFilename(name: string): string {
  const base = name.normalize('NFD').replace(/[^a-zA-Z0-9.\-_]/g, '_');
  return base || `marca-${Date.now()}.png`;
}

/** Upload de logo de marca do catálogo de peças. */
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
      return NextResponse.json({ ok: false, error: 'A imagem deve ter no máximo 2MB' }, { status: 400 });
    }

    const safeName = sanitizeFilename(file.name);
    const filePath = `pecas/marcas/${Date.now()}_${safeName}`;

    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      upsert: false,
      cacheControl: '3600',
      contentType: file.type,
    });

    if (uploadError) {
      console.error('Upload pecas marca:', uploadError);
      const hint =
        uploadError.message?.toLowerCase().includes('not found') ||
        uploadError.message?.toLowerCase().includes('bucket')
          ? 'Crie o bucket público "aparelhos" no Supabase Storage (database/aparelhos_storage.sql).'
          : undefined;
      return NextResponse.json(
        { ok: false, error: uploadError.message || 'Erro ao fazer upload', hint },
        { status: 500 }
      );
    }

    const { data: bucket } = await supabase.storage.getBucket(BUCKET);
    const isPublic = bucket?.public === true;
    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    let url = publicData?.publicUrl || '';

    if (!isPublic) {
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (signError || !signed?.signedUrl) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Bucket não é público. Execute database/aparelhos_storage.sql.',
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

    return NextResponse.json({ ok: true, url, path: filePath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

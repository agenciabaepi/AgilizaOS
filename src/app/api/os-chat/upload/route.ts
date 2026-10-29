import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getUsuarioForAuth } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const BUCKET = 'os-chat';
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: NextRequest) {
  try {
    const authUserId = await getSessionUserId(req);
    if (!authUserId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const usuario = await getUsuarioForAuth(authUserId);
    if (!usuario?.empresa_id || !usuario.id) {
      return NextResponse.json({ error: 'Usuário sem empresa' }, { status: 403 });
    }

    const form = await req.formData();
    const osId = String(form.get('osId') || '').trim();
    const file = form.get('file');

    if (!osId) {
      return NextResponse.json({ error: 'osId obrigatório' }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Apenas imagens são permitidas' }, { status: 400 });
    }
    if (file.size < 200) {
      return NextResponse.json({ error: 'Imagem inválida (vazia ou corrompida)' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Imagem muito grande (máx. 8MB)' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: os, error: osErr } = await admin
      .from('ordens_servico')
      .select('id, empresa_id')
      .eq('id', osId)
      .maybeSingle();

    if (osErr || !os) {
      return NextResponse.json({ error: 'O.S. não encontrada' }, { status: 404 });
    }
    if (os.empresa_id !== usuario.empresa_id) {
      return NextResponse.json({ error: 'Sem acesso a esta O.S.' }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength < 200) {
      return NextResponse.json({ error: 'Imagem inválida após leitura' }, { status: 400 });
    }

    const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const path = `${usuario.empresa_id}/${osId}/${fileName}`;

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });
    if (upErr) {
      return NextResponse.json({ error: `Upload falhou: ${upErr.message}` }, { status: 500 });
    }

    // Confirma no Storage que não ficou 0 bytes
    const { data: meta } = await admin.storage.from(BUCKET).list(path.split('/').slice(0, -1).join('/'), {
      search: path.split('/').pop(),
      limit: 1,
    });
    const storedSize = Number(meta?.[0]?.metadata?.size ?? meta?.[0]?.meta?.size ?? 0);
    if (storedSize > 0 && storedSize < 200) {
      await admin.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: 'Upload incompleto (arquivo vazio no Storage)' }, { status: 500 });
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    if (!pub?.publicUrl) {
      return NextResponse.json({ error: 'Falha ao gerar URL pública' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      path,
      publicUrl: pub.publicUrl,
      size: buffer.byteLength,
      mimeType: file.type || 'image/jpeg',
    });
  } catch (e) {
    console.error('[os-chat/upload]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro inesperado no upload' },
      { status: 500 }
    );
  }
}

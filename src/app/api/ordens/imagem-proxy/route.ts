import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const BUCKET = 'ordens-imagens';

/**
 * Extrai o path do bucket a partir da URL do storage Supabase.
 * Ex: https://xxx.supabase.co/storage/v1/object/public/ordens-imagens/OS_ID/123_file.jpg -> OS_ID/123_file.jpg
 */
function getStoragePathFromUrl(fullUrl: string): string | null {
  try {
    const decoded = decodeURIComponent(fullUrl);
    const idx = decoded.indexOf('ordens-imagens/');
    if (idx === -1) return null;
    const after = decoded.slice(idx + 'ordens-imagens/'.length);
    const path = after.split('?')[0].trim().replace(/^\/+|\/+$/g, '');
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Proxy para buscar imagens no servidor (evita CORS e bucket privado na impressão).
 * Usa Supabase Storage com service role para garantir acesso às imagens.
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 });
    }

    const decoded = decodeURIComponent(url).trim();
    if (!decoded.startsWith('http://') && !decoded.startsWith('https://')) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    // Restringir apenas ao storage do Supabase do projeto
    let allowed = false;
    if (SUPABASE_URL) {
      try {
        allowed = decoded.includes(new URL(SUPABASE_URL).hostname) && decoded.includes(BUCKET);
      } catch {
        allowed = false;
      }
    }
    if (!allowed) {
      return NextResponse.json({ error: 'URL não permitida' }, { status: 403 });
    }

    const path = getStoragePathFromUrl(decoded);
    if (!path) {
      return NextResponse.json({ error: 'Path inválido na URL' }, { status: 400 });
    }

    // Usar Supabase com service role para acessar bucket (público ou privado)
    if (SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data, error } = await supabase.storage.from(BUCKET).download(path);
      if (!error && data) {
        let buffer = Buffer.from(await data.arrayBuffer());
        let type = data.type || '';
        if (!type.startsWith('image/')) {
          const ext = path.split('.').pop()?.toLowerCase();
          type =
            ext === 'png'
              ? 'image/png'
              : ext === 'gif'
                ? 'image/gif'
                : ext === 'webp'
                  ? 'image/webp'
                  : ext === 'heic' || ext === 'heif'
                    ? 'image/heic'
                    : 'image/jpeg';
        }
        // HEIC é retornado como data URL; a página de impressão converte para JPEG no navegador
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${type};base64,${base64}`;
        return NextResponse.json({ dataUrl });
      }
      if (error) {
        console.warn('[imagem-proxy] Storage download failed:', error.message);
      }
      // Fallback: URL assinada e fetch (bucket privado)
      if (path) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        if (signed?.signedUrl) {
          const fetchRes = await fetch(signed.signedUrl, { cache: 'no-store' });
          if (fetchRes.ok) {
            const buffer = Buffer.from(await fetchRes.arrayBuffer());
            const ext = path.split('.').pop()?.toLowerCase();
            const type =
              ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            const dataUrl = `data:${type};base64,${buffer.toString('base64')}`;
            return NextResponse.json({ dataUrl });
          }
        }
      }
    }

    // Fallback: fetch direto (funciona se o bucket for público)
    const res = await fetch(decoded, {
      headers: { 'Accept': 'image/*' },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Falha ao carregar imagem: ${res.status}` },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${contentType.split(';')[0]};base64,${base64}`;
    return NextResponse.json({ dataUrl });
  } catch (err) {
    console.error('[imagem-proxy] Erro:', err);
    return NextResponse.json(
      { error: 'Erro ao processar imagem' },
      { status: 500 }
    );
  }
}

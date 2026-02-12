import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const BUCKET = 'ordens-imagens';

/**
 * Extrai o path do bucket a partir da URL do storage Supabase.
 * Ex: https://xxx.supabase.co/storage/v1/object/public/ordens-imagens/OS_ID/videos/123_file.mp4 -> OS_ID/videos/123_file.mp4
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

function getVideoContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
  };
  return types[ext || ''] || 'video/mp4';
}

/**
 * Proxy que faz stream do vídeo (same-origin).
 * Evita CORS e problemas com redirect em elementos <video> no Chrome/Windows.
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

    const rangeHeader = request.headers.get('range');
    const contentType = getVideoContentType(path);

    if (!SUPABASE_SERVICE_KEY) {
      return NextResponse.redirect(decoded);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Tentar download direto do storage
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (!error && data) {
      const buffer = Buffer.from(await data.arrayBuffer());
      const totalSize = buffer.length;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10) || 0;
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const chunkSize = end - start + 1;
        const chunk = buffer.subarray(start, end + 1);

        return new NextResponse(chunk, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=300',
          },
        });
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Length': String(totalSize),
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // 2. Fallback: URL assinada + fetch
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (signed?.signedUrl) {
      const fetchHeaders: HeadersInit = { Accept: 'video/*' };
      if (rangeHeader) (fetchHeaders as Record<string, string>)['Range'] = rangeHeader;

      const res = await fetch(signed.signedUrl, { headers: fetchHeaders, cache: 'no-store' });
      if (!res.ok) {
        return NextResponse.json({ error: `Falha ao carregar: ${res.status}` }, { status: res.status === 404 ? 404 : 502 });
      }

      const arr = await res.arrayBuffer();
      const headers: Record<string, string> = {
        'Content-Type': res.headers.get('content-type') || contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=300',
      };
      const cl = res.headers.get('content-length');
      if (cl) headers['Content-Length'] = cl;

      return new NextResponse(arr, { status: res.status, headers });
    }

    // 3. Fallback: fetch direto (bucket público)
    const fetchHeaders: HeadersInit = { Accept: 'video/*' };
    if (rangeHeader) (fetchHeaders as Record<string, string>)['Range'] = rangeHeader;

    const res = await fetch(decoded, { headers: fetchHeaders, cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Falha ao carregar: ${res.status}` }, { status: res.status === 404 ? 404 : 502 });
    }

    const arr = await res.arrayBuffer();
    const headers: Record<string, string> = {
      'Content-Type': res.headers.get('content-type') || contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=300',
    };
    const cl = res.headers.get('content-length');
    if (cl) headers['Content-Length'] = cl;

    return new NextResponse(arr, { status: res.status, headers });
  } catch (err) {
    console.error('[video-proxy] Erro:', err);
    return NextResponse.json({ error: 'Erro ao processar vídeo' }, { status: 500 });
  }
}

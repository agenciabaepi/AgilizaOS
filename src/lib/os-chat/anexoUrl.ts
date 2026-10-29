import { supabase } from '@/lib/supabaseClient';

const BUCKET = 'os-chat';

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function extractOsChatStoragePath(anexoUrl: string | null | undefined): string | null {
  if (!anexoUrl) return null;
  if (!isHttpUrl(anexoUrl)) return anexoUrl.replace(/^\/+/, '');
  try {
    const u = new URL(anexoUrl);
    const markers = [`/object/sign/${BUCKET}/`, `/object/public/${BUCKET}/`];
    for (const marker of markers) {
      const idx = u.pathname.indexOf(marker);
      if (idx >= 0) return decodeURIComponent(u.pathname.slice(idx + marker.length));
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** URL pública síncrona para exibir a imagem dentro do chat. */
export function getOsChatAnexoDisplayUrl(anexoUrl: string | null | undefined): string | null {
  if (!anexoUrl) return null;
  // URL completa (ex.: ordens-imagens ou os-chat public) — usar direto
  if (isHttpUrl(anexoUrl)) {
    const path = extractOsChatStoragePath(anexoUrl);
    if (path && supabase) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    }
    return anexoUrl;
  }
  const path = extractOsChatStoragePath(anexoUrl);
  if (path && supabase) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  }
  return null;
}

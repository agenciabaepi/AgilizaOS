import type { AparelhoSelecionado } from '@/types/aparelhos';

export interface AparelhoImagensRow {
  imagem_url?: string | null;
  imagem_frente_url?: string | null;
  imagem_verso_url?: string | null;
}

export interface AparelhoImagensResolved {
  frente: string | null;
  verso: string | null;
  /** Compatibilidade: frente ou verso ou legado */
  primary: string | null;
}

export function resolveAparelhoImagens(row: AparelhoImagensRow): AparelhoImagensResolved {
  const frente = row.imagem_frente_url?.trim() || row.imagem_url?.trim() || null;
  const verso = row.imagem_verso_url?.trim() || null;
  return {
    frente,
    verso,
    primary: frente || verso,
  };
}

const PRELOADED = new Set<string>();

/** URL menor para preview (Supabase Image Transform quando bucket público) */
export function aparelhoImagemPreviewUrl(
  url: string | null | undefined,
  opts?: { width?: number; quality?: number }
): string | null {
  const raw = url?.trim();
  if (!raw) return null;

  const width = opts?.width ?? 400;
  const quality = opts?.quality ?? 72;

  const objectPublic = '/storage/v1/object/public/';
  const renderPublic = '/storage/v1/render/image/public/';
  if (raw.includes(objectPublic)) {
    const render = raw.replace(objectPublic, renderPublic);
    const sep = render.includes('?') ? '&' : '?';
    return `${render}${sep}width=${width}&quality=${quality}&resize=contain`;
  }

  return raw;
}

/** Evita cache do navegador ao atualizar foto na lista */
export function aparelhoImagemComCacheBust(
  url: string | null | undefined,
  bust?: string | null
): string | null {
  const raw = url?.trim();
  if (!raw || !bust) return raw || null;
  const token = encodeURIComponent(bust);
  return raw.includes('?') ? `${raw}&v=${token}` : `${raw}?v=${token}`;
}

/** Mescla resposta da API com URLs enviadas no save (garante preview na lista) */
export function mergeAparelhoComImagensSalvas<T extends AparelhoImagensRow>(
  aparelho: T,
  salvo: {
    imagem_url?: string | null;
    imagem_frente_url?: string | null;
    imagem_verso_url?: string | null;
  }
): T {
  const frente = salvo.imagem_frente_url?.trim() || aparelho.imagem_frente_url?.trim() || salvo.imagem_url?.trim() || aparelho.imagem_url?.trim() || null;
  const verso = salvo.imagem_verso_url?.trim() || aparelho.imagem_verso_url?.trim() || null;
  const imagem_url = frente || verso || null;
  return {
    ...aparelho,
    imagem_frente_url: frente,
    imagem_verso_url: verso,
    imagem_url,
  };
}

export function preloadAparelhoImagens(
  ...urls: Array<string | null | undefined>
): void {
  if (typeof window === 'undefined') return;
  for (const url of urls) {
    const src = aparelhoImagemPreviewUrl(url);
    if (!src || PRELOADED.has(src)) continue;
    PRELOADED.add(src);
    const img = new window.Image();
    img.decoding = 'async';
    img.src = src;
  }
}

export function aparelhoImagensParaSelecionado(
  row: AparelhoImagensRow
): Pick<AparelhoSelecionado, 'imagemUrl' | 'imagemFrenteUrl' | 'imagemVersoUrl'> {
  const { frente, verso, primary } = resolveAparelhoImagens(row);
  return {
    imagemUrl: primary,
    imagemFrenteUrl: frente,
    imagemVersoUrl: verso,
  };
}

/** Insert: monta os três campos de imagem a partir do body */
export function aparelhoImagensInsertPayload(body: {
  imagem_url?: string | null;
  imagem_frente_url?: string | null;
  imagem_verso_url?: string | null;
}): {
  imagem_frente_url: string | null;
  imagem_verso_url: string | null;
  imagem_url: string | null;
} {
  const frente = body.imagem_frente_url?.trim() || body.imagem_url?.trim() || null;
  const verso = body.imagem_verso_url?.trim() || null;
  return {
    imagem_frente_url: frente,
    imagem_verso_url: verso,
    imagem_url: frente || verso,
  };
}

/** PUT: aplica só campos enviados e recalcula imagem_url quando algum campo de imagem mudou */
export function aparelhoImagensApplyToUpdate(
  body: {
    imagem_url?: string | null;
    imagem_frente_url?: string | null;
    imagem_verso_url?: string | null;
  },
  updateData: Record<string, unknown>
): void {
  if (body.imagem_frente_url !== undefined) {
    updateData.imagem_frente_url = body.imagem_frente_url?.trim() || null;
  } else if (body.imagem_url !== undefined) {
    updateData.imagem_frente_url = body.imagem_url?.trim() || null;
  }
  if (body.imagem_verso_url !== undefined) {
    updateData.imagem_verso_url = body.imagem_verso_url?.trim() || null;
  }

  const touched =
    body.imagem_frente_url !== undefined ||
    body.imagem_verso_url !== undefined ||
    body.imagem_url !== undefined;

  if (touched) {
    const frente = (updateData.imagem_frente_url as string | null | undefined) ?? null;
    const verso = (updateData.imagem_verso_url as string | null | undefined) ?? null;
    if (body.imagem_frente_url !== undefined || body.imagem_url !== undefined || body.imagem_verso_url !== undefined) {
      updateData.imagem_url = frente || verso || null;
    }
  }
}

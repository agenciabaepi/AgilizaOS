import type { SupabaseClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import sharp from 'sharp';
import { OrdemPDF } from '@/components/ordem-pdf/OrdemPDFCompleta';
import { carregarDadosImpressao } from '@/lib/ordem-pdf/dados-impressao';

const MAX_LADO_FOTO = 1200;

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2], 'base64') };
}

function isHeic(mime: string, buffer: Buffer): boolean {
  if (mime.includes('heic') || mime.includes('heif')) return true;
  if (buffer.length < 12) return false;
  const brand = buffer.subarray(8, 12).toString('ascii');
  return buffer.subarray(4, 8).toString('ascii') === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(brand);
}

/** O react-pdf só aceita JPEG baseline/PNG; reencoda tudo como JPEG e reduz o tamanho. */
async function normalizarFoto(dataUrl: string): Promise<string | null> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  try {
    let input = parsed.buffer;
    if (isHeic(parsed.mime, input)) {
      const { default: heicConvert } = await import('heic-convert');
      input = Buffer.from(await heicConvert({ buffer: input, format: 'JPEG', quality: 0.85 }));
    }
    const out = await sharp(input)
      .rotate()
      .resize(MAX_LADO_FOTO, MAX_LADO_FOTO, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 75, progressive: false })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString('base64')}`;
  } catch (err) {
    console.warn('[pdf-os-completo] foto ignorada:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function normalizarListaFotos(json: string | null | undefined): Promise<string | null> {
  if (!json) return null;
  let lista: unknown;
  try {
    lista = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(lista)) return null;
  const fotos = await Promise.all(lista.map((u) => (typeof u === 'string' ? normalizarFoto(u) : null)));
  const validas = fotos.filter((f): f is string => Boolean(f));
  return validas.length ? JSON.stringify(validas) : null;
}

async function baixarComoPng(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer())).png().toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Gera no servidor o mesmo PDF completo da tela /ordens/[id]/imprimir.
 * Retorna null se a OS não existir (ou não pertencer à empresa informada).
 */
export async function gerarPdfOsCompleto(
  supabase: SupabaseClient,
  osId: string,
  empresaId?: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  const dados = await carregarDadosImpressao(supabase, osId);
  if (!dados) return null;
  const { ordem, checklistItens } = dados;
  if (empresaId && ordem.empresa_id !== empresaId) return null;

  const logoUrl: string | undefined = ordem.empresas?.logo_url;
  const [imagensPdf, imagensTecnicoPdf, logo] = await Promise.all([
    normalizarListaFotos(ordem.imagens_pdf),
    normalizarListaFotos(ordem.imagens_tecnico_pdf),
    logoUrl && /^https?:\/\//i.test(logoUrl) ? baixarComoPng(logoUrl) : Promise.resolve(null),
  ]);

  const ordemPdf = {
    ...ordem,
    // Sem data URLs válidas o componente cairia nas URLs originais (possivelmente HEIC), que quebram o render.
    imagens: null,
    imagens_tecnico: null,
    imagens_pdf: imagensPdf,
    imagens_tecnico_pdf: imagensTecnicoPdf,
    empresas: ordem.empresas ? { ...ordem.empresas, logo_url: logo } : ordem.empresas,
  };

  const buffer = await renderToBuffer(<OrdemPDF ordem={ordemPdf} checklistItens={checklistItens} />);
  return { buffer: Buffer.from(buffer), filename: `OS-${ordem.numero_os ?? ordem.id}.pdf` };
}

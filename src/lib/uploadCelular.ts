export const UPLOAD_CELULAR_BUCKET = 'ordens-imagens';
export const UPLOAD_CELULAR_PASTA = 'upload-celular';
export const UPLOAD_CELULAR_MAX_ARQUIVOS = 10;
export const UPLOAD_CELULAR_MAX_IMAGEM_BYTES = 15 * 1024 * 1024;
export const UPLOAD_CELULAR_MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const UPLOAD_CELULAR_VALIDADE_MS = 3 * 60 * 60 * 1000;

export type TipoArquivoCelular = 'imagem' | 'video';

export interface ArquivoCelular {
  path: string;
  url: string;
  nome: string;
  tipo: TipoArquivoCelular;
  tamanho: number;
  criadoEm: string | null;
}

const EXT_VIDEO = ['mp4', 'mov', 'webm', 'm4v', '3gp', 'avi'];
const EXT_IMAGEM = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif'];

export function extensaoArquivo(nome: string): string {
  const partes = (nome || '').split('?')[0].split('.');
  return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : '';
}

export function isVideoUrl(url: string): boolean {
  return EXT_VIDEO.includes(extensaoArquivo(url));
}

export function tipoPorMimeOuNome(mime: string, nome: string): TipoArquivoCelular | null {
  if (mime?.startsWith('video/')) return 'video';
  if (mime?.startsWith('image/')) return 'imagem';
  const ext = extensaoArquivo(nome);
  if (EXT_VIDEO.includes(ext)) return 'video';
  if (EXT_IMAGEM.includes(ext)) return 'imagem';
  return null;
}

export function extensaoSegura(mime: string, nome: string): string {
  const ext = extensaoArquivo(nome);
  if (EXT_VIDEO.includes(ext) || EXT_IMAGEM.includes(ext)) return ext;
  if (mime === 'video/quicktime') return 'mov';
  if (mime?.startsWith('video/')) return mime.split('/')[1] || 'mp4';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime?.startsWith('image/')) return mime.split('/')[1] || 'jpg';
  return 'bin';
}

export function separarImagensEVideos(urls: string[]): { imagens: string[]; videos: string[] } {
  const imagens: string[] = [];
  const videos: string[] = [];
  for (const url of urls) {
    if (isVideoUrl(url)) videos.push(url);
    else imagens.push(url);
  }
  return { imagens, videos };
}

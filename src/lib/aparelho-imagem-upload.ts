/** Tipos que costumam ter transparência (fundo quadriculado no preview) */
const TIPOS_COM_TRANSPARENCIA = new Set(['image/png', 'image/webp', 'image/gif']);

/**
 * Desenha a imagem sobre fundo branco e exporta JPEG.
 * Evita fundo quadriculado de PNG transparente no catálogo/Nova OS.
 * Não remove marca d'água ou quadriculado já embutido no arquivo (ex.: previews de bancos de imagem).
 */
export async function flattenAparelhoImageFile(file: File): Promise<File> {
  if (typeof window === 'undefined' || !TIPOS_COM_TRANSPARENCIA.has(file.type)) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    let { width, height } = bitmap;
    if (width > maxSide || height > maxSide) {
      const scale = maxSide / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/i, '') || 'aparelho';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

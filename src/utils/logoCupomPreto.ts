function resolveImageUrl(url: string): string {
  if (!url) return '/logo.png';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`;
  }
  return url;
}

async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  const resolved = resolveImageUrl(url);
  const response = await fetch(resolved, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar logo (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Falha ao decodificar logo'));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Converte o logo para preto sólido (silhueta), ideal para impressão térmica/cupom fiscal.
 * Pixels transparentes ficam brancos; demais pixels viram preto puro (#000).
 */
export async function convertLogoToBlackForCupom(sourceUrl: string): Promise<string> {
  const img = await loadImageFromUrl(sourceUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  if (!width || !height) {
    throw new Error('Logo com dimensões inválidas');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas indisponível');
  }

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const alphaThreshold = 24;
  const whiteThreshold = 238;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const isTransparent = alpha < alphaThreshold;
    const isBackground = luminance >= whiteThreshold;

    if (isTransparent || isBackground) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    } else {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

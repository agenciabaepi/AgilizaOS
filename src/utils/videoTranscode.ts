/**
 * Transcodifica vídeo para H.264/MP4 (compatível com todos os navegadores).
 * Resolve o problema de HEVC/H.265 (iPhone) que não reproduz no Chrome/Windows.
 */

type TranscodeProgress = (progress: number) => void;

let ffmpegInstance: unknown = null;
let ffmpegLoadPromise: Promise<void> | null = null;

async function loadFFmpeg(): Promise<unknown> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadPromise) {
    await ffmpegLoadPromise;
    return ffmpegInstance;
  }

  ffmpegLoadPromise = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpeg = new FFmpeg();

    ffmpeg.on('progress', ({ progress }) => {
      if (typeof progress === 'number') {
        // progress 0-1
      }
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = { ffmpeg, fetchFile };
  })();

  await ffmpegLoadPromise;
  return ffmpegInstance;
}

/**
 * Converte vídeo (HEVC, MOV, etc.) para H.264 MP4.
 * Retorna File compatível com todos os navegadores.
 */
export async function transcodeToH264(
  file: File,
  onProgress?: TranscodeProgress
): Promise<File> {
  const { ffmpeg, fetchFile } = (await loadFFmpeg()) as {
    ffmpeg: { writeFile: (n: string, d: Uint8Array) => Promise<void>; readFile: (n: string) => Promise<Uint8Array>; exec: (a: string[]) => Promise<void>; on: (e: string, cb: (p: { progress?: number }) => void) => void };
    fetchFile: (f: File) => Promise<Uint8Array>;
  };

  const inputName = 'input' + (file.name.match(/\.[^.]+$/)?.[0] || '.mp4');
  const outputName = 'output.mp4';

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      if (typeof progress === 'number') onProgress(Math.round(progress * 100));
    });
  }

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // H.264 (libx264) ou mpeg4 como fallback - compatível com todos os navegadores
  try {
    await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputName
    ]);
  } catch {
    // Fallback: mpeg4 (mais comum em builds minimal do ffmpeg.wasm)
    await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'mpeg4',
      '-q:v', '5',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputName
    ]);
  }

  const data = await ffmpeg.readFile(outputName) as Uint8Array;
  const blob = new Blob([data], { type: 'video/mp4' });
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'video';
  return new File([blob], `${baseName}.mp4`, { type: 'video/mp4' });
}

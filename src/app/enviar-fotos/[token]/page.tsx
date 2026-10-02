'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { FiCamera, FiVideo, FiImage, FiCheckCircle, FiAlertCircle, FiTrash2, FiLoader } from 'react-icons/fi';
import {
  UPLOAD_CELULAR_MAX_ARQUIVOS,
  UPLOAD_CELULAR_MAX_IMAGEM_BYTES,
  UPLOAD_CELULAR_MAX_VIDEO_BYTES,
  tipoPorMimeOuNome,
  type ArquivoCelular,
} from '@/lib/uploadCelular';

interface EnvioEmAndamento {
  id: string;
  nome: string;
  progresso: number;
  erro?: string;
}

const LADO_MAX_IMAGEM = 2048;

async function comprimirImagem(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 1.5 * 1024 * 1024) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, LADO_MAX_IMAGEM / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    const nome = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], nome, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function enviarComProgresso(signedUrl: string, file: File, onProgresso: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('cacheControl', '3600');
    form.append('', file);

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('x-upsert', 'false');
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anon) xhr.setRequestHeader('apikey', anon);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgresso(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let msg = `Falha no envio (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.message) msg = body.message;
        } catch {}
        reject(new Error(/maximum allowed size|too large/i.test(msg) ? 'Arquivo muito grande.' : msg));
      }
    };
    xhr.onerror = () => reject(new Error('Sem conexão. Tente novamente.'));
    xhr.send(form);
  });
}

export default function EnviarFotosCelularPage() {
  const params = useParams();
  const token = params?.token as string;

  const [arquivos, setArquivos] = useState<ArquivoCelular[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroSessao, setErroSessao] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [envios, setEnvios] = useState<EnvioEmAndamento[]>([]);
  const enviandoRef = useRef(false);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/upload-celular/${encodeURIComponent(token)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setErroSessao(data.error || 'Link inválido.');
        return;
      }
      setArquivos(data.arquivos || []);
      setErroSessao(null);
    } catch {
      // mantém o estado atual; a próxima atualização tenta de novo
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    carregar();
    const intervalo = setInterval(() => {
      if (!enviandoRef.current) carregar();
    }, 5000);
    return () => clearInterval(intervalo);
  }, [token, carregar]);

  const restante = UPLOAD_CELULAR_MAX_ARQUIVOS - arquivos.length - envios.filter((e) => !e.erro).length;

  const handleArquivos = async (lista: FileList | null) => {
    if (!lista || lista.length === 0) return;
    setAviso(null);

    let selecionados = Array.from(lista);
    const invalidos = selecionados.filter((f) => !tipoPorMimeOuNome(f.type, f.name));
    selecionados = selecionados.filter((f) => tipoPorMimeOuNome(f.type, f.name));
    if (invalidos.length > 0) setAviso('Alguns arquivos foram ignorados: envie apenas fotos ou vídeos.');

    if (selecionados.length > restante) {
      setAviso(
        restante <= 0
          ? `Limite de ${UPLOAD_CELULAR_MAX_ARQUIVOS} arquivos atingido.`
          : `Só cabem mais ${restante} arquivo(s). Os primeiros ${restante} serão enviados.`
      );
      selecionados = selecionados.slice(0, Math.max(0, restante));
    }
    if (selecionados.length === 0) return;

    enviandoRef.current = true;
    const preparados = await Promise.all(selecionados.map(comprimirImagem));

    const grandes = preparados.filter((f) => {
      const max = tipoPorMimeOuNome(f.type, f.name) === 'video' ? UPLOAD_CELULAR_MAX_VIDEO_BYTES : UPLOAD_CELULAR_MAX_IMAGEM_BYTES;
      return f.size > max;
    });
    const validos = preparados.filter((f) => !grandes.includes(f));
    if (grandes.length > 0) {
      setAviso(
        `${grandes.length} arquivo(s) acima do limite (fotos até ${UPLOAD_CELULAR_MAX_IMAGEM_BYTES / 1024 / 1024}MB, vídeos até ${UPLOAD_CELULAR_MAX_VIDEO_BYTES / 1024 / 1024}MB).`
      );
    }
    if (validos.length === 0) {
      enviandoRef.current = false;
      return;
    }

    const novos: EnvioEmAndamento[] = validos.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      nome: f.name,
      progresso: 0,
    }));
    setEnvios((prev) => [...prev, ...novos]);
    const atualizar = (id: string, patch: Partial<EnvioEmAndamento>) =>
      setEnvios((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

    try {
      const res = await fetch(`/api/upload-celular/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arquivos: validos.map((f) => ({ nome: f.name, tipo: f.type, tamanho: f.size })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao preparar o envio');

      await Promise.all(
        validos.map(async (file, i) => {
          const envio = novos[i];
          try {
            await enviarComProgresso(data.uploads[i].signedUrl, file, (pct) => atualizar(envio.id, { progresso: pct }));
            setEnvios((prev) => prev.filter((e) => e.id !== envio.id));
          } catch (err) {
            atualizar(envio.id, { erro: err instanceof Error ? err.message : 'Falha no envio' });
          }
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar';
      setEnvios((prev) => prev.map((e) => (novos.some((n) => n.id === e.id) ? { ...e, erro: msg } : e)));
    } finally {
      enviandoRef.current = false;
      await carregar();
    }
  };

  const remover = async (arquivo: ArquivoCelular) => {
    setArquivos((prev) => prev.filter((a) => a.path !== arquivo.path));
    await fetch(`/api/upload-celular/${encodeURIComponent(token)}?path=${encodeURIComponent(arquivo.path)}`, {
      method: 'DELETE',
    });
    carregar();
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FiLoader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (erroSessao) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <FiAlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-lg font-semibold text-gray-900">Não foi possível abrir</h1>
        <p className="text-gray-600 mt-2">{erroSessao}</p>
      </div>
    );
  }

  const limiteAtingido = restante <= 0;
  const inputDisabled = limiteAtingido;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">Fotos do aparelho</h1>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(arquivos.length / UPLOAD_CELULAR_MAX_ARQUIVOS) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {arquivos.length}/{UPLOAD_CELULAR_MAX_ARQUIVOS}
          </span>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <p className="text-sm text-gray-600">
          As fotos e vídeos aparecem automaticamente no computador. Você pode enviar várias de uma vez.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className={`flex flex-col items-center justify-center gap-2 rounded-xl p-5 text-white font-medium ${inputDisabled ? 'bg-gray-300' : 'bg-gray-900 active:bg-gray-700'}`}>
            <FiCamera className="w-7 h-7" />
            Tirar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={inputDisabled}
              onChange={(e) => {
                handleArquivos(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <label className={`flex flex-col items-center justify-center gap-2 rounded-xl p-5 font-medium border ${inputDisabled ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-900 border-gray-300 active:bg-gray-100'}`}>
            <FiVideo className="w-7 h-7" />
            Gravar vídeo
            <input
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              disabled={inputDisabled}
              onChange={(e) => {
                handleArquivos(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <label className={`col-span-2 flex items-center justify-center gap-2 rounded-xl p-4 font-medium border ${inputDisabled ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-900 border-gray-300 active:bg-gray-100'}`}>
            <FiImage className="w-5 h-5" />
            Escolher da galeria (várias)
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              disabled={inputDisabled}
              onChange={(e) => {
                handleArquivos(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {aviso && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{aviso}</div>
        )}

        {limiteAtingido && envios.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <FiCheckCircle className="shrink-0" />
            Limite de {UPLOAD_CELULAR_MAX_ARQUIVOS} arquivos atingido. Pode fechar esta página.
          </div>
        )}

        {envios.length > 0 && (
          <div className="space-y-2">
            {envios.map((envio) => (
              <div key={envio.id} className="rounded-lg bg-white border border-gray-200 p-3">
                <div className="flex justify-between text-xs text-gray-600">
                  <span className="truncate pr-2">{envio.nome}</span>
                  <span>{envio.erro ? 'Erro' : `${envio.progresso}%`}</span>
                </div>
                {envio.erro ? (
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-red-600">{envio.erro}</p>
                    <button
                      className="text-xs text-gray-500 underline"
                      onClick={() => setEnvios((prev) => prev.filter((e) => e.id !== envio.id))}
                    >
                      Dispensar
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${envio.progresso}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {arquivos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {arquivos.map((arq) => (
              <div key={arq.path} className="relative aspect-square rounded-lg overflow-hidden bg-gray-200">
                {arq.tipo === 'video' ? (
                  <>
                    <video src={`${arq.url}#t=0.1`} preload="metadata" muted playsInline className="w-full h-full object-cover" />
                    <FiVideo className="absolute bottom-1 left-1 w-4 h-4 text-white drop-shadow" />
                  </>
                ) : (
                  <img src={arq.url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => remover(arq)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1.5 text-white"
                  aria-label="Remover"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

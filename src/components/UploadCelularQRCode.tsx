'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { FiSmartphone, FiCopy, FiRefreshCw, FiTrash2, FiVideo, FiLoader } from 'react-icons/fi';
import { bearerAuthHeadersForApi } from '@/lib/api/clientAuthHeaders';
import { UPLOAD_CELULAR_MAX_ARQUIVOS, type ArquivoCelular } from '@/lib/uploadCelular';

interface UploadCelularQRCodeProps {
  token: string | null;
  onTokenChange: (token: string | null) => void;
  onArquivosChange: (arquivos: ArquivoCelular[]) => void;
}

const INTERVALO_ATUALIZACAO_MS = 3000;

export default function UploadCelularQRCode({ token, onTokenChange, onArquivosChange }: UploadCelularQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [arquivos, setArquivos] = useState<ArquivoCelular[]>([]);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [expirado, setExpirado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const atualizarArquivos = useCallback(
    (lista: ArquivoCelular[]) => {
      setArquivos(lista);
      onArquivosChange(lista);
    },
    [onArquivosChange]
  );

  const gerarSessao = async () => {
    setGerando(true);
    setErro(null);
    try {
      const res = await fetch('/api/upload-celular/sessao', {
        method: 'POST',
        headers: await bearerAuthHeadersForApi(null),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar QR Code');
      setExpirado(false);
      atualizarArquivos([]);
      onTokenChange(data.token);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar QR Code');
    } finally {
      setGerando(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setQrDataUrl(null);
      setLink('');
      return;
    }
    const url = `${window.location.origin}/enviar-fotos/${encodeURIComponent(token)}`;
    setLink(url);
    QRCode.toDataURL(url, { width: 220, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let ativo = true;

    const buscar = async () => {
      try {
        const res = await fetch(`/api/upload-celular/${encodeURIComponent(token)}`, { cache: 'no-store' });
        const data = await res.json();
        if (!ativo) return;
        if (res.status === 410) {
          setExpirado(true);
          return;
        }
        if (res.ok) atualizarArquivos(data.arquivos || []);
      } catch {
        // tenta novamente no próximo ciclo
      }
    };

    buscar();
    const intervalo = setInterval(buscar, INTERVALO_ATUALIZACAO_MS);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [token, atualizarArquivos]);

  const remover = async (arquivo: ArquivoCelular) => {
    if (!token) return;
    atualizarArquivos(arquivos.filter((a) => a.path !== arquivo.path));
    await fetch(`/api/upload-celular/${encodeURIComponent(token)}?path=${encodeURIComponent(arquivo.path)}`, {
      method: 'DELETE',
    });
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  const emLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-zinc-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FiSmartphone className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
        <h4 className="text-sm font-medium text-gray-800 dark:text-zinc-200 text-left">Enviar pelo celular</h4>
        {token && !expirado && (
          <span className="ml-auto text-xs font-medium text-gray-600 dark:text-zinc-400">
            {arquivos.length}/{UPLOAD_CELULAR_MAX_ARQUIVOS} recebidos
          </span>
        )}
      </div>

      {!token || expirado ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-gray-600 dark:text-zinc-400 text-left">
            {expirado
              ? 'O QR Code expirou. Gere um novo para continuar enviando.'
              : 'Gere um QR Code e escaneie com o celular para tirar fotos e vídeos do aparelho. Eles chegam aqui automaticamente.'}
          </p>
          <button
            type="button"
            onClick={gerarSessao}
            disabled={gerando}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {gerando ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiRefreshCw className="w-4 h-4" />}
            {expirado ? 'Gerar novo QR Code' : 'Gerar QR Code'}
          </button>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="shrink-0 rounded-lg bg-white p-2 border border-gray-200">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code para enviar fotos pelo celular" className="w-44 h-44" />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center">
                <FiLoader className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 text-left">
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Escaneie com a câmera do celular. Até {UPLOAD_CELULAR_MAX_ARQUIVOS} fotos ou vídeos, várias de uma vez.
            </p>
            <button
              type="button"
              onClick={copiarLink}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <FiCopy className="w-3.5 h-3.5" />
              {copiado ? 'Link copiado!' : 'Copiar link'}
            </button>
            {emLocalhost && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Você está em localhost: o celular não acessa esse endereço. Abra o sistema pelo IP da rede
                (ex.: http://192.168.0.10:3000) para testar.
              </p>
            )}
          </div>
        </div>
      )}

      {arquivos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
          {arquivos.map((arq) => (
            <div key={arq.path} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              {arq.tipo === 'video' ? (
                <>
                  <video src={`${arq.url}#t=0.1`} preload="metadata" muted playsInline className="w-full h-full object-cover" />
                  <FiVideo className="absolute bottom-1 left-1 w-4 h-4 text-white drop-shadow" />
                </>
              ) : (
                <img src={arq.url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => remover(arq)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remover"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

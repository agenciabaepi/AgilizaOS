'use client';

import { useState } from 'react';
import { FiX, FiPlay, FiDownload, FiAlertCircle } from 'react-icons/fi';

interface VideosOSProps {
  videos: string | string[];
  ordemId: string;
  titulo?: string;
}

/** Converte URL do Supabase Storage para proxy (URL assinada - evita bucket privado). */
function getVideoSrcUrl(rawUrl: string): string {
  const u = String(rawUrl || '').trim();
  if (!u) return u;
  const hasSupabaseStorage = (u.includes('supabase') || u.includes('supabase.co')) && u.includes('ordens-imagens');
  if (hasSupabaseStorage) {
    return `/api/ordens/video-proxy?url=${encodeURIComponent(u)}`;
  }
  return u;
}

export default function VideosOS({ videos, ordemId, titulo = 'Vídeos do Técnico' }: VideosOSProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [videoErrors, setVideoErrors] = useState<Set<number>>(new Set());

  if (!videos || videos.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-6 text-center">
        <div className="text-gray-400 dark:text-zinc-500 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-zinc-400 text-sm">Nenhum vídeo disponível</p>
      </div>
    );
  }

  const videoUrls = (() => {
    if (!videos) return [];
    if (Array.isArray(videos)) return videos.map((u: unknown) => String(u || '').trim()).filter(Boolean);
    return String(videos)
      .split(',')
      .map((url: string) => url.trim())
      .filter((url: string) => url !== '' && url.length > 0);
  })();

  const openModal = (videoUrl: string) => {
    setSelectedVideo(videoUrl);
    setModalOpen(true);
  };

  const [fallbackUrls, setFallbackUrls] = useState<Set<number>>(new Set());

  const handleVideoError = (index: number) => {
    const rawUrl = String(videoUrls[index] || '').trim();
    const displayUrl = getVideoSrcUrl(rawUrl);
    const usesProxy = rawUrl && displayUrl !== rawUrl;

    // Se usamos proxy e ainda não tentamos URL direta, tenta fallback
    if (usesProxy && !fallbackUrls.has(index)) {
      setFallbackUrls(prev => new Set(prev).add(index));
      return;
    }
    setVideoErrors(prev => new Set(prev).add(index));
  };

  const downloadVideo = async (videoUrl: string, index: number): Promise<void> => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OS-${ordemId}-video-${index + 1}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar vídeo:', error);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">{titulo}</h3>
          <span className="text-sm text-gray-500 dark:text-zinc-400">
            {videoUrls.length} {videoUrls.length === 1 ? 'vídeo' : 'vídeos'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videoUrls.map((videoUrl, index) => {
            const hasError = videoErrors.has(index);
            const useFallback = fallbackUrls.has(index);
            const displayUrl = useFallback ? String(videoUrl).trim() : getVideoSrcUrl(videoUrl);
            return (
              <div key={index} className="relative group">
                {hasError ? (
                  <div className="w-full aspect-video bg-gray-100 dark:bg-zinc-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-zinc-600 flex flex-col items-center justify-center p-3">
                    <FiAlertCircle className="w-8 h-8 text-gray-400 dark:text-zinc-500 mb-2" />
                    <p className="text-xs text-gray-500 dark:text-zinc-400 text-center px-2">Formato de vídeo não suportado ou erro ao carregar</p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center mt-1">Use o botão abaixo para baixar e assistir no seu dispositivo</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const urlToUse = getVideoSrcUrl(String(videoUrl).trim()) || String(videoUrl).trim();
                        downloadVideo(urlToUse, index);
                      }}
                      className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <FiDownload size={16} />
                      Baixar vídeo
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      className="relative w-full aspect-video bg-gray-900 dark:bg-black rounded-lg border border-gray-200 dark:border-zinc-600 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      onClick={() => openModal(displayUrl)}
                    >
                      <video
                        src={displayUrl}
                        className="w-full h-full object-contain"
                        preload="auto"
                        onError={() => handleVideoError(index)}
                        muted
                        playsInline
                      />
                      {/* Overlay com play e ações */}
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all flex items-center justify-center">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(displayUrl);
                            }}
                            className="bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 rounded-full p-3 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors shadow-lg"
                            title="Assistir"
                          >
                            <FiPlay size={20} className="ml-0.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadVideo(displayUrl, index);
                            }}
                            className="bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 rounded-full p-3 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors shadow-lg"
                            title="Baixar"
                          >
                            <FiDownload size={18} />
                          </button>
                        </div>
                      </div>
                      {/* Ícone play central quando não hover */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="rounded-full bg-black/50 p-4">
                          <FiPlay size={32} className="text-white ml-1" />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal para visualização em tela cheia */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <video
              src={selectedVideo}
              controls
              autoPlay
              className="w-full max-h-[85vh] rounded-lg"
              playsInline
            />
            <button
              onClick={() => setModalOpen(false)}
              className="absolute -top-2 -right-2 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 rounded-full p-2 shadow-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <FiX size={24} />
            </button>
            <button
              onClick={() => downloadVideo(selectedVideo, 0)}
              className="absolute top-4 right-12 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors shadow-lg"
            >
              <FiDownload size={16} />
              Baixar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

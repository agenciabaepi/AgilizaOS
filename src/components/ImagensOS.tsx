'use client';

import { useState } from 'react';
import { FiX, FiZoomIn, FiDownload, FiAlertCircle } from 'react-icons/fi';

interface ImagensOSProps {
  imagens: string;
  ordemId: string;
  /** Título da seção (ex: "Imagens do Equipamento" ou "Imagens do Técnico") */
  titulo?: string;
}

export default function ImagensOS({ imagens, ordemId, titulo = 'Imagens do Equipamento' }: ImagensOSProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  function extractTimestampMsFromUrl(rawUrl: string): number | null {
    // Tentamos extrair timestamps usados no upload (Date.now()) do nome do arquivo:
    // - /<osId>/<13-dígitos>_<nome>
    // - /<osId>/<13-dígitos>-<rand>.<ext>
    // (mantém fallback para outros formatos)
    const s = String(rawUrl || '').trim();
    if (!s) return null;
    let path = s;
    try {
      const u = new URL(s);
      path = decodeURIComponent(u.pathname);
    } catch {
      // pode ser url parcial; tenta mesmo assim
      path = s;
    }

    const m13 = path.match(/(?:^|\/)(\d{13})(?:[_-])/);
    if (m13) return Number(m13[1]);

    const m10 = path.match(/(?:^|\/)(\d{10})(?:[_-])/);
    if (m10) return Number(m10[1]) * 1000;

    return null;
  }

  function formatDateTimePtBr(ms: number | null): string {
    if (!ms || !Number.isFinite(ms)) return '---';
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '---';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  if (!imagens || imagens.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Nenhuma imagem disponível</p>
      </div>
    );
  }

  // Limpar e filtrar URLs válidas
  const imageUrls = imagens 
    ? imagens
        .split(',')
        .map((url: string) => url.trim())
        .filter((url: string) => url !== '' && url.length > 0)
    : [];

  const openModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setModalOpen(true);
  };

  const handleImageError = (index: number) => {
    console.error(`Erro ao carregar imagem ${index + 1}:`, imageUrls[index]);
    setImageErrors(prev => new Set(prev).add(index));
  };

  const downloadImage = async (imageUrl: string, index: number): Promise<void> => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OS-${ordemId}-imagem-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
    }
  };

  // Determinar grid baseado no número de imagens para melhor distribuição
  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-2xl mx-auto';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 gap-4';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
    if (count === 4) return 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4';
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{titulo}</h3>
          <span className="text-sm text-gray-500">
            {imageUrls.length} {imageUrls.length === 1 ? 'imagem' : 'imagens'}
          </span>
        </div>
        
        <div className={getGridClass(imageUrls.length)}>
          {imageUrls.map((imageUrl, index) => {
            const hasError = imageErrors.has(index);
            const anexoDataHora = formatDateTimePtBr(extractTimestampMsFromUrl(imageUrl));
            return (
              <div key={index} className="relative group">
                {hasError ? (
                  <div className="w-full aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                    <FiAlertCircle className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-xs text-gray-500 text-center px-2">Erro ao carregar imagem</p>
                    <p className="text-xs text-gray-400 text-center px-2 mt-1 break-all">{imageUrl.substring(0, 50)}...</p>
                    <p className="text-[11px] text-gray-500 mt-2">{anexoDataHora}</p>
                  </div>
                ) : (
                  <>
                    <img
                      src={imageUrl}
                      alt={`Imagem ${index + 1} da OS ${ordemId}`}
                      className="w-full aspect-video object-cover rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                      onClick={() => openModal(imageUrl)}
                      onError={() => handleImageError(index)}
                      loading="lazy"
                    />

                    {/* Data/Hora do anexo */}
                    <div className="mt-1 text-[11px] text-gray-600">
                      {anexoDataHora}
                    </div>
                    
                    {/* Overlay com ações */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center pointer-events-none">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(imageUrl);
                          }}
                          className="bg-white text-gray-700 rounded-full w-9 h-9 flex items-center justify-center text-sm hover:bg-gray-100 transition-colors shadow-lg"
                          title="Ampliar"
                        >
                          <FiZoomIn size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadImage(imageUrl, index);
                          }}
                          className="bg-white text-gray-700 rounded-full w-9 h-9 flex items-center justify-center text-sm hover:bg-gray-100 transition-colors shadow-lg"
                          title="Baixar"
                        >
                          <FiDownload size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal para visualização ampliada */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Imagem ampliada"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            <button
              onClick={() => setModalOpen(false)}
              className="absolute -top-4 -right-4 bg-white text-gray-700 rounded-full w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              <FiX size={20} />
            </button>
            
            <button
              onClick={() => downloadImage(selectedImage, 0)}
              className="absolute top-4 right-4 bg-white text-gray-700 rounded-lg px-3 py-2 flex items-center gap-2 text-sm hover:bg-gray-100 transition-colors shadow-lg"
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
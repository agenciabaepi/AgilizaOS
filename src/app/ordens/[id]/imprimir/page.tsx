'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { OrdemPDF } from '@/components/ordem-pdf/OrdemPDFCompleta';

export default function ImprimirOrdemPage() {
  const { id } = useParams();
  const [ordem, setOrdem] = useState<any>(null);
  const [checklistItens, setChecklistItens] = useState<any[]>([]);
  const [PDFViewer, setPDFViewer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  /** Carrega heic2any do CDN (sem npm) para converter HEIC → JPEG no navegador. */
  function loadHeic2any(): Promise<(opts: { blob: Blob; toType?: string }) => Promise<Blob | Blob[]>> {
    const w = typeof window === 'undefined' ? null : (window as any);
    if (!w) return Promise.reject(new Error('no window'));
    if (w.__heic2any) return Promise.resolve(w.__heic2any);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = () => {
        w.__heic2any = w.heic2any;
        resolve(w.heic2any);
      };
      s.onerror = () => reject(new Error('Falha ao carregar heic2any'));
      document.head.appendChild(s);
    });
  }

  function isHeicDataUrl(s: string): boolean {
    return typeof s === 'string' && /^data:image\/(heic|heif)/i.test(s);
  }

  async function convertHeicDataUrlToJpeg(dataUrl: string, heic2anyFn: (opts: { blob: Blob; toType?: string }) => Promise<Blob | Blob[]>): Promise<string> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const result = await heic2anyFn({ blob, toType: 'image/jpeg' });
    const outBlob = Array.isArray(result) ? result[0] : result;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(outBlob);
    });
  }

  /** Quando a API não retorna data URLs, busca cada imagem via proxy no cliente e monta os arrays. */
  async function preencherImagensPdfPeloCliente(ordemFromApi: any): Promise<any> {
    let imagens_pdf = ordemFromApi.imagens_pdf;
    let imagens_tecnico_pdf = ordemFromApi.imagens_tecnico_pdf;

    const hasDataUrls = (s: string | null | undefined) => {
      if (!s || typeof s !== 'string') return false;
      const t = s.trim();
      if (!t || t === '[]') return false;
      if (t.startsWith('[')) {
        try {
          const arr = JSON.parse(t);
          return Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string';
        } catch {
          return false;
        }
      }
      return false;
    };

    if (!hasDataUrls(imagens_pdf) && ordemFromApi.imagens) {
      imagens_pdf = await prepareImagesForPdf(ordemFromApi.imagens, 30);
    }
    if (!hasDataUrls(imagens_tecnico_pdf) && ordemFromApi.imagens_tecnico) {
      imagens_tecnico_pdf = await prepareImagesForPdf(ordemFromApi.imagens_tecnico, 30);
    }

    if (imagens_pdf === ordemFromApi.imagens_pdf && imagens_tecnico_pdf === ordemFromApi.imagens_tecnico_pdf) {
      return ordemFromApi;
    }
    return { ...ordemFromApi, imagens_pdf, imagens_tecnico_pdf, laudo: ordemFromApi.laudo };
  }

  /** Tamanho máximo do lado maior da imagem no PDF (evita payload gigante e bugs do react-pdf). */
  const MAX_IMAGE_DIM = 400;

  /**
   * Converte qualquer data URL de imagem para PNG e redimensiona para caber em MAX_IMAGE_DIM.
   * Evita o erro "Unknown version" do react-pdf com JPEG/WebP e reduz tamanho do base64.
   */
  async function dataUrlToPng(dataUrl: string): Promise<string | null> {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
    const trimmed = dataUrl.trim();
    if (trimmed.startsWith('data:image/png;base64,')) {
      // Já é PNG; opcionalmente redimensionar se for muito grande
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            if (w <= MAX_IMAGE_DIM && h <= MAX_IMAGE_DIM) {
              resolve(trimmed);
              return;
            }
            const scale = MAX_IMAGE_DIM / Math.max(w, h);
            const cw = Math.round(w * scale);
            const ch = Math.round(h * scale);
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(trimmed);
              return;
            }
            ctx.drawImage(img, 0, 0, cw, ch);
            resolve(canvas.toDataURL('image/png'));
          } catch {
            resolve(trimmed);
          }
        };
        img.onerror = () => resolve(trimmed);
        img.src = trimmed;
      });
    }
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(w, h, 1));
          const cw = Math.round(w * scale);
          const ch = Math.round(h * scale);
          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, cw, ch);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = trimmed;
    });
  }

  /** Normaliza todas as imagens (data URLs) para PNG para evitar bug do react-pdf com JPEG. */
  async function normalizeImagensToPng(ordemFromApi: any): Promise<any> {
    if (!ordemFromApi?.imagens_pdf && !ordemFromApi?.imagens_tecnico_pdf) return ordemFromApi;
    const convertArray = async (jsonStr: string | null): Promise<string> => {
      if (!jsonStr || typeof jsonStr !== 'string') return jsonStr || '';
      let arr: string[];
      try {
        arr = JSON.parse(jsonStr);
      } catch {
        return jsonStr;
      }
      if (!Array.isArray(arr)) return jsonStr;
      const out = await Promise.all(
        arr.map(async (item: string) => {
          if (typeof item !== 'string' || !item.startsWith('data:image/')) return item;
          const png = await dataUrlToPng(item);
          return png || item;
        })
      );
      return JSON.stringify(out);
    };
    return {
      ...ordemFromApi,
      imagens_pdf: await convertArray(ordemFromApi.imagens_pdf),
      imagens_tecnico_pdf: await convertArray(ordemFromApi.imagens_tecnico_pdf),
    };
  }

  /** Converte data URLs HEIC em imagens_pdf e imagens_tecnico_pdf para JPEG no navegador. */
  async function convertHeicInOrdem(ordemFromApi: any): Promise<any> {
    if (!ordemFromApi.imagens_pdf && !ordemFromApi.imagens_tecnico_pdf) return ordemFromApi;
    try {
      const heic2anyFn = await loadHeic2any();
      const convertArray = async (jsonStr: string | null): Promise<string> => {
        if (!jsonStr || typeof jsonStr !== 'string') return jsonStr || '';
        let arr: string[];
        try {
          arr = JSON.parse(jsonStr);
        } catch {
          return jsonStr;
        }
        if (!Array.isArray(arr)) return jsonStr;
        const out = await Promise.all(
          arr.map(async (item: string) => {
            if (typeof item !== 'string' || !isHeicDataUrl(item)) return item;
            try {
              return await convertHeicDataUrlToJpeg(item, heic2anyFn);
            } catch {
              return item;
            }
          })
        );
        return JSON.stringify(out);
      };
      return {
        ...ordemFromApi,
        imagens_pdf: await convertArray(ordemFromApi.imagens_pdf),
        imagens_tecnico_pdf: await convertArray(ordemFromApi.imagens_tecnico_pdf),
      };
    } catch (e) {
      console.warn('Conversão HEIC no navegador falhou:', e);
      return ordemFromApi;
    }
  }

  async function urlToDataUrl(url: string): Promise<string | null> {
    try {
      // Tentar via proxy no servidor primeiro (evita CORS e bucket privado)
      const supabaseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL || '') : '';
      let isSupabase = false;
      if (supabaseUrl) {
        try {
          isSupabase = url.includes(new URL(supabaseUrl).hostname);
        } catch {
          isSupabase = url.includes('supabase');
        }
      }
      if (isSupabase && typeof window !== 'undefined') {
        const proxyRes = await fetch(
          `/api/ordens/imagem-proxy?url=${encodeURIComponent(url.trim())}`,
          { cache: 'no-store' }
        );
        if (proxyRes.ok) {
          const json = await proxyRes.json().catch(() => null);
          if (json?.dataUrl && typeof json.dataUrl === 'string' && json.dataUrl.startsWith('data:image/')) {
            return json.dataUrl;
          }
        }
      }
      // Fallback: fetch direto (pode falhar por CORS em bucket privado)
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.type || !blob.type.startsWith('image/')) return null;
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function prepareImagesForPdf(imagens: string | null | undefined, limit = 30): Promise<string> {
    if (!imagens || typeof imagens !== 'string') return '';
    const urls = imagens
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u && u !== 'null' && u !== 'undefined')
      .filter((u) => /^https?:\/\//i.test(u));

    const unique = Array.from(new Set(urls)).slice(0, limit);

    // Busca cada imagem via proxy (data URL). Se falhar, mantém a URL para o PDF tentar carregar.
    const resolved = await Promise.all(
      unique.map(async (u) => {
        const dataUrl = await urlToDataUrl(u.trim());
        return dataUrl || u.trim();
      })
    );
    const valid = resolved.filter((r): r is string => typeof r === 'string' && (r.startsWith('data:image/') || /^https?:\/\//i.test(r)));
    return JSON.stringify(valid);
  }

  useEffect(() => {
    async function fetchOrdem() {
      if (!id) {
        console.error('ID da OS não fornecido');
        setError('ID da OS não fornecido');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/ordens/${id}/dados-impressao`, { cache: 'no-store' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(errData?.error || `Erro ${res.status} ao carregar OS`);
          setLoading(false);
          return;
        }
        const { ordem: ordemFromApi, checklistItens: checklistFromApi } = await res.json();
        if (!ordemFromApi) {
          setError('OS não encontrada');
          setLoading(false);
          return;
        }
        // Se a API não trouxe data URLs, busca imagens via proxy no cliente
        const ordemComImagens = await preencherImagensPdfPeloCliente(ordemFromApi);
        // Converte HEIC (iPhone) para JPEG no navegador (heic2any via CDN, sem npm)
        const ordemComHeicConvertido = await convertHeicInOrdem(ordemComImagens);
        // Normaliza todas as imagens para PNG (evita "Unknown version" do react-pdf com JPEG)
        const ordemComPng = await normalizeImagensToPng(ordemComHeicConvertido);
        setOrdem(ordemComPng);
        setChecklistItens(checklistFromApi || []);
      } catch (err: any) {
        setError(err?.message || 'Erro ao conectar');
      } finally {
        setLoading(false);
      }
    }

    fetchOrdem();
  }, [id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Carregar PDFViewer com retry (evita ChunkLoadError após rebuild/cache)
  useEffect(() => {
    let cancelled = false;
    const load = (attempt = 1) => {
      import('@react-pdf/renderer')
        .then((mod) => {
          if (!cancelled) setPDFViewer(() => mod.PDFViewer);
        })
        .catch((err) => {
          if (cancelled) return;
          const isChunk = err?.name === 'ChunkLoadError' || /ChunkLoadError|Loading chunk/i.test(String(err?.message));
          if (isChunk && attempt < 3) {
            setTimeout(() => load(attempt + 1), 800 * attempt);
          } else {
            console.warn('Falha ao carregar visualizador PDF:', err);
          }
        });
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar a OS</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.history.back()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Voltar
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!PDFViewer || !ordem) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Preparando impressão...</p>
          <p className="text-gray-500 text-sm mt-2">
            {!PDFViewer ? 'Carregando visualizador PDF...' : 'Carregando dados da OS...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    
      <PDFViewer style={{ width: '100vw', height: '100vh' }}>
        <OrdemPDF ordem={ordem} checklistItens={checklistItens} />
      </PDFViewer>
    
  );
}
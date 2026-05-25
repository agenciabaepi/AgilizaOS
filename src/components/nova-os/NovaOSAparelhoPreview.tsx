'use client';

import { useEffect, useState } from 'react';
import { FiSmartphone } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import type { AparelhoSelecionado } from '@/types/aparelhos';
import {
  aparelhoImagemComCacheBust,
  aparelhoImagemPreviewUrl,
  preloadAparelhoImagens,
} from '@/lib/aparelhos-imagens';

interface NovaOSAparelhoPreviewProps {
  imagemUrl?: string | null;
  imagemFrenteUrl?: string | null;
  imagemVersoUrl?: string | null;
  /** Força recarregar <img> ao trocar cor (evita cache do navegador) */
  corCacheBust?: string | null;
  marca: string;
  modelo: string;
  tipo?: string;
  aparelhoSelecionado?: AparelhoSelecionado | null;
  /** Imagem obtida via IA (fallback quando não há imagem no catálogo) */
  imagemIAUrl?: string | null;
  /** @deprecated — tamanho único otimizado para Nova OS */
  compact?: boolean;
}

const PREVIEW_SIZES = {
  slotMinH: 'min-h-[220px] sm:min-h-[280px]',
  slotH: 'h-[220px] sm:h-[280px]',
  imgMaxH: 'max-h-[210px] sm:max-h-[270px]',
  imgWidth: 640,
  gridMinH: 'min-h-[240px] sm:min-h-[300px]',
  padding: 'p-5 sm:p-6',
} as const;

function SlotImagem({
  label,
  src,
  alt,
  priority,
  cacheBust,
  isExternal,
  badge,
}: {
  label: string;
  src: string | null;
  alt: string;
  priority?: boolean;
  cacheBust?: string | null;
  isExternal?: boolean;
  badge?: string | null;
}) {
  const rawSrc = src ? (isExternal ? src : aparelhoImagemComCacheBust(src, cacheBust)) : null;
  const displaySrc = rawSrc
    ? isExternal
      ? rawSrc
      : aparelhoImagemPreviewUrl(rawSrc, { width: PREVIEW_SIZES.imgWidth, quality: 82 })
    : null;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    if (displaySrc && !isExternal) preloadAparelhoImagens(displaySrc);
  }, [displaySrc, isExternal]);

  return (
    <div className="flex flex-col items-center min-w-0 w-full">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</span>
      <div
        className={`relative w-full ${PREVIEW_SIZES.slotMinH} ${PREVIEW_SIZES.slotH} flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-inner`}
      >
        {displaySrc && !failed ? (
          <>
            {!loaded && (
              <div
                className="absolute inset-2 rounded-xl bg-gray-100 animate-pulse border border-gray-100"
                aria-hidden
              />
            )}
            <img
              src={displaySrc}
              alt={alt}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              referrerPolicy={isExternal ? 'no-referrer' : undefined}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={`object-contain drop-shadow-lg w-full h-full ${PREVIEW_SIZES.imgMaxH} transition-opacity duration-200 ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {badge && loaded && (
              <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                <HiSparkles className="w-3 h-3" />
                {badge}
              </span>
            )}
          </>
        ) : (
          <div
            className={`flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/80 text-gray-300 w-full ${PREVIEW_SIZES.slotH}`}
          >
            <FiSmartphone className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function NovaOSAparelhoPreview({
  imagemUrl,
  imagemFrenteUrl,
  imagemVersoUrl,
  corCacheBust,
  marca,
  modelo,
  tipo,
  aparelhoSelecionado,
  imagemIAUrl,
}: NovaOSAparelhoPreviewProps) {
  const titulo = [marca, modelo].filter(Boolean).join(' ') || 'Aparelho';
  const frenteCatalogo =
    imagemFrenteUrl !== undefined
      ? imagemFrenteUrl
      : aparelhoSelecionado?.imagemFrenteUrl ?? imagemUrl ?? aparelhoSelecionado?.imagemUrl ?? null;
  const verso =
    imagemVersoUrl !== undefined
      ? imagemVersoUrl
      : aparelhoSelecionado?.imagemVersoUrl ?? null;

  const usandoIA = !frenteCatalogo && !verso && !!imagemIAUrl;
  const frente = frenteCatalogo || imagemIAUrl || null;

  const aparelhoEscolhido = !!(marca || modelo || aparelhoSelecionado);
  const temAlgumaImagem = !!(frente || verso);

  useEffect(() => {
    if (!usandoIA) preloadAparelhoImagens(frente, verso);
  }, [frente, verso, usandoIA]);

  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-gray-100 bg-gradient-to-b from-slate-50 via-white to-white ${PREVIEW_SIZES.padding}`}
    >
      {temAlgumaImagem || aparelhoEscolhido ? (
        <div className={`grid w-full grid-cols-2 gap-4 sm:gap-6 ${PREVIEW_SIZES.gridMinH}`}>
          <SlotImagem
            key={`frente-${corCacheBust || 'x'}-${frente || 'vazio'}`}
            label={usandoIA ? 'Imagem' : 'Frente'}
            src={frente}
            alt={`${titulo} — frente`}
            priority
            cacheBust={usandoIA ? undefined : corCacheBust}
            isExternal={usandoIA}
            badge={usandoIA ? 'IA' : null}
          />
          <SlotImagem
            key={`verso-${corCacheBust || 'x'}-${verso || 'vazio'}`}
            label="Verso"
            src={verso}
            alt={`${titulo} — verso`}
            cacheBust={corCacheBust}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-gray-400 py-10 w-full min-h-[200px] sm:min-h-[260px]">
          <FiSmartphone className="mb-3 opacity-30 w-14 h-14" />
          <p className="text-sm font-medium text-gray-500">Selecione um aparelho</p>
          <p className="text-xs mt-1 text-gray-400">As fotos aparecem aqui</p>
        </div>
      )}
      {(marca || modelo || tipo) && (
        <div className="w-full mt-4 pt-4 border-t border-gray-100 text-center space-y-1">
          <p className="font-semibold text-gray-900 text-base">{titulo}</p>
          {tipo && <p className="text-sm text-gray-500">{tipo}</p>}
          {aparelhoSelecionado && (
            <p className="text-xs text-gray-400">
              {aparelhoSelecionado.origem === 'catalogo_global'
                ? 'Catálogo Consert'
                : aparelhoSelecionado.origem === 'empresa'
                  ? 'Meus aparelhos'
                  : null}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

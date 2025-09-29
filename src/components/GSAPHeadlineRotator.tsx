'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface GSAPHeadlineRotatorProps {
  phrases: string[];
  interval?: number;
  isDarkMode: boolean;
  className?: string;
}

// Rotaciona frases inteiras com crossfade CSS (sem manipular innerHTML/hidratação)
export default function GSAPHeadlineRotator({
  phrases,
  interval = 4000,
  isDarkMode,
  className = ''
}: GSAPHeadlineRotatorProps) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [reservedHeight, setReservedHeight] = useState<number | undefined>(undefined);
  const measureRef = useRef<HTMLHeadingElement>(null);

  const current = useMemo(() => phrases[index] ?? '', [phrases, index]);

  // Medir altura máxima para fixar o bloco e evitar layout shift
  useEffect(() => {
    if (!measureRef.current) return;
    // mede usando a maior frase (por comprimento)
    const longest = phrases.reduce((a, b) => (a.length >= b.length ? a : b), '');
    const el = measureRef.current;
    el.textContent = longest;
    // força reflow e mede
    const h = el.clientHeight;
    if (h > 0) setReservedHeight(h);
  }, [phrases, className]);

  // efeito de digitação (sem manipular DOM)
  useEffect(() => {
    setTyped('');
    let i = 0;
    const step = () => {
      i += 1;
      setTyped(current.slice(0, i));
      if (i < current.length) {
        timeoutId = window.setTimeout(step, 28); // velocidade letra‑a‑letra
      } else {
        // aguarda e troca para próxima frase
        timeoutId = window.setTimeout(() => {
          setIndex((prev) => (prev + 1) % phrases.length);
        }, Math.max(1200, interval - current.length * 28));
      }
    };
    let timeoutId = window.setTimeout(step, 10);
    return () => window.clearTimeout(timeoutId);
  }, [current, phrases.length, interval]);

  return (
    <div style={{ height: reservedHeight ? reservedHeight + 12 : undefined, marginBottom: '0.5rem' }}>
      {/* Medidor invisível */}
      <h1 ref={measureRef} className={className} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', whiteSpace: 'pre-wrap' }} />
      {/* Conteúdo visível */}
      <h1
        aria-live="polite"
        className={className}
        style={{ color: isDarkMode ? undefined : '#111827' }}
      >
        <span style={{ fontWeight: 700 }}>{typed}</span>
        <span className="animate-pulse" style={{ marginLeft: 2 }}>|</span>
      </h1>
    </div>
  );
}

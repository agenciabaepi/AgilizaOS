'use client';

import { useState } from 'react';
import { FiGrid } from 'react-icons/fi';
import { resolveMarcaImagemUrl } from '@/lib/pecas-marcas';

export default function MarcaLogo({
  slug,
  nome,
  imagemUrl,
  className = 'w-10 h-10',
}: {
  slug?: string | null;
  nome?: string | null;
  imagemUrl?: string | null;
  className?: string;
}) {
  const resolved = resolveMarcaImagemUrl({ slug, nome, imagemUrl });
  const [failed, setFailed] = useState(false);

  if (resolved && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={nome || 'Marca'}
        className={`${className} object-contain`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  const letter = (nome || slug || '?').trim().charAt(0).toUpperCase();
  if (letter) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold tracking-tight text-2xl ${className}`}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  return <FiGrid className={className} strokeWidth={1.5} />;
}

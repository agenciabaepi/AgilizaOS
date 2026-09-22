'use client';

import { useState } from 'react';

const AVATAR_COLORS = [
  '#e17076',
  '#7bc862',
  '#e5ca4b',
  '#65aadd',
  '#ee7aae',
  '#6ec3c3',
  '#faa774',
  '#a695e7',
];

function hashHue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

interface Props {
  name: string;
  fotoUrl?: string | null;
  size?: number;
  className?: string;
}

/**
 * Foto do contato quando houver URL; senão avatar colorido (Cloud API da Meta
 * não envia foto de perfil do cliente).
 */
export function ContactAvatar({ name, fotoUrl, size = 48, className = '' }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const color = AVATAR_COLORS[hashHue(name || '?') % AVATAR_COLORS.length];
  const showImg = Boolean(fotoUrl) && !imgFailed;

  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden flex items-center justify-center text-white font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: showImg ? '#dfe5e7' : color,
        fontSize: Math.round(size * 0.32),
      }}
      aria-hidden
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fotoUrl!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}

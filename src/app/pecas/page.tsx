'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiSmartphone,
  FiBatteryCharging,
  FiCpu,
  FiSquare,
  FiCamera,
  FiVolume2,
  FiCircle,
  FiPackage,
  FiChevronRight,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import type { PecaGrupoCatalogo } from '@/types/pecas';
import PecasShell from '@/components/PecasShell';

const ICON_MAP: Record<string, IconType> = {
  smartphone: FiSmartphone,
  battery: FiBatteryCharging,
  plug: FiCpu,
  square: FiSquare,
  camera: FiCamera,
  cpu: FiCpu,
  volume: FiVolume2,
  circle: FiCircle,
};

function GrupoIcon({ name }: { name?: string | null }) {
  const Icon = (name && ICON_MAP[name]) || FiPackage;
  return <Icon className="w-9 h-9 sm:w-10 sm:h-10" strokeWidth={1.5} />;
}

export default function PecasCatalogoPage() {
  const [grupos, setGrupos] = useState<PecaGrupoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/pecas?view=grupos', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (!data.ok) {
          setErro(data.error || 'Não foi possível carregar o catálogo');
          return;
        }
        setGrupos(data.grupos || []);
      } catch {
        if (!cancelled) setErro('Erro de conexão');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PecasShell>
      <div className="max-w-lg mx-auto px-4 pt-5 pb-2 w-full">
        <h1 className="text-2xl font-bold tracking-tight">Peças</h1>
        <p className="text-sm text-zinc-500 mt-1">Escolha um grupo para ver o que temos disponível.</p>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4 pb-10 w-full flex-1">
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-zinc-200/80 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && erro && (
          <div className="rounded-2xl bg-red-50 text-red-800 text-sm p-4">{erro}</div>
        )}

        {!loading && !erro && grupos.length === 0 && (
          <div className="rounded-2xl bg-white border border-zinc-200 p-8 text-center text-sm text-zinc-500">
            Nenhum grupo disponível no momento.
          </div>
        )}

        {!loading && !erro && grupos.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {grupos.map((grupo) => (
              <Link
                key={grupo.id}
                href={`/pecas/${grupo.slug}`}
                className="group aspect-square rounded-2xl bg-white border border-zinc-200 shadow-sm active:scale-[0.98] transition-transform flex flex-col justify-between p-4 touch-manipulation"
              >
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-xl bg-zinc-900 text-[#D1FE6E] flex items-center justify-center">
                    <GrupoIcon name={grupo.icone} />
                  </div>
                  <FiChevronRight className="w-5 h-5 text-zinc-300 group-active:text-zinc-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">{grupo.nome}</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    {grupo.pecas_count
                      ? `${grupo.pecas_count} disponível${grupo.pecas_count === 1 ? '' : 'is'}`
                      : 'Em breve'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </PecasShell>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';
import type { PecaCatalogo } from '@/types/pecas';
import PecasShell from '@/components/PecasShell';
import PecasLista from '@/components/PecasLista';

export default function PecasSubcategoriaPage() {
  const params = useParams();
  const grupoSlug = String(params?.grupo || '');
  const categoriaSlug = String(params?.categoria || '');
  const subcategoriaSlug = String(params?.subcategoria || '');

  const [categoriaNome, setCategoriaNome] = useState('');
  const [subNome, setSubNome] = useState('');
  const [pecas, setPecas] = useState<PecaCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!grupoSlug || !categoriaSlug || !subcategoriaSlug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          view: 'pecas',
          grupo: grupoSlug,
          categoria: categoriaSlug,
          subcategoria: subcategoriaSlug,
        });
        const res = await fetch(`/api/pecas?${qs}`, { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!data.ok) {
          setErro(data.error || 'Não foi possível carregar');
          return;
        }
        setCategoriaNome(data.categoria?.nome || categoriaSlug);
        setSubNome(data.subcategoria?.nome || subcategoriaSlug);
        setPecas(data.pecas || []);
      } catch {
        if (!cancelled) setErro('Erro de conexão');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [grupoSlug, categoriaSlug, subcategoriaSlug]);

  if (notFound) {
    return (
      <PecasShell>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center">
            <p className="text-zinc-600 mb-4">Subcategoria não encontrada.</p>
            <Link
              href={`/pecas/${grupoSlug}/${categoriaSlug}`}
              className="text-sm font-medium underline"
            >
              Voltar
            </Link>
          </div>
        </div>
      </PecasShell>
    );
  }

  return (
    <PecasShell>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-2 w-full">
        <Link
          href={`/pecas/${grupoSlug}/${categoriaSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 min-h-[40px]"
        >
          <FiArrowLeft /> {categoriaNome || 'Voltar'}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">{subNome}</h1>
        <p className="text-sm text-zinc-500 mt-1">Peças disponíveis.</p>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4 pb-10 w-full flex-1">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-zinc-200/80 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && erro && (
          <div className="rounded-2xl bg-red-50 text-red-800 text-sm p-4">{erro}</div>
        )}

        {!loading && !erro && <PecasLista pecas={pecas} />}
      </main>
    </PecasShell>
  );
}

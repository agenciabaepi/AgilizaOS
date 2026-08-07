'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';
import type { PecaCatalogo, PecaSubcategoriaCatalogo } from '@/types/pecas';
import PecasShell from '@/components/PecasShell';
import PecasListaAgrupada from '@/components/PecasListaAgrupada';

export default function PecasCategoriaPage() {
  const params = useParams();
  const grupoSlug = String(params?.grupo || '');
  const categoriaSlug = String(params?.categoria || '');

  const [grupoNome, setGrupoNome] = useState('');
  const [categoriaNome, setCategoriaNome] = useState('');
  const [subcategorias, setSubcategorias] = useState<PecaSubcategoriaCatalogo[]>([]);
  const [pecas, setPecas] = useState<PecaCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!grupoSlug || !categoriaSlug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          view: 'subcategorias',
          grupo: grupoSlug,
          categoria: categoriaSlug,
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
        setGrupoNome(data.grupo?.nome || grupoSlug);
        setCategoriaNome(data.categoria?.nome || categoriaSlug);
        setSubcategorias(data.subcategorias || []);
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
  }, [grupoSlug, categoriaSlug]);

  if (notFound) {
    return (
      <PecasShell>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center">
            <p className="text-zinc-600 mb-4">Categoria não encontrada.</p>
            <Link href={`/pecas/${grupoSlug}`} className="text-sm font-medium underline">
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
          href={`/pecas/${grupoSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 min-h-[40px]"
        >
          <FiArrowLeft /> {grupoNome || 'Voltar'}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">{categoriaNome}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Busque o modelo — as peças aparecem agrupadas por tipo.
        </p>
      </div>

      <main className="max-w-lg mx-auto px-4 py-3 pb-10 w-full flex-1">
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

        {!loading && !erro && (
          <PecasListaAgrupada
            pecas={pecas}
            subcategorias={subcategorias}
            searchPlaceholder={`Buscar modelo, ex: ${categoriaNome || 'iPhone'} 11`}
            emptyText="Nenhuma peça disponível nesta marca."
          />
        )}
      </main>
    </PecasShell>
  );
}

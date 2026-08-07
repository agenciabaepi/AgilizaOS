'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiChevronRight } from 'react-icons/fi';
import type { PecaCategoriaCatalogo } from '@/types/pecas';
import PecasShell from '@/components/PecasShell';
import MarcaLogo from '@/components/MarcaLogo';

export default function PecasGrupoPage() {
  const params = useParams();
  const slug = String(params?.grupo || '');

  const [grupoNome, setGrupoNome] = useState('');
  const [categorias, setCategorias] = useState<PecaCategoriaCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pecas?view=categorias&grupo=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
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
        setGrupoNome(data.grupo?.nome || slug);
        setCategorias(data.categorias || []);
      } catch {
        if (!cancelled) setErro('Erro de conexão');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (notFound) {
    return (
      <PecasShell>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center">
            <p className="text-zinc-600 mb-4">Grupo não encontrado.</p>
            <Link href="/pecas" className="text-sm font-medium underline">
              Voltar ao catálogo
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
          href="/pecas"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 min-h-[40px]"
        >
          <FiArrowLeft /> Grupos
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">{grupoNome || 'Peças'}</h1>
        <p className="text-sm text-zinc-500 mt-1">Escolha a marca.</p>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4 pb-10 w-full flex-1">
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-zinc-200/80 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && erro && (
          <div className="rounded-2xl bg-red-50 text-red-800 text-sm p-4">{erro}</div>
        )}

        {!loading && !erro && categorias.length === 0 && (
          <div className="rounded-2xl bg-white border border-zinc-200 p-8 text-center text-sm text-zinc-500">
            Nenhuma marca neste grupo ainda.
          </div>
        )}

        {!loading && !erro && categorias.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {categorias.map((cat) => (
              <Link
                key={cat.id}
                href={`/pecas/${slug}/${cat.slug}`}
                className="group aspect-square rounded-2xl bg-white border border-zinc-200 shadow-sm active:scale-[0.98] transition-transform flex flex-col touch-manipulation overflow-hidden"
              >
                <div className="flex-1 flex items-center justify-center p-4 relative">
                  <div className="w-[72%] aspect-square rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-900">
                    <MarcaLogo
                      slug={cat.slug}
                      nome={cat.nome}
                      imagemUrl={cat.imagem_url}
                      className="w-14 h-14 sm:w-16 sm:h-16"
                    />
                  </div>
                  <FiChevronRight className="absolute top-3 right-3 w-5 h-5 text-zinc-300" />
                </div>
                <div className="px-3 pb-3.5 pt-0 text-center">
                  <h2 className="text-base font-semibold leading-tight">{cat.nome}</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {cat.subcategorias_count
                      ? `${cat.subcategorias_count} tipo${cat.subcategorias_count === 1 ? '' : 's'}`
                      : cat.pecas_count
                        ? `${cat.pecas_count} peça${cat.pecas_count === 1 ? '' : 's'}`
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

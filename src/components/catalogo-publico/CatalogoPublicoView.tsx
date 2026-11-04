'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Search, X } from 'lucide-react';
import type { CatalogoPublicoPayload, CatalogoPublicoProduto } from '@/lib/catalogo-publico';
import { formatCatalogoWhatsAppLink } from '@/lib/catalogo-publico';
import { CatalogoProductCard } from './CatalogoProductCard';
import { CatalogoFooter } from './CatalogoFooter';
import { CatalogoCarrinhoProvider } from './CatalogoCarrinhoContext';
import { CatalogoCarrinhoBar, CatalogoCarrinhoDrawer } from './CatalogoCarrinhoDrawer';
import '@/styles/catalogo-publico.css';

function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.01zm-7.01 15.24h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.69 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.07-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

function groupByCategoria(produtos: CatalogoPublicoProduto[]) {
  const map = new Map<string, CatalogoPublicoProduto[]>();
  for (const p of produtos) {
    const key = p.categoria?.trim() || 'Outros';
    const list = map.get(key) || [];
    list.push(p);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
}

function CatalogoPublicoInner({ slug }: { slug: string }) {
  const [data, setData] = useState<CatalogoPublicoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/catalogo-publico/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Catálogo não encontrado');
        }
        if (!cancelled) {
          setData({
            empresa: json.empresa,
            config: json.config,
            produtos: json.produtos || [],
            categorias: json.categorias || [],
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar catálogo');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const filtrados = useMemo(() => {
    if (!data) return [];
    const q = busca.trim().toLowerCase();
    return data.produtos.filter((p) => {
      if (categoria === 'Outros') {
        if (p.categoria) return false;
      } else if (categoria && (p.categoria || '') !== categoria) {
        return false;
      }
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        (p.descricao?.toLowerCase().includes(q) ?? false) ||
        (p.marca?.toLowerCase().includes(q) ?? false) ||
        (p.categoria?.toLowerCase().includes(q) ?? false) ||
        (p.codigo?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data, busca, categoria]);

  const secoes = useMemo(() => {
    if (categoria || busca.trim()) {
      const titulo = busca.trim() ? 'Resultados' : categoria || 'Resultados';
      return filtrados.length ? [[titulo, filtrados] as const] : [];
    }
    return groupByCategoria(filtrados);
  }, [filtrados, categoria, busca]);

  if (loading) {
    return (
      <div className="gc-cat-state">
        <div>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-800 mx-auto mb-4" aria-hidden />
          <p>Carregando catálogo…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="gc-cat-state">
        <div>
          <h1>Catálogo indisponível</h1>
          <p>{error || 'Não encontramos este catálogo.'}</p>
        </div>
      </div>
    );
  }

  const { empresa, config, categorias } = data;
  const cor = config.cor || '#EE524F';
  const waHref = config.whatsapp
    ? formatCatalogoWhatsAppLink(config.whatsapp, `Olá! Vim pelo catálogo de ${config.titulo}.`)
    : '';

  return (
    <div
      className="gc-cat gc-cat-shell gc-cat--kyte"
      style={
        {
          ['--gc-cat-cor' as string]: cor,
          ['--gc-cat-cta' as string]: cor,
        } as CSSProperties
      }
    >
      <div className="gc-cat-top">
        <header className="gc-cat-header">
          <div className="gc-cat-header-kyte">
            <span className="gc-cat-header-side" aria-hidden />
            <a href={`/catalogo/${encodeURIComponent(config.slug)}`} className="gc-cat-brand">
              {empresa.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={empresa.logo_url} alt={config.titulo} className="gc-cat-brand-logo" />
              ) : (
                <span className="gc-cat-brand-name">{config.titulo}</span>
              )}
            </a>
            <div className="gc-cat-header-side gc-cat-header-side--end">
              {waHref ? (
                <a
                  className="gc-cat-icon-btn gc-cat-icon-btn--wa"
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon />
                </a>
              ) : null}
            </div>
          </div>
        </header>

        <nav className="gc-cat-pills" aria-label="Categorias">
          <div className="gc-cat-pills-inner">
            <button
              type="button"
              className={`gc-cat-pill gc-cat-pill--icon${buscaAberta ? ' is-active' : ''}`}
              onClick={() => {
                setBuscaAberta((v) => !v);
                if (buscaAberta) setBusca('');
              }}
              aria-label="Buscar"
            >
              {buscaAberta ? <X size={16} /> : <Search size={16} />}
            </button>
            <button
              type="button"
              className={`gc-cat-pill${!categoria && !busca.trim() ? ' is-active' : ''}`}
              onClick={() => {
                setCategoria(null);
                setBusca('');
                setBuscaAberta(false);
              }}
            >
              Início
            </button>
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`gc-cat-pill${categoria === cat ? ' is-active' : ''}`}
                onClick={() => {
                  setCategoria(cat);
                  setBusca('');
                  setBuscaAberta(false);
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>

        {buscaAberta ? (
          <div className="gc-cat-search-wrap">
            <label className="gc-cat-search">
              <Search size={18} strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={busca}
                autoFocus
                onChange={(e) => {
                  setBusca(e.target.value);
                  setCategoria(null);
                }}
                placeholder="Buscar produtos…"
                aria-label="Buscar no catálogo"
              />
            </label>
          </div>
        ) : null}
      </div>

      <main className={`gc-cat-main gc-cat-main--kyte${filtrados.length ? ' has-cart-pad' : ''}`}>
        {filtrados.length === 0 ? (
          <p className="gc-cat-empty">
            {busca.trim()
              ? 'Nenhum item encontrado para sua busca.'
              : categoria
                ? 'Nenhum item nesta categoria.'
                : 'Nenhum produto disponível no momento.'}
          </p>
        ) : (
          secoes.map(([nomeSecao, itens]) => (
            <section key={nomeSecao} className="gc-cat-section">
              <div className="gc-cat-section-head">
                <h2>{nomeSecao}</h2>
                {!categoria && !busca.trim() ? (
                  <button
                    type="button"
                    className="gc-cat-section-link"
                    onClick={() => setCategoria(nomeSecao)}
                  >
                    Ver tudo ({itens.length})
                  </button>
                ) : (
                  <span className="gc-cat-section-link">{itens.length} itens</span>
                )}
              </div>
              <div className="gc-cat-list">
                {(categoria || busca.trim() ? itens : itens.slice(0, 8)).map((produto) => (
                  <CatalogoProductCard key={produto.id} produto={produto} slug={config.slug} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <CatalogoFooter empresa={empresa} config={config} />
      <CatalogoCarrinhoBar whatsapp={config.whatsapp} titulo={config.titulo} />
      <CatalogoCarrinhoDrawer whatsapp={config.whatsapp} titulo={config.titulo} />
    </div>
  );
}

export function CatalogoPublicoView({ slug }: { slug: string }) {
  return (
    <CatalogoCarrinhoProvider slug={slug}>
      <CatalogoPublicoInner slug={slug} />
    </CatalogoCarrinhoProvider>
  );
}

'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Plus } from 'lucide-react';
import {
  formatCatalogoCurrency,
  formatCatalogoWhatsAppLink,
  type CatalogoPublicoConfig,
  type CatalogoPublicoEmpresa,
  type CatalogoPublicoProduto,
} from '@/lib/catalogo-publico';
import { CatalogoFooter } from './CatalogoFooter';
import { CatalogoCarrinhoProvider, useCatalogoCarrinho } from './CatalogoCarrinhoContext';
import { CatalogoCarrinhoBar, CatalogoCarrinhoDrawer } from './CatalogoCarrinhoDrawer';
import '@/styles/catalogo-publico.css';

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.01zm-7.01 15.24h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.69 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.07-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

function CatalogoProdutoDetalheInner({
  slug,
  produtoId,
}: {
  slug: string;
  produtoId: string;
}) {
  const { addItem } = useCatalogoCarrinho();
  const [empresa, setEmpresa] = useState<CatalogoPublicoEmpresa | null>(null);
  const [config, setConfig] = useState<CatalogoPublicoConfig | null>(null);
  const [produto, setProduto] = useState<CatalogoPublicoProduto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgAtiva, setImgAtiva] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/catalogo-publico/${encodeURIComponent(slug)}/produto/${encodeURIComponent(produtoId)}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Produto não encontrado');
        }
        if (!cancelled) {
          setEmpresa(json.empresa);
          setConfig(json.config);
          setProduto(json.produto);
          setImgAtiva(0);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar produto');
          setProduto(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, produtoId]);

  const imagens = useMemo(() => {
    if (!produto) return [];
    if (produto.imagens?.length) return produto.imagens;
    return produto.imagem_url ? [produto.imagem_url] : [];
  }, [produto]);

  if (loading) {
    return (
      <div className="gc-cat-state">
        <div>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-800 mx-auto mb-4" aria-hidden />
          <p>Carregando produto…</p>
        </div>
      </div>
    );
  }

  if (error || !produto || !empresa || !config) {
    return (
      <div className="gc-cat-state">
        <div>
          <h1>Produto indisponível</h1>
          <p>{error || 'Não encontramos este item.'}</p>
          <Link href={`/catalogo/${encodeURIComponent(slug)}`} className="gc-cat-back-inline">
            Voltar ao catálogo
          </Link>
        </div>
      </div>
    );
  }

  const cor = config.cor || '#EE524F';
  const msg = `Olá! Vim pelo catálogo de ${config.titulo} e quero saber mais sobre: ${produto.nome} (${formatCatalogoCurrency(produto.preco)}).`;
  const waHref = config.whatsapp ? formatCatalogoWhatsAppLink(config.whatsapp, msg) : '';
  const imagemAtual = imagens[imgAtiva] || null;

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
          <div className="gc-cat-header-inner--produto">
            <Link href={`/catalogo/${encodeURIComponent(config.slug)}`} className="gc-cat-back">
              <ArrowLeft size={18} />
              Voltar
            </Link>
            <Link href={`/catalogo/${encodeURIComponent(config.slug)}`} className="gc-cat-brand">
              {empresa.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={empresa.logo_url} alt={config.titulo} className="gc-cat-brand-logo" />
              ) : (
                <span className="gc-cat-brand-name">{config.titulo}</span>
              )}
            </Link>
            <span className="gc-cat-back-spacer" aria-hidden />
          </div>
        </header>
      </div>

      <main className="gc-cat-main gc-cat-main--kyte has-cart-pad">
        <div className="gc-cat-produto">
          <div className="gc-cat-produto-gallery">
            <div className="gc-cat-produto-media">
              {imagemAtual ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagemAtual} alt={produto.nome} />
              ) : (
                <div className="gc-cat-card-placeholder">
                  <Package size={64} strokeWidth={1.25} />
                </div>
              )}
            </div>
            {imagens.length > 1 ? (
              <div className="gc-cat-produto-thumbs" role="list">
                {imagens.map((src, idx) => (
                  <button
                    key={src + idx}
                    type="button"
                    className={`gc-cat-produto-thumb${imgAtiva === idx ? ' is-active' : ''}`}
                    onClick={() => setImgAtiva(idx)}
                    aria-label={`Imagem ${idx + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="gc-cat-produto-info">
            {(produto.categoria || produto.marca || produto.codigo) && (
              <p className="gc-cat-produto-meta">
                {[produto.categoria, produto.marca, produto.codigo ? `CÓD: ${produto.codigo}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            <h1 className="gc-cat-produto-title">{produto.nome}</h1>
            <p className="gc-cat-produto-price">{formatCatalogoCurrency(produto.preco)}</p>

            {produto.descricao ? (
              <div className="gc-cat-produto-desc">
                <h2>Descrição</h2>
                <p>{produto.descricao}</p>
              </div>
            ) : null}

            <div className="gc-cat-produto-actions">
              <button type="button" className="gc-cat-produto-cta" onClick={() => addItem(produto, 1)}>
                <Plus size={18} strokeWidth={2.5} />
                Adicionar ao pedido
              </button>
              {waHref ? (
                <a className="gc-cat-produto-cta gc-cat-produto-cta--wa" href={waHref} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon />
                  Pedir só este no WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <CatalogoFooter empresa={empresa} config={config} />
      <CatalogoCarrinhoBar whatsapp={config.whatsapp} titulo={config.titulo} />
      <CatalogoCarrinhoDrawer whatsapp={config.whatsapp} titulo={config.titulo} />
    </div>
  );
}

export function CatalogoProdutoDetalhe({ slug, produtoId }: { slug: string; produtoId: string }) {
  return (
    <CatalogoCarrinhoProvider slug={slug}>
      <CatalogoProdutoDetalheInner slug={slug} produtoId={produtoId} />
    </CatalogoCarrinhoProvider>
  );
}

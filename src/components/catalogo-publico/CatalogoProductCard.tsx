'use client';

import Link from 'next/link';
import { Package, Plus } from 'lucide-react';
import { formatCatalogoCurrency, type CatalogoPublicoProduto } from '@/lib/catalogo-publico';
import { useCatalogoCarrinho } from './CatalogoCarrinhoContext';

export function CatalogoProductCard({
  produto,
  slug,
}: {
  produto: CatalogoPublicoProduto;
  slug: string;
  empresaNome?: string;
  whatsapp?: string | null;
}) {
  const { addItem } = useCatalogoCarrinho();
  const detailHref = `/catalogo/${encodeURIComponent(slug)}/produto/${encodeURIComponent(produto.id)}`;

  return (
    <article className="gc-cat-row">
      <Link href={detailHref} className="gc-cat-row-media" aria-label={produto.nome}>
        {produto.imagem_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.imagem_url} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="gc-cat-row-placeholder">
            <Package size={28} strokeWidth={1.4} />
          </span>
        )}
      </Link>

      <div className="gc-cat-row-body">
        <Link href={detailHref} className="gc-cat-row-title">
          {produto.nome}
        </Link>
        {produto.descricao ? <p className="gc-cat-row-desc">{produto.descricao}</p> : null}
        <div className="gc-cat-row-bottom">
          <div>
            <p className="gc-cat-row-price">{formatCatalogoCurrency(produto.preco)}</p>
            {produto.codigo ? <p className="gc-cat-row-code">CÓD: {produto.codigo}</p> : null}
          </div>
          <button
            type="button"
            className="gc-cat-row-add"
            onClick={() => addItem(produto, 1)}
            aria-label={`Adicionar ${produto.nome} ao pedido`}
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
}

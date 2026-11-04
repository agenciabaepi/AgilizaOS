'use client';

import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import {
  buildPedidoWhatsAppMessage,
  formatCatalogoCurrency,
  formatCatalogoWhatsAppLink,
} from '@/lib/catalogo-publico';
import { useCatalogoCarrinho } from './CatalogoCarrinhoContext';

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.01zm-7.01 15.24h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.69 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.07-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

export function CatalogoCarrinhoBar({
  whatsapp,
  titulo,
}: {
  whatsapp: string | null;
  titulo: string;
}) {
  const { totalItens, totalValor, setAberto, itens } = useCatalogoCarrinho();
  if (totalItens <= 0) return null;

  return (
    <div className="gc-cat-cart-bar">
      <button type="button" className="gc-cat-cart-bar-btn" onClick={() => setAberto(true)}>
        <span className="gc-cat-cart-bar-icon">
          <ShoppingBag size={18} />
          <span className="gc-cat-cart-bar-badge">{totalItens}</span>
        </span>
        <span className="gc-cat-cart-bar-text">
          Ver pedido · {formatCatalogoCurrency(totalValor)}
        </span>
      </button>
      {whatsapp && itens.length > 0 ? (
        <a
          className="gc-cat-cart-bar-wa"
          href={formatCatalogoWhatsAppLink(whatsapp, buildPedidoWhatsAppMessage(titulo, itens))}
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsAppIcon />
          Enviar
        </a>
      ) : null}
    </div>
  );
}

export function CatalogoCarrinhoDrawer({
  whatsapp,
  titulo,
}: {
  whatsapp: string | null;
  titulo: string;
}) {
  const { itens, totalItens, totalValor, aberto, setAberto, setQuantidade, removeItem, clear } =
    useCatalogoCarrinho();

  if (!aberto) return null;

  const waHref =
    whatsapp && itens.length > 0
      ? formatCatalogoWhatsAppLink(whatsapp, buildPedidoWhatsAppMessage(titulo, itens))
      : '';

  return (
    <div className="gc-cat-cart-overlay" role="dialog" aria-modal="true" aria-label="Carrinho">
      <button
        type="button"
        className="gc-cat-cart-backdrop"
        aria-label="Fechar carrinho"
        onClick={() => setAberto(false)}
      />
      <aside className="gc-cat-cart-drawer">
        <header className="gc-cat-cart-head">
          <div>
            <h2>Seu pedido</h2>
            <p>
              {totalItens} {totalItens === 1 ? 'item' : 'itens'}
            </p>
          </div>
          <button type="button" className="gc-cat-icon-btn" onClick={() => setAberto(false)} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className="gc-cat-cart-body">
          {itens.length === 0 ? (
            <p className="gc-cat-empty">Seu carrinho está vazio.</p>
          ) : (
            itens.map((item) => (
              <div key={item.produtoId} className="gc-cat-cart-item">
                <div className="gc-cat-cart-item-media">
                  {item.imagem_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagem_url} alt="" />
                  ) : (
                    <span />
                  )}
                </div>
                <div className="gc-cat-cart-item-info">
                  <strong>{item.nome}</strong>
                  <span>{formatCatalogoCurrency(item.preco)}</span>
                  <div className="gc-cat-qty">
                    <button
                      type="button"
                      onClick={() => setQuantidade(item.produtoId, item.quantidade - 1)}
                      aria-label="Diminuir"
                    >
                      <Minus size={14} />
                    </button>
                    <span>{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => setQuantidade(item.produtoId, item.quantidade + 1)}
                      aria-label="Aumentar"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      type="button"
                      className="gc-cat-cart-remove"
                      onClick={() => removeItem(item.produtoId)}
                      aria-label="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="gc-cat-cart-item-sub">
                  {formatCatalogoCurrency(item.preco * item.quantidade)}
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="gc-cat-cart-foot">
          <div className="gc-cat-cart-total">
            <span>Total</span>
            <strong>{formatCatalogoCurrency(totalValor)}</strong>
          </div>
          {waHref ? (
            <a
              className="gc-cat-cart-send"
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                /* mantém o carrinho; o cliente pode limpar depois */
              }}
            >
              <WhatsAppIcon size={20} />
              Enviar pedido no WhatsApp
            </a>
          ) : (
            <p className="gc-cat-cart-warn">WhatsApp da loja não configurado.</p>
          )}
          {itens.length > 0 ? (
            <button type="button" className="gc-cat-cart-clear" onClick={clear}>
              Limpar carrinho
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}

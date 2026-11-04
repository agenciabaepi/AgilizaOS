'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CatalogoCarrinhoItem, CatalogoPublicoProduto } from '@/lib/catalogo-publico';

type CatalogoCarrinhoContextValue = {
  itens: CatalogoCarrinhoItem[];
  totalItens: number;
  totalValor: number;
  aberto: boolean;
  setAberto: (open: boolean) => void;
  addItem: (produto: CatalogoPublicoProduto, quantidade?: number) => void;
  setQuantidade: (produtoId: string, quantidade: number) => void;
  removeItem: (produtoId: string) => void;
  clear: () => void;
};

const CatalogoCarrinhoContext = createContext<CatalogoCarrinhoContextValue | null>(null);

function storageKey(slug: string) {
  return `gc-catalogo-carrinho:${slug}`;
}

export function CatalogoCarrinhoProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const [itens, setItens] = useState<CatalogoCarrinhoItem[]>([]);
  const [aberto, setAberto] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(slug));
      if (raw) {
        const parsed = JSON.parse(raw) as CatalogoCarrinhoItem[];
        if (Array.isArray(parsed)) setItens(parsed.filter((i) => i?.produtoId && i.quantidade > 0));
      } else {
        setItens([]);
      }
    } catch {
      setItens([]);
    } finally {
      setHydrated(true);
    }
  }, [slug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify(itens));
    } catch {
      /* ignore quota */
    }
  }, [itens, slug, hydrated]);

  const addItem = useCallback((produto: CatalogoPublicoProduto, quantidade = 1) => {
    const qtd = Math.max(1, Math.floor(quantidade));
    setItens((prev) => {
      const idx = prev.findIndex((i) => i.produtoId === produto.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantidade: next[idx].quantidade + qtd };
        return next;
      }
      return [
        ...prev,
        {
          produtoId: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: qtd,
          imagem_url: produto.imagem_url,
          codigo: produto.codigo,
        },
      ];
    });
    setAberto(true);
  }, []);

  const setQuantidade = useCallback((produtoId: string, quantidade: number) => {
    const qtd = Math.floor(quantidade);
    setItens((prev) => {
      if (qtd <= 0) return prev.filter((i) => i.produtoId !== produtoId);
      return prev.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: qtd } : i));
    });
  }, []);

  const removeItem = useCallback((produtoId: string) => {
    setItens((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }, []);

  const clear = useCallback(() => setItens([]), []);

  const totalItens = useMemo(() => itens.reduce((acc, i) => acc + i.quantidade, 0), [itens]);
  const totalValor = useMemo(
    () => itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0),
    [itens]
  );

  const value = useMemo(
    () => ({
      itens,
      totalItens,
      totalValor,
      aberto,
      setAberto,
      addItem,
      setQuantidade,
      removeItem,
      clear,
    }),
    [itens, totalItens, totalValor, aberto, addItem, setQuantidade, removeItem, clear]
  );

  return (
    <CatalogoCarrinhoContext.Provider value={value}>{children}</CatalogoCarrinhoContext.Provider>
  );
}

export function useCatalogoCarrinho() {
  const ctx = useContext(CatalogoCarrinhoContext);
  if (!ctx) {
    throw new Error('useCatalogoCarrinho deve ser usado dentro de CatalogoCarrinhoProvider');
  }
  return ctx;
}

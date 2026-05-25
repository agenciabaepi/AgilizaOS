'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { AparelhoCatalogoCor } from '@/types/cores';
import { ordenarCoresAparelho } from '@/lib/aparelhos-cores';

interface AparelhoCorPickerProps {
  cores: AparelhoCatalogoCor[];
  corId?: string | null;
  valor?: string;
  onChange: (cor: AparelhoCatalogoCor | null) => void;
  onTextoChange?: (valor: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

type MenuPos = { top: number; left: number; width: number };

export default function AparelhoCorPicker({
  cores,
  corId,
  valor = '',
  onChange,
  onTextoChange,
  disabled = false,
  className = '',
  placeholder = 'Digite ou escolha a cor...',
}: AparelhoCorPickerProps) {
  const lista = ordenarCoresAparelho(cores);
  const [busca, setBusca] = useState(valor);
  const [aberto, setAberto] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setBusca(valor);
  }, [valor]);

  const atualizarPosMenu = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!aberto) return;
    atualizarPosMenu();
    const onScrollOrResize = () => atualizarPosMenu();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [aberto, atualizarPosMenu, busca]);

  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (containerRef.current?.contains(alvo)) return;
      const portal = document.getElementById('aparelho-cor-picker-menu');
      if (portal?.contains(alvo)) return;
      setAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lista;
    return lista.filter((c) => (c.cor_nome || '').toLowerCase().includes(termo));
  }, [lista, busca]);

  const handleInput = (texto: string) => {
    const upper = texto.toUpperCase();
    setBusca(upper);
    onTextoChange?.(upper);
    setAberto(true);

    const exata = lista.find((c) => (c.cor_nome || '').toUpperCase() === upper);
    if (exata) {
      onChange(exata);
    }
  };

  const handleSelecionar = (c: AparelhoCatalogoCor) => {
    const nome = c.cor_nome || '';
    setBusca(nome);
    onChange(c);
    onTextoChange?.(nome);
    setAberto(false);
  };

  const menuLista =
    aberto && !disabled && menuPos ? (
      <ul
        id="aparelho-cor-picker-menu"
        role="listbox"
        className="fixed z-[9999] max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
        style={{
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
        }}
      >
        {filtradas.length === 0 ? (
          <li className="px-3 py-2 text-sm text-gray-500">Nenhuma cor encontrada. Use o texto digitado.</li>
        ) : (
          filtradas.map((c) => {
            const hex = c.cor_hex?.trim();
            const ativo = corId === c.cor_id;
            return (
              <li key={c.cor_id} role="option" aria-selected={ativo}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelecionar(c)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50 ${
                    ativo ? 'bg-gray-100 font-medium' : ''
                  }`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
                    style={{ backgroundColor: hex || '#e5e7eb' }}
                  />
                  <span className="text-gray-900">{c.cor_nome}</span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    ) : null;

  if (!lista.length) {
    return (
      <input
        type="text"
        placeholder={placeholder}
        className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm ${className}`}
        value={busca}
        onChange={(e) => handleInput(e.target.value)}
        disabled={disabled}
      />
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        value={busca}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => {
          setAberto(true);
          requestAnimationFrame(atualizarPosMenu);
        }}
        disabled={disabled}
        autoComplete="off"
        aria-expanded={aberto}
        aria-haspopup="listbox"
      />

      {mounted && menuLista ? createPortal(menuLista, document.body) : null}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { FiClock, FiMaximize2, FiShoppingBag, FiX } from 'react-icons/fi';

interface PDVHeaderProps {
  empresaNome?: string;
  usuarioNome?: string;
  caixaAberto: boolean;
  onSair: () => void;
  onTelaCheia: () => void;
}

export function PDVHeader({ empresaNome, usuarioNome, caixaAberto, onSair, onTelaCheia }: PDVHeaderProps) {
  const [hora, setHora] = useState('');

  useEffect(() => {
    const tick = () => {
      setHora(
        new Date().toLocaleString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="shrink-0 flex items-center justify-between gap-4 px-1">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center shadow-md">
            <FiShoppingBag className="text-brand" size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 leading-tight">Ponto de Venda</h1>
            <p className="text-xs text-zinc-500 truncate">{empresaNome || 'Consert'}</p>
          </div>
        </div>
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            caixaAberto
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
              : 'bg-amber-100 text-amber-800 border border-amber-200/80'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${caixaAberto ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {caixaAberto ? 'Caixa aberto' : 'Caixa fechado'}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500 bg-white/70 px-3 py-2 rounded-xl border border-white shadow-sm">
          <FiClock size={14} />
          <span className="capitalize tabular-nums">{hora}</span>
        </div>
        <button
          type="button"
          onClick={onTelaCheia}
          className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl bg-white border border-zinc-200/80 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors shadow-sm"
          title="Tela cheia (F11)"
        >
          <FiMaximize2 size={16} />
        </button>
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-zinc-300/60">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-zinc-800 leading-tight">{usuarioNome || 'Operador'}</p>
            <p className="text-[11px] text-zinc-400">Operador de caixa</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center text-sm font-bold shadow-md">
            {usuarioNome?.charAt(0)?.toUpperCase() || '?'}
          </div>
        </div>
        <button
          type="button"
          onClick={onSair}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-zinc-200/80 text-zinc-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm"
          title="Sair (ESC)"
        >
          <FiX size={18} />
        </button>
      </div>
    </header>
  );
}

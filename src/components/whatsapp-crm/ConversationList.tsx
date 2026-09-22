'use client';

import { useMemo, useState } from 'react';
import { Archive, Search } from 'lucide-react';
import type { WhatsAppConversa } from '@/lib/whatsapp-crm/types';

export type FiltroConversa = 'aberta' | 'arquivada' | 'todas';

function formatTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Ontem';
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

interface Props {
  conversas: WhatsAppConversa[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filtro: FiltroConversa;
  onFiltroChange: (f: FiltroConversa) => void;
  loading: boolean;
}

export function ConversationList({
  conversas,
  selectedId,
  onSelect,
  filtro,
  onFiltroChange,
  loading,
}: Props) {
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return conversas;
    return conversas.filter((c) => {
      return (
        c.nome_contato?.toLowerCase().includes(termo) ||
        c.clientes?.nome?.toLowerCase().includes(termo) ||
        c.telefone.includes(termo) ||
        String(c.ordens_servico?.numero_os ?? '').includes(termo) ||
        c.usuarios?.nome?.toLowerCase().includes(termo)
      );
    });
  }, [conversas, busca]);

  return (
    <aside className="w-full max-w-[380px] shrink-0 border-r border-[#d1d7db] bg-[#f0f2f5] flex flex-col">
      <div className="px-3 pt-3 pb-2 bg-[#f0f2f5] space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#54656f]" size={15} />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar ou começar uma nova conversa"
            className="w-full rounded-lg bg-white py-2 pl-9 pr-3 text-sm text-[#111b21] placeholder:text-[#667781] border-0 shadow-sm focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div className="flex gap-1">
          {(
            [
              { id: 'aberta', label: 'Conversas' },
              { id: 'arquivada', label: 'Arquivadas' },
              { id: 'todas', label: 'Todas' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFiltroChange(f.id)}
              className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
                filtro === f.id
                  ? 'bg-[#00a884] text-white'
                  : 'bg-white text-[#54656f] hover:bg-gray-100'
              }`}
            >
              {f.id === 'arquivada' ? (
                <span className="inline-flex items-center justify-center gap-1">
                  <Archive size={12} />
                  {f.label}
                </span>
              ) : (
                f.label
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                  <div className="h-3 w-3/4 rounded bg-gray-50" />
                </div>
              </div>
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#667781]">
            {filtro === 'arquivada' ? (
              <>
                <Archive className="mx-auto mb-2 text-[#8696a0]" size={28} />
                Nenhuma conversa arquivada
              </>
            ) : (
              <>
                Nenhuma conversa ainda
                <p className="text-xs mt-1">Quando um cliente mandar mensagem, ela aparece aqui.</p>
              </>
            )}
          </div>
        ) : (
          filtradas.map((c) => {
            const nome = c.clientes?.nome || c.nome_contato || c.telefone;
            const selected = selectedId === c.id;
            const unread = c.nao_lidas > 0 && !selected;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`w-full text-left px-3 py-3 flex gap-3 border-b border-[#f0f2f5] transition-colors ${
                  selected ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                }`}
              >
                <div className="h-12 w-12 shrink-0 rounded-full bg-[#dfe5e7] text-[#54656f] flex items-center justify-center text-sm font-semibold">
                  {initials(nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`truncate text-[15px] ${
                        unread ? 'font-semibold text-[#111b21]' : 'font-medium text-[#111b21]'
                      }`}
                    >
                      {nome}
                    </p>
                    <span
                      className={`text-[11px] shrink-0 ${
                        unread ? 'text-[#00a884] font-medium' : 'text-[#667781]'
                      }`}
                    >
                      {formatTime(c.ultima_mensagem_em)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="text-[13px] text-[#667781] truncate">
                      {c.ultima_mensagem_preview || 'Sem mensagens'}
                    </p>
                    {unread && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#00a884] text-[11px] text-white flex items-center justify-center font-medium">
                        {c.nao_lidas > 99 ? '99+' : c.nao_lidas}
                      </span>
                    )}
                  </div>
                  {(c.ordens_servico || c.usuarios?.nome) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.ordens_servico && (
                        <span className="text-[10px] bg-[#e7fce3] text-[#027a48] px-1.5 py-0.5 rounded">
                          OS #{c.ordens_servico.numero_os}
                        </span>
                      )}
                      {c.usuarios?.nome && (
                        <span className="text-[10px] bg-[#efe7fd] text-[#5b21b6] px-1.5 py-0.5 rounded truncate max-w-[120px]">
                          {c.usuarios.nome}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

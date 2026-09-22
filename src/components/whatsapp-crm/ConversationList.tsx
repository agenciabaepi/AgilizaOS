'use client';

import { useMemo, useState } from 'react';
import { Archive, Search } from 'lucide-react';
import type { WhatsAppConversa } from '@/lib/whatsapp-crm/types';
import { ContactAvatar } from '@/components/whatsapp-crm/ContactAvatar';

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

interface Props {
  conversas: WhatsAppConversa[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPrefetch?: (id: string) => void;
  filtro: FiltroConversa;
  onFiltroChange: (f: FiltroConversa) => void;
  loading: boolean;
}

export function ConversationList({
  conversas,
  selectedId,
  onSelect,
  onPrefetch,
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
    <aside className="w-full max-w-[380px] shrink-0 border-r border-[#d1d7db] dark:border-[#222d34] bg-[#f0f2f5] dark:bg-[#111b21] flex flex-col">
      <div className="px-3 pt-3 pb-2 bg-[#f0f2f5] dark:bg-[#111b21] space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#54656f] dark:text-[#8696a0]" size={15} />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar"
            className="w-full rounded-lg bg-white dark:bg-[#202c33] py-2 pl-9 pr-3 text-sm text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781] dark:placeholder:text-[#8696a0] border-0 shadow-sm dark:shadow-none focus:outline-none focus:ring-1 focus:ring-[#00a884]"
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
                  : 'bg-white dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-gray-100 dark:hover:bg-[#2a3942]'
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

      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21]">
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-[#202c33]" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-[#202c33]" />
                  <div className="h-3 w-3/4 rounded bg-gray-50 dark:bg-[#182229]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#667781] dark:text-[#8696a0]">
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
                onMouseEnter={() => onPrefetch?.(c.id)}
                onFocus={() => onPrefetch?.(c.id)}
                className={`w-full text-left px-3 py-3 flex gap-3 border-b border-[#f0f2f5] dark:border-[#222d34] transition-colors ${
                  selected
                    ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
                    : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                }`}
              >
                <ContactAvatar name={nome} fotoUrl={c.foto_url} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`truncate text-[15px] ${
                        unread
                          ? 'font-semibold text-[#111b21] dark:text-[#e9edef]'
                          : 'font-medium text-[#111b21] dark:text-[#e9edef]'
                      }`}
                    >
                      {nome}
                    </p>
                    <span
                      className={`text-[11px] shrink-0 ${
                        unread
                          ? 'text-[#00a884] font-medium'
                          : 'text-[#667781] dark:text-[#8696a0]'
                      }`}
                    >
                      {formatTime(c.ultima_mensagem_em)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="text-[13px] text-[#667781] dark:text-[#8696a0] truncate">
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
                        <span className="text-[10px] bg-[#e7fce3] dark:bg-[#0d3b2e] text-[#027a48] dark:text-[#00a884] px-1.5 py-0.5 rounded">
                          OS #{c.ordens_servico.numero_os}
                        </span>
                      )}
                      {c.usuarios?.nome && (
                        <span className="text-[10px] bg-[#efe7fd] dark:bg-[#2a1f3d] text-[#5b21b6] dark:text-[#c4b5fd] px-1.5 py-0.5 rounded truncate max-w-[120px]">
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

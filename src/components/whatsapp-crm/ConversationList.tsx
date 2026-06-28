'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import type { WhatsAppConversa } from '@/lib/whatsapp-crm/types';

function formatTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 60) return `${diffMin || 1} min`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

interface Props {
  conversas: WhatsAppConversa[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filtro: 'aberta' | 'fechada' | 'todas';
  onFiltroChange: (f: 'aberta' | 'fechada' | 'todas') => void;
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

  const filtradas = conversas.filter((c) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      c.nome_contato?.toLowerCase().includes(termo) ||
      c.clientes?.nome?.toLowerCase().includes(termo) ||
      c.telefone.includes(termo) ||
      String(c.ordens_servico?.numero_os ?? '').includes(termo)
    );
  });

  return (
    <aside className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-3 border-b border-gray-100 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar conversa..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
        <div className="flex gap-1">
          {(['aberta', 'fechada', 'todas'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFiltroChange(f)}
              className={`flex-1 rounded-md py-1 text-xs font-medium capitalize ${
                filtro === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'todas' ? 'Todas' : f === 'aberta' ? 'Abertas' : 'Fechadas'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Carregando...</p>
        ) : filtradas.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 text-center">
            Nenhuma conversa ainda.
            <br />
            <span className="text-xs">Configure o WhatsApp e aguarde mensagens dos clientes.</span>
          </p>
        ) : (
          filtradas.map((c) => {
            const nome = c.clientes?.nome || c.nome_contato || c.telefone;
            const selected = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                  selected ? 'bg-green-50 border-l-2 border-l-green-600' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-900 truncate">{nome}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {c.ultima_mensagem_preview || 'Sem mensagens'}
                    </p>
                    {c.ordens_servico && (
                      <span className="inline-block mt-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        OS #{c.ordens_servico.numero_os}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-gray-400">{formatTime(c.ultima_mensagem_em)}</span>
                    {c.nao_lidas > 0 && (
                      <span className="mt-1 ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">
                        {c.nao_lidas}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

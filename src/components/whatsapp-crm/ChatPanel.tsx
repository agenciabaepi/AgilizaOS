'use client';

import { useState } from 'react';
import { Send, StickyNote } from 'lucide-react';
import type { ConversaDetalhe } from '@/app/whatsapp/page';

interface Props {
  detalhe: ConversaDetalhe | null;
  loading: boolean;
  onSent: () => void;
}

export function ChatPanel({ detalhe, loading, onSent }: Props) {
  const [texto, setTexto] = useState('');
  const [modo, setModo] = useState<'reply' | 'notes'>('reply');
  const [enviando, setEnviando] = useState(false);

  if (!detalhe && !loading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Selecione uma conversa para visualizar
      </main>
    );
  }

  const conversa = detalhe?.conversa;
  const nome = conversa?.clientes?.nome || conversa?.nome_contato || 'Conversa';

  async function enviar() {
    if (!texto.trim() || !conversa) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/whatsapp/crm/conversations/${conversa.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conteudo: texto.trim(),
          tipo: modo === 'notes' ? 'nota_interna' : 'texto',
        }),
      });
      if (res.ok) {
        setTexto('');
        onSent();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-[#e5ddd5]">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900">{nome}</h2>
          <p className="text-xs text-gray-500">{conversa?.telefone}</p>
        </div>
        {conversa?.status === 'aberta' && (
          <button
            type="button"
            onClick={async () => {
              await fetch(`/api/whatsapp/crm/conversations/${conversa.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'fechada' }),
              });
              onSent();
            }}
            className="text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            Fechar chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-600 text-center">Carregando mensagens...</p>
        ) : (
          detalhe?.mensagens.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.direcao === 'saida' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm whitespace-pre-wrap ${
                  m.direcao === 'saida'
                    ? 'bg-green-100 text-gray-900'
                    : 'bg-white text-gray-900'
                }`}
              >
                {m.conteudo}
                <p className="text-[10px] text-gray-400 mt-1 text-right">
                  {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {conversa && (
        <div className="bg-white border-t border-gray-200 p-3 shrink-0">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setModo('reply')}
              className={`text-xs px-3 py-1 rounded-full ${
                modo === 'reply' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Responder
            </button>
            <button
              type="button"
              onClick={() => setModo('notes')}
              className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
                modo === 'notes' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <StickyNote size={12} />
              Notas
            </button>
          </div>
          <div className="flex gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={modo === 'notes' ? 'Nota interna (não enviada ao cliente)...' : 'Digite sua mensagem...'}
              rows={2}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
            />
            <button
              type="button"
              onClick={enviar}
              disabled={enviando || !texto.trim()}
              className="self-end rounded-lg bg-green-600 p-2.5 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

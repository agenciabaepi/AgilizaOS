'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Send, StickyNote } from 'lucide-react';
import type { ConversaDetalhe } from '@/app/whatsapp/page';
import type { WhatsAppConversaNota, WhatsAppMensagem } from '@/lib/whatsapp-crm/types';
import { whatsappCrmFetch } from '@/lib/api/whatsappCrmFetch';
import { mergeWhatsAppMensagens } from '@/lib/whatsapp-crm/merge-messages';
import { AtendenteSelect } from '@/components/whatsapp-crm/AtendenteSelect';
import type { WhatsAppAtendente } from '@/lib/whatsapp-crm/types';

interface Props {
  detalhe: ConversaDetalhe | null;
  loading: boolean;
  atendentes: WhatsAppAtendente[];
  usuarioAtualId?: string | null;
  salvandoAtendente?: boolean;
  onAtendenteChange: (atribuidoUsuarioId: string | null) => void | Promise<void>;
  onMessageSent: (msg: WhatsAppMensagem) => void;
  onReplaceMessage: (tempId: string, msg: WhatsAppMensagem) => void;
  onMessageFailed: (tempId: string, error: string) => void;
  onNotaSent: (nota: WhatsAppConversaNota) => void;
}

function isPendingMessage(m: WhatsAppMensagem) {
  return m.id.startsWith('pending-');
}

export function ChatPanel({
  detalhe,
  loading,
  atendentes,
  usuarioAtualId,
  salvandoAtendente = false,
  onAtendenteChange,
  onMessageSent,
  onReplaceMessage,
  onMessageFailed,
  onNotaSent,
}: Props) {
  const [texto, setTexto] = useState('');
  const [modo, setModo] = useState<'reply' | 'notes'>('reply');
  const [enviandoNota, setEnviandoNota] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [mensagensLocais, setMensagensLocais] = useState<WhatsAppMensagem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversaId = detalhe?.conversa.id;
  const conversaIdAnterior = useRef<string | null>(null);

  useEffect(() => {
    if (!conversaId) {
      setMensagensLocais([]);
      conversaIdAnterior.current = null;
      return;
    }

    const trocouConversa = conversaIdAnterior.current !== conversaId;
    if (trocouConversa) {
      conversaIdAnterior.current = conversaId;
      setMensagensLocais(detalhe?.mensagens ?? []);
      return;
    }

    if (!detalhe?.mensagens) return;
    setMensagensLocais((prev) => mergeWhatsAppMensagens(detalhe.mensagens, prev));
  }, [conversaId, detalhe?.mensagens]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagensLocais.length, detalhe?.notas.length]);

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
    setErroEnvio(null);
    const conteudo = texto.trim();

    if (modo === 'notes') {
      setEnviandoNota(true);
      try {
        const res = await whatsappCrmFetch(`/api/whatsapp/crm/conversations/${conversa.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conteudo, tipo: 'nota_interna' }),
        });
        const json = await res.json();
        if (json.tipo === 'nota_interna' && json.data) {
          onNotaSent(json.data);
          setTexto('');
        } else {
          setErroEnvio(json.error || 'Erro ao salvar nota');
        }
      } finally {
        setEnviandoNota(false);
      }
      return;
    }

    const tempId = `pending-${crypto.randomUUID()}`;
    const optimistic: WhatsAppMensagem = {
      id: tempId,
      conversa_id: conversa.id,
      empresa_id: conversa.empresa_id,
      direcao: 'saida',
      tipo: 'texto',
      conteudo,
      meta_message_id: null,
      status_entrega: null,
      erro_entrega: null,
      os_id: conversa.os_id ?? null,
      automacao_id: null,
      enviado_por_usuario_id: null,
      created_at: new Date().toISOString(),
    };

    setMensagensLocais((prev) => mergeWhatsAppMensagens(prev, [optimistic]));
    onMessageSent(optimistic);
    setTexto('');

    try {
      const res = await whatsappCrmFetch(`/api/whatsapp/crm/conversations/${conversa.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo, tipo: 'texto' }),
      });
      const json = await res.json();

      if (json.data) {
        const realMsg: WhatsAppMensagem = {
          ...json.data,
          status_entrega: json.data.status_entrega ?? 'enviada',
        };
        setMensagensLocais((prev) =>
          mergeWhatsAppMensagens(
            prev.filter((m) => m.id !== tempId),
            [realMsg]
          )
        );
        onReplaceMessage(tempId, realMsg);
        if (realMsg.status_entrega === 'falha') {
          setErroEnvio(realMsg.erro_entrega || json.erro || 'Mensagem não enviada ao WhatsApp');
        }
      } else {
        setMensagensLocais((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, status_entrega: 'falha' as const, erro_entrega: json.error || 'Erro ao enviar' }
              : m
          )
        );
        onMessageFailed(tempId, json.error || 'Erro ao enviar');
        setErroEnvio(json.error || 'Erro ao enviar');
      }
    } catch {
      setMensagensLocais((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, status_entrega: 'falha' as const, erro_entrega: 'Erro de conexão' }
            : m
        )
      );
      onMessageFailed(tempId, 'Erro de conexão');
      setErroEnvio('Erro de conexão ao enviar mensagem');
    }
  }

  const timeline = [
    ...mensagensLocais.map((m) => ({ kind: 'msg' as const, at: m.created_at, data: m })),
    ...(detalhe?.notas ?? []).map((n) => ({ kind: 'nota' as const, at: n.created_at, data: n })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-[#e5ddd5]">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">{nome}</h2>
            <p className="text-xs text-gray-500">{conversa?.telefone}</p>
          </div>
          {conversa?.status === 'aberta' && (
            <button
              type="button"
              onClick={async () => {
                await whatsappCrmFetch(`/api/whatsapp/crm/conversations/${conversa.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'fechada' }),
                });
              }}
              className="text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 shrink-0"
            >
              Fechar chat
            </button>
          )}
        </div>
        {conversa && (
          <AtendenteSelect
            atendentes={atendentes}
            value={conversa.atribuido_usuario_id}
            usuarioAtualId={usuarioAtualId}
            saving={salvandoAtendente}
            onChange={onAtendenteChange}
          />
        )}
      </div>

      {erroEnvio && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{erroEnvio}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && mensagensLocais.length === 0 ? (
          <p className="text-sm text-gray-600 text-center">Carregando mensagens...</p>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-gray-600 text-center">Nenhuma mensagem ainda</p>
        ) : (
          timeline.map((item) => {
            if (item.kind === 'nota') {
              const nota = item.data;
              return (
                <div key={`nota-${nota.id}`} className="flex justify-center">
                  <div className="max-w-[85%] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm">
                    <p className="font-medium flex items-center gap-1">
                      <StickyNote size={12} />
                      Nota interna{nota.autor_nome ? ` · ${nota.autor_nome}` : ''}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{nota.conteudo}</p>
                  </div>
                </div>
              );
            }

            const m = item.data;
            const pending = isPendingMessage(m);
            const falhou = m.status_entrega === 'falha';
            return (
              <div
                key={m.id}
                className={`flex ${m.direcao === 'saida' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm whitespace-pre-wrap ${
                    m.direcao === 'saida'
                      ? falhou
                        ? 'bg-red-50 text-gray-900 border border-red-200'
                        : pending
                          ? 'bg-green-50 text-gray-900 border border-green-200 opacity-80'
                          : 'bg-green-100 text-gray-900'
                      : 'bg-white text-gray-900'
                  }`}
                >
                  {m.conteudo}
                  <p className="text-[10px] text-gray-400 mt-1 text-right flex items-center justify-end gap-1">
                    {pending && (
                      <>
                        <Loader2 size={10} className="animate-spin" />
                        <span>Enviando</span>
                      </>
                    )}
                    {falhou && m.direcao === 'saida' && !pending && (
                      <span className="text-red-500" title={m.erro_entrega ?? undefined}>
                        Não enviada
                      </span>
                    )}
                    {falhou && m.erro_entrega && (
                      <span className="block text-[10px] text-red-600 mt-0.5 max-w-[220px] text-right leading-tight">
                        {m.erro_entrega}
                      </span>
                    )}
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
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
                  void enviar();
                }
              }}
            />
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={(modo === 'notes' && enviandoNota) || !texto.trim()}
              className="self-end rounded-lg bg-green-600 p-2.5 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {modo === 'notes' && enviandoNota ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

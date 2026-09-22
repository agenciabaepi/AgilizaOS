'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Loader2,
  MoreVertical,
  Send,
  StickyNote,
} from 'lucide-react';
import type { ConversaDetalhe } from '@/app/whatsapp/page';
import type { WhatsAppConversaNota, WhatsAppMensagem } from '@/lib/whatsapp-crm/types';
import { whatsappCrmFetch } from '@/lib/api/whatsappCrmFetch';
import { mergeWhatsAppMensagens } from '@/lib/whatsapp-crm/merge-messages';
import { AtendenteSelect } from '@/components/whatsapp-crm/AtendenteSelect';
import { ContactAvatar } from '@/components/whatsapp-crm/ContactAvatar';
import type { WhatsAppAtendente, WhatsAppConversa } from '@/lib/whatsapp-crm/types';

interface Props {
  detalhe: ConversaDetalhe | null;
  loading: boolean;
  atendentes: WhatsAppAtendente[];
  usuarioAtualId?: string | null;
  salvandoAtendente?: boolean;
  onAtendenteChange: (atribuidoUsuarioId: string | null) => void | Promise<void>;
  onStatusChange: (conversa: WhatsAppConversa) => void;
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
  onStatusChange,
  onMessageSent,
  onReplaceMessage,
  onMessageFailed,
  onNotaSent,
}: Props) {
  const [texto, setTexto] = useState('');
  const [modo, setModo] = useState<'reply' | 'notes'>('reply');
  const [enviandoNota, setEnviandoNota] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [mensagensLocais, setMensagensLocais] = useState<WhatsAppMensagem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const conversaId = detalhe?.conversa.id;
  const conversaIdAnterior = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (!conversaId) {
      setMensagensLocais([]);
      conversaIdAnterior.current = null;
      setTexto('');
      setErroEnvio(null);
      setMenuAberto(false);
      return;
    }

    const trocouConversa = conversaIdAnterior.current !== conversaId;
    if (trocouConversa) {
      conversaIdAnterior.current = conversaId;
      setMensagensLocais(detalhe?.mensagens ?? []);
      setTexto('');
      setErroEnvio(null);
      setMenuAberto(false);
      stickToBottomRef.current = true;
      return;
    }

    if (!detalhe?.mensagens) return;
    setMensagensLocais((prev) => mergeWhatsAppMensagens(detalhe.mensagens, prev));
  }, [conversaId, detalhe?.mensagens]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagensLocais.length, detalhe?.notas.length]);

  function onScrollList() {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 80;
  }

  if (!detalhe && !loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] text-[#667781]">
        <div className="max-w-sm text-center px-6">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center text-[#00a884]">
            <Send size={28} />
          </div>
          <p className="text-lg font-light text-[#41525d]">WhatsApp Consert</p>
          <p className="text-sm mt-2">
            Selecione uma conversa à esquerda para ler e responder mensagens dos clientes.
          </p>
        </div>
      </main>
    );
  }

  const conversa = detalhe?.conversa;
  const nome = conversa?.clientes?.nome || conversa?.nome_contato || 'Conversa';
  const arquivada = conversa?.status === 'arquivada';

  async function alterarStatus(status: 'aberta' | 'arquivada' | 'fechada') {
    if (!conversa) return;
    setAlterandoStatus(true);
    setMenuAberto(false);
    try {
      const res = await whatsappCrmFetch(`/api/whatsapp/crm/conversations/${conversa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        onStatusChange(json.data as WhatsAppConversa);
      }
    } finally {
      setAlterandoStatus(false);
    }
  }

  async function enviar() {
    if (!texto.trim() || !conversa) return;
    setErroEnvio(null);
    const conteudo = texto.trim();
    stickToBottomRef.current = true;

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
    <main className="flex-1 flex flex-col min-w-0 bg-[#efeae2]">
      <div className="px-4 py-2.5 bg-[#f0f2f5] border-b border-[#d1d7db] flex items-center justify-between gap-3 shrink-0 relative">
        <div className="min-w-0 flex items-center gap-3">
          <ContactAvatar name={nome} fotoUrl={conversa?.foto_url} size={40} />
          <div className="min-w-0">
            <h2 className="font-medium text-[#111b21] truncate text-[16px]">{nome}</h2>
            <p className="text-xs text-[#667781] truncate">{conversa?.telefone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {conversa && (
            <div className="hidden sm:block min-w-[160px]">
              <AtendenteSelect
                atendentes={atendentes}
                value={conversa.atribuido_usuario_id}
                usuarioAtualId={usuarioAtualId}
                saving={salvandoAtendente}
                onChange={onAtendenteChange}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            className="p-2 rounded-full text-[#54656f] hover:bg-[#e9edef]"
            aria-label="Opções da conversa"
          >
            <MoreVertical size={20} />
          </button>
          {menuAberto && conversa && (
            <div className="absolute right-3 top-12 z-20 w-48 rounded-lg bg-white shadow-lg border border-gray-100 py-1 text-sm">
              {arquivada ? (
                <button
                  type="button"
                  disabled={alterandoStatus}
                  onClick={() => void alterarStatus('aberta')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-2 text-[#111b21]"
                >
                  <ArchiveRestore size={16} />
                  Desarquivar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={alterandoStatus}
                  onClick={() => void alterarStatus('arquivada')}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-2 text-[#111b21]"
                >
                  <Archive size={16} />
                  Arquivar conversa
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {arquivada && (
        <div className="bg-[#fff7d1] text-[#5e4200] text-xs text-center py-1.5 border-b border-[#f0e3a8]">
          Conversa arquivada — você ainda pode enviar mensagens ou desarquivar.
        </div>
      )}

      {erroEnvio && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span className="flex-1">{erroEnvio}</span>
          <button type="button" className="underline" onClick={() => setErroEnvio(null)}>
            Ok
          </button>
        </div>
      )}

      <div
        ref={listRef}
        onScroll={onScrollList}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(229,221,213,.92), rgba(229,221,213,.92)), url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23cbb9a8\' fill-opacity=\'0.18\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      >
        {loading && mensagensLocais.length === 0 ? (
          <p className="text-sm text-[#667781] text-center py-8">Carregando mensagens...</p>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-[#667781] text-center py-8">Nenhuma mensagem ainda</p>
        ) : (
          timeline.map((item) => {
            if (item.kind === 'nota') {
              const nota = item.data;
              return (
                <div key={`nota-${nota.id}`} className="flex justify-center my-2">
                  <div className="max-w-[85%] rounded-lg border border-amber-200/80 bg-[#fff7d1] px-3 py-2 text-xs text-[#5e4200] shadow-sm">
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
            const saida = m.direcao === 'saida';
            return (
              <div key={m.id} className={`flex ${saida ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-2.5 py-1.5 text-[14.2px] leading-[19px] shadow-sm whitespace-pre-wrap relative ${
                    saida
                      ? falhou
                        ? 'bg-red-50 text-[#111b21] border border-red-200'
                        : 'bg-[#d9fdd3] text-[#111b21]'
                      : 'bg-white text-[#111b21]'
                  } ${pending ? 'opacity-80' : ''}`}
                >
                  {m.conteudo}
                  <span className="float-right ml-2 mt-1 text-[11px] text-[#667781] flex items-center gap-1 leading-none">
                    {pending && <Loader2 size={10} className="animate-spin" />}
                    {falhou && !pending && (
                      <span className="text-red-500" title={m.erro_entrega ?? undefined}>
                        !
                      </span>
                    )}
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {saida && !pending && !falhou && (
                      <span className="text-[#53bdeb]" aria-hidden>
                        ✓✓
                      </span>
                    )}
                  </span>
                  {falhou && m.erro_entrega && (
                    <p className="clear-both text-[11px] text-red-600 mt-1 max-w-[240px]">
                      {m.erro_entrega}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {conversa && (
        <div className="bg-[#f0f2f5] px-3 py-2 shrink-0">
          <div className="sm:hidden mb-2">
            <AtendenteSelect
              atendentes={atendentes}
              value={conversa.atribuido_usuario_id}
              usuarioAtualId={usuarioAtualId}
              saving={salvandoAtendente}
              onChange={onAtendenteChange}
            />
          </div>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setModo('reply')}
              className={`text-xs px-3 py-1 rounded-full ${
                modo === 'reply' ? 'bg-[#00a884] text-white' : 'bg-white text-[#54656f]'
              }`}
            >
              Responder
            </button>
            <button
              type="button"
              onClick={() => setModo('notes')}
              className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
                modo === 'notes' ? 'bg-amber-500 text-white' : 'bg-white text-[#54656f]'
              }`}
            >
              <StickyNote size={12} />
              Notas
            </button>
          </div>
          <div className="flex gap-2 items-end">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={
                modo === 'notes' ? 'Nota interna (só a equipe vê)...' : 'Digite uma mensagem'
              }
              rows={1}
              className="flex-1 rounded-lg bg-white px-3 py-2.5 text-sm resize-none max-h-28 focus:outline-none shadow-sm"
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
              className="rounded-full bg-[#00a884] p-2.5 text-white hover:bg-[#008f72] disabled:opacity-50 shadow-sm"
            >
              {modo === 'notes' && enviandoNota ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

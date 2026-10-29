'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiCheck,
  FiCheckCircle,
  FiExternalLink,
  FiImage,
  FiMessageCircle,
  FiMinus,
  FiSearch,
  FiSend,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useOsChat } from '@/hooks/useOsChat';
import { useOsChatConversas, type OsChatConversa } from '@/hooks/useOsChatConversas';
import {
  playNotificationSound,
  unlockNotificationAudio,
  warmupNotificationAudio,
} from '@/utils/audioPlayer';
import { supabase } from '@/lib/supabaseClient';
import { formatVistoAs } from '@/lib/os-chat/readReceipts';
import { getOsChatAnexoDisplayUrl } from '@/lib/os-chat/anexoUrl';

export type OpenOsChatDetail = {
  osId: string;
  numeroOs?: string | number | null;
};

type ChatWindowState = OpenOsChatDetail & {
  minimized: boolean;
};

const MAX_OPEN_WINDOWS = 3;

function formatHoraCurta(iso: string) {
  try {
    const d = new Date(iso);
    const hoje = new Date();
    const sameDay = d.toDateString() === hoje.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

function formatMsgHora(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function tituloOs(numeroOs?: string | number | null) {
  return numeroOs != null && numeroOs !== '' ? `OS #${numeroOs}` : 'Chat da O.S.';
}

const CHAT_FAB_RIGHT_PX = 88; // right-[5.5rem] — alinhado à bolha do chat
const CHAT_FAB_BOTTOM_PX = 88; // acima das FABs
const CHAT_WINDOW_W = 360;
const CHAT_WINDOW_GAP = 12;

function ChatAnexoImage({ src, mine }: { src: string; mine: boolean }) {
  const [failed, setFailed] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  if (failed) {
    return (
      <div
        className={`mb-1.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${
          mine ? 'bg-white/15 text-white/90' : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300'
        }`}
      >
        <FiImage className="h-3.5 w-3.5" />
        Imagem indisponível (reenvie)
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="mb-1.5 block w-full overflow-hidden rounded-xl text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Anexo do chat"
          className="max-h-44 w-full object-cover bg-black/5"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </button>
      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Anexo ampliado"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            onClick={() => setLightbox(false)}
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </>
  );
}

/** Janela flutuante estilo Messenger */
function OsChatPopupWindow({
  osId,
  numeroOs,
  minimized,
  offsetIndex,
  onClose,
  onToggleMinimize,
}: {
  osId: string;
  numeroOs?: string | number | null;
  minimized: boolean;
  offsetIndex: number;
  onClose: () => void;
  onToggleMinimize: () => void;
}) {
  const { usuarioData, empresaData } = useAuth();
  const { addToast } = useToast();
  const meuId = usuarioData?.id;
  const { mensagens, loading, sending, enviar } = useOsChat(minimized ? null : osId, meuId);
  const [texto, setTexto] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const empresaId = empresaData?.id || usuarioData?.empresa_id;
  const rightOffset = CHAT_FAB_RIGHT_PX + offsetIndex * (CHAT_WINDOW_W + CHAT_WINDOW_GAP);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (minimized) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [mensagens.length, loading, minimized]);

  const handleSend = async () => {
    if (!meuId || !empresaId) {
      addToast('error', 'Sessão inválida. Faça login novamente.');
      return;
    }
    if (!texto.trim() && !file) return;
    try {
      await enviar({ empresaId, autorId: meuId, mensagem: texto, file });
      setTexto('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Erro ao enviar mensagem');
    }
  };

  if (minimized) {
    return (
      <button
        type="button"
        onClick={onToggleMinimize}
        style={{ right: rightOffset, bottom: CHAT_FAB_BOTTOM_PX }}
        className="fixed z-[55] flex h-11 w-[220px] items-center gap-2 rounded-2xl bg-emerald-600 px-3 text-left text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
      >
        <FiMessageCircle className="h-4 w-4 shrink-0" />
        <span className="truncate flex-1">{tituloOs(numeroOs)}</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              onClose();
            }
          }}
          className="rounded-full p-1 hover:bg-white/20"
        >
          <FiX className="h-4 w-4" />
        </span>
      </button>
    );
  }

  return (
    <div
      style={{ right: rightOffset, bottom: CHAT_FAB_BOTTOM_PX, width: CHAT_WINDOW_W }}
      className="fixed z-[55] flex h-[min(560px,calc(100vh-7.5rem))] flex-col overflow-hidden rounded-2xl border border-gray-200/90 dark:border-zinc-700 bg-white dark:bg-black shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-black px-3.5 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
          <FiMessageCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white">
            {tituloOs(numeroOs)}
          </div>
          <div className="truncate text-[11px] text-gray-500 dark:text-zinc-400">Chat da equipe</div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 text-gray-500 dark:text-zinc-300">
          <Link
            href={`/ordens/${osId}`}
            className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-900"
            title="Abrir O.S."
          >
            <FiExternalLink className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onToggleMinimize}
            className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-900"
            title="Minimizar"
          >
            <FiMinus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-900"
            title="Fechar"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-black px-3 py-3 space-y-3 [scrollbar-width:thin]"
      >
        {loading && mensagens.length === 0 ? (
          <p className="text-center text-xs text-gray-500 py-10">Carregando...</p>
        ) : mensagens.length === 0 ? (
          <p className="text-center text-xs text-gray-500 dark:text-zinc-400 py-10 px-6 leading-relaxed">
            Nenhuma mensagem. Envie uma anotação ou foto.
          </p>
        ) : (
          mensagens.map((m) => {
            const mine = m.autor_id === meuId;
            const img =
              m.anexo_display_url ||
              getOsChatAnexoDisplayUrl(m.anexo_url) ||
              (m.anexo_url?.startsWith('http') ? m.anexo_url : null);
            const vistoLabel = mine ? formatVistoAs(m.visto_em) : null;
            const initials = (m.autor?.nome || '?')
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join('');
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-600 text-[11px] font-bold text-white">
                    {initials || '?'}
                  </div>
                ) : null}
                <div className={`max-w-[72%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!mine && (
                    <div className="mb-1 ml-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {m.autor?.nome || 'Usuário'}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug ${
                      mine
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 border border-gray-200 dark:border-zinc-800 rounded-bl-md'
                    }`}
                  >
                    {img ? <ChatAnexoImage src={img} mine={mine} /> : null}
                    {m.mensagem ? (
                      <p className="whitespace-pre-wrap break-words">{m.mensagem}</p>
                    ) : null}
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] leading-none ${
                        mine ? 'text-white/70' : 'text-gray-400 dark:text-zinc-500'
                      }`}
                      title={vistoLabel || undefined}
                    >
                      <span>{formatMsgHora(m.created_at)}</span>
                      {mine ? (
                        m.visto_em ? (
                          <span className="inline-flex items-center text-emerald-100">
                            <FiCheck className="h-3 w-3" />
                            <FiCheck className="h-3 w-3 -ml-1.5" />
                          </span>
                        ) : (
                          <FiCheck className="h-3 w-3 opacity-80" />
                        )
                      ) : null}
                    </div>
                    {mine && vistoLabel ? (
                      <div className="mt-0.5 text-right text-[9px] text-emerald-100/90">{vistoLabel}</div>
                    ) : null}
                  </div>
                </div>
                {mine ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-600 text-[11px] font-bold text-white">
                    {(usuarioData?.nome || '?')
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase())
                      .join('') || '?'}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {previewUrl && (
        <div className="shrink-0 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-black px-3 pt-2">
          <div className="relative inline-flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-2 pr-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Prévia" className="h-11 w-11 rounded-lg object-cover" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Foto
              </div>
              <div className="text-xs font-semibold text-gray-800 dark:text-zinc-100">Pronta para enviar</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-white dark:bg-black text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 p-0.5"
            >
              <FiX className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <footer className="shrink-0 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2.5">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 disabled:opacity-50"
          >
            <FiImage className="h-5 w-5" />
          </button>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={1}
            placeholder="Escrever mensagem..."
            className="flex-1 resize-none rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-h-24 leading-5"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || (!texto.trim() && !file)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white"
          >
            <FiSend className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}

function ConversaRow({
  item,
  onOpen,
}: {
  item: OsChatConversa;
  onOpen: (c: OsChatConversa) => void;
}) {
  const unread = item.unreadCount > 0;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`flex w-full gap-3 px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
        unread ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''
      }`}
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
        #{item.numeroOs ?? 'OS'}
        {unread ? (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 bg-blue-600" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`truncate text-sm ${
              unread
                ? 'font-bold text-gray-900 dark:text-zinc-50'
                : 'font-semibold text-gray-900 dark:text-zinc-100'
            }`}
          >
            {tituloOs(item.numeroOs)}
          </span>
          <span className={`shrink-0 text-[11px] ${unread ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>
            {formatHoraCurta(item.lastAt)}
          </span>
        </div>
        <p className="truncate text-xs text-gray-500 dark:text-zinc-400">
          {item.clienteNome || item.equipamento || 'Sem cliente'}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <p
            className={`min-w-0 flex-1 truncate text-xs ${
              unread ? 'font-semibold text-gray-800 dark:text-zinc-100' : 'text-gray-600 dark:text-zinc-300'
            }`}
          >
            {item.lastAutorNome ? `${item.lastAutorNome}: ` : ''}
            {item.lastMensagem || (item.hasAnexo ? '📷 Imagem' : '')}
          </p>
          {unread ? (
            <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

/**
 * Messenger global estilo Facebook: bolha + inbox + janelas flutuantes.
 * Montar uma vez no MenuLayout.
 */
function ensureBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}

function showBrowserNotification(title: string, body: string, osId: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      tag: `os-chat-${osId}`,
      renotify: true,
    });
    n.onclick = () => {
      window.focus();
      window.dispatchEvent(
        new CustomEvent('os-chat-open', { detail: { osId } satisfies OpenOsChatDetail })
      );
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export default function OsChatMessenger() {
  const pathname = usePathname();
  const { usuarioData, empresaData } = useAuth();
  const { addToast } = useToast();
  const empresaId = empresaData?.id || usuarioData?.empresa_id;
  const meuId = usuarioData?.id;

  const [inboxOpen, setInboxOpen] = useState(false);
  const [windows, setWindows] = useState<ChatWindowState[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<OsChatConversa[]>([]);
  const [searching, setSearching] = useState(false);
  const windowsRef = useRef<ChatWindowState[]>([]);
  const seenMsgIdsRef = useRef<Set<string>>(new Set());

  const { conversas, loading, totalUnread, carregar: carregarConversas, buscarOrdens } = useOsChatConversas(
    empresaId,
    meuId,
    true
  );

  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);

  const openChat = useCallback(
    (detail: OpenOsChatDetail) => {
      ensureBrowserNotificationPermission();
      setWindows((prev) => {
        const existing = prev.find((w) => w.osId === detail.osId);
        if (existing) {
          return prev.map((w) => (w.osId === detail.osId ? { ...w, ...detail, minimized: false } : w));
        }
        const next: ChatWindowState = {
          osId: detail.osId,
          numeroOs: detail.numeroOs ?? null,
          minimized: false,
        };
        const kept = prev.slice(-(MAX_OPEN_WINDOWS - 1));
        return [...kept, next];
      });
      setInboxOpen(false);
      // Atualiza badges de não lidas após abrir (marcar_lido ocorre no useOsChat)
      window.setTimeout(() => void carregarConversas(), 400);
    },
    [carregarConversas]
  );

  // Evento global: dispatchEvent(new CustomEvent('os-chat-open', { detail: { osId, numeroOs } }))
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<OpenOsChatDetail>;
      if (ce.detail?.osId) openChat(ce.detail);
    };
    window.addEventListener('os-chat-open', handler as EventListener);
    return () => window.removeEventListener('os-chat-open', handler as EventListener);
  }, [openChat]);

  // Preload + destrava listeners de áudio assim que o messenger monta
  useEffect(() => {
    warmupNotificationAudio();
  }, []);

  // Som + toast + notificação do navegador em tempo real
  useEffect(() => {
    if (!empresaId || !meuId || !supabase?.channel) return;

    const channel = supabase
      .channel(`os_chat_alerts_web_${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'os_chat_mensagens',
          filter: `empresa_id=eq.${empresaId}`,
        },
        (payload) => {
          void (async () => {
            const row = payload.new as {
              id?: string;
              os_id?: string;
              autor_id?: string;
              mensagem?: string;
              anexo_url?: string | null;
            };
            if (!row?.id || !row.os_id) return;
            if (seenMsgIdsRef.current.has(row.id)) return;
            seenMsgIdsRef.current.add(row.id);
            if (seenMsgIdsRef.current.size > 300) {
              seenMsgIdsRef.current = new Set(Array.from(seenMsgIdsRef.current).slice(-100));
            }
            if (row.autor_id === meuId) return;

            const focused = windowsRef.current.find((w) => w.osId === row.os_id && !w.minimized);
            if (focused && document.visibilityState === 'visible') return;

            // Som imediatamente (antes de awaits) — evita atraso / perda do gesto de áudio
            void playNotificationSound();

            let numeroOs: string | number | null = null;
            let autorNome = 'Alguém';
            try {
              const [{ data: os }, { data: autor }] = await Promise.all([
                supabase.from('ordens_servico').select('numero_os').eq('id', row.os_id).maybeSingle(),
                row.autor_id
                  ? supabase.from('usuarios').select('nome').eq('id', row.autor_id).maybeSingle()
                  : Promise.resolve({ data: null }),
              ]);
              numeroOs = os?.numero_os ?? null;
              if (autor?.nome) autorNome = autor.nome;
            } catch {
              /* fallback */
            }

            const title = numeroOs != null ? `Chat OS #${numeroOs}` : 'Chat da O.S.';
            const preview =
              (row.mensagem || '').trim() || (row.anexo_url ? 'Enviou uma imagem' : 'Nova mensagem');
            const body = `${autorNome}: ${preview}`.slice(0, 160);

            addToast('info', `${title} — ${body}`);
            showBrowserNotification(title, body, row.os_id);
            void carregarConversas();
          })();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [empresaId, meuId, addToast, carregarConversas]);

  // Na página da O.S., oferece atalho no topo do inbox
  const osIdFromPath = useMemo(() => {
    const m = pathname?.match(/^\/ordens\/([^/]+)/);
    return m?.[1] && m[1] !== 'nova' ? m[1] : null;
  }, [pathname]);

  useEffect(() => {
    const t = setTimeout(() => {
      const q = search.trim();
      if (!q) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      void buscarOrdens(q).then((rows) => {
        setSearchResults(rows);
        setSearching(false);
      });
    }, 280);
    return () => clearTimeout(t);
  }, [search, buscarOrdens]);

  const listaFiltrada = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversas;
    return conversas.filter((c) => {
      const blob = `${c.numeroOs ?? ''} ${c.clienteNome ?? ''} ${c.equipamento ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [conversas, search]);

  const visibleWindows = windows.filter((w) => !w.minimized);
  const minimizedWindows = windows.filter((w) => w.minimized);

  if (!empresaId) return null;

  return (
    <>
      {/* Janelas abertas (direita → esquerda) */}
      {visibleWindows.map((w, i) => (
        <OsChatPopupWindow
          key={w.osId}
          osId={w.osId}
          numeroOs={w.numeroOs}
          minimized={false}
          offsetIndex={i}
          onClose={() => setWindows((prev) => prev.filter((x) => x.osId !== w.osId))}
          onToggleMinimize={() =>
            setWindows((prev) => prev.map((x) => (x.osId === w.osId ? { ...x, minimized: true } : x)))
          }
        />
      ))}

      {minimizedWindows.map((w, i) => (
        <OsChatPopupWindow
          key={`min-${w.osId}`}
          osId={w.osId}
          numeroOs={w.numeroOs}
          minimized
          offsetIndex={visibleWindows.length + i}
          onClose={() => setWindows((prev) => prev.filter((x) => x.osId !== w.osId))}
          onToggleMinimize={() =>
            setWindows((prev) => prev.map((x) => (x.osId === w.osId ? { ...x, minimized: false } : x)))
          }
        />
      ))}

      {/* Inbox estilo Messenger */}
      {inboxOpen && (
        <div
          style={{ right: CHAT_FAB_RIGHT_PX, bottom: CHAT_FAB_BOTTOM_PX + 64 }}
          className="fixed z-[56] flex h-[min(560px,calc(100vh-9rem))] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200/90 dark:border-zinc-600 bg-white dark:bg-zinc-900 shadow-[0_12px_40px_rgba(0,0,0,0.18)] max-sm:right-4"
        >
          <header className="flex items-center justify-between px-4 pt-3 pb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Chats</h2>
            <button
              type="button"
              onClick={() => setInboxOpen(false)}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <FiX className="h-5 w-5" />
            </button>
          </header>

          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 rounded-full bg-gray-100 dark:bg-zinc-800 px-3 py-2">
              <FiSearch className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar O.S. ou conversa"
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-zinc-100 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          {osIdFromPath && (
            <button
              type="button"
              onClick={() => openChat({ osId: osIdFromPath })}
              className="mx-3 mb-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-left text-sm text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              Abrir chat desta O.S.
            </button>
          )}

          <div className="flex-1 overflow-y-auto border-t border-gray-100 dark:border-zinc-800">
            {search.trim() && searchResults.length > 0 && (
              <div className="py-1">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Ordens
                </p>
                {searchResults.map((c) => (
                  <ConversaRow key={`s-${c.osId}`} item={c} onOpen={openChat} />
                ))}
              </div>
            )}

            {loading && conversas.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-10">Carregando conversas...</p>
            ) : listaFiltrada.length === 0 && !(search.trim() && searchResults.length) ? (
              <p className="text-center text-sm text-gray-500 dark:text-zinc-400 py-10 px-6">
                {searching
                  ? 'Buscando...'
                  : search.trim()
                    ? 'Nenhuma O.S. encontrada. Tente o número da OS.'
                    : 'Nenhuma conversa ainda. Busque uma O.S. pelo número para começar.'}
              </p>
            ) : (
              <div className="py-1">
                {listaFiltrada.length > 0 && (
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Recentes
                  </p>
                )}
                {listaFiltrada.map((c) => (
                  <ConversaRow key={c.osId} item={c} onOpen={openChat} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bolha à esquerda da calculadora (right-5 / h-14) */}
      <button
        type="button"
        onClick={() => {
          ensureBrowserNotificationPermission();
          void unlockNotificationAudio();
          setInboxOpen((v) => !v);
          void carregarConversas();
        }}
        className="fixed bottom-5 right-[5.5rem] z-[57] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-700 hover:scale-105 transition-transform max-sm:bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
        title="Chats das O.S."
        aria-label="Abrir chats das O.S."
      >
        {inboxOpen ? <FiX className="h-6 w-6" /> : <FiMessageCircle className="h-6 w-6" />}
        {!inboxOpen && totalUnread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        ) : null}
      </button>
    </>
  );
}

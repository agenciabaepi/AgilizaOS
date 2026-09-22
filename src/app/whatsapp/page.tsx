'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import { useWhatsAppCrmRealtime } from '@/hooks/useWhatsAppCrmRealtime';
import { useAuth } from '@/context/AuthContext';
import { ConversationList, type FiltroConversa } from '@/components/whatsapp-crm/ConversationList';
import { ChatPanel } from '@/components/whatsapp-crm/ChatPanel';
import { ClientOsSidebar } from '@/components/whatsapp-crm/ClientOsSidebar';
import { MessageCircle, PanelRightClose, PanelRightOpen, Settings } from 'lucide-react';
import Link from 'next/link';
import type {
  WhatsAppConversa,
  WhatsAppMensagem,
  WhatsAppConversaNota,
  WhatsAppOsContexto,
  WhatsAppOrdemResumo,
  WhatsAppAtendente,
} from '@/lib/whatsapp-crm/types';
import { whatsappCrmFetch } from '@/lib/api/whatsappCrmFetch';
import { mergeWhatsAppMensagens } from '@/lib/whatsapp-crm/merge-messages';
import {
  mergeWhatsAppConversa,
  mergeWhatsAppConversasList,
  previewFromMensagem,
} from '@/lib/whatsapp-crm/merge-conversas';

export interface ConversaDetalhe {
  conversa: WhatsAppConversa;
  mensagens: WhatsAppMensagem[];
  notas: WhatsAppConversaNota[];
  os_contexto: WhatsAppOsContexto[];
  ordens_cliente: WhatsAppOrdemResumo[];
}

function ordenarConversas(lista: WhatsAppConversa[]) {
  return [...lista].sort((a, b) => {
    const ta = a.ultima_mensagem_em ? new Date(a.ultima_mensagem_em).getTime() : 0;
    const tb = b.ultima_mensagem_em ? new Date(b.ultima_mensagem_em).getTime() : 0;
    return tb - ta;
  });
}

function bateFiltro(conversa: WhatsAppConversa, filtro: FiltroConversa) {
  if (filtro === 'todas') return true;
  return conversa.status === filtro;
}

export default function WhatsAppCrmPage() {
  const { podeAcessar } = useConfigPermission('whatsapp');
  const { empresaData, usuarioData } = useAuth();
  const [conversas, setConversas] = useState<WhatsAppConversa[]>([]);
  const [atendentes, setAtendentes] = useState<WhatsAppAtendente[]>([]);
  const [salvandoAtendente, setSalvandoAtendente] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ConversaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [filtro, setFiltro] = useState<FiltroConversa>('aberta');
  const [showOsSidebar, setShowOsSidebar] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  const filtroRef = useRef(filtro);
  selectedIdRef.current = selectedId;
  filtroRef.current = filtro;

  const zerarNaoLidas = useCallback((id: string) => {
    setConversas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nao_lidas: 0 } : c))
    );
  }, []);

  /** Zera no UI e no banco — evita badge voltar por race do Realtime/webhook. */
  const marcarComoLida = useCallback(
    (id: string) => {
      zerarNaoLidas(id);
      void whatsappCrmFetch(`/api/whatsapp/crm/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nao_lidas: 0 }),
      }).catch(() => {
        /* silencioso — GET do detalhe também zera */
      });
    },
    [zerarNaoLidas]
  );

  const conversasFetchGen = useRef(0);

  const carregarConversas = useCallback(
    async (conversaAbertaId?: string | null) => {
      const gen = ++conversasFetchGen.current;
      try {
        const params = filtro !== 'todas' ? `?status=${filtro}` : '';
        const res = await whatsappCrmFetch(`/api/whatsapp/crm/conversations${params}`);
        const json = await res.json();
        if (gen !== conversasFetchGen.current) return;
        if (json.success) {
          const aberta = conversaAbertaId ?? selectedIdRef.current;
          const incoming = json.data as WhatsAppConversa[];
          setConversas((prev) =>
            ordenarConversas(
              mergeWhatsAppConversasList(prev, incoming).map((c) =>
                c.id === aberta ? { ...c, nao_lidas: 0 } : c
              )
            )
          );
        }
      } finally {
        if (gen === conversasFetchGen.current) setLoading(false);
      }
    },
    [filtro]
  );

  const cacheRef = useRef<Map<string, ConversaDetalhe>>(new Map());
  const prefetchInFlight = useRef<Set<string>>(new Set());
  const MAX_CACHE = 25;

  const guardarCache = useCallback((id: string, data: ConversaDetalhe) => {
    const cache = cacheRef.current;
    cache.set(id, data);
    if (cache.size > MAX_CACHE) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
  }, []);

  const carregarDetalhe = useCallback(
    async (id: string, opts?: { silent?: boolean; light?: boolean }) => {
      const silent = opts?.silent ?? false;
      const light = opts?.light ?? true;
      const hasCache = cacheRef.current.has(id);

      // Mostra cache na hora, mas a resposta da API substitui (não mistura histórico velho)
      if (hasCache && selectedIdRef.current === id) {
        setDetalhe(cacheRef.current.get(id)!);
      }

      if (!silent && !hasCache) setLoadingDetalhe(true);

      try {
        const qs = new URLSearchParams();
        if (light) qs.set('light', '1');
        qs.set('mark_read', '0');
        const res = await whatsappCrmFetch(
          `/api/whatsapp/crm/conversations/${id}?${qs.toString()}`
        );
        const json = await res.json();
        if (!json.success) return;
        if (selectedIdRef.current !== id) {
          // Guarda no cache mesmo assim, para o próximo clique
          const incoming = json.data as ConversaDetalhe;
          const prevOs = cacheRef.current.get(id);
          guardarCache(id, {
            ...incoming,
            os_contexto: incoming.os_contexto?.length
              ? incoming.os_contexto
              : prevOs?.os_contexto ?? [],
            ordens_cliente: incoming.ordens_cliente?.length
              ? incoming.ordens_cliente
              : prevOs?.ordens_cliente ?? [],
          });
          return;
        }

        const incoming = json.data as ConversaDetalhe;
        setDetalhe((prev) => {
          const pendingOnly =
            prev && prev.conversa.id === id
              ? prev.mensagens.filter((m) => m.id.startsWith('pending-'))
              : [];
          const prevOs = cacheRef.current.get(id);
          const next: ConversaDetalhe = {
            ...incoming,
            mensagens: mergeWhatsAppMensagens(incoming.mensagens, pendingOnly),
            os_contexto: incoming.os_contexto?.length
              ? incoming.os_contexto
              : prev?.os_contexto?.length
                ? prev.os_contexto
                : prevOs?.os_contexto ?? [],
            ordens_cliente: incoming.ordens_cliente?.length
              ? incoming.ordens_cliente
              : prev?.ordens_cliente?.length
                ? prev.ordens_cliente
                : prevOs?.ordens_cliente ?? [],
          };
          guardarCache(id, next);
          return next;
        });

        // Só avança o preview da lista — nunca volta para mensagem mais antiga (race de fetch)
        const lastMsg = incoming.mensagens[incoming.mensagens.length - 1];
        const candidatePreview = lastMsg
          ? previewFromMensagem(lastMsg)
          : {
              ultima_mensagem_preview: incoming.conversa.ultima_mensagem_preview,
              ultima_mensagem_em: incoming.conversa.ultima_mensagem_em,
            };
        setConversas((prev) =>
          ordenarConversas(
            prev.map((c) => {
              if (c.id !== id) return c;
              const curTs = c.ultima_mensagem_em
                ? new Date(c.ultima_mensagem_em).getTime()
                : 0;
              const nextTs = candidatePreview.ultima_mensagem_em
                ? new Date(candidatePreview.ultima_mensagem_em).getTime()
                : 0;
              return {
                ...mergeWhatsAppConversa(c, { ...incoming.conversa, nao_lidas: 0 }),
                ...(nextTs >= curTs ? candidatePreview : {}),
                nao_lidas: 0,
              };
            })
          )
        );
      } finally {
        if (selectedIdRef.current === id) setLoadingDetalhe(false);
      }
    },
    [guardarCache]
  );

  const prefetchConversa = useCallback(
    (id: string) => {
      if (!id || cacheRef.current.has(id) || prefetchInFlight.current.has(id)) return;
      prefetchInFlight.current.add(id);
      void whatsappCrmFetch(`/api/whatsapp/crm/conversations/${id}?light=1&mark_read=0`)
        .then((res) => res.json())
        .then((json) => {
          if (!json.success) return;
          const incoming = json.data as ConversaDetalhe;
          // Prefetch: grava só o que veio do servidor (sem merge com cache velho)
          guardarCache(id, incoming);
        })
        .finally(() => {
          prefetchInFlight.current.delete(id);
        });
    },
    [guardarCache]
  );

  const carregarOsSidebar = useCallback(
    async (id: string) => {
      const res = await whatsappCrmFetch(`/api/whatsapp/crm/conversations/${id}?mark_read=0`);
      const json = await res.json();
      if (!json.success) return;
      const incoming = json.data as ConversaDetalhe;
      setDetalhe((prev) => {
        const pendingOnly =
          prev && prev.conversa.id === id
            ? prev.mensagens.filter((m) => m.id.startsWith('pending-'))
            : [];
        const next: ConversaDetalhe = {
          ...incoming,
          mensagens: mergeWhatsAppMensagens(incoming.mensagens, pendingOnly),
        };
        guardarCache(id, next);
        if (selectedIdRef.current !== id) return prev;
        return next;
      });
    },
    [guardarCache]
  );

  const selecionarConversa = useCallback(
    (id: string) => {
      setSelectedId(id);
      marcarComoLida(id);
      const cached = cacheRef.current.get(id);
      if (cached) {
        setDetalhe(cached);
        setLoadingDetalhe(false);
      }
    },
    [marcarComoLida]
  );

  const aplicarMensagemNaLista = useCallback((msg: WhatsAppMensagem) => {
    const aberta = selectedIdRef.current;
    const conversaAberta = aberta === msg.conversa_id;

    if (conversaAberta && msg.direcao === 'entrada') {
      marcarComoLida(msg.conversa_id);
    }

    const preview = previewFromMensagem(msg);
    const msgTs = new Date(msg.created_at).getTime();

    setConversas((prev) => {
      if (!prev.some((c) => c.id === msg.conversa_id)) {
        void carregarConversas(aberta);
        return prev;
      }
      return ordenarConversas(
        prev.map((c) => {
          if (c.id !== msg.conversa_id) return c;
          const atualTs = c.ultima_mensagem_em
            ? new Date(c.ultima_mensagem_em).getTime()
            : 0;
          // Sempre aplica se for igual ou mais novo (envio otimista / realtime)
          if (msgTs < atualTs) {
            return {
              ...c,
              nao_lidas: conversaAberta
                ? 0
                : msg.direcao === 'entrada'
                  ? c.nao_lidas + 1
                  : c.nao_lidas,
            };
          }
          return {
            ...c,
            ...preview,
            status: msg.direcao === 'entrada' && c.status === 'fechada' ? 'aberta' : c.status,
            nao_lidas: conversaAberta
              ? 0
              : msg.direcao === 'entrada'
                ? c.nao_lidas + 1
                : c.nao_lidas,
          };
        })
      );
    });
  }, [carregarConversas, marcarComoLida]);

  const handleMensagemInsert = useCallback(
    (msg: WhatsAppMensagem) => {
      aplicarMensagemNaLista(msg);

      if (selectedIdRef.current !== msg.conversa_id) return;

      setDetalhe((d) => {
        if (!d) return d;
        if (d.mensagens.some((m) => m.id === msg.id)) return d;
        const semPendingDuplicado = d.mensagens.filter(
          (m) =>
            !(
              m.id.startsWith('pending-') &&
              m.conteudo === msg.conteudo &&
              m.direcao === msg.direcao
            )
        );
        const next = {
          ...d,
          mensagens: mergeWhatsAppMensagens(semPendingDuplicado, [msg]),
        };
        cacheRef.current.set(msg.conversa_id, next);
        return next;
      });
    },
    [aplicarMensagemNaLista]
  );

  const handleMensagemUpdate = useCallback((msg: WhatsAppMensagem) => {
    if (selectedIdRef.current !== msg.conversa_id) return;
    setDetalhe((d) => {
      if (!d) return d;
      return {
        ...d,
        mensagens: d.mensagens.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
      };
    });
  }, []);

  const handleNotaInsert = useCallback((nota: WhatsAppConversaNota) => {
    if (selectedIdRef.current !== nota.conversa_id) return;
    setDetalhe((d) => {
      if (!d) return d;
      if (d.notas.some((n) => n.id === nota.id)) return d;
      return { ...d, notas: [...d.notas, nota] };
    });
  }, []);

  const handleConversaChange = useCallback((conversa: WhatsAppConversa) => {
    const aberta = selectedIdRef.current;
    const filtroAtual = filtroRef.current;
    const lendoEsta = aberta === conversa.id;

    setConversas((prev) => {
      const atual = prev.find((c) => c.id === conversa.id);
      const merged = mergeWhatsAppConversa(atual, {
        ...conversa,
        nao_lidas: lendoEsta ? 0 : conversa.nao_lidas,
      });
      if (!bateFiltro(merged, filtroAtual)) {
        return prev.filter((c) => c.id !== conversa.id);
      }
      if (!atual) return ordenarConversas([merged, ...prev]);
      return ordenarConversas(prev.map((c) => (c.id === conversa.id ? merged : c)));
    });

    if (lendoEsta) {
      setDetalhe((d) => (d ? { ...d, conversa: { ...d.conversa, ...conversa, nao_lidas: 0 } } : d));
      if (conversa.nao_lidas > 0) {
        void whatsappCrmFetch(`/api/whatsapp/crm/conversations/${conversa.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nao_lidas: 0 }),
        }).catch(() => {});
      }
      if (!bateFiltro(conversa, filtroAtual)) {
        setSelectedId(null);
        setDetalhe(null);
      }
    }
  }, []);

  const handleConversaInsert = useCallback((conversa: WhatsAppConversa) => {
    if (!bateFiltro(conversa, filtroRef.current)) return;
    setConversas((prev) => {
      if (prev.some((c) => c.id === conversa.id)) return prev;
      return ordenarConversas([conversa, ...prev]);
    });
  }, []);

  const handleStatusChange = useCallback(
    (conversa: WhatsAppConversa) => {
      handleConversaChange(conversa);
    },
    [handleConversaChange]
  );

  useWhatsAppCrmRealtime({
    empresaId: empresaData?.id,
    onMensagemInsert: handleMensagemInsert,
    onMensagemUpdate: handleMensagemUpdate,
    onNotaInsert: handleNotaInsert,
    onConversaChange: handleConversaChange,
    onConversaInsert: handleConversaInsert,
  });

  const handleMessageSent = useCallback((msg: WhatsAppMensagem) => {
    setDetalhe((d) => {
      if (!d) return d;
      if (d.mensagens.some((m) => m.id === msg.id)) return d;
      return { ...d, mensagens: mergeWhatsAppMensagens(d.mensagens, [msg]) };
    });
    aplicarMensagemNaLista(msg);
  }, [aplicarMensagemNaLista]);

  const handleReplaceMessage = useCallback((tempId: string, msg: WhatsAppMensagem) => {
    setDetalhe((d) => {
      if (!d) return d;
      const semTemp = d.mensagens.filter((m) => m.id !== tempId);
      return { ...d, mensagens: mergeWhatsAppMensagens(semTemp, [msg]) };
    });
    aplicarMensagemNaLista(msg);
  }, [aplicarMensagemNaLista]);

  const handleMessageFailed = useCallback((tempId: string, error: string) => {
    setDetalhe((d) => {
      if (!d) return d;
      return {
        ...d,
        mensagens: d.mensagens.map((m) =>
          m.id === tempId
            ? { ...m, status_entrega: 'falha' as const, erro_entrega: error }
            : m
        ),
      };
    });
  }, []);

  const handleNotaSent = useCallback((nota: WhatsAppConversaNota) => {
    setDetalhe((d) => {
      if (!d) return d;
      if (d.notas.some((n) => n.id === nota.id)) return d;
      return { ...d, notas: [...d.notas, nota] };
    });
  }, []);

  const handleAtendenteChange = useCallback(async (atribuidoUsuarioId: string | null) => {
    const conversaId = selectedIdRef.current;
    if (!conversaId) return;

    setSalvandoAtendente(true);
    try {
      const res = await whatsappCrmFetch(`/api/whatsapp/crm/conversations/${conversaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atribuido_usuario_id: atribuidoUsuarioId }),
      });
      const json = await res.json();
      if (!json.success || !json.data) return;

      const atualizada = json.data as WhatsAppConversa;
      setDetalhe((d) =>
        d && d.conversa.id === conversaId
          ? { ...d, conversa: { ...d.conversa, ...atualizada } }
          : d
      );
      setConversas((prev) =>
        prev.map((c) => (c.id === conversaId ? { ...c, ...atualizada } : c))
      );
    } finally {
      setSalvandoAtendente(false);
    }
  }, []);

  useEffect(() => {
    if (!podeAcessar) return;
    void whatsappCrmFetch('/api/whatsapp/crm/atendentes')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setAtendentes(json.data ?? []);
      });
  }, [podeAcessar]);

  useEffect(() => {
    if (!podeAcessar) return;
    setLoading(true);
    setSelectedId(null);
    setDetalhe(null);
    void carregarConversas();
  }, [podeAcessar, carregarConversas]);

  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setDetalhe(null);
      prevSelectedRef.current = null;
      return;
    }

    const trocou = prevSelectedRef.current !== selectedId;
    prevSelectedRef.current = selectedId;

    if (trocou) {
      const cached = cacheRef.current.get(selectedId);
      if (cached) {
        setDetalhe(cached);
        setLoadingDetalhe(false);
      } else {
        setDetalhe(null);
      }
    }

    void carregarDetalhe(selectedId, { light: true, silent: cacheRef.current.has(selectedId) });
  }, [selectedId, carregarDetalhe]);

  // Espelha a última mensagem do chat aberto na lista (envio otimista incluso)
  useEffect(() => {
    if (!detalhe?.conversa?.id || !detalhe.mensagens?.length) return;
    const last = detalhe.mensagens[detalhe.mensagens.length - 1];
    if (!last) return;
    const conversaId = detalhe.conversa.id;
    const preview = previewFromMensagem(last);
    const msgTs = new Date(last.created_at).getTime();

    setConversas((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (c.id !== conversaId) return c;
        const curTs = c.ultima_mensagem_em ? new Date(c.ultima_mensagem_em).getTime() : 0;
        if (msgTs < curTs) return c;
        if (
          c.ultima_mensagem_preview === preview.ultima_mensagem_preview &&
          c.ultima_mensagem_em === preview.ultima_mensagem_em
        ) {
          return c;
        }
        changed = true;
        return { ...c, ...preview };
      });
      return changed ? ordenarConversas(next) : prev;
    });
  }, [detalhe?.conversa?.id, detalhe?.mensagens]);

  // Ao abrir painel OS, busca dados pesados só então
  useEffect(() => {
    if (!showOsSidebar || !selectedId) return;
    const cached = cacheRef.current.get(selectedId);
    if (cached && (cached.ordens_cliente?.length > 0 || cached.os_contexto?.length > 0)) {
      return;
    }
    void carregarOsSidebar(selectedId);
  }, [showOsSidebar, selectedId, carregarOsSidebar]);

  // Refresh só quando a aba volta ao foco (sem polling contínuo)
  useEffect(() => {
    if (!podeAcessar) return;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void carregarConversas(selectedIdRef.current);
      if (selectedIdRef.current) {
        void carregarDetalhe(selectedIdRef.current, { silent: true, light: true });
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [podeAcessar, carregarConversas, carregarDetalhe]);

  if (!podeAcessar) {
    return (
      <MenuLayout>
        <div className="p-8"><AcessoNegadoComponent /></div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f0f2f5] dark:bg-[#111b21]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#d1d7db] dark:border-[#222d34] bg-[#f0f2f5] dark:bg-[#202c33] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884] text-white">
              <MessageCircle size={18} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#111b21] dark:text-[#e9edef]">WhatsApp</h1>
              <p className="text-[11px] text-[#667781] dark:text-[#8696a0]">Atendimento em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOsSidebar((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#d1d7db] dark:border-[#3b4a54] bg-white dark:bg-[#2a3942] px-3 py-1.5 text-xs text-[#54656f] dark:text-[#aebac1] hover:bg-gray-50 dark:hover:bg-[#3b4a54]"
              title={showOsSidebar ? 'Ocultar painel da OS' : 'Mostrar painel da OS'}
            >
              {showOsSidebar ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
              OS
            </button>
            <Link
              href="/configuracoes?tab=11"
              className="inline-flex items-center gap-2 rounded-lg border border-[#d1d7db] dark:border-[#3b4a54] bg-white dark:bg-[#2a3942] px-3 py-1.5 text-xs text-[#54656f] dark:text-[#aebac1] hover:bg-gray-50 dark:hover:bg-[#3b4a54]"
            >
              <Settings size={15} />
              Config
            </Link>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <ConversationList
            conversas={conversas}
            selectedId={selectedId}
            onSelect={selecionarConversa}
            onPrefetch={prefetchConversa}
            filtro={filtro}
            onFiltroChange={setFiltro}
            loading={loading}
          />

          <ChatPanel
            detalhe={detalhe}
            loading={loadingDetalhe}
            atendentes={atendentes}
            usuarioAtualId={usuarioData?.id}
            salvandoAtendente={salvandoAtendente}
            onAtendenteChange={handleAtendenteChange}
            onStatusChange={handleStatusChange}
            onMessageSent={handleMessageSent}
            onReplaceMessage={handleReplaceMessage}
            onMessageFailed={handleMessageFailed}
            onNotaSent={handleNotaSent}
          />

          {showOsSidebar && (
            <ClientOsSidebar detalhe={detalhe} loading={loadingDetalhe} />
          )}
        </div>
      </div>
    </MenuLayout>
  );
}

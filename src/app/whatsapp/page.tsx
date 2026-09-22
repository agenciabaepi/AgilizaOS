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

  const carregarConversas = useCallback(
    async (conversaAbertaId?: string | null) => {
      try {
        const params = filtro !== 'todas' ? `?status=${filtro}` : '';
        const res = await whatsappCrmFetch(`/api/whatsapp/crm/conversations${params}`);
        const json = await res.json();
        if (json.success) {
          const aberta = conversaAbertaId ?? selectedIdRef.current;
          setConversas(
            (json.data as WhatsAppConversa[]).map((c) =>
              c.id === aberta ? { ...c, nao_lidas: 0 } : c
            )
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [filtro]
  );

  const carregarDetalhe = useCallback(
    async (id: string, silent = false) => {
      if (!silent) setLoadingDetalhe(true);
      try {
        const res = await whatsappCrmFetch(`/api/whatsapp/crm/conversations/${id}`);
        const json = await res.json();
        if (json.success) {
          setDetalhe((prev) => {
            const incoming = json.data as ConversaDetalhe;
            if (!prev || prev.conversa.id !== id) return incoming;
            return {
              ...incoming,
              mensagens: mergeWhatsAppMensagens(incoming.mensagens, prev.mensagens),
            };
          });
          zerarNaoLidas(id);
        }
      } finally {
        if (!silent) setLoadingDetalhe(false);
      }
    },
    [zerarNaoLidas]
  );

  const selecionarConversa = useCallback(
    (id: string) => {
      setSelectedId(id);
      zerarNaoLidas(id);
    },
    [zerarNaoLidas]
  );

  const aplicarMensagemNaLista = useCallback((msg: WhatsAppMensagem) => {
    const aberta = selectedIdRef.current;
    setConversas((prev) => {
      if (!prev.some((c) => c.id === msg.conversa_id)) {
        // Nova atividade em conversa fora da lista → refresh leve
        void carregarConversas(aberta);
        return prev;
      }
      return ordenarConversas(
        prev.map((c) => {
          if (c.id !== msg.conversa_id) return c;
          return {
            ...c,
            ultima_mensagem_preview: msg.conteudo.slice(0, 120),
            ultima_mensagem_em: msg.created_at,
            status: msg.direcao === 'entrada' && c.status === 'fechada' ? 'aberta' : c.status,
            nao_lidas:
              aberta === msg.conversa_id
                ? 0
                : msg.direcao === 'entrada'
                  ? c.nao_lidas + 1
                  : c.nao_lidas,
          };
        })
      );
    });
  }, [carregarConversas]);

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
        return { ...d, mensagens: mergeWhatsAppMensagens(semPendingDuplicado, [msg]) };
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

    setConversas((prev) => {
      const existe = prev.some((c) => c.id === conversa.id);
      if (!bateFiltro(conversa, filtroAtual)) {
        return prev.filter((c) => c.id !== conversa.id);
      }
      const merged = {
        ...conversa,
        nao_lidas: aberta === conversa.id ? 0 : conversa.nao_lidas,
      };
      if (!existe) return ordenarConversas([merged, ...prev]);
      return ordenarConversas(prev.map((c) => (c.id === conversa.id ? { ...c, ...merged } : c)));
    });

    if (aberta === conversa.id) {
      setDetalhe((d) => (d ? { ...d, conversa: { ...d.conversa, ...conversa } } : d));
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
  }, []);

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
    if (prevSelectedRef.current !== selectedId) {
      setDetalhe(null);
      prevSelectedRef.current = selectedId;
    }
    void carregarDetalhe(selectedId);
  }, [selectedId, carregarDetalhe]);

  // Refresh só quando a aba volta ao foco (sem polling contínuo)
  useEffect(() => {
    if (!podeAcessar) return;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void carregarConversas(selectedIdRef.current);
      if (selectedIdRef.current) {
        void carregarDetalhe(selectedIdRef.current, true);
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
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f0f2f5]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#d1d7db] bg-[#f0f2f5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884] text-white">
              <MessageCircle size={18} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#111b21]">WhatsApp</h1>
              <p className="text-[11px] text-[#667781]">Atendimento em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOsSidebar((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#d1d7db] bg-white px-3 py-1.5 text-xs text-[#54656f] hover:bg-gray-50"
              title={showOsSidebar ? 'Ocultar painel da OS' : 'Mostrar painel da OS'}
            >
              {showOsSidebar ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
              OS
            </button>
            <Link
              href="/configuracoes?tab=11"
              className="inline-flex items-center gap-2 rounded-lg border border-[#d1d7db] bg-white px-3 py-1.5 text-xs text-[#54656f] hover:bg-gray-50"
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

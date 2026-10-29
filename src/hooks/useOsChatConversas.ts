'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { countUnreadForOs } from '@/lib/os-chat/readReceipts';

export type OsChatConversa = {
  osId: string;
  numeroOs: number | string | null;
  equipamento: string | null;
  clienteNome: string | null;
  lastMensagem: string;
  lastAt: string;
  lastAutorNome: string | null;
  hasAnexo: boolean;
  unreadCount: number;
};

type RawRow = {
  id: string;
  os_id: string;
  autor_id: string;
  mensagem: string;
  anexo_url: string | null;
  created_at: string;
  autor?: { nome: string | null } | null;
  ordem?: {
    id: string;
    numero_os: number | null;
    equipamento: string | null;
    cliente?: { nome: string | null } | { nome: string | null }[] | null;
  } | null;
};

function clienteNomeFromOrdem(ordem: RawRow['ordem']): string | null {
  const c = ordem?.cliente;
  if (!c) return null;
  if (Array.isArray(c)) return c[0]?.nome ?? null;
  return c.nome ?? null;
}

function groupConversas(
  rows: RawRow[],
  meuId: string | null | undefined,
  lastReadByOs: Map<string, string>
): OsChatConversa[] {
  const map = new Map<string, OsChatConversa>();
  for (const row of rows) {
    if (map.has(row.os_id)) continue;
    const unreadCount = meuId
      ? countUnreadForOs({
          osId: row.os_id,
          meuId,
          lastReadAt: lastReadByOs.get(row.os_id),
          messages: rows,
        })
      : 0;
    map.set(row.os_id, {
      osId: row.os_id,
      numeroOs: row.ordem?.numero_os ?? null,
      equipamento: row.ordem?.equipamento ?? null,
      clienteNome: clienteNomeFromOrdem(row.ordem),
      lastMensagem: row.mensagem?.trim() || (row.anexo_url ? '📷 Imagem' : ''),
      lastAt: row.created_at,
      lastAutorNome: row.autor?.nome ?? null,
      hasAnexo: !!row.anexo_url,
      unreadCount,
    });
  }
  return Array.from(map.values());
}

export function useOsChatConversas(
  empresaId: string | null | undefined,
  usuarioId: string | null | undefined,
  enabled: boolean
) {
  const [conversas, setConversas] = useState<OsChatConversa[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const knownRef = useRef(false);

  const carregar = useCallback(async () => {
    if (!empresaId || !supabase) return;
    setLoading(true);
    try {
      const [msgRes, leiturasRes] = await Promise.all([
        supabase
          .from('os_chat_mensagens')
          .select(
            `
          id, os_id, autor_id, mensagem, anexo_url, created_at,
          autor:autor_id(nome),
          ordem:os_id(id, numero_os, equipamento, cliente:cliente_id(nome))
        `
          )
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })
          .limit(300),
        usuarioId
          ? supabase
              .from('os_chat_leituras')
              .select('os_id, last_read_at')
              .eq('empresa_id', empresaId)
              .eq('usuario_id', usuarioId)
          : Promise.resolve({ data: [] as { os_id: string; last_read_at: string }[], error: null }),
      ]);

      if (msgRes.error) throw msgRes.error;
      const rows = (msgRes.data || []) as unknown as RawRow[];
      const lastReadByOs = new Map<string, string>();
      for (const l of leiturasRes.data || []) {
        lastReadByOs.set(l.os_id, l.last_read_at);
      }

      const grouped = groupConversas(rows, usuarioId, lastReadByOs);
      setConversas(grouped);
      setTotalUnread(grouped.reduce((acc, c) => acc + (c.unreadCount || 0), 0));
      knownRef.current = true;
    } catch (e) {
      console.warn('Erro ao listar conversas do chat OS:', e);
    } finally {
      setLoading(false);
    }
  }, [empresaId, usuarioId]);

  useEffect(() => {
    if (!enabled || !empresaId) return;
    void carregar();
  }, [enabled, empresaId, carregar]);

  useEffect(() => {
    if (!enabled || !empresaId || !supabase?.channel) return;

    const channel = supabase
      .channel(`os_chat_inbox_${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'os_chat_mensagens',
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          void carregar();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'os_chat_leituras',
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          void carregar();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, empresaId, carregar]);

  const buscarOrdens = useCallback(
    async (termo: string): Promise<OsChatConversa[]> => {
      if (!empresaId || !supabase) return [];
      const q = termo.trim();
      if (!q) return [];

      let query = supabase
        .from('ordens_servico')
        .select('id, numero_os, equipamento, cliente:cliente_id(nome)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (/^\d+$/.test(q)) {
        query = query.eq('numero_os', Number(q));
      } else {
        query = query.or(`equipamento.ilike.%${q}%,modelo.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((o: any) => ({
        osId: o.id as string,
        numeroOs: o.numero_os ?? null,
        equipamento: o.equipamento ?? null,
        clienteNome: Array.isArray(o.cliente) ? o.cliente[0]?.nome ?? null : o.cliente?.nome ?? null,
        lastMensagem: 'Abrir chat desta O.S.',
        lastAt: new Date().toISOString(),
        lastAutorNome: null,
        hasAnexo: false,
        unreadCount: 0,
      }));
    },
    [empresaId]
  );

  return { conversas, loading, totalUnread, carregar, buscarOrdens };
}

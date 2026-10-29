'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { bearerAuthHeadersForApi } from '@/lib/api/clientAuthHeaders';
import { supabase } from '@/lib/supabaseClient';
import { getVistoEm, type OsChatLeitura } from '@/lib/os-chat/readReceipts';

export type OsChatMensagem = {
  id: string;
  empresa_id: string;
  os_id: string;
  autor_id: string;
  mensagem: string;
  anexo_url: string | null;
  anexo_tipo: string | null;
  created_at: string;
  autor?: { id: string; nome: string | null } | null;
  anexo_display_url?: string | null;
  /** ISO do primeiro outro usuário que leu (mensagens próprias) */
  visto_em?: string | null;
};

const BUCKET = 'os-chat';
const SIGNED_TTL_SEC = 60 * 60 * 24 * 7;

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function extractOsChatStoragePath(anexoUrl: string | null | undefined): string | null {
  if (!anexoUrl) return null;
  if (!isHttpUrl(anexoUrl)) return anexoUrl.replace(/^\/+/, '');
  try {
    const u = new URL(anexoUrl);
    const marker = `/object/sign/${BUCKET}/`;
    const markerPublic = `/object/public/${BUCKET}/`;
    const idxSign = u.pathname.indexOf(marker);
    if (idxSign >= 0) return decodeURIComponent(u.pathname.slice(idxSign + marker.length));
    const idxPublic = u.pathname.indexOf(markerPublic);
    if (idxPublic >= 0) return decodeURIComponent(u.pathname.slice(idxPublic + markerPublic.length));
  } catch {
    /* ignore */
  }
  return null;
}

async function resolveAnexoDisplayUrl(anexoUrl: string | null | undefined): Promise<string | null> {
  if (!anexoUrl) return null;
  if (isHttpUrl(anexoUrl)) {
    // URLs assinadas antigas podem expirar — preferir public se for path do nosso bucket
    const pathFromUrl = extractOsChatStoragePath(anexoUrl);
    if (pathFromUrl && supabase) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(pathFromUrl);
      if (data?.publicUrl) return data.publicUrl;
    }
    return anexoUrl;
  }
  if (!supabase) return null;
  const path = extractOsChatStoragePath(anexoUrl);
  if (!path) return null;
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (pub?.publicUrl) return pub.publicUrl;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function withDisplayUrls(rows: OsChatMensagem[]): Promise<OsChatMensagem[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      anexo_display_url: await resolveAnexoDisplayUrl(row.anexo_url),
    }))
  );
}

function applyVistos(
  rows: OsChatMensagem[],
  leituras: OsChatLeitura[],
  meuId: string | null | undefined
): OsChatMensagem[] {
  return rows.map((row) => ({
    ...row,
    visto_em: row.autor_id === meuId ? getVistoEm(row.created_at, leituras, meuId) : null,
  }));
}

async function enrichAutor(raw: OsChatMensagem): Promise<OsChatMensagem> {
  let autor = raw.autor;
  if (!autor?.nome && raw.autor_id && supabase) {
    const { data } = await supabase.from('usuarios').select('id, nome').eq('id', raw.autor_id).maybeSingle();
    autor = data;
  }
  return {
    ...raw,
    autor,
    anexo_display_url: await resolveAnexoDisplayUrl(raw.anexo_url),
  };
}

export function useOsChat(osId: string | null | undefined, meuId?: string | null) {
  const [mensagens, setMensagens] = useState<OsChatMensagem[]>([]);
  const [leituras, setLeituras] = useState<OsChatLeitura[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const leiturasRef = useRef<OsChatLeitura[]>([]);
  const meuIdRef = useRef(meuId);

  leiturasRef.current = leituras;
  meuIdRef.current = meuId;

  const carregarLeituras = useCallback(async () => {
    if (!osId || !supabase) return [] as OsChatLeitura[];
    const { data, error } = await supabase
      .from('os_chat_leituras')
      .select('usuario_id, os_id, last_read_at')
      .eq('os_id', osId);
    if (error) return [] as OsChatLeitura[];
    const rows = (data || []) as OsChatLeitura[];
    setLeituras(rows);
    return rows;
  }, [osId]);

  const marcarLido = useCallback(async () => {
    if (!osId || !supabase) return;
    try {
      await supabase.rpc('marcar_os_chat_lido', { p_os_id: osId });
      await carregarLeituras();
    } catch {
      /* ignore */
    }
  }, [osId, carregarLeituras]);

  const carregar = useCallback(async () => {
    if (!osId || !supabase) return;
    setLoading(true);
    setErro(null);
    try {
      const [{ data, error }, leiturasRows] = await Promise.all([
        supabase
          .from('os_chat_mensagens')
          .select(
            'id, empresa_id, os_id, autor_id, mensagem, anexo_url, anexo_tipo, created_at, autor:autor_id(id, nome)'
          )
          .eq('os_id', osId)
          .order('created_at', { ascending: true }),
        carregarLeituras(),
      ]);
      if (error) throw error;
      const rows = await withDisplayUrls((data || []) as unknown as OsChatMensagem[]);
      knownIdsRef.current = new Set(rows.map((r) => r.id));
      setMensagens(applyVistos(rows, leiturasRows, meuIdRef.current));
      await marcarLido();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar chat');
    } finally {
      setLoading(false);
    }
  }, [osId, carregarLeituras, marcarLido]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!osId || typeof window === 'undefined' || !supabase?.channel) return;

    const channel = supabase
      .channel(`os_chat_${osId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'os_chat_mensagens',
          filter: `os_id=eq.${osId}`,
        },
        (payload) => {
          void (async () => {
            const raw = payload.new as OsChatMensagem;
            if (knownIdsRef.current.has(raw.id)) return;
            const enriched = await enrichAutor(raw);
            knownIdsRef.current.add(enriched.id);
            setMensagens((prev) => {
              const next = prev.some((m) => m.id === enriched.id) ? prev : [...prev, enriched];
              return applyVistos(next, leiturasRef.current, meuIdRef.current);
            });
            // Se a janela está aberta, marca como lida
            await marcarLido();
          })();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'os_chat_mensagens',
          filter: `os_id=eq.${osId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string };
          if (!old?.id) return;
          knownIdsRef.current.delete(old.id);
          setMensagens((prev) => prev.filter((m) => m.id !== old.id));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'os_chat_leituras',
          filter: `os_id=eq.${osId}`,
        },
        () => {
          void (async () => {
            const rows = await carregarLeituras();
            setMensagens((prev) => applyVistos(prev, rows, meuIdRef.current));
          })();
        }
      )
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED');
      });

    return () => {
      void supabase.removeChannel(channel);
      setConectado(false);
    };
  }, [osId, carregarLeituras, marcarLido]);

  // Reaplica vistos quando meuId carregar
  useEffect(() => {
    setMensagens((prev) => applyVistos(prev, leiturasRef.current, meuId));
  }, [meuId]);

  const enviar = useCallback(
    async (params: {
      empresaId: string;
      autorId: string;
      mensagem?: string;
      file?: File | null;
    }) => {
      if (!osId || !supabase) throw new Error('Chat indisponível');
      const texto = (params.mensagem || '').trim();
      let anexo_url: string | null = null;
      let anexo_tipo: string | null = null;

      if (params.file) {
        const mime = params.file.type || 'image/jpeg';
        if (!mime.startsWith('image/')) throw new Error('Apenas imagens são permitidas');
        if (params.file.size < 200) throw new Error('Imagem inválida (vazia)');

        // Garante bytes reais no browser (File pode reportar size e ainda falhar no pipe)
        const buffer = await params.file.arrayBuffer();
        if (buffer.byteLength < 200) throw new Error('Imagem inválida após leitura');
        const blob = new Blob([buffer], { type: mime });

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers = await bearerAuthHeadersForApi(session);

        // Sempre /api/upload (fotos da O.S.) — grava URL https pública, nunca path os-chat
        const formOs = new FormData();
        formOs.append('osId', osId);
        formOs.append('files', blob, params.file.name || `chat-${Date.now()}.jpg`);
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers,
          body: formOs,
          credentials: 'include',
        });

        const upJson = (await upRes.json().catch(() => ({}))) as {
          error?: string;
          files?: { url?: string; size?: number; type?: string }[];
        };
        if (!upRes.ok || !upJson.files?.[0]?.url) {
          throw new Error(upJson.error || `Falha no upload (${upRes.status})`);
        }
        const f = upJson.files[0];
        if (typeof f.size === 'number' && f.size < 200) {
          throw new Error('Upload incompleto (arquivo vazio)');
        }
        if (!/^https?:\/\//i.test(f.url!)) {
          throw new Error('Upload sem URL pública');
        }
        anexo_url = f.url!;
        anexo_tipo = f.type || mime;
      }

      if (!texto && !anexo_url) throw new Error('Digite uma mensagem ou anexe uma imagem');

      setSending(true);
      try {
        const { data, error } = await supabase
          .from('os_chat_mensagens')
          .insert({
            os_id: osId,
            empresa_id: params.empresaId,
            autor_id: params.autorId,
            mensagem: texto,
            anexo_url,
            anexo_tipo,
          })
          .select(
            'id, empresa_id, os_id, autor_id, mensagem, anexo_url, anexo_tipo, created_at, autor:autor_id(id, nome)'
          )
          .single();
        if (error) throw error;
        const row = await enrichAutor(data as unknown as OsChatMensagem);
        knownIdsRef.current.add(row.id);
        setMensagens((prev) => {
          const next = prev.some((m) => m.id === row.id) ? prev : [...prev, row];
          return applyVistos(next, leiturasRef.current, meuIdRef.current);
        });
        await marcarLido();
        return row;
      } finally {
        setSending(false);
      }
    },
    [osId, marcarLido]
  );

  return {
    mensagens,
    leituras,
    loading,
    sending,
    conectado,
    erro,
    carregar,
    enviar,
    marcarLido,
  };
}

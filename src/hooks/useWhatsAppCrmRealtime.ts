'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { WhatsAppConversa, WhatsAppConversaNota, WhatsAppMensagem } from '@/lib/whatsapp-crm/types';

interface UseWhatsAppCrmRealtimeOptions {
  empresaId: string | null | undefined;
  onMensagemInsert: (msg: WhatsAppMensagem) => void;
  onMensagemUpdate: (msg: WhatsAppMensagem) => void;
  onNotaInsert: (nota: WhatsAppConversaNota) => void;
  onConversaChange: (conversa: WhatsAppConversa) => void;
  onConversaInsert: (conversa: WhatsAppConversa) => void;
}

/**
 * Realtime estável: callbacks via ref para não recriar o channel a cada render.
 */
export function useWhatsAppCrmRealtime({
  empresaId,
  onMensagemInsert,
  onMensagemUpdate,
  onNotaInsert,
  onConversaChange,
  onConversaInsert,
}: UseWhatsAppCrmRealtimeOptions) {
  const handlersRef = useRef({
    onMensagemInsert,
    onMensagemUpdate,
    onNotaInsert,
    onConversaChange,
    onConversaInsert,
  });

  handlersRef.current = {
    onMensagemInsert,
    onMensagemUpdate,
    onNotaInsert,
    onConversaChange,
    onConversaInsert,
  };

  useEffect(() => {
    if (!empresaId || typeof window === 'undefined' || !supabase?.channel) return;

    const channel = supabase
      .channel(`whatsapp_crm_${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `empresa_id=eq.${empresaId}`,
        },
        (payload) => {
          handlersRef.current.onMensagemInsert(payload.new as WhatsAppMensagem);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_mensagens',
          filter: `empresa_id=eq.${empresaId}`,
        },
        (payload) => {
          handlersRef.current.onMensagemUpdate(payload.new as WhatsAppMensagem);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_conversa_notas',
          filter: `empresa_id=eq.${empresaId}`,
        },
        (payload) => {
          handlersRef.current.onNotaInsert(payload.new as WhatsAppConversaNota);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_conversas',
          filter: `empresa_id=eq.${empresaId}`,
        },
        (payload) => {
          handlersRef.current.onConversaInsert(payload.new as WhatsAppConversa);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conversas',
          filter: `empresa_id=eq.${empresaId}`,
        },
        (payload) => {
          handlersRef.current.onConversaChange(payload.new as WhatsAppConversa);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [empresaId]);
}

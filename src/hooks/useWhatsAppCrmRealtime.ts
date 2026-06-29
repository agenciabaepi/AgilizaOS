'use client';

import { useEffect } from 'react';
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

export function useWhatsAppCrmRealtime({
  empresaId,
  onMensagemInsert,
  onMensagemUpdate,
  onNotaInsert,
  onConversaChange,
  onConversaInsert,
}: UseWhatsAppCrmRealtimeOptions) {
  useEffect(() => {
    if (!empresaId || typeof window === 'undefined' || !supabase?.channel) return;

    const channel = supabase
      .channel(`whatsapp_crm_${empresaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_mensagens' },
        (payload) => {
          const msg = payload.new as WhatsAppMensagem;
          if (msg.empresa_id !== empresaId) return;
          onMensagemInsert(msg);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_mensagens' },
        (payload) => {
          const msg = payload.new as WhatsAppMensagem;
          if (msg.empresa_id !== empresaId) return;
          onMensagemUpdate(msg);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_conversa_notas' },
        (payload) => {
          const nota = payload.new as WhatsAppConversaNota;
          if (nota.empresa_id !== empresaId) return;
          onNotaInsert(nota);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_conversas' },
        (payload) => {
          const conversa = payload.new as WhatsAppConversa;
          if (conversa.empresa_id !== empresaId) return;
          onConversaInsert(conversa);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversas' },
        (payload) => {
          const conversa = payload.new as WhatsAppConversa;
          if (conversa.empresa_id !== empresaId) return;
          onConversaChange(conversa);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    empresaId,
    onMensagemInsert,
    onMensagemUpdate,
    onNotaInsert,
    onConversaChange,
    onConversaInsert,
  ]);
}

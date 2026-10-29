import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { WHATSAPP_AUTOMATION_ENABLED } from '@/config/whatsapp-config';

/**
 * Hook para monitorar mudanças de status das OS e enviar notificações via N8N
 * 
 * NOTA: As notificações de nova OS e aprovação já são enviadas diretamente
 * nas APIs de criação e atualização. Este hook serve como monitor adicional
 * para mudanças de status que possam ocorrer por outras vias.
 */
export function useWhatsAppNotification() {
  const { empresaData } = useAuth();

  useEffect(() => {
    if (!WHATSAPP_AUTOMATION_ENABLED) {
      return;
    }

    if (!empresaData?.id) {
      return;
    }

    // Canal para monitorar mudanças de status das OS
    const channel = supabase
      .channel('n8n-status-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ordens_servico',
          filter: `empresa_id=eq.${empresaData.id}`
        },
        async (payload: any) => {
          try {
            const { old: oldOS, new: newOS } = payload;

            // Verificar se houve mudança de status
            const statusMudou = oldOS.status !== newOS.status;
            const statusTecnicoMudou = oldOS.status_tecnico !== newOS.status_tecnico;

            if (!statusMudou && !statusTecnicoMudou) {
              return;
            }

            // Notificar via N8N se necessário
            if (statusMudou || statusTecnicoMudou) {
              try {
                const response = await fetch('/api/n8n/status-change', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    os_id: newOS.id,
                    status_anterior: oldOS.status,
                    status_novo: newOS.status,
                    status_tecnico_anterior: oldOS.status_tecnico,
                    status_tecnico_novo: newOS.status_tecnico,
                    empresa_id: empresaData.id
                  }),
                });

                if (!response.ok) {
                  console.warn('⚠️ N8N: Falha ao enviar notificação de mudança de status');
                }
              } catch (error) {
                console.error('❌ N8N: Erro ao enviar notificação de mudança de status:', error);
              }
            }

          } catch (error) {
            console.error('❌ N8N: Erro ao processar mudança de status:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaData?.id]);

  return null;
}

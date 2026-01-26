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
    // ⚠️ VERIFICAÇÃO: Automações WhatsApp desativadas
    if (!WHATSAPP_AUTOMATION_ENABLED) {
      console.log('⚠️ WhatsApp automações desativadas - hook não será executado');
      return;
    }

    if (!empresaData?.id) {
      return;
    }

    console.log('📡 N8N: Iniciando monitoramento de mudanças de status das OS...');

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
            console.log('📡 N8N: Mudança de status detectada:', payload);
            const { old: oldOS, new: newOS } = payload;

            // Verificar se houve mudança de status
            const statusMudou = oldOS.status !== newOS.status;
            const statusTecnicoMudou = oldOS.status_tecnico !== newOS.status_tecnico;

            if (!statusMudou && !statusTecnicoMudou) {
              console.log('📡 N8N: Nenhuma mudança de status relevante detectada');
              return;
            }

            console.log('📡 N8N: Mudança de status detectada:', {
              statusAnterior: oldOS.status,
              statusNovo: newOS.status,
              statusTecnicoAnterior: oldOS.status_tecnico,
              statusTecnicoNovo: newOS.status_tecnico
            });

            // Notificar via N8N se necessário
            if (statusMudou || statusTecnicoMudou) {
              console.log('📡 N8N: Enviando notificação de mudança de status via N8N...');
              
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

                if (response.ok) {
                  console.log('✅ N8N: Notificação de mudança de status enviada com sucesso');
                } else {
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
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ N8N: Monitoramento de status ativo');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      console.log('📡 N8N: Monitoramento de status finalizado');
    };
  }, [empresaData?.id]);

  return null;
}

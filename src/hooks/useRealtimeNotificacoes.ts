'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import { playNotificationSound, createAudioActivationButton } from '@/utils/audioPlayer';
import { useAuth } from '@/context/AuthContext';

export function useRealtimeNotificacoes(empresaId?: string | null) {
  const { usuarioData } = useAuth();
  const { addToast, showModal } = useToast();
  const router = useRouter();
  
  // Verificar se estamos no browser
  const isBrowser = typeof window !== 'undefined';
  // Mantém o último ID visto para evitar duplicidade e permitir fallback por polling
  const lastSeenIdRef = useRef<{ empresaId?: string | null; lastId?: string | null; lastSeenTime?: number }>({ empresaId: null, lastId: null });
  const intervalsRef = useRef<Record<string, any>>({});
  const [notificacoesFixas, setNotificacoesFixas] = useState<any[]>([]);

  function shouldKeepAlerting(status?: string | null, statusTecnico?: string | null): boolean {
    // ✅ CORREÇÃO: Só alerta se orçamento pendente E status não indica conclusão
    const s = (status || '').toUpperCase();
    const st = (statusTecnico || '').toUpperCase();
    
    // Não alertar se status indica que já foi processado/finalizado
    const statusFinalizados = [
      'AGUARDANDO RETIRADA',
      'AGUARDANDO_RETIRADA', 
      'ENTREGUE',
      'FINALIZADA',
      'CONCLUIDA',
      'CONCLUÍDO',
      'CANCELADA'
    ];
    
    if (statusFinalizados.some(status => s.includes(status))) {
      return false;
    }
    
    // Só alerta se tem orçamento pendente
    if (st.includes('ORÇAMENTO')) return true;
    if (s.includes('ORÇAMENTO')) return true;
    if (s.includes('AGUARDANDO') && (s.includes('APROVACAO') || s.includes('APROVAÇÃO'))) return true;
    return false;
  }

  function buildPopupNode(params: { numero?: string | number; mensagem?: string; createdAt?: string }) {
    const { numero, mensagem, createdAt } = params;
    return (
      React.createElement('div', { className: 'space-y-3' },
        React.createElement('div', { className: 'rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 text-sm' }, 'Novo orçamento enviado pelo técnico'),
        numero ? React.createElement('div', { className: 'text-sm text-gray-800' }, `OS #${numero}`) : null,
        mensagem ? React.createElement('div', { className: 'text-sm text-gray-700' }, mensagem) : null,
        createdAt ? React.createElement('div', { className: 'text-xs text-gray-500' }, new Date(createdAt).toLocaleString('pt-BR')) : null,
      )
    );
  }

  function presentPopup(nova: any) {
    const mensagem = nova?.mensagem || 'Você recebeu uma nova notificação';
    const tipo = (nova?.tipo || '').toLowerCase();
    
    if (tipo.includes('reparo_concluido')) {
      // Notificação de reparo concluído - NÃO exibe toast, apenas adiciona à lista fixa
      // NÃO chama addToast aqui, pois será exibida como notificação fixa
    } else if (tipo.includes('laudo') || tipo.includes('orcamento')) {
      // ✅ Modal para orçamento enviado - APENAS para usuários atendentes
      const isAtendente = usuarioData?.nivel === 'atendente';
      
      if (!isAtendente) {
        console.log('🔔 [NOTIF] Modal de orçamento não exibida - usuário não é atendente');
        return;
      }
      
      console.log('🔔 [NOTIF] Exibindo modal de orçamento com som...');
      
      // Reproduzir som imediatamente
      playNotificationSound().then(success => {
        if (success) {
          console.log('✅ [NOTIF] Som reproduzido com sucesso!');
        } else {
          console.warn('⚠️ [NOTIF] Falha ao reproduzir som - criando botão de ativação');
          // Criar botão de ativação de áudio se o som falhar
          createAudioActivationButton();
        }
      }).catch(error => {
        console.error('❌ [NOTIF] Erro ao reproduzir som:', error);
        // Criar botão de ativação de áudio em caso de erro
        createAudioActivationButton();
      });
      
      addToast('info', mensagem);
      showModal({
        title: 'Orçamento aguardando aprovação',
        messageNode: buildPopupNode({ numero: nova?.numero_os, mensagem, createdAt: nova?.created_at }),
        confirmLabel: nova?.os_id ? 'Abrir OS' : 'Ok',
        onConfirm: () => {
          if (nova?.os_id) router.push(`/ordens/${nova.os_id}`);
        }
      });
    } else {
      // Notificação padrão
      addToast('info', mensagem);
    }
  }

  // ✅ OTIMIZADO: Busca notificações apenas quando necessário
  async function buscarNotificacoesFixas() {
    if (!empresaId || !isBrowser) return;
    
    try {
      // Verifica se o empresaId é um UUID válido
      if (!empresaId || empresaId === 'mock-empresa-id' || empresaId.length < 10) {
        return;
      }

      // ✅ DEBOUNCE: Buscar apenas a cada 5 segundos para evitar spam
      const now = Date.now();
      if (lastSeenIdRef.current.lastSeenTime && (now - lastSeenIdRef.current.lastSeenTime) < 5000) {
        return;
      }
      lastSeenIdRef.current.lastSeenTime = now;

      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'reparo_concluido')
        .order('created_at', { ascending: false })
        .limit(10); // ✅ LIMIT: Máximo 10 notificações
        
      if (error) {
        console.warn('⚠️ [NOTIF] Erro ao buscar notificações fixas:', error.message);
        return;
      }
      
      setNotificacoesFixas(data || []);
    } catch (error) {
      console.warn('⚠️ [NOTIF] Erro ao buscar notificações fixas:', error);
    }
  }

  // Marca notificação como cliente avisado
  async function marcarClienteAvisado(notificacaoId: string) {
    if (!isBrowser) return;
    
    try {
      const response = await fetch('/api/notificacoes/marcar-avisado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificacao_id: notificacaoId })
      });
      
      if (response.ok) {
        // Remove a notificação da lista local
        setNotificacoesFixas(prev => prev.filter(n => n.id !== notificacaoId));
        addToast('success', 'Cliente marcado como avisado!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('⚠️ [NOTIF] Erro na API ao marcar cliente avisado:', response.status, errorData);
        addToast('error', 'Erro ao marcar cliente como avisado');
      }
    } catch (error) {
      console.warn('⚠️ [NOTIF] Erro ao marcar cliente avisado:', error);
      addToast('error', 'Erro ao marcar cliente como avisado');
    }
  }

  function startReminderIfNeeded(osId?: string | null) {
    if (!osId || !isBrowser) return;
    if (intervalsRef.current[osId]) return; // já ativo
    
    console.log(`⏰ [NOTIF] Iniciando lembretes automáticos para OS ${osId} a cada 5 minutos`);
    
    intervalsRef.current[osId] = setInterval(async () => {
      try {
        console.log(`🔔 [NOTIF] Verificando status da OS ${osId}...`);
        
        const { data } = await supabase
          .from('ordens_servico')
          .select('status, status_tecnico, numero_os')
          .eq('id', osId)
          .single();
          
        if (!data) {
          console.log(`⚠️ [NOTIF] OS ${osId} não encontrada, parando lembretes`);
          clearInterval(intervalsRef.current[osId]);
          delete intervalsRef.current[osId];
          return;
        }
        
        if (shouldKeepAlerting(data.status as any, (data as any).status_tecnico)) {
          console.log(`🔔 [NOTIF] OS ${osId} ainda pendente, exibindo modal com som...`);
          presentPopup({ 
            tipo: 'orcamento_enviado', 
            os_id: osId, 
            numero_os: (data as any).numero_os, 
            mensagem: 'Orçamento enviado. Aguardando sua aprovação.' 
          });
        } else {
          console.log(`✅ [NOTIF] OS ${osId} não está mais pendente, parando lembretes`);
          clearInterval(intervalsRef.current[osId]);
          delete intervalsRef.current[osId];
        }
      } catch (error) {
        console.warn(`⚠️ [NOTIF] Erro ao verificar OS ${osId}:`, error);
      }
    }, 5 * 60 * 1000); // 5 minutos
  }

  useEffect(() => {
    if (!empresaId || !isBrowser) return;

    // Reset do controle quando trocar a empresa
    if (lastSeenIdRef.current.empresaId !== empresaId) {
      lastSeenIdRef.current = { empresaId, lastId: null };
    }

    // Verifica se o empresaId é válido antes de fazer subscribe
    if (!empresaId || empresaId === 'mock-empresa-id' || empresaId.length < 10) {
      return;
    }

    // --- Realtime via Supabase (sem filtro no canal; filtramos no handler para evitar incompatibilidades) ---
    let channel: any;
    if (isBrowser) {
      channel = supabase
        .channel(`notificacoes_realtime_${empresaId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload: any) => {
        const nova = (payload as any)?.new;
        if (!nova) return;
        
        if (nova.empresa_id !== empresaId) {
          return;
        }
        
        // Processa a nova notificação
        presentPopup(nova);
        
        // Se for notificação de reparo concluído, atualiza a lista fixa
        if (nova.tipo === 'reparo_concluido') {
          buscarNotificacoesFixas();
        }
      })
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            // Busca notificações existentes ao conectar
            buscarNotificacoesFixas();
          }
        });
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [empresaId, isBrowser]);

  // Cleanup dos intervals ao desmontar
  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  return {
    notificacoesFixas,
    marcarClienteAvisado,
    startReminderIfNeeded,
    buscarNotificacoesFixas
  };
}


'use client';

import { useState, useEffect, useRef } from 'react';
import { FiFileText, FiBell, FiEye, FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { playNotificationSound, unlockNotificationAudio } from '@/lib/playNotificationSound';

interface OSLaudoPronto {
  id: string;
  numero_os: string;
  cliente: string;
  tecnico: string;
  status_tecnico: string;
  created_at: string;
}

export default function LaudoProntoAlert() {
  const [laudosProntos, setLaudosProntos] = useState<OSLaudoPronto[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const router = useRouter();
  const { empresaData, usuarioData } = useAuth();
  const initialSyncDoneRef = useRef(false);
  const previousIdsRef = useRef<Set<string>>(new Set());

  const podeVerNotificacao = () => {
    if (!usuarioData?.nivel) return false;
    return usuarioData.nivel === 'admin' || usuarioData.nivel === 'atendente';
  };

  const fetchLaudosProntos = async () => {
    if (!empresaData?.id) return;

    const { data, error } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        created_at,
        status_tecnico,
        clientes:cliente_id(nome),
        tecnico:usuarios!tecnico_id(nome)
      `)
      .eq('empresa_id', empresaData.id)
      .in('status_tecnico', ['ORÇAMENTO CONCLUÍDO', 'AGUARDANDO APROVAÇÃO'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      const laudos = data
        .filter((os: any) => os.status_tecnico === 'ORÇAMENTO CONCLUÍDO')
        .map((os: any) => ({
          id: os.id,
          numero_os: os.numero_os,
          cliente: (os.clientes as any)?.nome || 'Cliente não identificado',
          tecnico: (os.tecnico as any)?.nome || 'Técnico não identificado',
          status_tecnico: os.status_tecnico,
          created_at: os.created_at
        }));

      const currentIds = new Set(laudos.map((l) => l.id));

      if (!initialSyncDoneRef.current) {
        initialSyncDoneRef.current = true;
        previousIdsRef.current = currentIds;
      } else {
        const novas = laudos.filter((os) => !previousIdsRef.current.has(os.id));
        if (novas.length > 0) {
          void playNotificationSound();
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 3000);
        }
        previousIdsRef.current = currentIds;
      }

      setLaudosProntos(laudos);
      setIsVisible(laudos.length > 0);
      setIsBlinking(laudos.length > 0);
    } else if (error) {
      console.error('Erro ao buscar laudos:', error);
    }
  };

  useEffect(() => {
    if (!empresaData?.id) return;

    initialSyncDoneRef.current = false;
    previousIdsRef.current = new Set();

    fetchLaudosProntos();

    const testChannel = supabase
      .channel('test_connection')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ordens_servico'
      }, () => {})
      .subscribe(() => {});

    const channel = supabase
      .channel('laudos_prontos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordens_servico',
          filter: `empresa_id=eq.${empresaData.id}`
        },
        () => {
          fetchLaudosProntos();
        }
      )
      .subscribe(() => {});

    return () => {
      supabase.removeChannel(testChannel);
      supabase.removeChannel(channel);
    };
  }, [empresaData?.id]);

  useEffect(() => {
    const unlock = () => {
      void unlockNotificationAudio();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    if (isBlinking) {
      const blinkInterval = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, 1000);
      return () => clearInterval(blinkInterval);
    }
  }, [isBlinking]);

  if (!podeVerNotificacao() || !isVisible || laudosProntos.length === 0) {
    return null;
  }

  return (
    <>
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 dark:bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg border border-emerald-700/30 dark:border-emerald-300/20 animate-bounce">
          <div className="flex items-center gap-2">
            <FiBell className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">Nova OS com orçamento concluído!</span>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-40 max-w-xs">
        <div
          className={`
          bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-600 rounded-xl shadow-xl dark:shadow-2xl dark:shadow-black/40
          transform transition-all duration-300 hover:shadow-2xl
          ${isBlinking ? 'ring-2 ring-blue-500 dark:ring-sky-400 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950' : ''}
        `}
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-zinc-600">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`
                p-1.5 bg-blue-50 dark:bg-blue-950/80 rounded-full shrink-0
                ${isBlinking ? 'animate-pulse' : ''}
              `}
              >
                <FiFileText className="w-4 h-4 text-blue-600 dark:text-sky-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-50 truncate">
                  Orçamentos Concluídos
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-400">
                  {laudosProntos.length} OS{laudosProntos.length > 1 ? 's' : ''} aguardando aprovação
                </p>
              </div>
            </div>
            <div
              className={`
              p-1 bg-red-50 dark:bg-red-950/60 rounded-full shrink-0
              ${isBlinking ? 'animate-ping' : ''}
            `}
            >
              <FiBell className="w-3 h-3 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
            {laudosProntos.slice(0, 3).map((os) => (
              <div
                key={os.id}
                className="bg-gray-50 dark:bg-zinc-800/90 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all cursor-pointer group border border-transparent dark:border-zinc-600/60"
                onClick={() => router.push(`/ordens/${os.id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                        OS #{os.numero_os}
                      </span>
                      <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-xs rounded-full font-medium border border-blue-200/80 dark:border-blue-700">
                        Concluído
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-zinc-300 truncate">{os.cliente}</p>
                  </div>
                  <FiArrowRight className="w-3 h-3 text-gray-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors shrink-0" />
                </div>
              </div>
            ))}

            {laudosProntos.length > 3 && (
              <div className="text-center py-1">
                <span className="text-xs text-gray-500 dark:text-zinc-400">
                  +{laudosProntos.length - 3} mais...
                </span>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-100 dark:border-zinc-600">
            <button
              type="button"
              onClick={() => router.push('/ordens')}
              className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 dark:hover:bg-blue-900/90 text-blue-800 dark:text-blue-200 text-xs font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 border border-blue-100 dark:border-blue-800"
            >
              <FiEye className="w-3 h-3" />
              Ver Todas
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

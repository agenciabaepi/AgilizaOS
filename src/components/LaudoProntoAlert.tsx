'use client';

import { useState, useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import { FiFileText, FiBell, FiEye, FiArrowRight, FiX } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { playNotificationSound, unlockNotificationAudio } from '@/lib/playNotificationSound';

const REMINDER_INTERVAL_MS = 5 * 60 * 1000;

type OSPendenciaTipo = 'orcamento' | 'sem_reparo';

interface OSPendencia {
  id: string;
  numero_os: string;
  cliente: string;
  tecnico: string;
  tipo: OSPendenciaTipo;
  created_at: string;
}

function normalizeStatus(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/_/g, ' ');
}

function isOsFinalizada(status?: string | null): boolean {
  const st = normalizeStatus(status);
  return [
    'AGUARDANDO RETIRADA',
    'ENTREGUE',
    'REPARO CONCLUIDO',
    'CONCLUIDA',
    'CONCLUIDO',
    'CANCELADA',
  ].some((s) => st.includes(s));
}

function isOrcamentoConcluido(statusTecnico?: string | null): boolean {
  const st = normalizeStatus(statusTecnico);
  return st.includes('ORCAMENTO CONCLUIDO');
}

function isSemReparoPendente(os: {
  status?: string | null;
  status_tecnico?: string | null;
  aparelho_sem_conserto?: boolean | null;
}): boolean {
  if (isOsFinalizada(os.status)) return false;
  const st = normalizeStatus(os.status_tecnico);
  if (st.includes('SEM REPARO')) return true;
  return os.aparelho_sem_conserto === true;
}

const STATUS_TECNICO_PENDENTES = [
  'ORÇAMENTO CONCLUÍDO',
  'AGUARDANDO APROVAÇÃO',
  'SEM REPARO',
  'SEM_REPARO',
] as const;

const SELECT_PENDENCIAS_BASE = `
  id,
  numero_os,
  created_at,
  status,
  status_tecnico,
  clientes:cliente_id(nome),
  tecnico:usuarios!tecnico_id(nome)
`;

function mergeOsPorId(primary: any[], extra: any[]): any[] {
  const byId = new Map<string, any>();
  for (const row of primary) byId.set(row.id, row);
  for (const row of extra) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

function processarPendencias(
  data: any[],
  openModalIfAllowed: (count: number, force?: boolean) => void,
  refs: {
    initialSyncDoneRef: MutableRefObject<boolean>;
    previousIdsRef: MutableRefObject<Set<string>>;
    dismissedAtRef: MutableRefObject<number | null>;
  },
  setPendencias: (items: OSPendencia[]) => void,
  setModalOpen: (open: boolean) => void
) {
  const itens = data
    .map((os: any) => mapOsParaPendencia(os))
    .filter((os): os is OSPendencia => os !== null);

  const currentIds = new Set(itens.map((l) => l.id));

  if (!refs.initialSyncDoneRef.current) {
    refs.initialSyncDoneRef.current = true;
    refs.previousIdsRef.current = currentIds;
    openModalIfAllowed(itens.length);
  } else {
    const novas = itens.filter((os) => !refs.previousIdsRef.current.has(os.id));
    if (novas.length > 0) {
      void playNotificationSound();
      openModalIfAllowed(itens.length, true);
    } else {
      openModalIfAllowed(itens.length);
    }
    refs.previousIdsRef.current = currentIds;
  }

  setPendencias(itens);
  if (itens.length === 0) {
    setModalOpen(false);
    refs.dismissedAtRef.current = null;
  }
}

function mapOsParaPendencia(os: any): OSPendencia | null {
  if (isOsFinalizada(os.status)) return null;

  const semReparo = isSemReparoPendente(os);
  const orcamento = isOrcamentoConcluido(os.status_tecnico);

  if (!semReparo && !orcamento) return null;

  return {
    id: os.id,
    numero_os: os.numero_os,
    cliente: (os.clientes as any)?.nome || 'Cliente não identificado',
    tecnico: (os.tecnico as any)?.nome || 'Técnico não identificado',
    tipo: semReparo ? 'sem_reparo' : 'orcamento',
    created_at: os.created_at,
  };
}

export default function LaudoProntoAlert() {
  const [pendencias, setPendencias] = useState<OSPendencia[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const { empresaData, usuarioData } = useAuth();
  const initialSyncDoneRef = useRef(false);
  const previousIdsRef = useRef<Set<string>>(new Set());
  const dismissedAtRef = useRef<number | null>(null);
  const laudosCountRef = useRef(0);
  const modalOpenRef = useRef(false);

  useEffect(() => {
    modalOpenRef.current = modalOpen;
  }, [modalOpen]);

  useEffect(() => {
    laudosCountRef.current = pendencias.length;
  }, [pendencias.length]);

  const podeVerNotificacao = useCallback(() => {
    if (!usuarioData?.nivel) return false;
    return usuarioData.nivel === 'admin' || usuarioData.nivel === 'atendente';
  }, [usuarioData?.nivel]);

  const shouldShowModal = useCallback((count: number, force = false) => {
    if (count <= 0) return false;
    if (force) return true;
    if (dismissedAtRef.current === null) return true;
    return Date.now() - dismissedAtRef.current >= REMINDER_INTERVAL_MS;
  }, []);

  const openModalIfAllowed = useCallback((count: number, force = false) => {
    if (shouldShowModal(count, force)) {
      setModalOpen(true);
    }
  }, [shouldShowModal]);

  const handleClose = useCallback(() => {
    dismissedAtRef.current = Date.now();
    setModalOpen(false);
  }, []);

  const fetchLaudosProntos = useCallback(async () => {
    if (!empresaData?.id) return;

    const refs = { initialSyncDoneRef, previousIdsRef, dismissedAtRef };

    const runQuery = (selectFields: string) =>
      supabase
        .from('ordens_servico')
        .select(selectFields)
        .eq('empresa_id', empresaData.id)
        .in('status_tecnico', [...STATUS_TECNICO_PENDENTES])
        .order('created_at', { ascending: false });

    let hasAparelhoSemConsertoCol = true;
    let result = await runQuery(`${SELECT_PENDENCIAS_BASE}, aparelho_sem_conserto`);

    if (
      result.error &&
      typeof result.error.message === 'string' &&
      result.error.message.includes('aparelho_sem_conserto')
    ) {
      hasAparelhoSemConsertoCol = false;
      result = await runQuery(SELECT_PENDENCIAS_BASE);
    }

    if (result.error) {
      console.error(
        'Erro ao buscar pendências do técnico:',
        result.error.message || JSON.stringify(result.error)
      );
      return;
    }

    let rows = result.data || [];

    if (hasAparelhoSemConsertoCol) {
      const extra = await supabase
        .from('ordens_servico')
        .select(`${SELECT_PENDENCIAS_BASE}, aparelho_sem_conserto`)
        .eq('empresa_id', empresaData.id)
        .eq('aparelho_sem_conserto', true)
        .order('created_at', { ascending: false });

      if (!extra.error && extra.data) {
        rows = mergeOsPorId(rows, extra.data);
      }
    }

    processarPendencias(rows, openModalIfAllowed, refs, setPendencias, setModalOpen);
  }, [empresaData?.id, openModalIfAllowed]);

  useEffect(() => {
    if (!empresaData?.id || !podeVerNotificacao()) return;

    initialSyncDoneRef.current = false;
    previousIdsRef.current = new Set();
    dismissedAtRef.current = null;

    void fetchLaudosProntos();

    const channel = supabase
      .channel('laudos_prontos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ordens_servico',
          filter: `empresa_id=eq.${empresaData.id}`,
        },
        () => {
          void fetchLaudosProntos();
        }
      )
      .subscribe(() => {});

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaData?.id, podeVerNotificacao, fetchLaudosProntos]);

  useEffect(() => {
    if (!podeVerNotificacao()) return;

    const reminderTimer = window.setInterval(() => {
      if (modalOpenRef.current) return;
      const count = laudosCountRef.current;
      if (count <= 0 || dismissedAtRef.current === null) return;
      if (Date.now() - dismissedAtRef.current < REMINDER_INTERVAL_MS) return;

      setModalOpen(true);
      dismissedAtRef.current = Date.now();
      void playNotificationSound();
    }, 60_000);

    return () => window.clearInterval(reminderTimer);
  }, [podeVerNotificacao]);

  useEffect(() => {
    const unlock = () => {
      void unlockNotificationAudio();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  if (!podeVerNotificacao() || !modalOpen || pendencias.length === 0) {
    return null;
  }

  const totalOrcamentos = pendencias.filter((os) => os.tipo === 'orcamento').length;
  const totalSemReparo = pendencias.filter((os) => os.tipo === 'sem_reparo').length;
  const temSemReparo = totalSemReparo > 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orcamento-concluido-title"
      >
        <button
          type="button"
          aria-label="Fechar"
          className="absolute right-3 top-3 p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={handleClose}
        >
          <FiX className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {totalOrcamentos > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/80 px-3 py-1 text-xs font-medium text-blue-800 dark:text-blue-200">
                <FiBell className="w-3.5 h-3.5" />
                {totalOrcamentos} orçamento{totalOrcamentos > 1 ? 's' : ''} aguardando aprovação
              </div>
            )}
            {totalSemReparo > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/80 px-3 py-1 text-xs font-medium text-red-800 dark:text-red-200">
                <FiBell className="w-3.5 h-3.5" />
                {totalSemReparo} sem reparo
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 pr-6">
            <div className={`p-2 rounded-full shrink-0 ${temSemReparo ? 'bg-red-50 dark:bg-red-950/80' : 'bg-blue-50 dark:bg-blue-950/80'}`}>
              <FiFileText className={`w-5 h-5 ${temSemReparo ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-sky-300'}`} />
            </div>
            <div className="min-w-0">
              <h2 id="orcamento-concluido-title" className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                Pendências do técnico
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
                {pendencias.length} OS{pendencias.length > 1 ? 's' : ''} aguardando sua ação
                {totalOrcamentos > 0 && totalSemReparo > 0
                  ? ': orçamentos para aprovar e aparelhos sem reparo para tratar com o cliente.'
                  : totalSemReparo > 0
                    ? ' com aparelho sem reparo informado pelo técnico.'
                    : ' com orçamento enviado pelo técnico.'}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2 max-h-56 overflow-y-auto rounded-xl border border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 p-3">
            {pendencias.slice(0, 5).map((os) => {
              const semReparo = os.tipo === 'sem_reparo';
              return (
              <button
                key={os.id}
                type="button"
                className={`w-full text-left rounded-lg p-3 transition-colors group border ${
                  semReparo
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-950/60'
                    : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
                onClick={() => {
                  router.push(`/ordens/${os.id}`);
                  handleClose();
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-sm font-semibold truncate ${semReparo ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-zinc-100'}`}>
                        OS #{os.numero_os}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                          semReparo
                            ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
                        }`}
                      >
                        {semReparo ? 'Sem reparo' : 'Concluído'}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${semReparo ? 'text-red-800 dark:text-red-200' : 'text-gray-700 dark:text-zinc-300'}`}>
                      {os.cliente}
                    </p>
                    <p className={`text-xs truncate ${semReparo ? 'text-red-700/80 dark:text-red-300/80' : 'text-gray-500 dark:text-zinc-500'}`}>
                      Técnico: {os.tecnico}
                    </p>
                  </div>
                  <FiArrowRight
                    className={`w-4 h-4 transition-colors shrink-0 ${
                      semReparo
                        ? 'text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300'
                        : 'text-gray-400 group-hover:text-blue-600 dark:group-hover:text-sky-400'
                    }`}
                  />
                </div>
              </button>
            );
            })}

            {pendencias.length > 5 && (
              <p className="text-center text-xs text-gray-500 dark:text-zinc-400 py-1">
                +{pendencias.length - 5} mais...
              </p>
            )}
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-zinc-500 text-center">
            Este lembrete voltará em 5 minutos enquanto houver pendências.
          </p>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
              onClick={handleClose}
            >
              Fechar
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
              onClick={() => {
                router.push('/ordens');
                handleClose();
              }}
            >
              <FiEye className="w-4 h-4" />
              Ver todas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

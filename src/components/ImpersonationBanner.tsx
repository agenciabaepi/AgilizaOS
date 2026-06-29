'use client';

import { useCallback, useEffect, useState } from 'react';
import { exitImpersonationClient } from '@/lib/impersonation-client';
import { FiLogOut, FiShield } from 'react-icons/fi';

type ImpersonationStatus = {
  active: boolean;
  targetNome?: string;
  targetEmail?: string;
  empresaNome?: string;
};

export default function ImpersonationBanner() {
  const [status, setStatus] = useState<ImpersonationStatus>({ active: false });
  const [exiting, setExiting] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-saas/impersonate/status', {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.ok && json.active) {
        setStatus({
          active: true,
          targetNome: json.targetNome,
          targetEmail: json.targetEmail,
          empresaNome: json.empresaNome,
        });
      } else {
        setStatus({ active: false });
      }
    } catch {
      setStatus({ active: false });
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  async function sairImpersonation() {
    if (!window.confirm('Encerrar impersonation e voltar ao painel admin?')) return;
    setExiting(true);
    try {
      await exitImpersonationClient();
      const res = await fetch('/api/admin-saas/impersonate/exit', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Falha ao sair');
      }
      window.location.href = json.redirect || '/admin-saas';
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao encerrar impersonation');
      setExiting(false);
    }
  }

  if (!status.active) return null;

  return (
    <div
      className="sticky top-0 z-[70] flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-sm border-b border-indigo-200 bg-indigo-600 text-white shadow-md"
      role="status"
      aria-live="polite"
    >
      <FiShield className="shrink-0" size={16} aria-hidden />
      <span className="text-center">
        Modo suporte: você está vendo o sistema como{' '}
        <strong className="font-semibold">{status.targetNome || status.targetEmail}</strong>
        {status.empresaNome ? (
          <>
            {' '}
            (<span className="font-medium">{status.empresaNome}</span>)
          </>
        ) : null}
      </span>
      <button
        type="button"
        onClick={sairImpersonation}
        disabled={exiting}
        className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25 disabled:opacity-60 transition-colors"
      >
        <FiLogOut size={14} />
        {exiting ? 'Saindo...' : 'Sair e voltar ao admin'}
      </button>
    </div>
  );
}

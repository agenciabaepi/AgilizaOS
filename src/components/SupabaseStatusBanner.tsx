'use client';

import { useState, useEffect, useCallback } from 'react';

const POLL_INTERVAL_MS = 120000; // 2 minutos
const STATUS_API = '/api/supabase-status';

interface StatusResponse {
  ok: boolean;
  indicator: string;
  description: string;
  url: string;
}

export default function SupabaseStatusBanner() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [visible, setVisible] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(STATUS_API, { cache: 'no-store' });
      const data: StatusResponse = await res.json().catch(() => ({
        ok: false,
        indicator: 'unknown',
        description: 'Status indisponível',
        url: 'https://status.supabase.com',
      }));
      setStatus(data);
      setVisible(!data.ok);
    } catch {
      setStatus({
        ok: false,
        indicator: 'unknown',
        description: 'Erro ao verificar status do banco de dados',
        url: 'https://status.supabase.com',
      });
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (!visible || !status) return null;

  const isCritical = status.indicator === 'critical' || status.indicator === 'major';
  const bg = isCritical ? '#FEE2E2' : '#FEF3C7'; // red-100 : amber-100
  const border = isCritical ? '#FECACA' : '#FDE68A';
  const text = isCritical ? '#991B1B' : '#92400E';
  const link = status.url;

  // Mensagem simples para o usuário leigo (evita termos técnicos e texto em inglês)
  const mensagemUsuario =
    'O sistema está com instabilidade no momento. Algumas telas podem demorar ou não carregar. A equipe do provedor já está trabalhando para normalizar.';

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: bg,
        color: text,
        borderBottom: `2px solid ${border}`,
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
      role="alert"
    >
      <span>
        <strong>Atenção:</strong> {mensagemUsuario}
      </span>
      {' — '}
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: text, textDecoration: 'underline', fontWeight: 600 }}
      >
        Ver atualizações
      </a>
    </div>
  );
}

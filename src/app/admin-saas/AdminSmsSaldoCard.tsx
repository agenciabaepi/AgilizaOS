'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiMessageCircle } from 'react-icons/fi';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminSmsSaldoCard() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimativa, setEstimativa] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin-saas/sms/saldo', {
          cache: 'no-store',
          credentials: 'include',
        });
        const json = await res.json();
        if (!cancelled && res.ok && json.ok && typeof json.saldo === 'number') {
          setSaldo(json.saldo);
          setEstimativa(
            typeof json.smsRestantesEstimados === 'number' ? json.smsRestantesEstimados : null
          );
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const low = typeof saldo === 'number' && saldo > 0 && saldo < 1.5;
  const zero = typeof saldo === 'number' && saldo <= 0;

  return (
    <Link
      href="/admin-saas/sms"
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow block"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`h-12 w-12 rounded-lg flex items-center justify-center ${
            zero ? 'bg-red-50' : low ? 'bg-amber-50' : 'bg-emerald-50'
          }`}
        >
          <FiMessageCircle
            className={zero ? 'text-red-600' : low ? 'text-amber-600' : 'text-emerald-600'}
            size={22}
          />
        </div>
      </div>
      <div className="text-sm font-medium text-gray-600 mb-1">Saldo SMS</div>
      <div className="text-3xl font-bold text-gray-900 tabular-nums">
        {loading ? '…' : typeof saldo === 'number' ? formatBRL(saldo) : '—'}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {typeof estimativa === 'number'
          ? `≈ ${estimativa} SMS · Gerenciar`
          : 'Configurar saldo'}
      </p>
    </Link>
  );
}

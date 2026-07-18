'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiMessageSquare,
  FiRefreshCw,
  FiExternalLink,
  FiAlertCircle,
  FiDollarSign,
} from 'react-icons/fi';
import { formatarDataAdmin } from '@/lib/user-verification-tracking';

type SmsEnvio = {
  id: string;
  telefone: string;
  proposito: string;
  sms_id?: number | null;
  cost?: number | null;
  blocks_used?: number | null;
  sucesso: boolean;
  erro?: string | null;
  created_at: string;
};

type SaldoResponse = {
  ok: boolean;
  configured?: boolean;
  tableReady?: boolean;
  saldoReady?: boolean;
  saldo?: number | null;
  saldoFonte?: 'brasilsms' | 'local' | string;
  saldoAtualizadoEm?: string | null;
  saldoAtualizadoPor?: string | null;
  smsRestantesEstimados?: number;
  message?: string;
  totalEnviados?: number;
  totalCusto?: number;
  totalFalhas?: number;
  ultimoEnvio?: SmsEnvio | null;
  saldoNota?: string;
  saldoApiDisponivel?: boolean;
  dashboardError?: string | null;
  brasilsms?: {
    totalSent: number;
    sentToday: number;
    successRate: number;
    pendingSMS: number;
    failedSMS: number;
  } | null;
  painelUrl?: string;
  recentes?: SmsEnvio[];
};

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminSmsPage() {
  const [data, setData] = useState<SaldoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saldoInput, setSaldoInput] = useState('');
  const [savingSaldo, setSavingSaldo] = useState(false);
  const [saldoMsg, setSaldoMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin-saas/sms/saldo', {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = (await res.json()) as SaldoResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao carregar dados de SMS');
      }
      setData(json);
      if (typeof json.saldo === 'number') {
        setSaldoInput(json.saldo.toFixed(2).replace('.', ','));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvarSaldo(e: React.FormEvent) {
    e.preventDefault();
    setSavingSaldo(true);
    setSaldoMsg(null);
    try {
      const res = await fetch('/api/admin-saas/sms/saldo', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saldo: saldoInput }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao salvar saldo');
      }
      setSaldoMsg('Saldo atualizado com sucesso.');
      await carregar();
    } catch (err) {
      setSaldoMsg(err instanceof Error ? err.message : 'Erro ao salvar saldo');
    } finally {
      setSavingSaldo(false);
    }
  }

  const saldoBaixo =
    typeof data?.saldo === 'number' && data.saldo > 0 && data.saldo < 1.5;
  const saldoZerado = typeof data?.saldo === 'number' && data.saldo <= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SMS — BrasilSMS</h1>
          <p className="text-sm text-gray-500 mt-1">
            Saldo de créditos, confirmação de cadastro e histórico de envios.
          </p>
        </div>
        <button
          type="button"
          onClick={carregar}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {loading && !data ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : data ? (
        <>
          {/* Saldo em destaque */}
          <div
            className={`rounded-xl border p-6 ${
              saldoZerado
                ? 'bg-red-50 border-red-200'
                : saldoBaixo
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div
                  className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                    saldoZerado
                      ? 'bg-red-100'
                      : saldoBaixo
                        ? 'bg-amber-100'
                        : 'bg-emerald-100'
                  }`}
                >
                  <FiDollarSign
                    className={
                      saldoZerado
                        ? 'text-red-700'
                        : saldoBaixo
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                    }
                    size={22}
                  />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Saldo SMS disponível
                  </div>
                  <div className="mt-1 text-4xl font-bold text-gray-900 tabular-nums">
                    {typeof data.saldo === 'number' ? formatBRL(data.saldo) : '—'}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {typeof data.smsRestantesEstimados === 'number'
                      ? `≈ ${data.smsRestantesEstimados} SMS restantes (R$ 0,15/un.)`
                      : 'Saldo indisponível'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.saldoFonte === 'brasilsms'
                      ? 'Sincronizado com a BrasilSMS'
                      : data.saldoAtualizadoPor
                        ? `Fonte: ${data.saldoAtualizadoPor}`
                        : 'Fonte local'}
                    {data.saldoAtualizadoEm
                      ? ` · ${formatarDataAdmin(data.saldoAtualizadoEm)}`
                      : ''}
                  </p>
                </div>
              </div>

              <form onSubmit={salvarSaldo} className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Atualizar saldo (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 10,50"
                    value={saldoInput}
                    onChange={(e) => setSaldoInput(e.target.value)}
                    className="w-full sm:w-40 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingSaldo || !saldoInput.trim()}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {savingSaldo ? 'Salvando...' : 'Salvar saldo'}
                </button>
                {data.painelUrl ? (
                  <a
                    href={data.painelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    Ver no BrasilSMS <FiExternalLink size={12} />
                  </a>
                ) : null}
              </form>
            </div>
            {saldoMsg ? (
              <p
                className={`mt-3 text-sm ${
                  saldoMsg.includes('sucesso') ? 'text-emerald-800' : 'text-red-700'
                }`}
              >
                {saldoMsg}
              </p>
            ) : null}
            {!data.saldoApiDisponivel && data.dashboardError ? (
              <p className="mt-3 text-sm text-amber-800 flex items-center gap-1.5">
                <FiAlertCircle size={14} />
                Não foi possível ler o saldo na API: {data.dashboardError}. Use o campo ao lado
                como fallback.
              </p>
            ) : (
              <p className="mt-3 text-xs text-gray-600">{data.saldoNota}</p>
            )}
            {data.brasilsms ? (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-white/70 rounded-lg px-3 py-2">
                  <div className="text-xs text-gray-500">Enviados hoje</div>
                  <div className="font-semibold text-gray-900">{data.brasilsms.sentToday}</div>
                </div>
                <div className="bg-white/70 rounded-lg px-3 py-2">
                  <div className="text-xs text-gray-500">Total envios</div>
                  <div className="font-semibold text-gray-900">{data.brasilsms.totalSent}</div>
                </div>
                <div className="bg-white/70 rounded-lg px-3 py-2">
                  <div className="text-xs text-gray-500">Taxa sucesso</div>
                  <div className="font-semibold text-gray-900">{data.brasilsms.successRate}%</div>
                </div>
                <div className="bg-white/70 rounded-lg px-3 py-2">
                  <div className="text-xs text-gray-500">Falhas</div>
                  <div className="font-semibold text-gray-900">{data.brasilsms.failedSMS}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">API</div>
              <div className="mt-2 text-xl font-semibold text-gray-900">
                {data.configured ? 'Configurada' : 'Sem token'}
              </div>
              <p className="text-xs text-gray-500 mt-1">BRASILSMS_API_TOKEN</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                SMS enviados
              </div>
              <div className="mt-2 text-xl font-semibold text-gray-900">
                {(data.totalEnviados ?? 0).toLocaleString('pt-BR')}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Custo acumulado
              </div>
              <div className="mt-2 text-xl font-semibold text-gray-900">
                {formatBRL(data.totalCusto ?? 0)}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Falhas</div>
              <div className="mt-2 text-xl font-semibold text-gray-900">
                {(data.totalFalhas ?? 0).toLocaleString('pt-BR')}
              </div>
            </div>
          </div>

          {!data.tableReady ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-600">
              {data.message}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <FiMessageSquare className="text-emerald-700" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Últimos envios</h2>
                  <p className="text-sm text-gray-500">Histórico recente de SMS de verificação</p>
                </div>
              </div>

              {(data.recentes || []).length === 0 ? (
                <p className="text-sm text-gray-500 py-2">Nenhum SMS registrado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Telefone</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Custo</th>
                        <th className="px-3 py-2">SMS ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(data.recentes || []).map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/80">
                          <td className="px-3 py-3 tabular-nums text-gray-600">
                            {formatarDataAdmin(r.created_at)}
                          </td>
                          <td className="px-3 py-3 font-mono text-gray-800">{r.telefone}</td>
                          <td className="px-3 py-3">
                            {r.sucesso ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                OK
                              </span>
                            ) : (
                              <span
                                className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                                title={r.erro || undefined}
                              >
                                Falha
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 tabular-nums">
                            {r.cost != null ? formatBRL(Number(r.cost)) : '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-500">{r.sms_id ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500">
            <Link href="/admin-saas" className="underline hover:text-gray-800">
              Voltar ao dashboard
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}

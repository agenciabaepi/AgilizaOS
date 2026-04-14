'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import AuthGuardFinal from '@/components/AuthGuardFinal';
import { Button } from '@/components/Button';
import { FiCreditCard, FiCheckCircle, FiClock, FiRefreshCw, FiArrowRight, FiX } from 'react-icons/fi';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import PixQRCode from '@/components/PixQRCode';
import { useSubscription, dispatchAssinaturaUpdated } from '@/hooks/useSubscription';

/** Cobrança vinda do Asaas (API cobrancas-asaas) */
interface CobrancaAsaas {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  paymentDate?: string;
  description?: string;
  billingType?: string;
}

/** Registro da nossa tabela pagamentos (API assinatura/pagamentos) */
interface Pagamento {
  id: string;
  empresa_id: string;
  mercadopago_payment_id: string;
  status: string;
  valor: number;
  created_at: string;
  paid_at: string | null;
}

/** Item unificado para exibição (Asaas ou DB) */
type ItemAssinatura = CobrancaAsaas | (Pagamento & { _from?: 'db' });
function isAsaas(item: ItemAssinatura): item is CobrancaAsaas {
  return 'value' in item && 'dueDate' in item;
}
function getValor(item: ItemAssinatura): number {
  return isAsaas(item) ? item.value : item.valor;
}
function getStatus(item: ItemAssinatura): string {
  return item.status || 'PENDING';
}
/** Igual ao backend: período de acesso após confirmação do pagamento */
const DIAS_ACESSO_APOS_PAGAMENTO = 30;

function parseFirstCalendarDate(iso: string): Date | null {
  const s = String(iso).trim();
  const head = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) {
    const [y, m, d] = head[1].split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Retorna YYYY-MM-DD (dia civil local) após somar `dias`. */
function addCalendarDaysFromIso(iso: string, dias: number): string | null {
  const base = parseFirstCalendarDate(iso);
  if (!base) return null;
  const out = new Date(base);
  out.setDate(out.getDate() + dias);
  const y = out.getFullYear();
  const mo = String(out.getMonth() + 1).padStart(2, '0');
  const da = String(out.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function getDataPagamento(item: ItemAssinatura): string | null {
  if (isAsaas(item)) return item.paymentDate || null;
  return item.paid_at || null;
}

function isPendente(item: ItemAssinatura): boolean {
  const s = (getStatus(item) || '').toUpperCase();
  const pagavel = s === 'PENDING' || s === 'OVERDUE';
  return !!pagavel && !getDataPagamento(item);
}

function cobrancaFoiPaga(item: ItemAssinatura): boolean {
  if (isPendente(item)) return false;
  if (getDataPagamento(item)) return true;
  const s = (getStatus(item) || '').toLowerCase();
  return ['confirmed', 'received', 'approved', 'pago'].includes(s);
}

/**
 * Data mostrada na 1ª coluna: pendente = vencimento da cobrança (Asaas);
 * pago = último dia do período de 30 dias após o pagamento (igual `proxima_cobranca` no sistema).
 */
function getDataVencimentoLista(item: ItemAssinatura): string | null {
  const pago = cobrancaFoiPaga(item);
  if (isAsaas(item)) {
    if (pago) {
      const base = item.paymentDate || item.dueDate;
      if (!base) return item.dueDate || null;
      return (
        addCalendarDaysFromIso(base, DIAS_ACESSO_APOS_PAGAMENTO) ||
        item.dueDate ||
        null
      );
    }
    return item.dueDate || null;
  }
  const pg = item as Pagamento & { _from?: 'db' };
  if (pago && pg.paid_at) {
    return addCalendarDaysFromIso(pg.paid_at, DIAS_ACESSO_APOS_PAGAMENTO) || null;
  }
  return pg.created_at || null;
}

/** ID da cobrança no Asaas (para obter QR PIX de cobrança existente) */
function getPaymentId(item: ItemAssinatura): string {
  return isAsaas(item) ? item.id : (item as Pagamento).mercadopago_payment_id;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

/** Formata apenas data (dd/MM/yyyy) para evitar erro de fuso em datas do Asaas (YYYY-MM-DD) */
function formatarDataShort(iso: string | null) {
  if (!iso) return '—';
  const s = String(iso).trim();
  const onlyDate = /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (onlyDate) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Formata data e hora quando há horário; senão só data */
function formatarData(iso: string | null) {
  if (!iso) return '—';
  const s = String(iso).trim();
  const onlyDate = /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (onlyDate) return formatarDataShort(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'confirmed' || s === 'received' || s === 'pago') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
        <FiCheckCircle /> Pago
      </span>
    );
  }
  if (s === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
        <FiClock /> Pendente
      </span>
    );
  }
  if (s === 'rejected' || s === 'cancelled' || s === 'deleted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
        Falhou/Cancelado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
      {status || '—'}
    </span>
  );
}

function diasRestantes(proximaCobranca: string | null): number | null {
  if (!proximaCobranca) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prox = new Date(proximaCobranca);
  prox.setHours(0, 0, 0, 0);
  const diff = Math.ceil((prox.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function AssinaturaPage() {
  const { empresaData } = useAuth();
  const { assinatura } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<ItemAssinatura[]>([]);
  const [total, setTotal] = useState(0);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [pagarPixItem, setPagarPixItem] = useState<{ paymentId: string; valor: number } | null>(null);

  const carregar = useCallback(async () => {
    if (!empresaData?.id) return;
    setLoading(true);
    setErroCarregar(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const headers = { 'Content-Type': 'application/json', ...authHeader } as HeadersInit;
      const opts = { cache: 'no-store' as RequestCache, headers, credentials: 'include' as RequestCredentials };

      // Buscar cobranças do Asaas (painel Asaas = mesma empresa por e-mail)
      const resAsaas = await fetch('/api/assinatura/cobrancas-asaas', opts);
      const jsonAsaas = await resAsaas.json();
      if (resAsaas.ok && Array.isArray(jsonAsaas.items)) {
        let lista: ItemAssinatura[] = jsonAsaas.items;
        if (filtroStatus) {
          const s = filtroStatus.toLowerCase();
          lista = lista.filter((p) => (p.status || '').toLowerCase() === s);
        }
        setItens(lista);
        setTotal(lista.length);
        return;
      }
      // Se Asaas falhar, tentar só nossa tabela
      const resDb = await fetch(`/api/assinatura/pagamentos?page=1&pageSize=100${filtroStatus ? `&status=${filtroStatus}` : ''}`, opts);
      const jsonDb = await resDb.json();
      if (!resDb.ok) throw new Error(jsonDb?.error || 'Erro ao carregar pagamentos');
      const listaDb = (jsonDb.items || []).map((p: Pagamento) => ({ ...p, _from: 'db' as const }));
      setItens(listaDb);
      setTotal(jsonDb.total ?? 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar pagamentos';
      setErroCarregar(msg);
      setItens([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [empresaData?.id, filtroStatus]);

  useEffect(() => {
    if (empresaData?.id) carregar();
  }, [empresaData?.id, carregar]);

  /** Uma vez por empresa: alinha vencimento no Supabase com o último PIX pago no Asaas (rota antes quebrada). */
  useEffect(() => {
    if (!empresaData?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        const res = await fetch('/api/assinatura/sincronizar', {
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeader },
        });
        if (!cancelled && res.ok) dispatchAssinaturaUpdated();
      } catch {
        /* silencioso */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empresaData?.id]);

  const pendentes = itens.filter((p) => {
    const s = (getStatus(p) || '').toLowerCase();
    return s === 'pending' || !getDataPagamento(p);
  });

  const statusCanceladoOuInativo = assinatura?.status && ['cancelled', 'expired', 'suspended'].includes(assinatura.status);
  const diasRest = !statusCanceladoOuInativo && assinatura?.proxima_cobranca
    ? diasRestantes(assinatura.proxima_cobranca)
    : null;

  const labelStatus = assinatura?.status === 'active'
    ? 'Ativa'
    : assinatura?.status === 'trial'
      ? 'Trial'
      : assinatura?.status === 'cancelled'
        ? 'Cancelada'
        : assinatura?.status === 'expired'
          ? 'Expirada'
          : assinatura?.status === 'suspended'
            ? 'Suspensa'
            : assinatura?.status || '—';

  return (
    <AuthGuardFinal>
      <MenuLayout>
        <div className="max-w-4xl mx-auto py-6 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FiCreditCard className="text-gray-600 dark:text-gray-400" />
                Assinatura
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Histórico de pagamentos da sua assinatura
              </p>
            </div>
            <Link href="/planos/renovar">
              <Button className="flex items-center gap-2">
                Renovar assinatura
                <FiArrowRight size={16} />
              </Button>
            </Link>
          </div>

          {/* Resumo da assinatura (vencimento e dias restantes) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Próximo vencimento</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {statusCanceladoOuInativo ? '—' : (assinatura?.proxima_cobranca ? formatarDataShort(assinatura.proxima_cobranca) : '—')}
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Dias restantes</p>
              <p className={`text-xl font-bold mt-1 ${
                statusCanceladoOuInativo ? 'text-gray-600 dark:text-gray-400' :
                (diasRest ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {statusCanceladoOuInativo
                  ? (assinatura?.status === 'cancelled' ? 'Cancelada' : '—')
                  : (diasRest != null
                    ? (diasRest >= 0 ? `${diasRest} dias` : 'Vencida')
                    : '—')}
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Status da assinatura</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {labelStatus}
              </p>
            </div>
          </div>

          {/* Resumo de cobranças */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de pagamentos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{total}</p>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes (esta página)</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendentes.length}</p>
            </div>
          </div>

          {/* Filtro */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="CONFIRMED">Confirmados</option>
              <option value="RECEIVED">Recebidos</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const authHeader = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
                  const res = await fetch('/api/assinatura/sincronizar', {
                    cache: 'no-store',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', ...authHeader },
                  });
                  if (res.ok) dispatchAssinaturaUpdated();
                } catch {
                  /* segue para recarregar lista */
                }
                carregar();
              }}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </Button>
          </div>

          {/* Tabela */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
            {erroCarregar ? (
              <div className="p-8 text-center">
                <p className="text-red-600 dark:text-red-400 font-medium mb-2">Erro ao carregar pagamentos</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{erroCarregar}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                  Se a tabela <code className="bg-gray-100 dark:bg-zinc-700 px-1 rounded">pagamentos</code> ainda não existir no Supabase, execute o script em <code className="bg-gray-100 dark:bg-zinc-700 px-1 rounded">database/create_table_pagamentos.sql</code> no SQL Editor do Supabase.
                </p>
                <Button onClick={carregar} variant="outline" size="sm">
                  Tentar novamente
                </Button>
              </div>
            ) : loading ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                Carregando pagamentos...
              </div>
            ) : itens.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                Nenhum pagamento encontrado. As cobranças do painel Asaas (mesmo e-mail da empresa) aparecem aqui.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-zinc-700/50">
                    <tr>
                      <th
                        className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300"
                        title="Pendente: vencimento da cobrança. Pago: último dia do período de 30 dias após o pagamento (mesma regra do sistema)."
                      >
                        Vencimento
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Valor</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Data pagamento</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                    {itens.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700/30">
                        <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                          {formatarDataShort(getDataVencimentoLista(p))}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {formatarMoeda(getValor(p))}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={getStatus(p)} />
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {formatarDataShort(getDataPagamento(p))}
                        </td>
                        <td className="px-4 py-3">
                          {isPendente(p) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPagarPixItem({ paymentId: getPaymentId(p), valor: getValor(p) })}
                            >
                              Pagar com PIX
                            </Button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {itens.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-zinc-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {total} cobrança(s) — dados do Asaas (e-mail da empresa)
                </p>
              </div>
            )}
          </div>

          {/* Modal Pagar cobrança pendente com PIX */}
          {pagarPixItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPagarPixItem(null)}>
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl max-w-md w-full p-4 relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setPagarPixItem(null)}
                  className="absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-700"
                  aria-label="Fechar"
                >
                  <FiX size={20} />
                </button>
                <PixQRCode
                  valor={pagarPixItem.valor}
                  existingPaymentId={pagarPixItem.paymentId}
                  onSuccess={() => {
                    setPagarPixItem(null);
                    carregar();
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </MenuLayout>
    </AuthGuardFinal>
  );
}

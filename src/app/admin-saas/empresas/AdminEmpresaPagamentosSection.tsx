'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiRefreshCw,
  FiXCircle,
} from 'react-icons/fi';
import type { CicloMensal, ResumoCiclosPagamento } from '@/lib/billing/verificarCiclosPagamento';

type PagamentoRow = {
  id: string;
  mercadopago_payment_id: string | null;
  status: string | null;
  valor: number | null;
  plano_slug: string | null;
  created_at: string | null;
  paid_at: string | null;
  due_date?: string | null;
  fonte?: 'asaas' | 'db' | 'ambos';
  billing_type?: string | null;
  description?: string | null;
};

type AssinaturaResumo = {
  id: string;
  status: string | null;
  valor: number | null;
  created_at: string | null;
  data_fim: string | null;
  proxima_cobranca: string | null;
} | null;

type Props = {
  empresaId: string;
};

function formatarMoeda(valor: number | null | undefined) {
  if (valor == null || !Number.isFinite(Number(valor))) return '—';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(iso: string | null | undefined) {
  if (!iso) return '—';
  const s = String(iso).trim();
  const head = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) {
    const [y, m, d] = head[1].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

function StatusPagamentoBadge({ status }: { status: string | null }) {
  const s = (status || '').toLowerCase();
  if (['approved', 'confirmed', 'received', 'pago'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
        <FiCheckCircle className="w-3 h-3" /> Pago
      </span>
    );
  }
  if (['pending', 'overdue'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
        <FiClock className="w-3 h-3" /> Pendente
      </span>
    );
  }
  if (['rejected', 'cancelled', 'canceled', 'deleted', 'refunded'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
        <FiXCircle className="w-3 h-3" /> {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
      {status || '—'}
    </span>
  );
}

function StatusCicloBadge({ status }: { status: CicloMensal['status'] }) {
  if (status === 'pago') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
        <FiCheckCircle className="w-3 h-3" /> Pago
      </span>
    );
  }
  if (status === 'proxima_cobranca') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-medium">
        <FiClock className="w-3 h-3" /> Próx. cobrança
      </span>
    );
  }
  if (status === 'pendente') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
        <FiClock className="w-3 h-3" /> Pendente
      </span>
    );
  }
  if (status === 'atrasado') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
        <FiAlertCircle className="w-3 h-3" /> Pendente / Atrasado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
      <FiXCircle className="w-3 h-3" /> Sem pagamento
    </span>
  );
}

export default function AdminEmpresaPagamentosSection({ empresaId }: Props) {
  const [loading, setLoading] = useState(true);
  const [liberando, setLiberando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [ciclos, setCiclos] = useState<CicloMensal[]>([]);
  const [resumo, setResumo] = useState<ResumoCiclosPagamento | null>(null);
  const [assinatura, setAssinatura] = useState<AssinaturaResumo>(null);
  const [diasCiclo, setDiasCiclo] = useState(30);
  const [fonte, setFonte] = useState<string | null>(null);
  const [asaasError, setAsaasError] = useState<string | null>(null);
  const [empresaEmail, setEmpresaEmail] = useState<string | null>(null);
  const [sincronizacaoMsg, setSincronizacaoMsg] = useState<string | null>(null);
  const [sistemaLiberado, setSistemaLiberado] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin-saas/empresas/${empresaId}/pagamentos`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || json.reason || 'Falha ao carregar pagamentos');
      }
      setPagamentos(json.pagamentos || []);
      setCiclos(json.ciclos || []);
      setResumo(json.resumo || null);
      setAssinatura(json.assinatura || null);
      setDiasCiclo(json.diasCiclo || 30);
      setFonte(json.fonte || null);
      setAsaasError(json.asaasError || null);
      setEmpresaEmail(json.empresa?.email || null);
      setSincronizacaoMsg(json.sincronizacaoMsg || null);
      setSistemaLiberado(json.empresa?.sistema_liberado === true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  const liberarPorPagamento = useCallback(async () => {
    setLiberando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin-saas/empresas/${empresaId}/liberar-pagamento`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Falha ao liberar assinatura');
      }
      setSincronizacaoMsg(json.message || `Assinatura liberada até ${json.coberturaAte}`);
      await carregar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao liberar');
    } finally {
      setLiberando(false);
    }
  }, [empresaId, carregar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiCreditCard className="text-gray-500" />
            Pagamentos e ciclos mensais
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Cobertura = pagamento + {diasCiclo} dias, empilhada se pagar antecipado. Ex.: cobria até
            15/08 e pagou em 08/08 → novo fim 14/09. Se já venceu, pago em 16/07 cobre até 15/08.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={liberarPorPagamento}
            disabled={loading || liberando}
            className="border-emerald-300 text-emerald-800 bg-emerald-50"
          >
            {liberando ? 'Liberando...' : 'Liberar por pagamento Asaas'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={carregar}
            disabled={loading}
            className="border-gray-300 text-gray-700"
          >
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {sincronizacaoMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {sincronizacaoMsg}
        </div>
      )}
      {sistemaLiberado && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Esta empresa está com <strong>sistema liberado</strong> pelo admin — o bloqueio por
          vencimento fica desativado até revogar a liberação.
        </div>
      )}
      {resumo?.proximaCobrancaPendente && !sistemaLiberado && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Cobertura vencida em {formatarData(resumo.coberturaAte)}
          {resumo.diasAtrasoAtual != null ? ` (${resumo.diasAtrasoAtual} dia(s) de atraso)` : ''}.
          Último pagamento em {formatarData(resumo.ultimoPagamentoEm)}. Próxima cobrança pendente —
          o acesso deve estar bloqueado.
        </div>
      )}
      {asaasError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Não foi possível sincronizar com o Asaas: {asaasError}. Exibindo o que há no banco local.
        </div>
      )}
      {!empresaEmail && fonte === 'db_sem_email' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Esta empresa não tem e-mail cadastrado — não dá para buscar cobranças no Asaas. Cadastre o
          e-mail da empresa para sincronizar valores corretos.
        </div>
      )}
      {fonte === 'asaas' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
          Sincronizado com Asaas — valores exibidos são os da cobrança real.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && !resumo ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          Carregando pagamentos...
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {sistemaLiberado ? (
                  <span className="text-sky-700">Sistema liberado</span>
                ) : resumo?.emDia ? (
                  <span className="text-green-700">Em dia</span>
                ) : resumo?.totalPagos ? (
                  <span className="text-red-700">
                    Atrasado
                    {resumo.diasAtrasoAtual != null ? ` (${resumo.diasAtrasoAtual}d)` : ''}
                  </span>
                ) : (
                  <span className="text-gray-600">Sem pagamentos</span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Último pago {formatarData(resumo?.ultimoPagamentoEm)} · cobre até{' '}
                {formatarData(resumo?.coberturaAte)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pagos</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {resumo?.totalPagos ?? 0}
                <span className="text-sm font-normal text-gray-500">
                  {' '}
                  / {resumo?.totalPagamentos ?? 0} registros
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Total {formatarMoeda(resumo?.valorTotalPago)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Ciclos ({diasCiclo} dias)
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                <span className="text-green-700">{resumo?.ciclosPagos ?? 0}</span>
                <span className="text-sm font-normal text-gray-400"> pagos</span>
                {(resumo?.ciclosFaltando ?? 0) > 0 && (
                  <>
                    {' · '}
                    <span className="text-red-700">{resumo?.ciclosFaltando}</span>
                    <span className="text-sm font-normal text-gray-400"> faltando</span>
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {resumo?.ciclosEsperados ?? 0} ciclo(s) desde o 1º pagamento
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assinatura</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">
                {assinatura?.status || '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Próx. cobrança {formatarData(assinatura?.proxima_cobranca)}
                {assinatura?.valor != null && (
                  <> · {formatarMoeda(assinatura.valor)}/mês</>
                )}
              </p>
            </div>
          </div>

          {/* Verificação mensal */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Cobertura por pagamento (+{diasCiclo} dias)
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Cada linha &quot;Pago&quot; = data do pagamento → data do pagamento + {diasCiclo} dias.
                Se a cobertura acabou e não há novo pagamento, aparece &quot;Pendente / Atrasado&quot;.
              </p>
            </div>
            {ciclos.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                Nenhum pagamento aprovado ainda — não há ciclos mensais para verificar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3">Ciclo</th>
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Pagamento</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Obs.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ciclos.map((c) => (
                      <tr key={c.indice} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-medium text-gray-900">#{c.indice}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {formatarData(c.inicio)} → {formatarData(c.fim)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusCicloBadge status={c.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {c.pagamento
                            ? formatarData(c.pagamento.paid_at)
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {c.pagamento ? formatarMoeda(c.pagamento.valor) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {c.status === 'atrasado'
                            ? c.diasAtraso != null
                              ? `${c.diasAtraso} dia(s) sem renovação — deve bloquear`
                              : 'Cobrança pendente'
                            : c.status === 'proxima_cobranca'
                              ? 'Renovação futura (ainda dentro da cobertura)'
                              : c.pagamento?.asaas_id
                                ? `Asaas: ${c.pagamento.asaas_id.slice(0, 12)}…`
                                : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Histórico completo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Histórico de pagamentos (Asaas)</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Cobranças do Asaas vinculadas ao e-mail da empresa, mais recentes primeiro.
              </p>
            </div>
            {pagamentos.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                Nenhuma cobrança encontrada no Asaas{empresaEmail ? ` para ${empresaEmail}` : ''} e
                nenhum registro local.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Pago em</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Valor (Asaas)</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Fonte</th>
                      <th className="px-4 py-3">ID Asaas</th>
                      <th className="px-4 py-3">Cobre até</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagamentos.map((p) => {
                      const pago = ['approved', 'confirmed', 'received', 'pago'].includes(
                        (p.status || '').toLowerCase()
                      );
                      const base = p.paid_at || (pago ? p.created_at : null);
                      let cobreAte: string | null = null;
                      if (base) {
                        const m = String(base).match(/^(\d{4}-\d{2}-\d{2})/);
                        if (m) {
                          const [y, mo, d] = m[1].split('-').map(Number);
                          const dt = new Date(y, mo - 1, d);
                          dt.setDate(dt.getDate() + diasCiclo);
                          cobreAte = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                        }
                      }
                      const fonteLabel =
                        p.fonte === 'asaas'
                          ? 'Asaas'
                          : p.fonte === 'ambos'
                            ? 'Asaas + DB'
                            : 'Só DB';
                      return (
                        <tr key={`${p.fonte}-${p.id}`} className="hover:bg-gray-50/80">
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {formatarData(p.due_date || p.created_at)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {formatarData(p.paid_at)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPagamentoBadge status={p.status} />
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {formatarMoeda(p.valor)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {p.billing_type || p.plano_slug || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                p.fonte === 'db'
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-sky-50 text-sky-800'
                              }`}
                            >
                              {fonteLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                            {p.mercadopago_payment_id || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {cobreAte ? formatarData(cobreAte) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

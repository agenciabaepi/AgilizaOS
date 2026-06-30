'use client'

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { DIAS_TRIAL_GRATIS } from '@/config/trial';
import { FiInfo, FiChevronRight, FiUnlock } from 'react-icons/fi';
import PremiumRecursosForm from '@/components/admin/PremiumRecursosForm';
import type { PremiumModule } from '@/config/planModules';

const TRIAL_IMPLICITO_HINT = `Trial implícito: ${DIAS_TRIAL_GRATIS} dias a partir da criação da empresa. Sem registro na tabela assinaturas.`;

function cobrancaBadgeClass(status: string) {
  if (status === 'Sistema liberado') return 'bg-sky-50 text-sky-800 ring-sky-200/80';
  if (status === 'Em dia') return 'bg-emerald-50 text-emerald-800 ring-emerald-200/80';
  if (status === 'Trial') return 'bg-amber-50 text-amber-900 ring-amber-200/80';
  if (status === 'Trial encerrado') return 'bg-orange-50 text-orange-900 ring-orange-200/80';
  if (status === 'Vencido') return 'bg-red-50 text-red-800 ring-red-200/80';
  return 'bg-gray-50 text-gray-700 ring-gray-200/80';
}

function chipClass(tone: 'green' | 'yellow' | 'red' | 'sky' | 'gray') {
  const map = {
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
    yellow: 'bg-amber-50 text-amber-900 ring-amber-200/80',
    red: 'bg-red-50 text-red-800 ring-red-200/80',
    sky: 'bg-sky-50 text-sky-800 ring-sky-200/80',
    gray: 'bg-gray-50 text-gray-600 ring-gray-200/80',
  };
  return `inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${map[tone]}`;
}

function formatarDataCurta(iso: string | null | undefined) {
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

type Empresa = {
  id: string;
  nome: string;
  email?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  status?: string | null; // pendente, aprovada, reprovada
  ativo?: boolean | null;
  sistema_liberado?: boolean | null;
  created_at?: string | null;
  logo_url?: string | null;
  metrics?: {
    usuarios: number;
    produtos: number;
    servicos: number;
    ordens: number;
    usoMb: number; // storage
  };
  billing?: {
    plano: { id: string | null; nome: string };
    assinaturaStatus: string | null;
    proximaCobranca: string | null;
    vencido: boolean;
    cobrancaStatus: string;
    ultimoPagamentoStatus: string | null;
    ultimoPagamentoPagoEm: string | null;
    ultimoPagamentoValor: number | null;
    valorMensal?: number | null;
    dataTrialFim?: string | null;
    diasTrialRestantes?: number | null;
    trialImplicito?: boolean;
  };
}

type ListResponse = {
  ok: boolean;
  items: Empresa[];
  page: number;
  pageSize: number;
  total: number;
}

export default function EmpresasClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Empresa[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({ nome: '', email: '', cnpj: '' });
  const [showAlterarPlano, setShowAlterarPlano] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);
  const [planos, setPlanos] = useState<Array<{ id: string; nome: string; descricao: string; preco: number }>>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<string>('');
  const [valorMensalManual, setValorMensalManual] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [alterandoPlano, setAlterandoPlano] = useState(false);
  
  const [showGerenciarRecursos, setShowGerenciarRecursos] = useState(false);
  const [recursosCustomizados, setRecursosCustomizados] = useState<Partial<Record<PremiumModule, boolean>>>({});
  const [salvandoRecursos, setSalvandoRecursos] = useState(false);
  const safePageSize = Math.max(1, pageSize);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / safePageSize)), [total, safePageSize]);

  async function fetchItems(opts?: { keepPage?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || '');
      const params = new URLSearchParams({
        page: String(opts?.keepPage ? page : 1),
        pageSize: String(safePageSize),
        search,
        status,
      });
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 30000); // 30s timeout
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
        signal: ctrl.signal,
      });
      clearTimeout(timeoutId);
      let json: ListResponse & { reason?: string; error?: string | { message?: string } };
      try {
        json = await res.json();
      } catch {
        setError('Resposta inválida do servidor');
        return;
      }
      if (res.status === 401) {
        setError('Sessão expirada. Redirecionando para login...');
        router.replace('/admin-login');
        return;
      }
      if (!res.ok || !json.ok) {
        const err = json.error;
        const msg =
          typeof err === 'string'
            ? err
            : err && typeof err === 'object' && typeof (err as { message?: string }).message === 'string'
              ? (err as { message: string }).message
              : json.reason || 'Não foi possível carregar as empresas';
        setError(msg);
        setItems([]);
        setTotal(0);
        return;
      }
      setItems(json.items || []);
      setTotal(json.total ?? 0);
      if (!opts?.keepPage) setPage(1);
    } catch (e) {
      console.error('fetchItems error:', e);
      const isAbort = e instanceof Error && e.name === 'AbortError';
      const msg = isAbort ? 'Timeout: servidor demorou para responder' : (e instanceof Error ? (e.message || e.toString()) : 'Não foi possível carregar as empresas');
      setError(msg || 'Não foi possível carregar as empresas');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems({ keepPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  async function patchEmpresa(id: string, payload: Record<string, unknown>) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error('Falha na atualização');
    await fetchItems({ keepPage: true });
  }

  async function handleApprove(e: Empresa) {
    await patchEmpresa(e.id, { status: 'aprovada', ativo: true });
  }
  async function handleReject(e: Empresa) {
    await patchEmpresa(e.id, { status: 'reprovada', ativo: false });
  }
  async function handleToggleActive(e: Empresa) {
    await patchEmpresa(e.id, { ativo: !e.ativo });
  }

  async function handleToggleSistemaLiberado(e: Empresa) {
    await patchEmpresa(e.id, { sistema_liberado: !e.sistema_liberado });
  }

  async function handleCreate() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const res = await fetch(`${baseUrl}/api/admin-saas/empresas/criar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...createData }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error('Falha ao criar');
    setShowCreate(false);
    setCreateData({ nome: '', email: '', cnpj: '' });
    await fetchItems({ keepPage: true });
  }

  async function handleAlterarPlano(e: Empresa) {
    setEmpresaSelecionada(e);
    setShowAlterarPlano(true);
    setPlanoSelecionado(e.billing?.plano?.id || '');
    const vm = e.billing?.valorMensal;
    setValorMensalManual(vm != null && Number.isFinite(Number(vm)) ? String(Number(vm)) : '');
    setObservacoes('');

    // Buscar planos disponíveis
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const res = await fetch(`${baseUrl}/api/admin-saas/planos`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.ok) {
        setPlanos(json.planos || []);
      }
    } catch (err) {
      console.error('Erro ao buscar planos:', err);
    }
  }

  async function confirmarAlterarPlano() {
    if (!empresaSelecionada || !planoSelecionado) return;

    setAlterandoPlano(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const trimmed = valorMensalManual.trim();
      let valor_mensal: number | undefined;
      if (trimmed) {
        const n = parseFloat(trimmed.replace(/\./g, '').replace(',', '.'));
        if (Number.isFinite(n) && n > 0) valor_mensal = n;
      }
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaSelecionada.id}/alterar-plano`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano_id: planoSelecionado,
          observacoes: observacoes || undefined,
          ...(valor_mensal != null ? { valor_mensal } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao alterar assinatura');
      }
      setShowAlterarPlano(false);
      setEmpresaSelecionada(null);
      setPlanoSelecionado('');
      setValorMensalManual('');
      setObservacoes('');
      await fetchItems({ keepPage: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar assinatura');
    } finally {
      setAlterandoPlano(false);
    }
  }

  async function handleGerenciarRecursos(e: Empresa) {
    setEmpresaSelecionada(e);
    setShowGerenciarRecursos(true);
    
    // Buscar recursos customizados atuais
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${e.id}/recursos`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.ok) {
        setRecursosCustomizados(json.recursos || {});
      } else {
        setRecursosCustomizados({});
      }
    } catch (err) {
      console.error('Erro ao buscar recursos:', err);
      setRecursosCustomizados({});
    }
  }

  async function confirmarSalvarRecursos() {
    if (!empresaSelecionada) return;

    setSalvandoRecursos(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaSelecionada.id}/recursos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recursos: recursosCustomizados }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao salvar recursos');
      }
      setShowGerenciarRecursos(false);
      setEmpresaSelecionada(null);
      setRecursosCustomizados({});
      await fetchItems({ keepPage: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar recursos');
    } finally {
      setSalvandoRecursos(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
            placeholder="Buscar por nome, CNPJ ou e-mail..."
            className="flex-1 min-w-[200px] max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovada">Aprovada</option>
            <option value="reprovada">Reprovada</option>
          </select>
          <Button onClick={() => fetchItems()} className="bg-gray-900 hover:bg-gray-800 text-white">
            Filtrar
          </Button>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-gray-900 hover:bg-gray-800 text-white shrink-0">
          Adicionar empresa
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between gap-3 flex-wrap">
          <span>{error}</span>
          <Button
            type="button"
            size="sm"
            onClick={() => fetchItems()}
            className="shrink-0 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Empresa
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Situação
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Assinatura
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Uso
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
                      <span>Carregando empresas...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-gray-500">
                    Nenhuma empresa encontrada
                  </td>
                </tr>
              ) : (
                items.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/admin-saas/empresas/${e.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        {e.logo_url ? (
                          <img
                            src={e.logo_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                            onError={(ev) => {
                              (ev.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0">
                            <span className="text-gray-500 text-sm font-semibold">
                              {e.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                            {e.nome}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {[e.email, e.cnpj].filter(Boolean).join(' · ') || 'Sem contato'}
                          </p>
                          {e.created_at && (
                            <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                              Criada em {new Date(e.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <div className="space-y-1.5">
                        <p
                          className={`text-sm font-medium ${e.ativo ? 'text-emerald-700' : 'text-gray-500'}`}
                        >
                          {e.ativo ? 'Ativa' : 'Inativa'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {e.status === 'pendente' && (
                            <span className={chipClass('yellow')}>Pendente</span>
                          )}
                          {e.status === 'reprovada' && (
                            <span className={chipClass('red')}>Reprovada</span>
                          )}
                          {e.sistema_liberado && (
                            <span className={chipClass('sky')}>Liberado</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <div className="space-y-1.5 min-w-[140px]">
                        <p className="text-sm font-medium text-gray-900">
                          {e.billing?.plano?.nome || '—'}
                        </p>
                        {e.billing?.cobrancaStatus ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${cobrancaBadgeClass(e.billing.cobrancaStatus)}`}
                            >
                              {e.billing.cobrancaStatus}
                            </span>
                            {e.billing.trialImplicito && (
                              <span
                                className="inline-flex text-amber-600"
                                title={TRIAL_IMPLICITO_HINT}
                              >
                                <FiInfo className="w-3.5 h-3.5" aria-hidden />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sem cobrança</span>
                        )}
                        {e.billing?.dataTrialFim &&
                          (e.billing.cobrancaStatus === 'Trial' ||
                            e.billing.cobrancaStatus === 'Trial encerrado') && (
                          <p className="text-[11px] text-gray-500 tabular-nums">
                            Até {formatarDataCurta(e.billing.dataTrialFim)}
                            {e.billing.cobrancaStatus === 'Trial' &&
                              e.billing.diasTrialRestantes != null && (
                                <> · {e.billing.diasTrialRestantes}d rest.</>
                              )}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-top hidden md:table-cell">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 min-w-[120px]">
                        <span>
                          <span className="text-gray-400">Usu. </span>
                          <span className="font-medium text-gray-800 tabular-nums">
                            {e.metrics?.usuarios ?? 0}
                          </span>
                        </span>
                        <span>
                          <span className="text-gray-400">Prod. </span>
                          <span className="font-medium text-gray-800 tabular-nums">
                            {e.metrics?.produtos ?? 0}
                          </span>
                        </span>
                        <span>
                          <span className="text-gray-400">Serv. </span>
                          <span className="font-medium text-gray-800 tabular-nums">
                            {e.metrics?.servicos ?? 0}
                          </span>
                        </span>
                        <span>
                          <span className="text-gray-400">OS </span>
                          <span className="font-medium text-gray-800 tabular-nums">
                            {e.metrics?.ordens ?? 0}
                          </span>
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 tabular-nums">
                        {e.metrics?.usoMb ?? 0} MB
                      </p>
                    </td>

                    <td
                      className="px-4 py-3.5 align-middle"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title={e.sistema_liberado ? 'Revogar liberação' : 'Liberar sistema'}
                          onClick={() => void handleToggleSistemaLiberado(e)}
                          className={`p-2 rounded-lg transition-colors ${
                            e.sistema_liberado
                              ? 'text-sky-700 bg-sky-50 hover:bg-sky-100'
                              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <FiUnlock className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Ver detalhes"
                          onClick={() => router.push(`/admin-saas/empresas/${e.id}`)}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                          <FiChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            {total} {total === 1 ? 'empresa' : 'empresas'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-700 font-medium tabular-nums px-1">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Criar Empresa */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar empresa</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Nome da empresa"
                  value={createData.nome}
                  onChange={e => setCreateData({ ...createData, nome: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail (opcional)</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="email@exemplo.com"
                  value={createData.email}
                  onChange={e => setCreateData({ ...createData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ (opcional)</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="00.000.000/0000-00"
                  value={createData.cnpj}
                  onChange={e => setCreateData({ ...createData, cnpj: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreate(false)}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreate}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alterar Assinatura */}
      {showAlterarPlano && empresaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAlterarPlano(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alterar Assinatura da Empresa</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <div className="text-sm text-gray-900 font-medium">{empresaSelecionada.nome}</div>
                {empresaSelecionada.billing?.plano?.nome && (
                  <div className="text-xs text-gray-500 mt-1">
                    Assinatura atual: <span className="font-medium">{empresaSelecionada.billing.plano.nome}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Assinatura</label>
                <select
                  value={planoSelecionado}
                  onChange={(e) => setPlanoSelecionado(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">Selecione um plano</option>
                  {planos.map((plano) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.nome} - R$ {plano.preco.toFixed(2)}/mês
                    </option>
                  ))}
                </select>
                {planos.find(p => p.id === planoSelecionado) && (
                  <div className="mt-2 text-xs text-gray-600">
                    {planos.find(p => p.id === planoSelecionado)?.descricao}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor mensal (R$) — opcional
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorMensalManual}
                  onChange={(e) => setValorMensalManual(e.target.value)}
                  placeholder={
                    planos.find((p) => p.id === planoSelecionado)
                      ? `Padrão do plano: ${planos.find((p) => p.id === planoSelecionado)!.preco.toFixed(2)}`
                      : 'Ex: 99,90'
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Deixe em branco para usar o preço do plano. Preencha para um valor personalizado nesta empresa.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  rows={3}
                  placeholder="Observações sobre a alteração da assinatura..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAlterarPlano(false);
                    setEmpresaSelecionada(null);
                    setPlanoSelecionado('');
                    setValorMensalManual('');
                    setObservacoes('');
                  }}
                  className="border-gray-300 hover:bg-gray-50"
                  disabled={alterandoPlano}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmarAlterarPlano}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                  disabled={!planoSelecionado || alterandoPlano}
                >
                  {alterandoPlano ? 'Alterando...' : 'Confirmar Alteração'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciar Recursos */}
      {showGerenciarRecursos && empresaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowGerenciarRecursos(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gerenciar Recursos - {empresaSelecionada.nome}</h3>
            <p className="text-sm text-gray-600 mb-6">
              Libere módulos premium manualmente. Por padrão, o acesso segue o plano da assinatura.
            </p>

            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Módulos Premium</h4>
              <PremiumRecursosForm
                valores={recursosCustomizados}
                onChange={setRecursosCustomizados}
                disabled={salvandoRecursos}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-yellow-800">
                <strong>Nota:</strong> Para remover todas as customizações e voltar a usar apenas os recursos da assinatura, 
                desmarque todos os recursos e salve.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowGerenciarRecursos(false);
                  setEmpresaSelecionada(null);
                  setRecursosCustomizados({});
                }}
                className="border-gray-300 hover:bg-gray-50"
                disabled={salvandoRecursos}
              >
                Cancelar
              </Button>
              <Button 
                onClick={confirmarSalvarRecursos}
                className="bg-gray-900 hover:bg-gray-800 text-white"
                disabled={salvandoRecursos}
              >
                {salvandoRecursos ? 'Salvando...' : 'Salvar Recursos'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



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

function formatarCadastro(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

const LIST_GRID =
  'grid grid-cols-1 xl:grid-cols-[minmax(0,2.4fr)_6.25rem_minmax(7.5rem,0.85fr)_minmax(8.5rem,1fr)_minmax(10rem,1.25fr)_4.5rem] xl:gap-x-5 xl:items-start';

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center justify-between gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-[11px] tabular-nums ring-1 ring-gray-100 w-full min-w-0">
      <span className="text-gray-400 font-medium shrink-0">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </span>
  );
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
  const [showGerenciarRecursos, setShowGerenciarRecursos] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);
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
    <div className="space-y-5 w-full">
      {/* Cabeçalho + toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? 'empresa' : 'empresas'} · mais recentes primeiro
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
            placeholder="Buscar nome, CNPJ ou e-mail..."
            className="w-full sm:w-64 lg:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
          <Button onClick={() => setShowCreate(true)} className="bg-gray-900 hover:bg-gray-800 text-white">
            Adicionar empresa
          </Button>
        </div>
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

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full">
        <div className={`hidden xl:grid ${LIST_GRID} px-5 py-3 bg-gray-50/90 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide`}>
          <span>Empresa</span>
          <span>Cadastro</span>
          <span>Situação</span>
          <span>Plano</span>
          <span>Uso na plataforma</span>
          <span className="text-right sr-only">Ações</span>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
              <span>Carregando empresas...</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-16 text-center text-gray-500">Nenhuma empresa encontrada</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((e) => (
              <li key={e.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/admin-saas/empresas/${e.id}`)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      router.push(`/admin-saas/empresas/${e.id}`);
                    }
                  }}
                  className={`group px-5 py-4 hover:bg-indigo-50/30 transition-colors cursor-pointer ${LIST_GRID} gap-y-3`}
                >
                  <div className="flex items-center gap-3 min-w-0 xl:min-w-0">
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
                        <span className="text-gray-500 text-sm font-bold">
                          {e.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-indigo-700">
                        {e.nome}
                      </p>
                      {e.email && (
                        <p className="text-xs text-gray-500 truncate">{e.email}</p>
                      )}
                      {e.cnpj && (
                        <p className="text-xs text-gray-400 truncate tabular-nums">{e.cnpj}</p>
                      )}
                      {!e.email && !e.cnpj && (
                        <p className="text-xs text-gray-400">Sem contato</p>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 shrink-0">
                    <span className="xl:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wide mr-2">
                      Cadastro
                    </span>
                    <span
                      className="text-xs text-gray-700 tabular-nums font-medium whitespace-nowrap"
                      title={formatarCadastro(e.created_at)}
                    >
                      {formatarCadastro(e.created_at)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <span className="xl:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      Situação
                    </span>
                    <div className="flex flex-col items-start gap-1.5">
                      <span
                        className={`inline-flex w-fit items-center gap-1.5 text-xs font-medium ${
                          e.ativo ? 'text-emerald-700' : 'text-gray-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${e.ativo ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        />
                        {e.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {e.status === 'pendente' && <span className={chipClass('yellow')}>Pendente</span>}
                        {e.status === 'reprovada' && <span className={chipClass('red')}>Reprovada</span>}
                        {e.sistema_liberado && <span className={chipClass('sky')}>Liberado</span>}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <span className="xl:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      Plano
                    </span>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {e.billing?.plano?.nome || '—'}
                    </p>
                    {e.billing?.cobrancaStatus ? (
                      <div className="mt-1 flex items-center gap-1 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ${cobrancaBadgeClass(e.billing.cobrancaStatus)}`}
                        >
                          {e.billing.cobrancaStatus}
                        </span>
                        {e.billing.trialImplicito && (
                          <span className="text-amber-600" title={TRIAL_IMPLICITO_HINT}>
                            <FiInfo className="w-3 h-3" aria-hidden />
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">Sem cobrança</p>
                    )}
                  </div>

                  <div className="min-w-0 overflow-hidden">
                    <span className="xl:hidden text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      Uso
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 max-w-[11.5rem]">
                      <MetricPill label="Usu." value={e.metrics?.usuarios ?? 0} />
                      <MetricPill label="Prod." value={e.metrics?.produtos ?? 0} />
                      <MetricPill label="OS" value={e.metrics?.ordens ?? 0} />
                      <MetricPill label="MB" value={e.metrics?.usoMb ?? 0} />
                    </div>
                  </div>

                  <div
                    className="flex items-start justify-end gap-0.5 shrink-0 self-start pt-0.5"
                    onClick={(ev) => ev.stopPropagation()}
                    onKeyDown={(ev) => ev.stopPropagation()}
                  >
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
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Página {page} de {totalPages}
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



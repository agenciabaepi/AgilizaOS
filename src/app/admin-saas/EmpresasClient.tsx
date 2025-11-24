'use client'

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

type Empresa = {
  id: string;
  nome: string;
  email?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  status?: string | null; // pendente, aprovada, reprovada
  ativo?: boolean | null;
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
  const [observacoes, setObservacoes] = useState('');
  const [alterandoPlano, setAlterandoPlano] = useState(false);
  
  const [showGerenciarRecursos, setShowGerenciarRecursos] = useState(false);
  const [recursosCustomizados, setRecursosCustomizados] = useState<Record<string, boolean>>({});
  const [salvandoRecursos, setSalvandoRecursos] = useState(false);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function fetchItems(opts?: { keepPage?: boolean }) {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const params = new URLSearchParams({
        page: String(opts?.keepPage ? page : 1),
        pageSize: String(pageSize),
        search,
        status,
      });
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas?${params.toString()}`, { cache: 'no-store' });
      const json: ListResponse = await res.json();
      if (!res.ok || !json.ok) throw new Error(json as any);
      setItems(json.items || []);
      setTotal(json.total || 0);
      if (!opts?.keepPage) setPage(1);
    } catch (e) {
      console.error(e);
      setError('Não foi possível carregar as empresas');
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
      const res = await fetch(`${baseUrl}/api/admin-saas/empresas/${empresaSelecionada.id}/alterar-plano`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano_id: planoSelecionado,
          observacoes: observacoes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao alterar plano');
      }
      setShowAlterarPlano(false);
      setEmpresaSelecionada(null);
      setPlanoSelecionado('');
      setObservacoes('');
      await fetchItems({ keepPage: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar plano');
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Empresas</h2>
            <p className="text-sm text-gray-500">Gerencie todas as empresas da plataforma</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-gray-900 hover:bg-gray-800 text-white">
            Adicionar empresa
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-6 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ, e-mail..."
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value)} 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="">Todos status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovada">Aprovada</option>
            <option value="reprovada">Reprovada</option>
          </select>
          <Button onClick={() => fetchItems()} className="bg-gray-900 hover:bg-gray-800 text-white">
            Filtrar
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Tabela */}
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ativa</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Criada em</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Plano</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cobrança</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Usuários</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Produtos</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Serviços</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">OS</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Storage (MB)</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    <span>Carregando...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                  Nenhuma empresa encontrada
                </td>
              </tr>
            ) : (
              items.map(e => (
                <tr 
                  key={e.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/admin-saas/empresas/${e.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {e.logo_url ? (
                        <img 
                          src={e.logo_url} 
                          alt={e.nome}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                          <span className="text-gray-400 text-xs font-medium">
                            {e.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 hover:text-blue-600">{e.nome}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{e.email || '-'} • {e.cnpj || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {e.status ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${e.status === 'aprovada' ? 'bg-green-100 text-green-800' : ''}
                        ${e.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${e.status === 'reprovada' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {e.status}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${e.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}
                    `}>
                      {e.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {e.created_at ? new Date(e.created_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {e.billing?.plano?.nome ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {e.billing.plano.nome}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {e.billing?.cobrancaStatus ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        e.billing.cobrancaStatus === 'Em dia' ? 'bg-green-100 text-green-800' :
                        e.billing.cobrancaStatus === 'Trial' ? 'bg-yellow-100 text-yellow-800' :
                        e.billing.cobrancaStatus === 'Vencido' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {e.billing.cobrancaStatus}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{e.metrics?.usuarios ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{e.metrics?.produtos ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{e.metrics?.servicos ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{e.metrics?.ordens ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{e.metrics?.usoMb ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      size="sm" 
                      onClick={() => window.location.href = `/admin-saas/empresas/${e.id}`}
                      className="bg-gray-900 hover:bg-gray-800 text-white text-xs px-3 py-1"
                    >
                      Ver Detalhes
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {total} {total === 1 ? 'registro' : 'registros'}
        </div>
        <div className="flex items-center gap-3">
          <Button 
            size="sm" 
            disabled={page <= 1} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-700 font-medium">
            {page} / {totalPages}
          </span>
          <Button 
            size="sm" 
            disabled={page >= totalPages} 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </Button>
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

      {/* Modal de Alterar Plano */}
      {showAlterarPlano && empresaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAlterarPlano(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alterar Plano da Empresa</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <div className="text-sm text-gray-900 font-medium">{empresaSelecionada.nome}</div>
                {empresaSelecionada.billing?.plano?.nome && (
                  <div className="text-xs text-gray-500 mt-1">
                    Plano atual: <span className="font-medium">{empresaSelecionada.billing.plano.nome}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Novo Plano</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  rows={3}
                  placeholder="Observações sobre a alteração do plano..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAlterarPlano(false);
                    setEmpresaSelecionada(null);
                    setPlanoSelecionado('');
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
              Libere ou bloqueie recursos específicos para esta empresa. 
              <br />
              <span className="font-medium">Por padrão, os recursos seguem o plano da empresa.</span>
              <br />
              <span className="text-xs text-gray-500">Recursos marcados aqui sobrescrevem os recursos do plano.</span>
            </p>
            
            <div className="space-y-4 mb-6">
              {/* Financeiro */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Módulo Financeiro</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recursosCustomizados['financeiro'] === true}
                      onChange={(e) => setRecursosCustomizados({
                        ...recursosCustomizados,
                        financeiro: e.target.checked
                      })}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700">Financeiro Completo</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recursosCustomizados['vendas'] === true}
                      onChange={(e) => setRecursosCustomizados({
                        ...recursosCustomizados,
                        vendas: e.target.checked
                      })}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700">Vendas</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recursosCustomizados['contas_pagar'] === true}
                      onChange={(e) => setRecursosCustomizados({
                        ...recursosCustomizados,
                        contas_pagar: e.target.checked
                      })}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700">Contas a Pagar</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recursosCustomizados['movimentacao_caixa'] === true}
                      onChange={(e) => setRecursosCustomizados({
                        ...recursosCustomizados,
                        movimentacao_caixa: e.target.checked
                      })}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700">Movimentações de Caixa</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recursosCustomizados['lucro_desempenho'] === true}
                      onChange={(e) => setRecursosCustomizados({
                        ...recursosCustomizados,
                        lucro_desempenho: e.target.checked
                      })}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700">Lucro & Desempenho</span>
                  </label>
                </div>
              </div>

              {/* WhatsApp e Automações */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Automações</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recursosCustomizados['whatsapp'] === true}
                      onChange={(e) => setRecursosCustomizados({
                        ...recursosCustomizados,
                        whatsapp: e.target.checked
                      })}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700">WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recursosCustomizados['chatgpt'] === true}
                      onChange={(e) => setRecursosCustomizados({
                        ...recursosCustomizados,
                        chatgpt: e.target.checked
                      })}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700">ChatGPT / IA</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recursosCustomizados['editor_foto'] === true}
                      onChange={(e) => setRecursosCustomizados({
                        ...recursosCustomizados,
                        editor_foto: e.target.checked
                      })}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700">Editor de Fotos</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-yellow-800">
                <strong>Nota:</strong> Para remover todas as customizações e voltar a usar apenas os recursos do plano, 
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



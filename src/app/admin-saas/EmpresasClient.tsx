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
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{e.nome}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{e.email || '-'} • {e.cnpj || '-'}</div>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(e)} 
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1"
                      >
                        Aprovar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleReject(e)} 
                        className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1"
                      >
                        Reprovar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleToggleActive(e)} 
                        className="border-gray-300 text-xs px-2 py-1"
                      >
                        {e.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
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
    </div>
  );
}



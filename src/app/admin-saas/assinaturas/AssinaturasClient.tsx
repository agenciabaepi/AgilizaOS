'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

type Assinatura = {
  id: string;
  empresa_id: string | null;
  plano_id: string | null;
  status: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  data_trial_fim: string | null;
  proxima_cobranca: string | null;
  valor: number | null;
  created_at: string | null;
  empresa: {
    id: string;
    nome: string;
    email: string | null;
    cnpj: string | null;
  } | null;
  plano: {
    id: string;
    nome: string;
    descricao: string | null;
    preco: number | null;
  } | null;
  vencido: boolean;
};

type ListResponse = {
  ok: boolean;
  items: Assinatura[];
  page: number;
  pageSize: number;
  total: number;
};

export default function AssinaturasClient() {
  const [items, setItems] = useState<Assinatura[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function fetchList(opts?: { keepPage?: boolean }) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(opts?.keepPage ? page : 1),
        pageSize: String(pageSize),
      });
      if (status) params.set('status', status);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin-saas/assinaturas?${params.toString()}`, { cache: 'no-store' });
      const json: ListResponse = await res.json();
      if (!res.ok || !json.ok) throw new Error('Falha ao listar');
      setItems(json.items || []);
      setTotal(json.total || 0);
      if (!opts?.keepPage) setPage(1);
    } catch (e) {
      setError('Falha ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList({ keepPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  function formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  function formatDate(date: string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center gap-2 mb-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por empresa, email, CNPJ ou ID"
          className="w-full max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded px-2 py-2 text-sm"
        >
          <option value="">Todos status</option>
          <option value="trial">Trial</option>
          <option value="active">Ativa</option>
          <option value="cancelled">Cancelada</option>
          <option value="expired">Expirada</option>
          <option value="suspended">Suspensa</option>
        </select>
        <Button onClick={() => fetchList()}>Filtrar</Button>
      </div>

      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Empresa</th>
              <th className="px-3 py-2 text-left">Plano</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Valor</th>
              <th className="px-3 py-2 text-left">Início</th>
              <th className="px-3 py-2 text-left">Fim/Trial</th>
              <th className="px-3 py-2 text-left">Próxima Cobrança</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.empresa?.nome || '-'}</div>
                  <div className="text-gray-500 text-xs">
                    {r.empresa?.email || '-'} • {r.empresa?.cnpj || '-'}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {r.plano?.nome ? (
                    <div>
                      <div className="font-medium">{r.plano.nome}</div>
                      {r.plano.preco && (
                        <div className="text-xs text-gray-500">
                          {formatCurrency(r.plano.preco)}
                        </div>
                      )}
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      r.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : r.status === 'trial'
                        ? 'bg-yellow-100 text-yellow-800'
                        : r.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : r.status === 'expired'
                        ? 'bg-gray-100 text-gray-800'
                        : r.status === 'suspended'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {r.status || '-'}
                    {r.vencido && ' (Vencido)'}
                  </span>
                </td>
                <td className="px-3 py-2">{formatCurrency(r.valor)}</td>
                <td className="px-3 py-2">{formatDate(r.data_inicio)}</td>
                <td className="px-3 py-2">
                  {r.status === 'trial' ? (
                    <div>
                      <div>Trial: {formatDate(r.data_trial_fim)}</div>
                      {r.data_trial_fim && new Date(r.data_trial_fim) < new Date() && (
                        <div className="text-xs text-red-600">Expirado</div>
                      )}
                    </div>
                  ) : (
                    formatDate(r.data_fim)
                  )}
                </td>
                <td className="px-3 py-2">
                  {r.proxima_cobranca ? (
                    <div>
                      <div>{formatDate(r.proxima_cobranca)}</div>
                      {r.vencido && (
                        <div className="text-xs text-red-600">Vencido</div>
                      )}
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  Nenhuma assinatura encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-gray-600">{total} registros</div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}


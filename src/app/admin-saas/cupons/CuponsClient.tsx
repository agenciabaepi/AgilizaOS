'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiRefreshCw, FiTag } from 'react-icons/fi';

type CupomUso = {
  id: string;
  status: string;
  empresa_nome: string | null;
  empresa_email: string | null;
  valor_desconto: number;
  valor_final: number;
  confirmado_em: string | null;
  created_at: string;
};

type CupomRow = {
  id: string;
  codigo: string;
  percentual: number;
  ativo: boolean;
  descricao: string | null;
  created_at: string;
  situacao: 'disponivel' | 'reservado' | 'usado' | 'inativo';
  uso: CupomUso | null;
};

const SITUACAO_LABEL: Record<CupomRow['situacao'], string> = {
  disponivel: 'Disponível',
  reservado: 'Reservado (PIX pendente)',
  usado: 'Utilizado',
  inativo: 'Inativo',
};

const SITUACAO_CLASS: Record<CupomRow['situacao'], string> = {
  disponivel: 'bg-green-100 text-green-800',
  reservado: 'bg-amber-100 text-amber-800',
  usado: 'bg-gray-100 text-gray-700',
  inativo: 'bg-red-100 text-red-700',
};

export default function CuponsClient() {
  const [cupons, setCupons] = useState<CupomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ codigo: '', percentual: '10', descricao: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-saas/cupons', { cache: 'no-store', credentials: 'include' });
      const json = await res.json();
      if (json.ok && Array.isArray(json.cupons)) {
        setCupons(json.cupons);
      } else {
        throw new Error(json.error || 'Falha ao carregar');
      }
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao carregar cupons',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin-saas/cupons', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: form.codigo,
          percentual: parseInt(form.percentual, 10),
          descricao: form.descricao || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Falha ao criar cupom');
      }
      setForm({ codigo: '', percentual: '10', descricao: '' });
      setMessage({ type: 'success', text: `Cupom ${json.cupom.codigo} criado!` });
      await load();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao criar cupom',
      });
    } finally {
      setCreating(false);
    }
  }

  async function toggleAtivo(cupom: CupomRow) {
    try {
      const res = await fetch('/api/admin-saas/cupons', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cupom.id, ativo: !cupom.ativo }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Falha');
      await load();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao atualizar cupom',
      });
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR');
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-4xl">
        <div className="h-24 bg-gray-100 rounded" />
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={criar} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <FiPlus /> Novo cupom
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
            <input
              required
              minLength={3}
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
              className="w-full border rounded-md px-3 py-2 text-sm uppercase font-mono"
              placeholder="PROMO20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desconto (%)</label>
            <input
              required
              type="number"
              min={1}
              max={100}
              value={form.percentual}
              onChange={(e) => setForm((f) => ({ ...f, percentual: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição (opcional)</label>
            <input
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Campanha lançamento"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          <FiTag />
          {creating ? 'Criando…' : 'Criar cupom'}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Cupons cadastrados</h2>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
        >
          <FiRefreshCw /> Atualizar
        </button>
      </div>

      {cupons.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum cupom cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Uso / Empresa</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cupons.map((c) => (
                <tr key={c.id} className="bg-white">
                  <td className="px-4 py-3 font-mono font-medium">{c.codigo}</td>
                  <td className="px-4 py-3">{c.percentual}%</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${SITUACAO_CLASS[c.situacao]}`}>
                      {SITUACAO_LABEL[c.situacao]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.uso?.status === 'confirmado' ? (
                      <div>
                        <div className="font-medium text-gray-900">{c.uso.empresa_nome || 'Empresa'}</div>
                        <div className="text-xs">{c.uso.empresa_email}</div>
                        <div className="text-xs mt-1">
                          Confirmado em {formatDate(c.uso.confirmado_em)}
                        </div>
                        <div className="text-xs">
                          Pago: R$ {Number(c.uso.valor_final).toFixed(2).replace('.', ',')} (desconto R${' '}
                          {Number(c.uso.valor_desconto).toFixed(2).replace('.', ',')})
                        </div>
                      </div>
                    ) : c.uso?.status === 'reservado' ? (
                      <span className="text-xs text-amber-700">Aguardando pagamento PIX</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.situacao !== 'usado' && (
                      <button
                        type="button"
                        onClick={() => void toggleAtivo(c)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {c.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

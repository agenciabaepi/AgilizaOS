'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { FiEdit2, FiSearch, FiUsers, FiX } from 'react-icons/fi';

type ClienteLista = {
  id: string;
  numero_cliente?: number | string | null;
  nome: string;
  telefone?: string | null;
  celular?: string | null;
  email?: string | null;
  documento?: string | null;
  tipo?: string | null;
  status?: string | null;
  cidade?: string | null;
  created_at?: string | null;
};

type ClienteFormState = {
  nome: string;
  telefone: string;
  celular: string;
  email: string;
  documento: string;
  tipo: string;
  observacoes: string;
  responsavel: string;
  senha: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  origem: string;
  aniversario: string;
  status: string;
};

const emptyForm = (): ClienteFormState => ({
  nome: '',
  telefone: '',
  celular: '',
  email: '',
  documento: '',
  tipo: 'pf',
  observacoes: '',
  responsavel: '',
  senha: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  origem: '',
  aniversario: '',
  status: 'ativo',
});

function rowToForm(row: Record<string, unknown>): ClienteFormState {
  const s = (k: string) => (row[k] != null ? String(row[k]) : '');
  return {
    nome: s('nome'),
    telefone: s('telefone'),
    celular: s('celular'),
    email: s('email'),
    documento: s('documento'),
    tipo: s('tipo') || 'pf',
    observacoes: s('observacoes'),
    responsavel: s('responsavel'),
    senha: s('senha'),
    cep: s('cep'),
    rua: s('rua'),
    numero: s('numero'),
    complemento: s('complemento'),
    bairro: s('bairro'),
    cidade: s('cidade'),
    estado: s('estado'),
    origem: s('origem'),
    aniversario: row.aniversario != null && String(row.aniversario).trim()
      ? String(row.aniversario).slice(0, 10)
      : '',
    status: s('status') || 'ativo',
  };
}

export default function AdminEmpresaClientesSection({ empresaId }: { empresaId: string }) {
  const [clientes, setClientes] = useState<ClienteLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteFormState>(emptyForm);
  const [loadingCliente, setLoadingCliente] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const q = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
      const res = await fetch(`/api/admin-saas/empresas/${empresaId}/clientes${q}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao carregar clientes');
      }
      setClientes(json.clientes || []);
    } catch (e: unknown) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [empresaId, debouncedSearch]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function abrirEdicao(id: string) {
    setEditingId(id);
    setModalOpen(true);
    setLoadingCliente(true);
    setForm(emptyForm());
    try {
      const res = await fetch(`/api/admin-saas/empresas/${empresaId}/clientes/${id}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok || !json.cliente) {
        throw new Error(json.message || 'Cliente não encontrado');
      }
      setForm(rowToForm(json.cliente as Record<string, unknown>));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao abrir cliente');
      setModalOpen(false);
      setEditingId(null);
    } finally {
      setLoadingCliente(false);
    }
  }

  function fecharModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!form.nome.trim()) {
      alert('Informe o nome do cliente.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone,
        celular: form.celular,
        email: form.email,
        documento: form.documento,
        tipo: form.tipo,
        observacoes: form.observacoes,
        responsavel: form.responsavel,
        senha: form.senha,
        cep: form.cep,
        rua: form.rua,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        origem: form.origem,
        aniversario: form.aniversario.trim() || null,
        status: form.status,
      };
      const res = await fetch(`/api/admin-saas/empresas/${empresaId}/clientes/${editingId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao salvar');
      }
      fecharModal();
      await carregar();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <FiUsers className="text-teal-700 w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Clientes da empresa</h2>
            <p className="text-sm text-gray-500">Editar cadastros de clientes desta empresa</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome, telefone, e-mail..."
              className={`${inputClass} pl-9`}
              aria-label="Buscar clientes"
            />
          </div>
          <Button type="button" variant="outline" onClick={() => carregar()} disabled={loading} className="border-gray-300">
            Atualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : clientes.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">Nenhum cliente encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Nome</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 hidden md:table-cell">Telefone</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 hidden lg:table-cell">E-mail</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 hidden sm:table-cell">Documento</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{c.numero_cliente ?? '—'}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{c.nome}</td>
                  <td className="px-3 py-2 text-gray-700 hidden md:table-cell whitespace-nowrap">
                    {[c.telefone, c.celular].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 hidden lg:table-cell max-w-[200px] truncate">
                    {c.email || '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 hidden sm:table-cell whitespace-nowrap">
                    {c.documento || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'inativo' ? 'bg-gray-100 text-gray-700' : 'bg-green-50 text-green-800'
                      }`}
                    >
                      {c.status || 'ativo'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-gray-300"
                      onClick={() => abrirEdicao(c.id)}
                    >
                      <FiEdit2 className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-edit-cliente-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) fecharModal();
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 id="admin-edit-cliente-title" className="text-lg font-semibold text-gray-900">
                Editar cliente
              </h3>
              <button
                type="button"
                onClick={fecharModal}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {loadingCliente ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : (
              <form onSubmit={salvar} className="overflow-y-auto px-4 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                  <input
                    className={inputClass}
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                    <input
                      className={inputClass}
                      value={form.telefone}
                      onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
                    <input
                      className={inputClass}
                      value={form.celular}
                      onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Documento (CPF/CNPJ)</label>
                    <input
                      className={inputClass}
                      value={form.documento}
                      onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                    <select
                      className={inputClass}
                      value={form.tipo}
                      onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                    >
                      <option value="pf">Pessoa física</option>
                      <option value="pj">Pessoa jurídica</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CEP</label>
                  <input className={inputClass} value={form.cep} onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rua</label>
                  <input className={inputClass} value={form.rua} onChange={(e) => setForm((f) => ({ ...f, rua: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                    <input
                      className={inputClass}
                      value={form.numero}
                      onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Complemento</label>
                    <input
                      className={inputClass}
                      value={form.complemento}
                      onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
                  <input
                    className={inputClass}
                    value={form.bairro}
                    onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
                    <input
                      className={inputClass}
                      value={form.cidade}
                      onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                    <input
                      className={inputClass}
                      value={form.estado}
                      onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
                    <input
                      className={inputClass}
                      value={form.responsavel}
                      onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Origem</label>
                    <input
                      className={inputClass}
                      value={form.origem}
                      onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Aniversário</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.aniversario}
                    onChange={(e) => setForm((f) => ({ ...f, aniversario: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Senha de desbloqueio (se houver)</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={form.senha}
                    onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                  <textarea
                    className={`${inputClass} min-h-[80px]`}
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                  <Button type="button" variant="outline" onClick={fecharModal} className="border-gray-300" disabled={saving}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-gray-900 hover:bg-gray-800 text-white" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

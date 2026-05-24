'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiList, FiSearch, FiChevronDown } from 'react-icons/fi';
import type { TipoEquipamentoCatalogo } from '@/types/equipamentos';
import type { ChecklistItemCatalogo } from '@/types/checklist';
import { CHECKLIST_CATEGORIAS } from '@/types/checklist';

export default function ChecklistCatalogoClient() {
  const [tipos, setTipos] = useState<TipoEquipamentoCatalogo[]>([]);
  const [tipoId, setTipoId] = useState('');
  const [itens, setItens] = useState<ChecklistItemCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItens, setLoadingItens] = useState(false);
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ChecklistItemCatalogo | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    categoria: 'geral',
    ordem: 0,
    obrigatorio: false,
    ativo: true,
  });

  const tipoSelecionado = tipos.find((t) => t.id === tipoId);

  const fetchTipos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-saas/equipamentos-tipos-catalogo', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        const lista: TipoEquipamentoCatalogo[] = data.tipos || [];
        setTipos(lista);
        if (lista.length > 0) {
          setTipoId((prev) => prev || lista[0].id);
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao carregar tipos de equipamento' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchItens = useCallback(
    async (tipoAlvo: string, signal?: AbortSignal) => {
      if (!tipoAlvo) {
        setItens([]);
        return;
      }
      setLoadingItens(true);
      setItens([]);
      try {
        const tipo = tipos.find((t) => t.id === tipoAlvo);
        const params = new URLSearchParams({ tipo_id: tipoAlvo });
        if (tipo?.codigo) params.set('equipamento_categoria', tipo.codigo);

        const res = await fetch(`/api/admin-saas/checklist-catalogo?${params}`, {
          credentials: 'include',
          signal,
        });
        const data = await res.json();
        if (signal?.aborted) return;
        if (data.ok) setItens(data.itens || []);
        else setMessage({ type: 'error', text: data.error || 'Erro ao carregar checklist' });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setMessage({ type: 'error', text: 'Erro de conexão' });
      } finally {
        if (!signal?.aborted) setLoadingItens(false);
      }
    },
    [tipos]
  );

  useEffect(() => {
    fetchTipos();
  }, [fetchTipos]);

  useEffect(() => {
    if (!tipoId) return;
    const controller = new AbortController();
    fetchItens(tipoId, controller.signal);
    return () => controller.abort();
  }, [tipoId, fetchItens]);

  const filtered = itens.filter((item) => {
    const q = busca.toLowerCase();
    return (
      item.nome.toLowerCase().includes(q) ||
      (item.descricao?.toLowerCase().includes(q) ?? false) ||
      item.categoria.toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setForm({ nome: '', descricao: '', categoria: 'geral', ordem: 0, obrigatorio: false, ativo: true });
    setEditing(null);
  };

  const openEdit = (item: ChecklistItemCatalogo) => {
    setEditing(item);
    setForm({
      nome: item.nome,
      descricao: item.descricao || '',
      categoria: item.categoria,
      ordem: item.ordem,
      obrigatorio: item.obrigatorio,
      ativo: item.ativo,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoId || !form.nome.trim()) {
      setMessage({ type: 'error', text: 'Selecione o tipo e informe o nome do item' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        tipo_id: tipoId,
        equipamento_categoria: tipoSelecionado?.codigo,
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        categoria: form.categoria,
        ordem: form.ordem,
        obrigatorio: form.obrigatorio,
        ativo: form.ativo,
        ...(editing ? { id: editing.id } : {}),
      };
      const res = await fetch('/api/admin-saas/checklist-catalogo', {
        method: editing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: editing ? 'Item atualizado' : 'Item criado' });
        setShowModal(false);
        resetForm();
        fetchItens(tipoId);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este item do checklist?')) return;
    try {
      const res = await fetch(`/api/admin-saas/checklist-catalogo?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Item excluído' });
        fetchItens(tipoId);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    }
  };

  const categoriaLabel = (value: string) =>
    CHECKLIST_CATEGORIAS.find((c) => c.value === value)?.label || value;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiList className="text-gray-700" />
            Checklist por equipamento
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Itens padrão do catálogo Consert. Na OS o usuário escolhe <strong>Funciona</strong> ou{' '}
            <strong>Não funciona</strong> — use nomes curtos (ex: &quot;Touch&quot;, &quot;Câmera frontal&quot;).
          </p>
        </div>
        <button
          type="button"
          disabled={!tipoId}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          <FiPlus /> Novo item
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de equipamento</label>
          <div className="relative">
            <select
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value)}
              className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm bg-white"
            >
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.codigo})
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {tipoSelecionado && (
            <p className="text-xs text-gray-500 mt-2">
              Código: <span className="font-mono">{tipoSelecionado.codigo}</span>
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, descrição ou categoria..."
              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {tipos.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          Cadastre tipos de equipamento em &quot;Tipos equip.&quot; antes de configurar o checklist.
        </div>
      ) : loadingItens ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          Nenhum item para este tipo. Clique em &quot;Novo item&quot; para começar.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ordem</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Obrig.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ativo</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{item.ordem}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.nome}</div>
                    {item.descricao && (
                      <div className="text-xs text-gray-500 mt-0.5">{item.descricao}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{categoriaLabel(item.categoria)}</td>
                  <td className="px-4 py-3">{item.obrigatorio ? 'Sim' : '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-1.5 text-gray-500 hover:text-gray-900"
                      title="Editar"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 ml-1"
                      title="Excluir"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Editar item' : 'Novo item de checklist'}
              </h2>
              {tipoSelecionado && (
                <p className="text-sm text-gray-500">
                  Tipo: <strong>{tipoSelecionado.nome}</strong>
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {CHECKLIST_CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                  <input
                    type="number"
                    value={form.ordem}
                    onChange={(e) => setForm((f) => ({ ...f, ordem: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.obrigatorio}
                  onChange={(e) => setForm((f) => ({ ...f, obrigatorio: e.target.checked }))}
                />
                Item obrigatório na OS
              </label>
              {editing && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  />
                  Ativo
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

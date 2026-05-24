'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiSearch } from 'react-icons/fi';
import type { TipoEquipamentoCatalogo } from '@/types/equipamentos';

export default function TiposEquipamentoClient() {
  const [tipos, setTipos] = useState<TipoEquipamentoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TipoEquipamentoCatalogo | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ codigo: '', nome: '', descricao: '', ordem: 0, ativo: true });

  const fetchTipos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-saas/equipamentos-tipos-catalogo', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setTipos(data.tipos || []);
      else setMessage({ type: 'error', text: data.error || 'Erro ao carregar tipos' });
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTipos();
  }, [fetchTipos]);

  const filtered = tipos.filter((t) => {
    const q = busca.toLowerCase();
    return t.codigo.toLowerCase().includes(q) || t.nome.toLowerCase().includes(q);
  });

  const resetForm = () => {
    setForm({ codigo: '', nome: '', descricao: '', ordem: 0, ativo: true });
    setEditing(null);
  };

  const openEdit = (t: TipoEquipamentoCatalogo) => {
    setEditing(t);
    setForm({
      codigo: t.codigo,
      nome: t.nome,
      descricao: t.descricao || '',
      ordem: t.ordem,
      ativo: t.ativo,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo.trim() || !form.nome.trim()) {
      setMessage({ type: 'error', text: 'Código e nome são obrigatórios' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        codigo: form.codigo.toUpperCase(),
        nome: form.nome,
        descricao: form.descricao || null,
        ordem: form.ordem,
        ativo: form.ativo,
        ...(editing ? { id: editing.id } : {}),
      };
      const res = await fetch('/api/admin-saas/equipamentos-tipos-catalogo', {
        method: editing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar' });
        return;
      }
      setMessage({ type: 'success', text: editing ? 'Tipo atualizado!' : 'Tipo cadastrado!' });
      setShowModal(false);
      resetForm();
      fetchTipos();
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este tipo do catálogo global?')) return;
    try {
      const res = await fetch(`/api/admin-saas/equipamentos-tipos-catalogo?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setTipos((p) => p.filter((t) => t.id !== id));
        setMessage({ type: 'success', text: 'Tipo excluído' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiPackage className="text-gray-600" />
            Tipos de equipamento
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Catálogo global usado na Nova OS, checklist e filtro de aparelhos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          <FiPlus /> Novo tipo
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por código ou nome..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum tipo cadastrado</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ordem</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{t.ordem}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.codigo}</td>
                  <td className="px-4 py-3 font-medium">{t.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${t.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {t.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(t)} className="p-1.5 text-gray-500 hover:text-gray-900 mr-1">
                      <FiEdit2 size={16} />
                    </button>
                    <button type="button" onClick={() => handleDelete(t.id)} className="p-1.5 text-red-500 hover:text-red-700">
                      <FiTrash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar tipo' : 'Novo tipo'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="CELULAR"
                  required
                  disabled={!!editing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome exibido</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                <input
                  type="number"
                  value={form.ordem}
                  onChange={(e) => setForm((p) => ({ ...p, ordem: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {editing && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((p) => ({ ...p, ativo: e.target.checked }))} />
                  Ativo
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-2 border rounded-lg text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

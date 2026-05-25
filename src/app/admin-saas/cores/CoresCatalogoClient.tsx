'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiDroplet } from 'react-icons/fi';
import type { CorCatalogo } from '@/types/cores';

export default function CoresCatalogoClient() {
  const [cores, setCores] = useState<CorCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CorCatalogo | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ nome: '', hex: '', ordem: 500, ativo: true });

  const fetchCores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-saas/cores-catalogo?incluir_inativas=true', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.ok) setCores(data.cores || []);
      else setMessage({ type: 'error', text: data.error || 'Erro ao carregar cores' });
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCores();
  }, [fetchCores]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: '', hex: '#000000', ordem: 500, ativo: true });
    setShowModal(true);
  };

  const openEdit = (cor: CorCatalogo) => {
    setEditing(cor);
    setForm({
      nome: cor.nome,
      hex: cor.hex || '',
      ordem: cor.ordem,
      ativo: cor.ativo,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = form.nome.trim().toUpperCase();
    if (!nome) {
      setMessage({ type: 'error', text: 'Nome é obrigatório' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        nome,
        hex: form.hex.trim() || null,
        ordem: form.ordem,
        ativo: form.ativo,
        ...(editing ? { id: editing.id } : {}),
      };

      const res = await fetch('/api/admin-saas/cores-catalogo', {
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

      setMessage({ type: 'success', text: editing ? 'Cor atualizada!' : 'Cor cadastrada!' });
      setShowModal(false);
      fetchCores();
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta cor? Aparelhos que a usam podem perder a variante.')) return;
    try {
      const res = await fetch(`/api/admin-saas/cores-catalogo?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Cor excluída' });
        fetchCores();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiDroplet className="text-purple-600" />
            Cores do catálogo
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Lista usada ao cadastrar imagens por cor e na Nova OS.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
        >
          <FiPlus /> Nova cor
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Cor</th>
                <th className="px-4 py-3">Hex</th>
                <th className="px-4 py-3">Ordem</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cores.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      {c.hex && (
                        <span
                          className="w-5 h-5 rounded-full border border-gray-200"
                          style={{ backgroundColor: c.hex }}
                        />
                      )}
                      {c.hex || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.ordem}</td>
                  <td className="px-4 py-3">{c.ativo ? 'Ativo' : 'Inativo'}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(c)} className="p-2 text-gray-600 hover:text-black">
                      <FiEdit2 />
                    </button>
                    <button type="button" onClick={() => handleDelete(c.id)} className="p-2 text-red-600 hover:text-red-800">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar cor' : 'Nova cor'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value.toUpperCase() }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex: PRETO"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hex (opcional)</label>
                <input
                  type="text"
                  value={form.hex}
                  onChange={(e) => setForm((p) => ({ ...p, hex: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="#000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                <input
                  type="number"
                  value={form.ordem}
                  onChange={(e) => setForm((p) => ({ ...p, ordem: Number(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {editing && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm((p) => ({ ...p, ativo: e.target.checked }))}
                  />
                  Ativo
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
                >
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

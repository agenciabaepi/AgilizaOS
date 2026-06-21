'use client';

import { useState, useEffect, useCallback } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { bearerAuthHeadersForApi } from '@/lib/api/clientAuthHeaders';
import { supabase } from '@/lib/supabaseClient';
import { FiPlus, FiEdit2, FiTrash2, FiSmartphone, FiSearch } from 'react-icons/fi';
import type { AparelhoEmpresa } from '@/types/aparelhos';
import { resolveAparelhoImagens } from '@/lib/aparelhos-imagens';
import { flattenAparelhoImageFile } from '@/lib/aparelho-imagem-upload';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';

export default function AparelhosConfigPage({ embedded = false }: { embedded?: boolean }) {
  const { empresaData, session } = useAuth();
  const { addToast } = useToast();
  const { podeAcessar } = useConfigPermission('aparelhos');
  const [aparelhos, setAparelhos] = useState<AparelhoEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AparelhoEmpresa | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    marca: '',
    modelo: '',
    tipo: 'CELULAR',
    imagemFrenteFile: null as File | null,
    imagemVersoFile: null as File | null,
    imagem_frente_url: '',
    imagem_verso_url: '',
    ativo: true,
  });

  const fetchAparelhos = useCallback(async () => {
    if (!empresaData?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ empresa_id: empresaData.id });
      if (busca) params.set('busca', busca);
      const res = await fetch(`/api/aparelhos-empresa?${params}`, {
        headers: await bearerAuthHeadersForApi(session),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setAparelhos(data.aparelhos || []);
      else addToast('error', data.error || 'Erro ao carregar aparelhos');
    } catch {
      addToast('error', 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [empresaData?.id, session, busca, addToast]);

  useEffect(() => {
    fetchAparelhos();
  }, [fetchAparelhos]);

  const resetForm = () => {
    setForm({
      marca: '',
      modelo: '',
      tipo: 'CELULAR',
      imagemFrenteFile: null,
      imagemVersoFile: null,
      imagem_frente_url: '',
      imagem_verso_url: '',
      ativo: true,
    });
    setEditing(null);
  };

  const uploadImagem = async (file: File): Promise<string | null> => {
    const prepared = await flattenAparelhoImageFile(file);
    const path = `empresa-${empresaData?.id}/${Date.now()}_${prepared.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage.from('aparelhos').upload(path, prepared);
    if (error) return null;
    const { data } = supabase.storage.from('aparelhos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaData?.id || !form.marca.trim() || !form.modelo.trim()) {
      addToast('error', 'Marca e modelo são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      let imagem_frente_url = form.imagem_frente_url || null;
      let imagem_verso_url = form.imagem_verso_url || null;
      if (form.imagemFrenteFile) {
        const uploaded = await uploadImagem(form.imagemFrenteFile);
        if (uploaded) imagem_frente_url = uploaded;
      }
      if (form.imagemVersoFile) {
        const uploaded = await uploadImagem(form.imagemVersoFile);
        if (uploaded) imagem_verso_url = uploaded;
      }

      const payload = {
        empresa_id: empresaData.id,
        marca: form.marca,
        modelo: form.modelo,
        tipo: form.tipo,
        imagem_frente_url,
        imagem_verso_url,
        ativo: form.ativo,
        ...(editing ? { id: editing.id } : {}),
      };

      const res = await fetch('/api/aparelhos-empresa', {
        method: editing ? 'PUT' : 'POST',
        headers: await bearerAuthHeadersForApi(session, { 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast('error', data.error || 'Erro ao salvar aparelho');
        return;
      }

      addToast('success', editing ? 'Aparelho atualizado!' : 'Aparelho cadastrado!');
      setShowModal(false);
      resetForm();
      fetchAparelhos();
    } catch {
      addToast('error', 'Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este aparelho?')) return;
    try {
      const res = await fetch(`/api/aparelhos-empresa?id=${id}`, {
        method: 'DELETE',
        headers: await bearerAuthHeadersForApi(session),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setAparelhos((prev) => prev.filter((a) => a.id !== id));
        addToast('success', 'Aparelho excluído');
      } else {
        addToast('error', data.error || 'Erro ao excluir');
      }
    } catch {
      addToast('error', 'Erro de conexão');
    }
  };

  if (!podeAcessar) {
    const denied = <AcessoNegadoComponent />;
    return embedded ? denied : <MenuLayout><div className="p-8">{denied}</div></MenuLayout>;
  }

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiSmartphone className="text-gray-600" />
            Meus Aparelhos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Aparelhos cadastrados pela sua empresa, disponíveis apenas para você.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          <FiPlus /> Novo aparelho
        </button>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por marca ou modelo..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : aparelhos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum aparelho cadastrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Imagem</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Marca</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Modelo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {aparelhos.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(() => {
                          const { frente, verso } = resolveAparelhoImagens(a);
                          if (!frente && !verso) {
                            return (
                              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                                <FiSmartphone className="text-gray-400" />
                              </div>
                            );
                          }
                          return (
                            <>
                              {frente && <img src={frente} alt="Frente" className="w-10 h-10 object-contain rounded bg-gray-50" />}
                              {verso && <img src={verso} alt="Verso" className="w-10 h-10 object-contain rounded bg-gray-50" />}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{a.marca}</td>
                    <td className="px-4 py-3">{a.modelo}</td>
                    <td className="px-4 py-3 text-gray-500">{a.tipo}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(a);
                          setForm({
                            marca: a.marca,
                            modelo: a.modelo,
                            tipo: a.tipo || 'CELULAR',
                            imagemFrenteFile: null,
                            imagemVersoFile: null,
                            imagem_frente_url: a.imagem_frente_url || a.imagem_url || '',
                            imagem_verso_url: a.imagem_verso_url || '',
                            ativo: a.ativo,
                          });
                          setShowModal(true);
                        }}
                        className="p-1.5 text-gray-500 hover:text-gray-900 mr-1"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button type="button" onClick={() => handleDelete(a.id)} className="p-1.5 text-red-500 hover:text-red-700">
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Editar aparelho' : 'Novo aparelho'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input
                type="text"
                placeholder="Marca"
                value={form.marca}
                onChange={(e) => setForm((p) => ({ ...p, marca: e.target.value.toUpperCase() }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Modelo"
                value={form.modelo}
                onChange={(e) => setForm((p) => ({ ...p, modelo: e.target.value.toUpperCase() }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <select
                value={form.tipo}
                onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="CELULAR">CELULAR</option>
                <option value="NOTEBOOK">NOTEBOOK</option>
                <option value="TABLET">TABLET</option>
                <option value="SMARTWATCH">SMARTWATCH</option>
                <option value="OUTRO">OUTRO</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Foto frente</label>
                  {(form.imagem_frente_url && !form.imagemFrenteFile) && (
                    <img src={form.imagem_frente_url} alt="Frente" className="w-full max-h-20 object-contain mb-1 rounded bg-gray-50" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((p) => ({ ...p, imagemFrenteFile: e.target.files?.[0] || null }))}
                    className="w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Foto verso</label>
                  {(form.imagem_verso_url && !form.imagemVersoFile) && (
                    <img src={form.imagem_verso_url} alt="Verso" className="w-full max-h-20 object-contain mb-1 rounded bg-gray-50" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((p) => ({ ...p, imagemVersoFile: e.target.files?.[0] || null }))}
                    className="w-full text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return embedded ? content : <MenuLayout>{content}</MenuLayout>;
}

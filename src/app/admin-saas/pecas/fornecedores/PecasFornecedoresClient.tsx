'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiEdit2, FiImage, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import type { PecaFornecedorCatalogo } from '@/types/pecas';
import ToggleSwitch from '@/components/ToggleSwitch';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function PecasFornecedoresClient() {
  const [items, setItems] = useState<PecaFornecedorCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PecaFornecedorCatalogo | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', slug: '', imagem_url: '', ordem: 100, ativo: true });
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-saas/pecas-fornecedores-catalogo?incluir_inativos=true', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.ok) setItems(data.fornecedores || []);
      else setMessage({ type: 'error', text: data.error || 'Erro ao carregar' });
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: '', slug: '', imagem_url: '', ordem: 100, ativo: true });
    setImagemFile(null);
    setImagemPreview(null);
    setShowModal(true);
  };

  const openEdit = (f: PecaFornecedorCatalogo) => {
    setEditing(f);
    setForm({
      nome: f.nome,
      slug: f.slug,
      imagem_url: f.imagem_url || '',
      ordem: f.ordem,
      ativo: f.ativo,
    });
    setImagemFile(null);
    setImagemPreview(f.imagem_url || null);
    setShowModal(true);
  };

  const onImagemChange = (file: File | null) => {
    setImagemFile(file);
    if (file) setImagemPreview(URL.createObjectURL(file));
    else setImagemPreview(form.imagem_url || null);
  };

  const uploadImagem = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin-saas/pecas-fornecedores-catalogo/upload', {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || data.hint || 'Falha no upload da imagem');
    }
    return data.url as string;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      let imagemUrl = form.imagem_url.trim() || null;
      if (imagemFile) imagemUrl = await uploadImagem(imagemFile);

      const payload = {
        ...(editing ? { id: editing.id } : {}),
        nome: form.nome.trim(),
        slug: form.slug.trim() || slugify(form.nome),
        imagem_url: imagemUrl,
        ordem: Number(form.ordem) || 100,
        ativo: form.ativo,
      };

      const res = await fetch('/api/admin-saas/pecas-fornecedores-catalogo', {
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
      setMessage({
        type: 'success',
        text: editing ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!',
      });
      setShowModal(false);
      setImagemFile(null);
      setImagemPreview(null);
      fetchAll();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro de conexão',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este fornecedor? Peças vinculadas ficarão sem fornecedor.')) return;
    try {
      const res = await fetch(`/api/admin-saas/pecas-fornecedores-catalogo?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Fornecedor excluído' });
        fetchAll();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    }
  };

  const toggleAtivo = async (item: PecaFornecedorCatalogo) => {
    const next = !item.ativo;
    setTogglingId(item.id);
    setItems((list) => list.map((f) => (f.id === item.id ? { ...f, ativo: next } : f)));
    try {
      const res = await fetch('/api/admin-saas/pecas-fornecedores-catalogo', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, ativo: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setItems((list) => list.map((f) => (f.id === item.id ? { ...f, ativo: item.ativo } : f)));
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar' });
      }
    } catch {
      setItems((list) => list.map((f) => (f.id === item.id ? { ...f, ativo: item.ativo } : f)));
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            href="/admin-saas/pecas"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2"
          >
            <FiArrowLeft /> Voltar às peças
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores / marcas da peça</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre com logo para selecionar no cadastro da peça e exibir na lista pública.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
        >
          <FiPlus /> Novo fornecedor
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
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
          Nenhum fornecedor cadastrado ainda.
        </div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-11 h-11 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0 p-1.5">
                {item.imagem_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imagem_url}
                    alt={item.nome}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <FiImage className="text-zinc-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900">{item.nome}</div>
                <div className="text-xs text-gray-400">{item.slug}</div>
              </div>
              <ToggleSwitch
                checked={item.ativo}
                disabled={togglingId === item.id}
                label={item.ativo ? 'Desativar' : 'Ativar'}
                onChange={() => void toggleAtivo(item)}
              />
              <button
                type="button"
                onClick={() => openEdit(item)}
                className="p-2 text-gray-500 hover:text-gray-900"
                aria-label="Editar"
              >
                <FiEdit2 />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-2 text-gray-500 hover:text-red-600"
                aria-label="Excluir"
              >
                <FiTrash2 />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <form
            onSubmit={handleSave}
            className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 space-y-3 max-h-[92vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold">
              {editing ? 'Editar fornecedor' : 'Novo fornecedor'}
            </h2>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-3">
              <span className="text-xs font-medium text-gray-600">Logo</span>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0 p-2">
                  {imagemPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagemPreview} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <FiImage className="w-7 h-7 text-zinc-300" />
                  )}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => onImagemChange(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-black text-white rounded-lg text-sm font-medium"
                  >
                    <FiImage /> {imagemPreview ? 'Trocar imagem' : 'Enviar imagem'}
                  </button>
                  {(imagemPreview || form.imagem_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagemFile(null);
                        setImagemPreview(null);
                        setForm((f) => ({ ...f, imagem_url: '' }));
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600"
                    >
                      <FiX size={14} /> Remover logo
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-500">PNG, JPG, WEBP ou SVG — máx. 2MB</p>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-gray-600">Nome *</span>
              <input
                required
                value={form.nome}
                onChange={(e) => {
                  const nome = e.target.value;
                  setForm((f) => ({
                    ...f,
                    nome,
                    slug: editing ? f.slug : slugify(nome),
                  }));
                }}
                placeholder="Ex: Soft OLED, JK, GX"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-600">
                URL do logo <span className="text-gray-400">(opcional)</span>
              </span>
              <input
                value={form.imagem_url}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, imagem_url: v }));
                  if (!imagemFile) setImagemPreview(v.trim() || null);
                }}
                placeholder="https://..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
              />
              Ativo
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setImagemFile(null);
                  setImagemPreview(null);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

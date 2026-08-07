'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiLayers, FiSearch, FiTag } from 'react-icons/fi';
import type {
  PecaCatalogo,
  PecaGrupoCatalogo,
  PecaCategoriaCatalogo,
  PecaSubcategoriaCatalogo,
  PecaFornecedorCatalogo,
} from '@/types/pecas';
import ToggleSwitch from '@/components/ToggleSwitch';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const emptyForm = {
  grupo_id: '',
  categoria_id: '',
  subcategoria_id: '',
  fornecedor_id: '',
  codigo: '',
  nome: '',
  descricao: '',
  modelo_compativel: '',
  preco: '',
  custo: '',
  estoque: '0',
  estoque_min: '0',
  unidade: 'UN',
  imagem_url: '',
  ativo: true,
  destaque: false,
  ordem: 100,
};

export default function PecasCatalogoClient() {
  const [pecas, setPecas] = useState<PecaCatalogo[]>([]);
  const [grupos, setGrupos] = useState<PecaGrupoCatalogo[]>([]);
  const [categorias, setCategorias] = useState<PecaCategoriaCatalogo[]>([]);
  const [subcategorias, setSubcategorias] = useState<PecaSubcategoriaCatalogo[]>([]);
  const [fornecedores, setFornecedores] = useState<PecaFornecedorCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PecaCatalogo | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroBaixoEstoque, setFiltroBaixoEstoque] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchGrupos = useCallback(async () => {
    const res = await fetch('/api/admin-saas/pecas-grupos-catalogo?incluir_inativos=true', {
      credentials: 'include',
      cache: 'no-store',
    });
    const data = await res.json();
    if (data.ok) setGrupos(data.grupos || []);
  }, []);

  const fetchCategorias = useCallback(async (grupoId?: string) => {
    const qs = new URLSearchParams({ incluir_inativos: 'true' });
    if (grupoId) qs.set('grupo_id', grupoId);
    const res = await fetch(`/api/admin-saas/pecas-categorias-catalogo?${qs}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    const data = await res.json();
    if (data.ok) setCategorias(data.categorias || []);
  }, []);

  const fetchSubcategorias = useCallback(async (categoriaId?: string) => {
    if (!categoriaId) {
      setSubcategorias([]);
      return;
    }
    const qs = new URLSearchParams({ incluir_inativos: 'true', categoria_id: categoriaId });
    const res = await fetch(`/api/admin-saas/pecas-subcategorias-catalogo?${qs}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    const data = await res.json();
    if (data.ok) setSubcategorias(data.subcategorias || []);
  }, []);

  const fetchFornecedores = useCallback(async () => {
    const res = await fetch('/api/admin-saas/pecas-fornecedores-catalogo?incluir_inativos=true', {
      credentials: 'include',
      cache: 'no-store',
    });
    const data = await res.json();
    if (data.ok) setFornecedores(data.fornecedores || []);
  }, []);

  const fetchPecas = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ incluir_inativos: 'true' });
      if (busca.trim()) qs.set('busca', busca.trim());
      if (filtroGrupo) qs.set('grupo_id', filtroGrupo);
      if (filtroBaixoEstoque) qs.set('baixo_estoque', 'true');

      const res = await fetch(`/api/admin-saas/pecas-catalogo?${qs}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.ok) setPecas(data.pecas || []);
      else setMessage({ type: 'error', text: data.error || 'Erro ao carregar peças' });
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  }, [busca, filtroGrupo, filtroBaixoEstoque]);

  useEffect(() => {
    fetchGrupos();
    fetchFornecedores();
  }, [fetchGrupos, fetchFornecedores]);

  useEffect(() => {
    fetchPecas();
  }, [fetchPecas]);

  useEffect(() => {
    if (form.grupo_id) fetchCategorias(form.grupo_id);
    else setCategorias([]);
  }, [form.grupo_id, fetchCategorias]);

  useEffect(() => {
    if (form.categoria_id) fetchSubcategorias(form.categoria_id);
    else setSubcategorias([]);
  }, [form.categoria_id, fetchSubcategorias]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, grupo_id: filtroGrupo || '' });
    setShowModal(true);
  };

  const openEdit = (peca: PecaCatalogo) => {
    setEditing(peca);
    setForm({
      grupo_id: peca.grupo_id,
      categoria_id: peca.categoria_id || '',
      subcategoria_id: peca.subcategoria_id || '',
      fornecedor_id: peca.fornecedor_id || '',
      codigo: peca.codigo || '',
      nome: peca.nome,
      descricao: peca.descricao || '',
      modelo_compativel: peca.modelo_compativel || '',
      preco: String(peca.preco ?? ''),
      custo: peca.custo != null ? String(peca.custo) : '',
      estoque: String(peca.estoque ?? 0),
      estoque_min: String(peca.estoque_min ?? 0),
      unidade: peca.unidade || 'UN',
      imagem_url: peca.imagem_url || '',
      ativo: peca.ativo,
      destaque: peca.destaque,
      ordem: peca.ordem,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta peça?')) return;
    try {
      const res = await fetch(`/api/admin-saas/pecas-catalogo?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Peça excluída' });
        fetchPecas();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    }
  };

  const toggleAtivo = async (peca: PecaCatalogo) => {
    const next = !peca.ativo;
    setTogglingId(peca.id);
    setPecas((list) => list.map((p) => (p.id === peca.id ? { ...p, ativo: next } : p)));
    try {
      const res = await fetch('/api/admin-saas/pecas-catalogo', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: peca.id, ativo: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPecas((list) => list.map((p) => (p.id === peca.id ? { ...p, ativo: peca.ativo } : p)));
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar status' });
      }
    } catch {
      setPecas((list) => list.map((p) => (p.id === peca.id ? { ...p, ativo: peca.ativo } : p)));
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setTogglingId(null);
    }
  };

  const categoriasDoForm = categorias.filter((c) => c.grupo_id === form.grupo_id);
  const subcategoriasDoForm = subcategorias.filter((s) => s.categoria_id === form.categoria_id);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.grupo_id) {
      setMessage({ type: 'error', text: 'Nome e grupo são obrigatórios' });
      return;
    }
    if (!form.categoria_id) {
      setMessage({ type: 'error', text: 'Selecione a marca (ex: iPhone, Samsung)' });
      return;
    }
    if (subcategoriasDoForm.length > 0 && !form.subcategoria_id) {
      setMessage({ type: 'error', text: 'Selecione o tipo (OLED, Incell, Vivid…)' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        grupo_id: form.grupo_id,
        categoria_id: form.categoria_id || null,
        subcategoria_id: form.subcategoria_id || null,
        fornecedor_id: form.fornecedor_id || null,
        codigo: form.codigo.trim() || null,
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        modelo_compativel: form.modelo_compativel.trim() || null,
        preco: Number(form.preco) || 0,
        custo: form.custo !== '' ? Number(form.custo) : null,
        estoque: Number(form.estoque) || 0,
        estoque_min: Number(form.estoque_min) || 0,
        unidade: form.unidade.trim() || 'UN',
        imagem_url: form.imagem_url.trim() || null,
        ativo: form.ativo,
        destaque: form.destaque,
        ordem: Number(form.ordem) || 100,
      };

      const res = await fetch('/api/admin-saas/pecas-catalogo', {
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

      setMessage({ type: 'success', text: editing ? 'Peça atualizada!' : 'Peça cadastrada!' });
      setShowModal(false);
      fetchPecas();
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiPackage className="text-emerald-600" />
            Peças (catálogo)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cadastro, estoque e disponibilidade das peças exibidas em{' '}
            <Link href="/pecas" className="underline hover:text-gray-800" target="_blank">
              /pecas
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin-saas/pecas/fornecedores"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FiTag /> Fornecedores
          </Link>
          <Link
            href="/admin-saas/pecas/grupos"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FiLayers /> Grupos
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
          >
            <FiPlus /> Nova peça
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, código, marca..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select
          value={filtroGrupo}
          onChange={(e) => setFiltroGrupo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">Todos os grupos</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700 px-2">
          <input
            type="checkbox"
            checked={filtroBaixoEstoque}
            onChange={(e) => setFiltroBaixoEstoque(e.target.checked)}
          />
          Baixo estoque
        </label>
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
      ) : pecas.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
          Nenhuma peça cadastrada. Cadastre grupos e depois as peças.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Peça</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Grupo</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Estoque</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pecas.map((peca) => {
                  const baixo = peca.estoque <= peca.estoque_min;
                  return (
                    <tr key={peca.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{peca.nome}</div>
                        <div className="text-xs text-gray-500">
                          {[
                            peca.codigo,
                            peca.fornecedor?.nome || peca.marca,
                            peca.modelo_compativel,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                        <div className="text-xs text-gray-400 md:hidden mt-0.5">
                          {peca.grupo?.nome}
                          {peca.categoria?.nome ? ` / ${peca.categoria.nome}` : ''}
                          {peca.subcategoria?.nome ? ` / ${peca.subcategoria.nome}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                        {peca.grupo?.nome}
                        {peca.categoria?.nome ? (
                          <span className="text-gray-400"> / {peca.categoria.nome}</span>
                        ) : null}
                        {peca.subcategoria?.nome ? (
                          <span className="text-gray-400"> / {peca.subcategoria.nome}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatMoney(Number(peca.preco))}</td>
                      <td className="px-4 py-3">
                        <span className={baixo ? 'text-amber-700 font-semibold' : 'text-gray-900'}>
                          {peca.estoque}
                        </span>
                        <span className="text-gray-400 text-xs"> / mín {peca.estoque_min}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ToggleSwitch
                            checked={peca.ativo}
                            disabled={togglingId === peca.id}
                            label={peca.ativo ? 'Desativar peça' : 'Ativar peça'}
                            onChange={() => void toggleAtivo(peca)}
                          />
                          <span className={`text-xs ${peca.ativo ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {peca.ativo ? 'Ativo' : 'Off'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(peca)}
                          className="p-2 text-gray-500 hover:text-gray-900"
                          aria-label="Editar"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(peca.id)}
                          className="p-2 text-gray-500 hover:text-red-600"
                          aria-label="Excluir"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[92vh] overflow-y-auto">
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Editar peça' : 'Nova peça'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Grupo *</span>
                  <select
                    required
                    value={form.grupo_id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        grupo_id: e.target.value,
                        categoria_id: '',
                        subcategoria_id: '',
                      }))
                    }
                    className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Selecione (ex: Telas)</option>
                    {grupos
                      .filter((g) => g.ativo || g.id === form.grupo_id)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nome}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Marca *</span>
                  <select
                    required
                    value={form.categoria_id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        categoria_id: e.target.value,
                        subcategoria_id: '',
                      }))
                    }
                    className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                    disabled={!form.grupo_id}
                  >
                    <option value="">Selecione (ex: iPhone)</option>
                    {categoriasDoForm.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-900">
                      Tipo * <span className="font-normal text-emerald-700/80">(OLED, Incell, Vivid, LCD…)</span>
                    </span>
                    <Link
                      href="/admin-saas/pecas/grupos"
                      className="text-[11px] text-emerald-800 underline"
                      target="_blank"
                    >
                      Gerenciar tipos
                    </Link>
                  </div>

                  {!form.categoria_id ? (
                    <p className="text-xs text-emerald-800/70">Selecione a marca para ver os tipos.</p>
                  ) : subcategoriasDoForm.length === 0 ? (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Nenhum tipo cadastrado para esta marca. Cadastre OLED, Incell, Vivid etc. em{' '}
                      <Link href="/admin-saas/pecas/grupos" className="underline font-medium" target="_blank">
                        Grupos
                      </Link>
                      .
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {subcategoriasDoForm.map((s) => {
                        const ativo = form.subcategoria_id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, subcategoria_id: s.id }))}
                            className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              ativo
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400'
                            }`}
                          >
                            {s.nome}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <input type="hidden" value={form.subcategoria_id} readOnly />
                </div>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Nome da peça *</span>
                  <input
                    required
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: iPhone 11"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Código</span>
                  <input
                    value={form.codigo}
                    onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-600">Fornecedor / marca peça</span>
                    <Link
                      href="/admin-saas/pecas/fornecedores"
                      className="text-[11px] text-gray-500 underline"
                      target="_blank"
                    >
                      Gerenciar
                    </Link>
                  </div>
                  <select
                    value={form.fornecedor_id}
                    onChange={(e) => setForm((f) => ({ ...f, fornecedor_id: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Sem fornecedor</option>
                    {fornecedores
                      .filter((f) => f.ativo || f.id === form.fornecedor_id)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                  </select>
                  {fornecedores.length === 0 && (
                    <p className="text-[11px] text-amber-700 mt-1">
                      Cadastre fornecedores em{' '}
                      <Link href="/admin-saas/pecas/fornecedores" className="underline" target="_blank">
                        Fornecedores
                      </Link>{' '}
                      para selecionar aqui.
                    </p>
                  )}
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Modelo compatível</span>
                  <input
                    value={form.modelo_compativel}
                    onChange={(e) => setForm((f) => ({ ...f, modelo_compativel: e.target.value }))}
                    placeholder="Ex: iPhone 13 / 13 Pro"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Preço</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.preco}
                    onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Custo</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.custo}
                    onChange={(e) => setForm((f) => ({ ...f, custo: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Estoque</span>
                  <input
                    type="number"
                    min="0"
                    value={form.estoque}
                    onChange={(e) => setForm((f) => ({ ...f, estoque: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-600">Estoque mínimo</span>
                  <input
                    type="number"
                    min="0"
                    value={form.estoque_min}
                    onChange={(e) => setForm((f) => ({ ...f, estoque_min: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-gray-600">URL da imagem</span>
                  <input
                    value={form.imagem_url}
                    onChange={(e) => setForm((f) => ({ ...f, imagem_url: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-gray-600">Descrição</span>
                  <textarea
                    rows={2}
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  />
                  Ativo
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.destaque}
                    onChange={(e) => setForm((f) => ({ ...f, destaque: e.target.checked }))}
                  />
                  Destaque
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-50"
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

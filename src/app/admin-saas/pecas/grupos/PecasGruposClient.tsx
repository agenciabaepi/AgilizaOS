'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { FiPlus, FiEdit2, FiTrash2, FiLayers, FiArrowLeft, FiDownload, FiImage, FiX } from 'react-icons/fi';
import type {
  PecaGrupoCatalogo,
  PecaCategoriaCatalogo,
  PecaSubcategoriaCatalogo,
} from '@/types/pecas';
import { PECAS_MARCAS_PADRAO } from '@/lib/pecas-marcas';
import MarcaLogo from '@/components/MarcaLogo';
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

export default function PecasGruposClient() {
  const [grupos, setGrupos] = useState<PecaGrupoCatalogo[]>([]);
  const [categorias, setCategorias] = useState<PecaCategoriaCatalogo[]>([]);
  const [subcategorias, setSubcategorias] = useState<PecaSubcategoriaCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showGrupoModal, setShowGrupoModal] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<PecaGrupoCatalogo | null>(null);
  const [savingGrupo, setSavingGrupo] = useState(false);
  const [grupoForm, setGrupoForm] = useState({
    nome: '',
    slug: '',
    descricao: '',
    icone: '',
    ordem: 100,
    ativo: true,
  });

  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<PecaCategoriaCatalogo | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const [catForm, setCatForm] = useState({
    grupo_id: '',
    nome: '',
    slug: '',
    imagem_url: '',
    ordem: 100,
    ativo: true,
  });
  const [catImagemFile, setCatImagemFile] = useState<File | null>(null);
  const [catImagemPreview, setCatImagemPreview] = useState<string | null>(null);
  const catFileRef = useRef<HTMLInputElement>(null);

  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState<PecaSubcategoriaCatalogo | null>(null);
  const [savingSub, setSavingSub] = useState(false);
  const [subForm, setSubForm] = useState({
    categoria_id: '',
    nome: '',
    slug: '',
    ordem: 100,
    ativo: true,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, cRes, sRes] = await Promise.all([
        fetch('/api/admin-saas/pecas-grupos-catalogo?incluir_inativos=true', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/admin-saas/pecas-categorias-catalogo?incluir_inativos=true', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/admin-saas/pecas-subcategorias-catalogo?incluir_inativos=true', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ]);
      const gData = await gRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      if (gData.ok) setGrupos(gData.grupos || []);
      else setMessage({ type: 'error', text: gData.error || 'Erro ao carregar grupos' });
      if (cData.ok) setCategorias(cData.categorias || []);
      if (sData.ok) setSubcategorias(sData.subcategorias || []);
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  }, []);

  const seedMarcas = async () => {
    if (
      !confirm(
        `Importar ${PECAS_MARCAS_PADRAO.length} marcas padrão (iPhone, Samsung, Xiaomi...) com logos em todos os grupos?`
      )
    ) {
      return;
    }
    setSeeding(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin-saas/pecas-categorias-catalogo/seed-marcas', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forcar_logo: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao importar marcas' });
        return;
      }
      setMessage({ type: 'success', text: data.message || 'Marcas importadas!' });
      fetchAll();
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreateGrupo = () => {
    setEditingGrupo(null);
    setGrupoForm({ nome: '', slug: '', descricao: '', icone: '', ordem: 100, ativo: true });
    setShowGrupoModal(true);
  };

  const openEditGrupo = (g: PecaGrupoCatalogo) => {
    setEditingGrupo(g);
    setGrupoForm({
      nome: g.nome,
      slug: g.slug,
      descricao: g.descricao || '',
      icone: g.icone || '',
      ordem: g.ordem,
      ativo: g.ativo,
    });
    setShowGrupoModal(true);
  };

  const saveGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoForm.nome.trim()) return;
    setSavingGrupo(true);
    setMessage(null);
    try {
      const payload = {
        ...(editingGrupo ? { id: editingGrupo.id } : {}),
        nome: grupoForm.nome.trim(),
        slug: grupoForm.slug.trim() || slugify(grupoForm.nome),
        descricao: grupoForm.descricao.trim() || null,
        icone: grupoForm.icone.trim() || null,
        ordem: Number(grupoForm.ordem) || 100,
        ativo: grupoForm.ativo,
      };
      const res = await fetch('/api/admin-saas/pecas-grupos-catalogo', {
        method: editingGrupo ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar grupo' });
        return;
      }
      setMessage({ type: 'success', text: editingGrupo ? 'Grupo atualizado!' : 'Grupo criado!' });
      setShowGrupoModal(false);
      fetchAll();
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSavingGrupo(false);
    }
  };

  const deleteGrupo = async (id: string) => {
    if (!confirm('Excluir este grupo?')) return;
    try {
      const res = await fetch(`/api/admin-saas/pecas-grupos-catalogo?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Grupo excluído' });
        fetchAll();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    }
  };

  const openCreateCat = (grupoId?: string) => {
    setEditingCat(null);
    setCatForm({
      grupo_id: grupoId || grupos[0]?.id || '',
      nome: '',
      slug: '',
      imagem_url: '',
      ordem: 100,
      ativo: true,
    });
    setCatImagemFile(null);
    setCatImagemPreview(null);
    setShowCatModal(true);
  };

  const openEditCat = (c: PecaCategoriaCatalogo) => {
    setEditingCat(c);
    setCatForm({
      grupo_id: c.grupo_id,
      nome: c.nome,
      slug: c.slug,
      imagem_url: c.imagem_url || '',
      ordem: c.ordem,
      ativo: c.ativo,
    });
    setCatImagemFile(null);
    setCatImagemPreview(c.imagem_url || null);
    setShowCatModal(true);
  };

  const onCatImagemChange = (file: File | null) => {
    setCatImagemFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setCatImagemPreview(url);
    } else {
      setCatImagemPreview(catForm.imagem_url || null);
    }
  };

  const uploadMarcaImagem = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin-saas/pecas-categorias-catalogo/upload', {
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

  const saveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.nome.trim() || !catForm.grupo_id) return;
    setSavingCat(true);
    setMessage(null);
    try {
      let imagemUrl = catForm.imagem_url.trim() || null;
      if (catImagemFile) {
        imagemUrl = await uploadMarcaImagem(catImagemFile);
      }

      const payload = {
        ...(editingCat ? { id: editingCat.id } : {}),
        grupo_id: catForm.grupo_id,
        nome: catForm.nome.trim(),
        slug: catForm.slug.trim() || slugify(catForm.nome),
        imagem_url: imagemUrl,
        ordem: Number(catForm.ordem) || 100,
        ativo: catForm.ativo,
      };
      const res = await fetch('/api/admin-saas/pecas-categorias-catalogo', {
        method: editingCat ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar marca' });
        return;
      }
      setMessage({
        type: 'success',
        text: editingCat ? 'Marca atualizada!' : 'Marca cadastrada!',
      });
      setShowCatModal(false);
      setCatImagemFile(null);
      setCatImagemPreview(null);
      fetchAll();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro de conexão',
      });
    } finally {
      setSavingCat(false);
    }
  };

  const deleteCat = async (id: string) => {
    if (!confirm('Excluir esta categoria?')) return;
    try {
      const res = await fetch(`/api/admin-saas/pecas-categorias-catalogo?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Categoria excluída' });
        fetchAll();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    }
  };

  const openCreateSub = (categoriaId?: string) => {
    setEditingSub(null);
    setSubForm({
      categoria_id: categoriaId || categorias[0]?.id || '',
      nome: '',
      slug: '',
      ordem: 100,
      ativo: true,
    });
    setShowSubModal(true);
  };

  const openEditSub = (s: PecaSubcategoriaCatalogo) => {
    setEditingSub(s);
    setSubForm({
      categoria_id: s.categoria_id,
      nome: s.nome,
      slug: s.slug,
      ordem: s.ordem,
      ativo: s.ativo,
    });
    setShowSubModal(true);
  };

  const saveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.nome.trim() || !subForm.categoria_id) return;
    setSavingSub(true);
    setMessage(null);
    try {
      const payload = {
        ...(editingSub ? { id: editingSub.id } : {}),
        categoria_id: subForm.categoria_id,
        nome: subForm.nome.trim(),
        slug: subForm.slug.trim() || slugify(subForm.nome),
        ordem: Number(subForm.ordem) || 100,
        ativo: subForm.ativo,
      };
      const res = await fetch('/api/admin-saas/pecas-subcategorias-catalogo', {
        method: editingSub ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar subcategoria' });
        return;
      }
      setMessage({
        type: 'success',
        text: editingSub ? 'Subcategoria atualizada!' : 'Subcategoria criada!',
      });
      setShowSubModal(false);
      fetchAll();
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSavingSub(false);
    }
  };

  const deleteSub = async (id: string) => {
    if (!confirm('Excluir esta subcategoria?')) return;
    try {
      const res = await fetch(`/api/admin-saas/pecas-subcategorias-catalogo?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Subcategoria excluída' });
        fetchAll();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    }
  };

  const toggleGrupoAtivo = async (g: PecaGrupoCatalogo) => {
    const next = !g.ativo;
    const key = `g:${g.id}`;
    setTogglingKey(key);
    setGrupos((list) => list.map((x) => (x.id === g.id ? { ...x, ativo: next } : x)));
    try {
      const res = await fetch('/api/admin-saas/pecas-grupos-catalogo', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: g.id, ativo: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setGrupos((list) => list.map((x) => (x.id === g.id ? { ...x, ativo: g.ativo } : x)));
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar grupo' });
      }
    } catch {
      setGrupos((list) => list.map((x) => (x.id === g.id ? { ...x, ativo: g.ativo } : x)));
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setTogglingKey(null);
    }
  };

  const toggleCatAtivo = async (c: PecaCategoriaCatalogo) => {
    const next = !c.ativo;
    const key = `c:${c.id}`;
    setTogglingKey(key);
    setCategorias((list) => list.map((x) => (x.id === c.id ? { ...x, ativo: next } : x)));
    try {
      const res = await fetch('/api/admin-saas/pecas-categorias-catalogo', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, ativo: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCategorias((list) => list.map((x) => (x.id === c.id ? { ...x, ativo: c.ativo } : x)));
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar marca' });
      }
    } catch {
      setCategorias((list) => list.map((x) => (x.id === c.id ? { ...x, ativo: c.ativo } : x)));
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setTogglingKey(null);
    }
  };

  const toggleSubAtivo = async (s: PecaSubcategoriaCatalogo) => {
    const next = !s.ativo;
    const key = `s:${s.id}`;
    setTogglingKey(key);
    setSubcategorias((list) => list.map((x) => (x.id === s.id ? { ...x, ativo: next } : x)));
    try {
      const res = await fetch('/api/admin-saas/pecas-subcategorias-catalogo', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, ativo: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubcategorias((list) => list.map((x) => (x.id === s.id ? { ...x, ativo: s.ativo } : x)));
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar tipo' });
      }
    } catch {
      setSubcategorias((list) => list.map((x) => (x.id === s.id ? { ...x, ativo: s.ativo } : x)));
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <Link
            href="/admin-saas/pecas"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2"
          >
            <FiArrowLeft /> Voltar às peças
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiLayers className="text-emerald-600" />
            Grupos, categorias e tipos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Hierarquia: Grupo → Marca → Tipo (ex: Telas → iPhone → OLED). Logos via Simple Icons.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={seedMarcas}
            disabled={seeding}
            className="flex items-center gap-2 px-3 py-2 border border-emerald-300 bg-emerald-50 text-emerald-900 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <FiDownload /> {seeding ? 'Importando...' : 'Importar marcas'}
          </button>
          <button
            type="button"
            onClick={() => openCreateSub()}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
          >
            <FiPlus /> Tipo
          </button>
          <button
            type="button"
            onClick={() => openCreateCat()}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
          >
            <FiPlus /> Marca
          </button>
          <button
            type="button"
            onClick={openCreateGrupo}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
          >
            <FiPlus /> Grupo
          </button>
        </div>
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
        <div className="space-y-4">
          {grupos.map((grupo) => {
            const cats = categorias.filter((c) => c.grupo_id === grupo.id);
            return (
              <div
                key={grupo.id}
                className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${
                  grupo.ativo ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {grupo.nome}
                    </div>
                    <div className="text-xs text-gray-500">/{grupo.slug}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      checked={grupo.ativo}
                      disabled={togglingKey === `g:${grupo.id}`}
                      label={grupo.ativo ? 'Desativar grupo' : 'Ativar grupo'}
                      onChange={() => void toggleGrupoAtivo(grupo)}
                    />
                    <button
                      type="button"
                      onClick={() => openCreateCat(grupo.id)}
                      className="p-2 text-gray-500 hover:text-gray-900"
                      title="Nova categoria"
                    >
                      <FiPlus />
                    </button>
                    <button type="button" onClick={() => openEditGrupo(grupo)} className="p-2 text-gray-500 hover:text-gray-900">
                      <FiEdit2 />
                    </button>
                    <button type="button" onClick={() => deleteGrupo(grupo.id)} className="p-2 text-gray-500 hover:text-red-600">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                {cats.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">Sem categorias</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {cats.map((c) => {
                      const subs = subcategorias.filter((s) => s.categoria_id === c.id);
                      return (
                        <div key={c.id} className={`px-4 py-3 ${c.ativo ? '' : 'opacity-50'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 p-1.5">
                                <MarcaLogo
                                  slug={c.slug}
                                  nome={c.nome}
                                  imagemUrl={c.imagem_url}
                                  className="w-full h-full"
                                />
                              </span>
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-gray-900">{c.nome}</span>
                                <span className="ml-2 text-xs text-gray-400">/{c.slug}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ToggleSwitch
                                size="sm"
                                checked={c.ativo}
                                disabled={togglingKey === `c:${c.id}`}
                                label={c.ativo ? 'Desativar marca' : 'Ativar marca'}
                                onChange={() => void toggleCatAtivo(c)}
                              />
                              <button
                                type="button"
                                onClick={() => openCreateSub(c.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-800"
                                title="Novo tipo (OLED, Incell...)"
                              >
                                <FiPlus size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditCat(c)}
                                className="p-1.5 text-gray-400 hover:text-gray-800"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCat(c.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {subs.length > 0 && (
                            <ul className="mt-2 ml-3 border-l border-gray-200 pl-3 space-y-1">
                              {subs.map((s) => (
                                <li
                                  key={s.id}
                                  className={`flex items-center justify-between text-sm py-1 ${
                                    s.ativo ? '' : 'opacity-50'
                                  }`}
                                >
                                  <span className="text-gray-600">{s.nome}</span>
                                  <div className="flex items-center gap-2">
                                    <ToggleSwitch
                                      size="sm"
                                      checked={s.ativo}
                                      disabled={togglingKey === `s:${s.id}`}
                                      label={s.ativo ? 'Desativar tipo' : 'Ativar tipo'}
                                      onChange={() => void toggleSubAtivo(s)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => openEditSub(s)}
                                      className="p-1 text-gray-400 hover:text-gray-800"
                                    >
                                      <FiEdit2 size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteSub(s.id)}
                                      className="p-1 text-gray-400 hover:text-red-600"
                                    >
                                      <FiTrash2 size={12} />
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showGrupoModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <form
            onSubmit={saveGrupo}
            className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 space-y-3"
          >
            <h2 className="text-lg font-semibold">{editingGrupo ? 'Editar grupo' : 'Novo grupo'}</h2>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Nome *</span>
              <input
                required
                value={grupoForm.nome}
                onChange={(e) => {
                  const nome = e.target.value;
                  setGrupoForm((f) => ({
                    ...f,
                    nome,
                    slug: editingGrupo ? f.slug : slugify(nome),
                  }));
                }}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Slug</span>
              <input
                value={grupoForm.slug}
                onChange={(e) => setGrupoForm((f) => ({ ...f, slug: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={grupoForm.ativo}
                onChange={(e) => setGrupoForm((f) => ({ ...f, ativo: e.target.checked }))}
              />
              Ativo
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowGrupoModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
                Cancelar
              </button>
              <button type="submit" disabled={savingGrupo} className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm disabled:opacity-50">
                {savingGrupo ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <form
            onSubmit={saveCat}
            className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 space-y-3 max-h-[92vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold">
              {editingCat ? 'Editar marca' : 'Nova marca'}
            </h2>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-3">
              <span className="text-xs font-medium text-gray-600">Logo da marca</span>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-white border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0 p-2">
                  {catImagemPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={catImagemPreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <MarcaLogo
                      slug={catForm.slug}
                      nome={catForm.nome}
                      className="w-10 h-10"
                    />
                  )}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <input
                    ref={catFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => onCatImagemChange(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => catFileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-black text-white rounded-lg text-sm font-medium"
                  >
                    <FiImage /> {catImagemPreview ? 'Trocar imagem' : 'Enviar imagem'}
                  </button>
                  {(catImagemPreview || catForm.imagem_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCatImagemFile(null);
                        setCatImagemPreview(null);
                        setCatForm((f) => ({ ...f, imagem_url: '' }));
                        if (catFileRef.current) catFileRef.current.value = '';
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
              <span className="text-xs font-medium text-gray-600">Grupo *</span>
              <select
                required
                value={catForm.grupo_id}
                onChange={(e) => setCatForm((f) => ({ ...f, grupo_id: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">Selecione</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Nome *</span>
              <input
                required
                value={catForm.nome}
                onChange={(e) => {
                  const nome = e.target.value;
                  setCatForm((f) => ({
                    ...f,
                    nome,
                    slug: editingCat ? f.slug : slugify(nome),
                  }));
                }}
                placeholder="Ex: iPhone, Samsung"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">
                URL do logo <span className="text-gray-400">(opcional, se não enviar arquivo)</span>
              </span>
              <input
                value={catForm.imagem_url}
                onChange={(e) => {
                  const v = e.target.value;
                  setCatForm((f) => ({ ...f, imagem_url: v }));
                  if (!catImagemFile) setCatImagemPreview(v.trim() || null);
                }}
                placeholder="https://..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={catForm.ativo}
                onChange={(e) => setCatForm((f) => ({ ...f, ativo: e.target.checked }))}
              />
              Ativo
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCatModal(false);
                  setCatImagemFile(null);
                  setCatImagemPreview(null);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingCat}
                className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm disabled:opacity-50"
              >
                {savingCat ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <form
            onSubmit={saveSub}
            className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl p-5 space-y-3"
          >
            <h2 className="text-lg font-semibold">
              {editingSub ? 'Editar tipo' : 'Novo tipo / subcategoria'}
            </h2>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Categoria *</span>
              <select
                required
                value={subForm.categoria_id}
                onChange={(e) => setSubForm((f) => ({ ...f, categoria_id: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">Selecione</option>
                {categorias.map((c) => {
                  const g = grupos.find((x) => x.id === c.grupo_id);
                  return (
                    <option key={c.id} value={c.id}>
                      {g ? `${g.nome} → ` : ''}
                      {c.nome}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Nome *</span>
              <input
                required
                value={subForm.nome}
                onChange={(e) => {
                  const nome = e.target.value;
                  setSubForm((f) => ({
                    ...f,
                    nome,
                    slug: editingSub ? f.slug : slugify(nome),
                  }));
                }}
                placeholder="Ex: OLED, Incell, LCD"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={subForm.ativo}
                onChange={(e) => setSubForm((f) => ({ ...f, ativo: e.target.checked }))}
              />
              Ativo
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowSubModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
                Cancelar
              </button>
              <button type="submit" disabled={savingSub} className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm disabled:opacity-50">
                {savingSub ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

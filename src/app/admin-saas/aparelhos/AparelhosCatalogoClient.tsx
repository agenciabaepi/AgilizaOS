'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSmartphone, FiSearch, FiTag } from 'react-icons/fi';
import type { AparelhoCatalogo } from '@/types/aparelhos';
import {
  aparelhoImagemComCacheBust,
  aparelhoImagemPreviewUrl,
  mergeAparelhoComImagensSalvas,
  resolveAparelhoImagens,
} from '@/lib/aparelhos-imagens';
import { flattenAparelhoImageFile } from '@/lib/aparelho-imagem-upload';
import type { TipoEquipamentoCatalogo } from '@/types/equipamentos';
import type { MarcaCatalogo } from '@/types/marcas';
import type { CorCatalogo, AparelhoCatalogoCor } from '@/types/cores';
import { invalidateAparelhosFetchCache } from '@/components/AparelhoSelector';

function mesclarListaPreservandoImagens(
  novaLista: AparelhoCatalogo[],
  anterior: AparelhoCatalogo[]
): AparelhoCatalogo[] {
  const porId = new Map(anterior.map((a) => [a.id, a]));
  return novaLista.map((item) => {
    const prev = porId.get(item.id);
    if (!prev) return item;
    const atual = resolveAparelhoImagens(item);
    if (atual.frente || atual.verso) return item;
    return mergeAparelhoComImagensSalvas(item, prev);
  });
}

type CorVarianteForm = {
  cor_id: string;
  imagemFrenteFile: File | null;
  imagemVersoFile: File | null;
  imagem_frente_url: string;
  imagem_verso_url: string;
};

function urlThumbLista(aparelho: AparelhoCatalogo, url: string, listaVersao: number): string {
  const otimizada = aparelhoImagemPreviewUrl(url, { width: 96 }) || url;
  const bust = aparelho.updated_at || `${listaVersao}-${aparelho.id}`;
  return aparelhoImagemComCacheBust(otimizada, bust) || otimizada;
}

export default function AparelhosCatalogoClient() {
  const [coresCatalogo, setCoresCatalogo] = useState<CorCatalogo[]>([]);
  const [tiposCatalogo, setTiposCatalogo] = useState<TipoEquipamentoCatalogo[]>([]);
  const [marcas, setMarcas] = useState<MarcaCatalogo[]>([]);
  const [marcaAtiva, setMarcaAtiva] = useState('');
  const [aparelhos, setAparelhos] = useState<AparelhoCatalogo[]>([]);
  const [loadingMarcas, setLoadingMarcas] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMarcaModal, setShowMarcaModal] = useState(false);
  const [editing, setEditing] = useState<AparelhoCatalogo | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingMarca, setSavingMarca] = useState(false);
  const [novaMarcaNome, setNovaMarcaNome] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [listaVersao, setListaVersao] = useState(0);
  const fetchSeqRef = useRef(0);
  const skipEffectFetchRef = useRef(false);
  const [form, setForm] = useState({
    marca: '',
    modelo: '',
    tipo_id: '' as string,
    tipo: 'CELULAR',
    imagemFrenteFile: null as File | null,
    imagemVersoFile: null as File | null,
    imagem_frente_url: '',
    imagem_verso_url: '',
    ativo: true,
  });
  const [variantesCor, setVariantesCor] = useState<CorVarianteForm[]>([]);

  const fetchCoresCatalogo = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-saas/cores-catalogo', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setCoresCatalogo(data.cores || []);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchMarcas = useCallback(async (opts?: { preserveTab?: boolean; silent?: boolean }) => {
    if (!opts?.silent) setLoadingMarcas(true);
    try {
      const res = await fetch('/api/admin-saas/marcas-catalogo?com_contagem=true', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.ok) {
        const lista: MarcaCatalogo[] = data.marcas || [];
        setMarcas(lista);
        if (!opts?.preserveTab) {
          setMarcaAtiva((prev) => {
            if (prev && lista.some((m) => m.nome === prev)) return prev;
            return lista[0]?.nome || '';
          });
        }
      } else if (!opts?.silent) {
        setMessage({ type: 'error', text: data.error || 'Erro ao carregar marcas' });
      }
    } catch {
      if (!opts?.silent) setMessage({ type: 'error', text: 'Erro de conexão ao carregar marcas' });
    } finally {
      if (!opts?.silent) setLoadingMarcas(false);
    }
  }, []);

  const fetchAparelhos = useCallback(
    async (marcaOverride?: string, opts?: { silent?: boolean }) => {
      const marca = marcaOverride || marcaAtiva;
      if (!marca) {
        setAparelhos([]);
        setLoading(false);
        return;
      }

      const seq = ++fetchSeqRef.current;
      if (!opts?.silent) setLoading(true);

      try {
        const params = new URLSearchParams({ marca, _t: String(Date.now()) });
        if (busca) params.set('busca', busca);
        const res = await fetch(`/api/admin-saas/aparelhos-catalogo?${params}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json();

        if (seq !== fetchSeqRef.current) return;

        if (data.ok) {
          const lista = (data.aparelhos || []) as AparelhoCatalogo[];
          setAparelhos((prev) => mesclarListaPreservandoImagens(lista, prev));
          setListaVersao((v) => v + 1);
        } else if (!opts?.silent) {
          setMessage({ type: 'error', text: data.error || 'Erro ao carregar aparelhos' });
        }
      } catch {
        if (seq === fetchSeqRef.current && !opts?.silent) {
          setMessage({ type: 'error', text: 'Erro de conexão' });
        }
      } finally {
        if (seq === fetchSeqRef.current && !opts?.silent) setLoading(false);
      }
    },
    [busca, marcaAtiva]
  );

  useEffect(() => {
    fetchMarcas();
  }, [fetchMarcas]);

  useEffect(() => {
    if (skipEffectFetchRef.current) {
      skipEffectFetchRef.current = false;
      return;
    }
    fetchAparelhos();
  }, [fetchAparelhos]);

  useEffect(() => {
    fetch('/api/admin-saas/equipamentos-tipos-catalogo?ativo=true', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setTiposCatalogo(d.tipos || []);
      })
      .catch(() => {});
    fetchCoresCatalogo();
  }, [fetchCoresCatalogo]);

  const loadVariantesCor = async (aparelhoId: string) => {
    try {
      const res = await fetch(
        `/api/admin-saas/aparelhos-catalogo/cores?aparelho_catalogo_id=${aparelhoId}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.cores)) {
        setVariantesCor(
          (data.cores as AparelhoCatalogoCor[]).map((c) => ({
            cor_id: c.cor_id,
            imagemFrenteFile: null,
            imagemVersoFile: null,
            imagem_frente_url: c.imagem_frente_url || c.imagem_url || '',
            imagem_verso_url: c.imagem_verso_url || '',
          }))
        );
      } else {
        setVariantesCor([]);
      }
    } catch {
      setVariantesCor([]);
    }
  };

  const resetForm = (marcaPadrao?: string) => {
    const defaultTipo = tiposCatalogo[0];
    setForm({
      marca: marcaPadrao || marcaAtiva || '',
      modelo: '',
      tipo_id: defaultTipo?.id || '',
      tipo: defaultTipo?.codigo || 'CELULAR',
      imagemFrenteFile: null,
      imagemVersoFile: null,
      imagem_frente_url: '',
      imagem_verso_url: '',
      ativo: true,
    });
    setVariantesCor([]);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm(marcaAtiva);
    setShowModal(true);
  };

  const openEdit = (aparelho: AparelhoCatalogo) => {
    setEditing(aparelho);
    setForm({
      marca: aparelho.marca,
      modelo: aparelho.modelo,
      tipo_id: aparelho.tipo_id || '',
      tipo: aparelho.tipo || 'CELULAR',
      imagemFrenteFile: null,
      imagemVersoFile: null,
      imagem_frente_url: aparelho.imagem_frente_url || aparelho.imagem_url || '',
      imagem_verso_url: aparelho.imagem_verso_url || '',
      ativo: aparelho.ativo,
    });
    setShowModal(true);
    void loadVariantesCor(aparelho.id);
  };

  const adicionarVarianteCor = () => {
    setVariantesCor((prev) => [
      ...prev,
      {
        cor_id: '',
        imagemFrenteFile: null,
        imagemVersoFile: null,
        imagem_frente_url: '',
        imagem_verso_url: '',
      },
    ]);
  };

  const syncVariantesCor = async (aparelhoId: string) => {
    const payload: Array<{
      cor_id: string;
      imagem_frente_url: string | null;
      imagem_verso_url: string | null;
      ordem: number;
    }> = [];

    for (let i = 0; i < variantesCor.length; i++) {
      const v = variantesCor[i];
      if (!v.cor_id) continue;

      let imagem_frente_url = v.imagem_frente_url || null;
      let imagem_verso_url = v.imagem_verso_url || null;

      if (v.imagemFrenteFile) {
        const up = await uploadImagem(v.imagemFrenteFile);
        if ('error' in up) throw new Error(up.error);
        imagem_frente_url = up.url;
      }
      if (v.imagemVersoFile) {
        const up = await uploadImagem(v.imagemVersoFile);
        if ('error' in up) throw new Error(up.error);
        imagem_verso_url = up.url;
      }

      if (!imagem_frente_url && !imagem_verso_url) continue;

      payload.push({
        cor_id: v.cor_id,
        imagem_frente_url,
        imagem_verso_url,
        ordem: i,
      });
    }

    const res = await fetch('/api/admin-saas/aparelhos-catalogo/cores', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aparelho_catalogo_id: aparelhoId, cores: payload }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Erro ao salvar cores do aparelho');
    }
  };

  const uploadImagem = async (file: File): Promise<{ url: string } | { error: string }> => {
    const prepared = await flattenAparelhoImageFile(file);
    const fd = new FormData();
    fd.append('file', prepared);
    const res = await fetch('/api/admin-saas/aparelhos-catalogo/upload', {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || !data.ok || !data.url) {
      const msg = [data.error, data.hint].filter(Boolean).join(' — ');
      return { error: msg || 'Falha no upload da imagem' };
    }
    return { url: data.url as string };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.marca.trim() || !form.modelo.trim()) {
      setMessage({ type: 'error', text: 'Marca e modelo são obrigatórios' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      let imagem_frente_url = form.imagem_frente_url || null;
      let imagem_verso_url = form.imagem_verso_url || null;
      if (form.imagemFrenteFile) {
        const uploaded = await uploadImagem(form.imagemFrenteFile);
        if ('error' in uploaded) {
          setMessage({ type: 'error', text: uploaded.error });
          setSaving(false);
          return;
        }
        imagem_frente_url = uploaded.url;
      }
      if (form.imagemVersoFile) {
        const uploaded = await uploadImagem(form.imagemVersoFile);
        if ('error' in uploaded) {
          setMessage({ type: 'error', text: uploaded.error });
          setSaving(false);
          return;
        }
        imagem_verso_url = uploaded.url;
      }

      if ((form.imagemFrenteFile || form.imagemVersoFile) && !imagem_frente_url && !imagem_verso_url) {
        setMessage({ type: 'error', text: 'Upload concluído, mas a URL da imagem não foi gerada. Tente novamente.' });
        setSaving(false);
        return;
      }

      const imagem_url = imagem_frente_url || imagem_verso_url || null;

      const payload = {
        marca: form.marca,
        modelo: form.modelo,
        tipo_id: form.tipo_id || null,
        tipo: form.tipo,
        imagem_url,
        imagem_frente_url,
        imagem_verso_url,
        ativo: form.ativo,
        ...(editing ? { id: editing.id } : {}),
      };

      const res = await fetch('/api/admin-saas/aparelhos-catalogo', {
        method: editing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const hint =
          data.error?.includes('imagem_') || data.error?.includes('column')
            ? ' Rode database/aparelhos_imagens_frente_verso.sql no Supabase.'
            : '';
        setMessage({ type: 'error', text: (data.error || 'Erro ao salvar aparelho') + hint });
        return;
      }

      const marcaSalva = form.marca.trim().toUpperCase();
      const aparelhoApi = data.aparelho as AparelhoCatalogo | undefined;
      const aparelhoSalvo = aparelhoApi
        ? mergeAparelhoComImagensSalvas(aparelhoApi, {
            imagem_url,
            imagem_frente_url,
            imagem_verso_url,
          })
        : undefined;

      if (aparelhoSalvo?.id && variantesCor.some((v) => v.cor_id)) {
        try {
          await syncVariantesCor(aparelhoSalvo.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro ao salvar imagens por cor';
          setMessage({
            type: 'error',
            text: `${editing ? 'Aparelho atualizado' : 'Aparelho cadastrado'}, mas falhou nas cores: ${msg}`,
          });
          setSaving(false);
          return;
        }
      }

      invalidateAparelhosFetchCache();
      setMessage({ type: 'success', text: editing ? 'Aparelho atualizado!' : 'Aparelho cadastrado!' });
      setShowModal(false);
      resetForm();
      setListaVersao((v) => v + 1);

      if (marcaSalva !== marcaAtiva) {
        skipEffectFetchRef.current = true;
        setMarcaAtiva(marcaSalva);
      }

      if (aparelhoSalvo?.id) {
        setAparelhos((prev) => {
          const idx = prev.findIndex((a) => a.id === aparelhoSalvo.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = aparelhoSalvo;
            return next;
          }
          if (marcaSalva === marcaAtiva) {
            return [aparelhoSalvo, ...prev];
          }
          return prev;
        });
      }

      await Promise.all([
        fetchMarcas({ preserveTab: true, silent: true }),
        fetchAparelhos(marcaSalva, { silent: true }),
      ]);
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este aparelho do catálogo global?')) return;
    try {
      const res = await fetch(`/api/admin-saas/aparelhos-catalogo?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Aparelho excluído' });
        fetchMarcas();
        fetchAparelhos();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao excluir' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    }
  };

  const handleNovaMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = novaMarcaNome.trim().toUpperCase();
    if (!nome) return;

    setSavingMarca(true);
    try {
      const res = await fetch('/api/admin-saas/marcas-catalogo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao cadastrar marca' });
        return;
      }
      setMessage({ type: 'success', text: `Marca ${nome} cadastrada` });
      setNovaMarcaNome('');
      setShowMarcaModal(false);
      await fetchMarcas();
      setMarcaAtiva(nome);
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSavingMarca(false);
    }
  };

  const marcaAtivaInfo = marcas.find((m) => m.nome === marcaAtiva);
  const totalNaMarca = marcaAtivaInfo?.total_aparelhos ?? aparelhos.length;

  if (loadingMarcas) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiSmartphone className="text-gray-600" />
            Catálogo de Aparelhos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Aparelhos pré-cadastrados por marca, disponíveis para todos os usuários.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowMarcaModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <FiTag /> Nova marca
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={!marcaAtiva}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            <FiPlus /> Novo aparelho
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {marcas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
          <p className="mb-3">Nenhuma marca cadastrada.</p>
          <button
            type="button"
            onClick={() => setShowMarcaModal(true)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Cadastrar primeira marca
          </button>
        </div>
      ) : (
        <>
          <div className="border-b border-gray-200 -mx-1 px-1 overflow-x-auto">
            <div className="flex gap-1 min-w-max pb-px">
              {marcas.map((m) => {
                const ativa = marcaAtiva === m.nome;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMarcaAtiva(m.nome)}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      ativa
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    {m.nome}
                    <span
                      className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                        ativa ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m.total_aparelhos ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={`Buscar em ${marcaAtiva}...`}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <p className="text-sm text-gray-500">
              {loading ? 'Carregando...' : `${aparelhos.length} de ${totalNaMarca} modelo(s)`}
              {busca ? ' (filtrado)' : ''}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative">
            {loading && aparelhos.length > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 pointer-events-none">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-800" />
              </div>
            )}
            {loading && aparelhos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Carregando aparelhos...</div>
            ) : aparelhos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Nenhum aparelho em {marcaAtiva}.</p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Cadastrar primeiro modelo
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Imagem</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Modelo</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
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
                                  {frente && (
                                    <img
                                      key={`${a.id}-f-${listaVersao}`}
                                      src={urlThumbLista(a, frente, listaVersao)}
                                      alt="Frente"
                                      title="Frente"
                                      loading="eager"
                                      decoding="async"
                                      className="w-10 h-10 object-contain rounded bg-white border border-gray-100"
                                    />
                                  )}
                                  {verso && (
                                    <img
                                      key={`${a.id}-v-${listaVersao}`}
                                      src={urlThumbLista(a, verso, listaVersao)}
                                      alt="Verso"
                                      title="Verso"
                                      loading="eager"
                                      decoding="async"
                                      className="w-10 h-10 object-contain rounded bg-white border border-gray-100"
                                    />
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{a.modelo}</td>
                        <td className="px-4 py-3 text-gray-500">{a.tipo}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              a.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {a.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 mr-1"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(a.id)}
                            className="p-1.5 text-red-500 hover:text-red-700"
                          >
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
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar aparelho' : 'Novo aparelho'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                <select
                  value={form.marca}
                  onChange={(e) => setForm((p) => ({ ...p, marca: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  required
                >
                  <option value="">Selecione a marca</option>
                  {marcas.map((m) => (
                    <option key={m.id} value={m.nome}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <input
                  type="text"
                  value={form.modelo}
                  onChange={(e) => setForm((p) => ({ ...p, modelo: e.target.value.toUpperCase() }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex: IPHONE 15 PRO MAX"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.tipo_id}
                  onChange={(e) => {
                    const t = tiposCatalogo.find((x) => x.id === e.target.value);
                    setForm((p) => ({
                      ...p,
                      tipo_id: e.target.value,
                      tipo: t?.codigo || p.tipo,
                    }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                >
                  {tiposCatalogo.length === 0 ? (
                    <option value="">Carregando tipos...</option>
                  ) : (
                    tiposCatalogo.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} ({t.codigo})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <p className="text-xs text-gray-500 -mt-1">
                Imagens padrão (fallback quando a cor não tiver foto). Use PNG/JPG com fundo branco.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Foto frente (padrão)</label>
                  {form.imagem_frente_url && !form.imagemFrenteFile && (
                    <img
                      src={form.imagem_frente_url}
                      alt="Frente"
                      className="w-full max-h-24 object-contain mb-2 rounded bg-gray-50"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((p) => ({ ...p, imagemFrenteFile: e.target.files?.[0] || null }))}
                    className="w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Foto verso (padrão)</label>
                  {form.imagem_verso_url && !form.imagemVersoFile && (
                    <img
                      src={form.imagem_verso_url}
                      alt="Verso"
                      className="w-full max-h-24 object-contain mb-2 rounded bg-gray-50"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((p) => ({ ...p, imagemVersoFile: e.target.files?.[0] || null }))}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-800">Imagens por cor</label>
                  <button
                    type="button"
                    onClick={adicionarVarianteCor}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    + Adicionar cor
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Ex.: iPhone 11 preto, branco, vermelho. Na Nova OS a foto muda conforme a cor; sem foto da cor, usa a
                  imagem padrão acima.
                </p>
                {variantesCor.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhuma cor cadastrada para este modelo.</p>
                ) : (
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                    {variantesCor.map((v, idx) => (
                      <div key={idx} className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50/50">
                        <div className="flex gap-2 items-center">
                          <select
                            value={v.cor_id}
                            onChange={(e) =>
                              setVariantesCor((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], cor_id: e.target.value };
                                return next;
                              })
                            }
                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                            required
                          >
                            <option value="">Cor</option>
                            {coresCatalogo.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setVariantesCor((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-xs text-red-600 shrink-0"
                          >
                            Remover
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-xs text-gray-600">Frente</span>
                            {v.imagem_frente_url && !v.imagemFrenteFile && (
                              <img
                                src={v.imagem_frente_url}
                                alt=""
                                className="w-full max-h-16 object-contain my-1 rounded bg-white"
                              />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="w-full text-xs"
                              onChange={(e) =>
                                setVariantesCor((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], imagemFrenteFile: e.target.files?.[0] || null };
                                  return next;
                                })
                              }
                            />
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">Verso</span>
                            {v.imagem_verso_url && !v.imagemVersoFile && (
                              <img
                                src={v.imagem_verso_url}
                                alt=""
                                className="w-full max-h-16 object-contain my-1 rounded bg-white"
                              />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="w-full text-xs"
                              onChange={(e) =>
                                setVariantesCor((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], imagemVersoFile: e.target.files?.[0] || null };
                                  return next;
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMarcaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Nova marca</h2>
            <form onSubmit={handleNovaMarca} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da marca</label>
                <input
                  type="text"
                  value={novaMarcaNome}
                  onChange={(e) => setNovaMarcaNome(e.target.value.toUpperCase())}
                  placeholder="Ex: SAMSUNG"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingMarca}
                  className="flex-1 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {savingMarca ? 'Salvando...' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMarcaModal(false);
                    setNovaMarcaNome('');
                  }}
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

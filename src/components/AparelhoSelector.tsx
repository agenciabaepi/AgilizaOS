'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { FiSearch, FiPlus, FiX, FiSmartphone } from 'react-icons/fi';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import { bearerAuthHeaders } from '@/lib/api/clientAuthHeaders';
import { supabase } from '@/lib/supabaseClient';
import type { AparelhoCatalogo, AparelhoSelecionado } from '@/types/aparelhos';
import { aparelhoLabel } from '@/types/aparelhos';
import {
  aparelhoImagemPreviewUrl,
  aparelhoImagensParaSelecionado,
  preloadAparelhoImagens,
  resolveAparelhoImagens,
} from '@/lib/aparelhos-imagens';
import { flattenAparelhoImageFile } from '@/lib/aparelho-imagem-upload';

const aparelhosFetchCache = new Map<string, { catalogo: AparelhoCatalogo[]; empresa: AparelhoCatalogo[] }>();
import type { TipoEquipamentoSelecionado } from '@/types/equipamentos';

type OrigemLista = 'catalogo_global' | 'empresa';

interface AparelhoListItem extends AparelhoCatalogo {
  origemLista: OrigemLista;
  listKey: string;
}

interface AparelhoSelectorProps {
  empresaId: string;
  tipoSelecionado?: TipoEquipamentoSelecionado | null;
  /** @deprecated use tipoSelecionado.codigo */
  tipoEquipamento?: string;
  marca?: string;
  modelo?: string;
  imagemUrl?: string | null;
  value?: AparelhoSelecionado | null;
  onChange: (aparelho: AparelhoSelecionado | null) => void;
  className?: string;
  readOnly?: boolean;
  hidePreview?: boolean;
}

function mergeAparelhosLista(
  catalogo: AparelhoCatalogo[],
  empresa: AparelhoCatalogo[]
): AparelhoListItem[] {
  const seen = new Set<string>();
  const merged: AparelhoListItem[] = [];

  for (const a of catalogo) {
    const key = `${a.marca}|${a.modelo}`.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...a, origemLista: 'catalogo_global', listKey: `c-${a.id}` });
  }

  for (const a of empresa) {
    const key = `${a.marca}|${a.modelo}`.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...a, origemLista: 'empresa', listKey: `e-${a.id}` });
  }

  return merged.sort((a, b) => aparelhoLabel(a).localeCompare(aparelhoLabel(b)));
}

export default function AparelhoSelector({
  empresaId,
  tipoSelecionado = null,
  tipoEquipamento,
  marca = '',
  modelo = '',
  imagemUrl,
  value = null,
  onChange,
  className = '',
  readOnly = false,
  hidePreview = false,
}: AparelhoSelectorProps) {
  const [catalogo, setCatalogo] = useState<AparelhoCatalogo[]>([]);
  const [empresa, setEmpresa] = useState<AparelhoCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selected, setSelected] = useState<AparelhoSelecionado | null>(value);
  const [previewFrente, setPreviewFrente] = useState<string | null>(
    value?.imagemFrenteUrl ?? value?.imagemUrl ?? imagemUrl ?? null
  );
  const [previewVerso, setPreviewVerso] = useState<string | null>(value?.imagemVersoUrl ?? null);
  const isUserSearchingRef = useRef(false);

  const tipoCodigo = tipoSelecionado?.codigo || tipoEquipamento || '';
  const tipoId = tipoSelecionado?.catalogoId || null;
  const aparelhoJaInformado = Boolean(
    value || (marca.trim() && modelo.trim())
  );
  const semTipo = !tipoCodigo && !aparelhoJaInformado;

  const [newAparelho, setNewAparelho] = useState({
    marca: '',
    modelo: '',
    tipo: tipoCodigo || 'CELULAR',
    imagemFrenteFile: null as File | null,
    imagemVersoFile: null as File | null,
  });

  const { addToast } = useToast();
  const { session } = useAuth();

  const listaUnificada = useMemo(() => mergeAparelhosLista(catalogo, empresa), [catalogo, empresa]);

  useEffect(() => {
    setNewAparelho((p) => ({ ...p, tipo: tipoCodigo || p.tipo }));
  }, [tipoCodigo]);

  useEffect(() => {
    if (!empresaId) return;

    let cancelled = false;

    const fetchAparelhos = async () => {
      const cacheKey = `${empresaId}|${tipoId || ''}|${tipoCodigo}`;
      const cached = aparelhosFetchCache.get(cacheKey);
      if (cached) {
        setCatalogo(cached.catalogo);
        setEmpresa(cached.empresa);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (tipoId) params.set('tipo_id', tipoId);
        else if (tipoCodigo) params.set('tipo', tipoCodigo);
        const q = params.toString() ? `&${params.toString()}` : '';

        const [resCatalogo, resEmpresa] = await Promise.all([
          fetch(`/api/aparelhos-catalogo?ativo=true${q}`, {
            headers: bearerAuthHeaders(session),
            credentials: 'include',
          }),
          fetch(`/api/aparelhos-empresa?empresa_id=${empresaId}&ativo=true${q}`, {
            headers: bearerAuthHeaders(session),
            credentials: 'include',
          }),
        ]);

        if (cancelled) return;

        const dataCatalogo = await resCatalogo.json();
        const dataEmpresa = await resEmpresa.json();

        const listaCatalogo = resCatalogo.ok ? dataCatalogo.aparelhos || [] : [];
        const listaEmpresa = resEmpresa.ok ? dataEmpresa.aparelhos || [] : [];

        aparelhosFetchCache.set(cacheKey, { catalogo: listaCatalogo, empresa: listaEmpresa });
        setCatalogo(listaCatalogo);
        setEmpresa(listaEmpresa);
      } catch (error) {
        console.error('Erro ao buscar aparelhos:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAparelhos();

    return () => {
      cancelled = true;
    };
  }, [empresaId, session?.access_token, tipoCodigo, tipoId]);

  useEffect(() => {
    if (isUserSearchingRef.current) return;

    if (value) {
      setSelected(value);
      setSearchTerm(`${value.marca} ${value.modelo}`.trim());
      setPreviewFrente(value.imagemFrenteUrl ?? value.imagemUrl ?? null);
      setPreviewVerso(value.imagemVersoUrl ?? null);
      return;
    }

    if (marca && modelo) {
      setSearchTerm(`${marca} ${modelo}`.trim());
      setPreviewFrente(imagemUrl ?? null);
      setPreviewVerso(null);
      return;
    }

    setSelected(null);
    setSearchTerm('');
    setPreviewFrente(null);
    setPreviewVerso(null);
  }, [
    value?.catalogoId,
    value?.aparelhoEmpresaId,
    value?.marca,
    value?.modelo,
    value?.imagemUrl,
    value?.imagemFrenteUrl,
    value?.imagemVersoUrl,
    marca,
    modelo,
    imagemUrl,
  ]);

  const selectionKey =
    value?.catalogoId ??
    value?.aparelhoEmpresaId ??
    selected?.catalogoId ??
    selected?.aparelhoEmpresaId ??
    'none';

  const filtered = listaUnificada.filter((a) => {
    const label = aparelhoLabel(a).toLowerCase();
    const term = searchTerm.toLowerCase();
    return label.includes(term) || a.marca.toLowerCase().includes(term) || a.modelo.toLowerCase().includes(term);
  });

  const preloadAparelhoItem = (aparelho: AparelhoListItem) => {
    const { frente, verso } = resolveAparelhoImagens(aparelho);
    preloadAparelhoImagens(frente, verso);
  };

  const handleSelect = (aparelho: AparelhoListItem) => {
    isUserSearchingRef.current = false;
    const imgs = aparelhoImagensParaSelecionado(aparelho);
    preloadAparelhoImagens(imgs.imagemFrenteUrl, imgs.imagemVersoUrl);
    const selecionado: AparelhoSelecionado = {
      origem: aparelho.origemLista,
      catalogoId: aparelho.origemLista === 'catalogo_global' ? aparelho.id : null,
      aparelhoEmpresaId: aparelho.origemLista === 'empresa' ? aparelho.id : null,
      tipo: aparelho.tipo || tipoCodigo || 'CELULAR',
      tipoId: aparelho.tipo_id ?? tipoId ?? null,
      marca: aparelho.marca,
      modelo: aparelho.modelo,
      ...imgs,
    };
    setSelected(selecionado);
    setPreviewFrente(imgs.imagemFrenteUrl ?? null);
    setPreviewVerso(imgs.imagemVersoUrl ?? null);
    setSearchTerm(aparelhoLabel(aparelho));
    setShowDropdown(false);
    setShowAddForm(false);
    onChange({ ...selecionado });
  };

  const handleClear = () => {
    isUserSearchingRef.current = false;
    setSelected(null);
    setPreviewFrente(null);
    setPreviewVerso(null);
    setSearchTerm('');
    onChange(null);
  };

  const uploadImagem = async (file: File, pathPrefix: string): Promise<string | null> => {
    try {
      const prepared = await flattenAparelhoImageFile(file);
      const path = `${pathPrefix}/${Date.now()}_${prepared.name.replace(/\s+/g, '_')}`;
      const { error } = await supabase.storage.from('aparelhos').upload(path, prepared);
      if (error) {
        addToast('Falha no upload da imagem. Verifique se o bucket "aparelhos" existe no Supabase.', 'error');
        return null;
      }
      const { data } = supabase.storage.from('aparelhos').getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return null;
    }
  };

  const handleAddAparelho = async () => {
    if (!newAparelho.marca || !newAparelho.modelo) {
      addToast('Marca e modelo são obrigatórios', 'error');
      return;
    }

    try {
      let imagem_frente_url: string | null = null;
      let imagem_verso_url: string | null = null;
      if (newAparelho.imagemFrenteFile) {
        imagem_frente_url = await uploadImagem(newAparelho.imagemFrenteFile, `empresa-${empresaId}`);
      }
      if (newAparelho.imagemVersoFile) {
        imagem_verso_url = await uploadImagem(newAparelho.imagemVersoFile, `empresa-${empresaId}`);
      }

      const response = await fetch('/api/aparelhos-empresa', {
        method: 'POST',
        headers: bearerAuthHeaders(session, { 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          empresa_id: empresaId,
          marca: newAparelho.marca,
          modelo: newAparelho.modelo,
          tipo: newAparelho.tipo || tipoCodigo || 'CELULAR',
          tipo_id: tipoId,
          imagem_frente_url,
          imagem_verso_url,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        addToast('Aparelho cadastrado com sucesso!', 'success');
        setEmpresa((prev) => [...prev, data.aparelho]);
        const item: AparelhoListItem = {
          ...data.aparelho,
          origemLista: 'empresa',
          listKey: `e-${data.aparelho.id}`,
        };
        handleSelect(item);
        setNewAparelho({ marca: '', modelo: '', tipo: tipoCodigo || 'CELULAR', imagemFrenteFile: null, imagemVersoFile: null });
        setShowAddForm(false);
      } else {
        addToast(data.error || 'Erro ao cadastrar aparelho', 'error');
      }
    } catch (error) {
      console.error('Erro ao cadastrar aparelho:', error);
      addToast('Erro ao cadastrar aparelho', 'error');
    }
  };

  useEffect(() => {
    if (semTipo) {
      setShowDropdown(false);
      setShowAddForm(false);
    }
  }, [semTipo]);

  useEffect(() => {
    if (!showDropdown || loading) return;
    filtered.slice(0, 12).forEach(preloadAparelhoItem);
  }, [showDropdown, loading, filtered]);

  const origemBadge = (origem: OrigemLista) =>
    origem === 'catalogo_global' ? (
      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600">
        Consert
      </span>
    ) : (
      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700">
        Meu
      </span>
    );

  return (
    <div className={`space-y-3 ${showDropdown && !semTipo ? 'relative z-50' : 'relative'} ${className}`}>
      {semTipo && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Selecione o tipo de equipamento acima para filtrar os aparelhos compatíveis.
        </p>
      )}

      <div className={`relative ${semTipo ? 'opacity-60' : ''}`}>
        <input
          type="text"
          value={searchTerm}
          readOnly={readOnly || semTipo}
          disabled={semTipo}
          onChange={(e) => {
            isUserSearchingRef.current = true;
            setSearchTerm(e.target.value);
            setSelected(null);
            if (!showDropdown) setShowDropdown(true);
          }}
          onFocus={() => !readOnly && !semTipo && setShowDropdown(true)}
          placeholder="Buscar aparelho por marca ou modelo..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
          {(selected || value) && !readOnly && (
            <button type="button" onClick={handleClear} className="p-1 text-gray-400 hover:text-gray-600">
              <FiX size={16} />
            </button>
          )}
          <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="p-1 text-gray-400 hover:text-gray-600">
            <FiSearch size={16} />
          </button>
        </div>

        {showDropdown && !readOnly && (
          <>
            <div className="absolute left-0 right-0 top-full z-[60] mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-center text-gray-500 text-sm">Carregando aparelhos...</div>
              ) : filtered.length > 0 ? (
                filtered.map((aparelho) => {
                  const thumb = resolveAparelhoImagens(aparelho).primary;
                  return (
                  <button
                    key={aparelho.listKey}
                    type="button"
                    onMouseEnter={() => preloadAparelhoItem(aparelho)}
                    onFocus={() => preloadAparelhoItem(aparelho)}
                    onClick={() => handleSelect(aparelho)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                  >
                    {thumb ? (
                      <img
                        src={aparelhoImagemPreviewUrl(thumb, { width: 80 }) || thumb}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 object-contain rounded bg-white border border-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <FiSmartphone className="text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm truncate">{aparelhoLabel(aparelho)}</span>
                        {origemBadge(aparelho.origemLista)}
                      </div>
                      <div className="text-xs text-gray-400">{aparelho.tipo}</div>
                    </div>
                  </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-gray-500 text-sm">Nenhum aparelho encontrado</div>
              )}

              <div className="border-t border-gray-200 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="w-full px-3 py-2.5 text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium"
                >
                  <FiPlus size={16} />
                  Cadastrar aparelho personalizado
                </button>
              </div>

              {showAddForm && (
                <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
                  <input
                    type="text"
                    placeholder="Marca (ex: SAMSUNG)"
                    value={newAparelho.marca}
                    onChange={(e) => setNewAparelho((p) => ({ ...p, marca: e.target.value.toUpperCase() }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Modelo (ex: GALAXY S21)"
                    value={newAparelho.modelo}
                    onChange={(e) => setNewAparelho((p) => ({ ...p, modelo: e.target.value.toUpperCase() }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  />
                  <label className="block text-xs font-medium text-gray-600">Foto frente</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewAparelho((p) => ({ ...p, imagemFrenteFile: e.target.files?.[0] || null }))}
                    className="w-full text-xs"
                  />
                  <label className="block text-xs font-medium text-gray-600">Foto verso</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewAparelho((p) => ({ ...p, imagemVersoFile: e.target.files?.[0] || null }))}
                    className="w-full text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddAparelho}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div
              className="fixed inset-0 z-[55]"
              onClick={() => {
                setShowDropdown(false);
                setShowAddForm(false);
              }}
              aria-hidden
            />
          </>
        )}
      </div>
      {showDropdown && !readOnly && !semTipo && <div className="h-80 shrink-0" aria-hidden />}

      {(previewFrente || previewVerso) && !hidePreview && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex gap-2 shrink-0">
            {previewFrente && (
              <img
                key={`${selectionKey}-f-${previewFrente}`}
                src={previewFrente}
                alt="Frente"
                className="w-14 h-14 object-contain rounded-lg bg-white border border-gray-100"
              />
            )}
            {previewVerso && (
              <img
                key={`${selectionKey}-v-${previewVerso}`}
                src={previewVerso}
                alt="Verso"
                className="w-14 h-14 object-contain rounded-lg bg-white border border-gray-100"
              />
            )}
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">{searchTerm || `${marca} ${modelo}`.trim()}</div>
            <div className="text-xs text-gray-500">
              {selected?.origem === 'catalogo_global'
                ? 'Catálogo Consert'
                : selected?.origem === 'empresa'
                  ? 'Cadastrado pela sua empresa'
                  : 'Aparelho selecionado'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

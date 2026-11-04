'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import { slugifyCatalogo } from '@/lib/catalogo-publico';

type CatalogoLojaForm = {
  habilitado: boolean;
  slug: string;
  titulo: string;
  descricao: string;
  whatsapp: string;
  cor: string;
};

const DEFAULT_FORM: CatalogoLojaForm = {
  habilitado: false,
  slug: '',
  titulo: '',
  descricao: '',
  whatsapp: '',
  cor: '#111111',
};

export default function CatalogoLojaConfigPage() {
  const { empresaData, session } = useAuth();
  const { addToast } = useToast();
  const { podeAcessar } = useConfigPermission('catalogo-config');
  const [form, setForm] = useState<CatalogoLojaForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const authHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session?.access_token]);

  const carregar = useCallback(async () => {
    if (!empresaData?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/catalogo-loja/config', {
        cache: 'no-store',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao carregar configuração do catálogo');
      }

      const cfg = json.config || {};
      setForm({
        habilitado: Boolean(cfg.habilitado),
        slug: (cfg.slug || '').trim() || slugifyCatalogo(empresaData.nome || 'minha-loja'),
        titulo: (cfg.titulo || '').trim() || empresaData.nome || '',
        descricao: (cfg.descricao || '').trim(),
        whatsapp: (cfg.whatsapp || '').trim() || empresaData.telefone || '',
        cor: (cfg.cor || '#111111').trim() || '#111111',
      });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erro ao carregar catálogo');
      setForm({
        ...DEFAULT_FORM,
        slug: slugifyCatalogo(empresaData.nome || 'minha-loja'),
        titulo: empresaData.nome || '',
        whatsapp: empresaData.telefone || '',
      });
    } finally {
      setLoading(false);
    }
  }, [empresaData?.id, empresaData?.nome, empresaData?.telefone, authHeaders, addToast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const slugNormalizado = useMemo(
    () => slugifyCatalogo(form.slug || form.titulo || empresaData?.nome || ''),
    [form.slug, form.titulo, empresaData?.nome]
  );

  const urlPublica =
    typeof window !== 'undefined'
      ? `${window.location.origin}/catalogo/${slugNormalizado || 'seu-slug'}`
      : `/catalogo/${slugNormalizado || 'seu-slug'}`;

  const salvar = async () => {
    if (!empresaData?.id) {
      addToast('error', 'Empresa não identificada. Recarregue a página e tente novamente.');
      return;
    }
    if (!slugNormalizado) {
      addToast('error', 'Informe um endereço (slug) válido para o catálogo.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/catalogo-loja/config', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          habilitado: form.habilitado,
          slug: slugNormalizado,
          titulo: form.titulo.trim() || empresaData.nome || '',
          descricao: form.descricao.trim(),
          whatsapp: form.whatsapp.trim(),
          cor: form.cor.trim() || '#111111',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao salvar catálogo');
      }

      const cfg = json.config || {};
      setForm((prev) => ({
        ...prev,
        habilitado: Boolean(cfg.habilitado),
        slug: (cfg.slug || slugNormalizado).trim(),
        titulo: (cfg.titulo || prev.titulo).trim(),
        descricao: (cfg.descricao || '').trim(),
        whatsapp: (cfg.whatsapp || '').trim(),
        cor: (cfg.cor || '#111111').trim() || '#111111',
      }));

      addToast(
        'success',
        form.habilitado
          ? 'Catálogo habilitado e salvo com sucesso!'
          : 'Configuração do catálogo salva com sucesso!'
      );
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erro ao salvar catálogo');
    } finally {
      setSaving(false);
    }
  };

  if (!podeAcessar) {
    return <AcessoNegadoComponent />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Catálogo</h2>
        <p className="text-gray-600 text-sm">
          Loja online pública com grid de produtos. O cliente envia o pedido direto no WhatsApp — sem checkout.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 bg-white space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-gray-900">Habilitar catálogo público</div>
            <div className="text-sm text-gray-600">Quando ativo, o link fica acessível sem login.</div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={form.habilitado}
              onChange={(e) => setForm((prev) => ({ ...prev, habilitado: e.target.checked }))}
              disabled={loading || saving}
            />
            <span
              className={`w-10 h-6 flex items-center bg-gray-200 rounded-full p-1 transition ${form.habilitado ? '!bg-green-500' : ''}`}
            >
              <span
                className={`bg-white w-4 h-4 rounded-full shadow transform transition ${form.habilitado ? 'translate-x-4' : ''}`}
              />
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço (slug)</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              onBlur={() => setForm((prev) => ({ ...prev, slug: slugifyCatalogo(prev.slug) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="minha-assistencia"
              disabled={loading || saving}
            />
            <p className="text-xs text-gray-500 mt-1 font-mono break-all">{urlPublica}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder={empresaData?.nome || 'Nome da loja'}
              disabled={loading || saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input
              value={form.whatsapp}
              onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder={empresaData?.telefone || '(11) 99999-9999'}
              disabled={loading || saving}
            />
            <p className="text-xs text-gray-500 mt-1">Se vazio, usa o telefone da empresa.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor de destaque</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.cor}
                onChange={(e) => setForm((prev) => ({ ...prev, cor: e.target.value }))}
                className="h-10 w-14 border border-gray-300 rounded cursor-pointer"
                disabled={loading || saving}
              />
              <input
                value={form.cor}
                onChange={(e) => setForm((prev) => ({ ...prev, cor: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                disabled={loading || saving}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (rodapé)</label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Texto curto sobre a assistência ou a loja."
            disabled={loading || saving}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <a
            href={urlPublica}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-4 py-2 rounded-md border border-gray-300 text-gray-800 hover:bg-gray-50"
          >
            Abrir catálogo
          </a>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-50"
            disabled={saving || loading}
            onClick={salvar}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Os itens vêm de <strong>Produtos e serviços</strong> ativos. Por padrão todos aparecem; você poderá ocultar itens individualmente depois.
      </div>
    </div>
  );
}

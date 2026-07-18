'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiSave, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { PREMIUM_MODULES, PLANO_SLUGS, premiumModuleStatusBadge, type PremiumModule } from '@/config/planModules';

type PlanoRow = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  slug: string | null;
  ativo: boolean;
  recursos_disponiveis: Partial<Record<PremiumModule, boolean>>;
};

export default function PlanosClient() {
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { preco: string; nome: string; descricao: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-saas/planos', { cache: 'no-store', credentials: 'include' });
      const json = await res.json();
      if (json.ok && Array.isArray(json.planos)) {
        const vendaveis = json.planos.filter(
          (p: PlanoRow) => p.slug === PLANO_SLUGS.BASICO || p.slug === PLANO_SLUGS.COMPLETO
        );
        setPlanos(vendaveis);
        const nextDrafts: Record<string, { preco: string; nome: string; descricao: string }> = {};
        for (const p of vendaveis) {
          nextDrafts[p.id] = {
            preco: String(p.preco ?? ''),
            nome: p.nome ?? '',
            descricao: p.descricao ?? '',
          };
        }
        setDrafts(nextDrafts);
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao carregar planos' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function salvar(plano: PlanoRow) {
    const draft = drafts[plano.id];
    if (!draft) return;

    const preco = parseFloat(draft.preco.replace(',', '.'));
    if (!Number.isFinite(preco) || preco < 0) {
      setMessage({ type: 'error', text: 'Informe um preço válido' });
      return;
    }

    setSavingId(plano.id);
    setMessage(null);
    try {
      const res = await fetch('/api/admin-saas/planos', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plano.id,
          nome: draft.nome.trim(),
          descricao: draft.descricao.trim(),
          preco,
          recursos_disponiveis: plano.recursos_disponiveis,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Falha ao salvar');
      }
      setMessage({ type: 'success', text: `Plano ${draft.nome} atualizado!` });
      await load();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar plano',
      });
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-100 rounded" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-gray-600">
        Defina o preço mensal de cada plano. Os módulos premium do plano Completo são fixos (NF, IA e CRM
        WhatsApp — em desenvolvimento).
      </p>

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          {message.text}
        </div>
      )}

      {planos.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Nenhum plano vendável encontrado. Execute a migration{' '}
          <code className="text-xs bg-white px-1 rounded">database/planos_dois_tiers.sql</code> no Supabase.
        </div>
      )}

      {planos.map((plano) => {
        const draft = drafts[plano.id];
        if (!draft) return null;
        const modulos = Object.entries(PREMIUM_MODULES) as [PremiumModule, (typeof PREMIUM_MODULES)[PremiumModule]][];
        return (
          <form
            key={plano.id}
            onSubmit={(e) => {
              e.preventDefault();
              void salvar(plano);
            }}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">{plano.slug}</h2>
              <span className="text-xs text-gray-500 uppercase tracking-wide">{plano.slug}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome exibido</label>
              <input
                type="text"
                value={draft.nome}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [plano.id]: { ...draft, nome: e.target.value } }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={draft.descricao}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [plano.id]: { ...draft, descricao: e.target.value } }))
                }
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço mensal (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={draft.preco}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [plano.id]: { ...draft, preco: e.target.value } }))
                }
                className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="89.90"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Módulos premium incluídos</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {modulos.map(([key, info]) => (
                  <li key={key} className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        plano.recursos_disponiveis?.[key] ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    {info.label}
                    {premiumModuleStatusBadge(info.status) && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">
                        {premiumModuleStatusBadge(info.status)}
                      </span>
                    )}
                    {!plano.recursos_disponiveis?.[key] && (
                      <span className="text-xs text-gray-400">(não incluído)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="submit"
              disabled={savingId === plano.id}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <FiSave />
              {savingId === plano.id ? 'Salvando...' : 'Salvar plano'}
            </button>
          </form>
        );
      })}
    </div>
  );
}

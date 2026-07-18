'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/Button';
import { FiCheck, FiX as FiXIcon } from 'react-icons/fi';
import {
  PLANO_SLUGS,
  PREMIUM_MODULES,
  PLANOS_VENDA,
  premiumModuleStatusBadge,
  type PlanoSlug,
  type PremiumModule,
} from '@/config/planModules';

type PlanoAdmin = {
  id: string;
  slug: string | null;
  nome: string;
  descricao: string;
  preco: number;
  recursos_disponiveis: Partial<Record<PremiumModule, boolean>>;
};

function formatarPrecoBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function modulosPremiumDoPlano(plano: PlanoAdmin) {
  return (Object.keys(PREMIUM_MODULES) as PremiumModule[]).map((key) => ({
    key,
    ...PREMIUM_MODULES[key],
    incluido: plano.slug === PLANO_SLUGS.COMPLETO || !!plano.recursos_disponiveis?.[key],
  }));
}

export type AdminAlterarPlanoModalProps = {
  empresaId: string;
  empresaNome: string;
  planoAtualId?: string | null;
  planoAtualNome?: string | null;
  /** Pré-seleciona Básico/Completo ao abrir (ex.: botão "Atribuir Completo") */
  planoInicialSlug?: PlanoSlug | null;
  valorMensalAtual?: number | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export default function AdminAlterarPlanoModal({
  empresaId,
  empresaNome,
  planoAtualId,
  planoAtualNome,
  planoInicialSlug,
  valorMensalAtual,
  onClose,
  onSuccess,
}: AdminAlterarPlanoModalProps) {
  const [planos, setPlanos] = useState<PlanoAdmin[]>([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);
  const [planoSelecionadoId, setPlanoSelecionadoId] = useState('');
  const [valorMensalStr, setValorMensalStr] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [limparRecursos, setLimparRecursos] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const valorInicializadoRef = useRef(false);

  useEffect(() => {
    valorInicializadoRef.current = false;
  }, [empresaId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingPlanos(true);
      setErro(null);
      try {
        const res = await fetch('/api/admin-saas/planos', { cache: 'no-store', credentials: 'include' });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Falha ao carregar planos');
        }
        const vendaveis = (json.planos || []).filter(
          (p: PlanoAdmin) => p.slug && PLANOS_VENDA.includes(p.slug as PlanoSlug)
        ) as PlanoAdmin[];

        if (cancelled) return;
        setPlanos(vendaveis);

        let selectedId = '';
        if (planoInicialSlug) {
          const bySlug = vendaveis.find((p) => p.slug === planoInicialSlug);
          if (bySlug) selectedId = bySlug.id;
        }
        if (!selectedId && planoAtualId && vendaveis.some((p) => p.id === planoAtualId)) {
          selectedId = planoAtualId;
        } else if (!selectedId && planoAtualNome) {
          const nomeNorm = planoAtualNome.toLowerCase().trim();
          const match = vendaveis.find(
            (p) =>
              p.nome.toLowerCase() === nomeNorm ||
              p.slug === nomeNorm ||
              (nomeNorm === 'trial' && p.slug === PLANO_SLUGS.BASICO)
          );
          if (match) selectedId = match.id;
        }
        if (selectedId) setPlanoSelecionadoId(selectedId);
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : 'Erro ao carregar planos');
        }
      } finally {
        if (!cancelled) setLoadingPlanos(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [planoAtualId, planoAtualNome, planoInicialSlug]);

  const planoSelecionado = planos.find((p) => p.id === planoSelecionadoId);

  function selecionarPlano(id: string) {
    setPlanoSelecionadoId(id);
    const plano = planos.find((p) => p.id === id);
    if (!plano) return;
    const mesmoPlanoAtual = !!planoAtualId && id === planoAtualId;
    if (
      mesmoPlanoAtual &&
      valorMensalAtual != null &&
      Number.isFinite(Number(valorMensalAtual))
    ) {
      setValorMensalStr(String(Number(valorMensalAtual)));
    } else {
      setValorMensalStr(String(Number(plano.preco) || ''));
    }
  }

  // Valor inicial quando planos carregam / seleção inicial
  useEffect(() => {
    if (!planoSelecionadoId || !planos.length || valorInicializadoRef.current) return;
    const plano = planos.find((p) => p.id === planoSelecionadoId);
    if (!plano) return;
    const mesmoPlanoAtual = !!planoAtualId && plano.id === planoAtualId;
    if (
      mesmoPlanoAtual &&
      valorMensalAtual != null &&
      Number.isFinite(Number(valorMensalAtual))
    ) {
      setValorMensalStr(String(Number(valorMensalAtual)));
    } else {
      setValorMensalStr(String(Number(plano.preco) || ''));
    }
    valorInicializadoRef.current = true;
  }, [planoSelecionadoId, planos, planoAtualId, valorMensalAtual]);

  const planoAtualIdVendavel =
    planoAtualId && planos.some((p) => p.id === planoAtualId) ? planoAtualId : null;
  const mudouPlano = planoSelecionadoId && planoSelecionadoId !== planoAtualIdVendavel;

  async function confirmar() {
    if (!planoSelecionadoId) return;

    setSalvando(true);
    setErro(null);
    try {
      const trimmed = valorMensalStr.trim();
      let valor_mensal: number | undefined;
      if (trimmed) {
        const n = parseFloat(trimmed.replace(/\./g, '').replace(',', '.'));
        if (Number.isFinite(n) && n > 0) valor_mensal = n;
      }

      const res = await fetch(`/api/admin-saas/empresas/${empresaId}/alterar-plano`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano_id: planoSelecionadoId,
          observacoes: observacoes.trim() || undefined,
          limpar_recursos_customizados: limparRecursos,
          ...(valor_mensal != null ? { valor_mensal } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || json.error || 'Falha ao alterar plano');
      }
      await onSuccess();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao alterar assinatura');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Alterar assinatura</h3>
            <p className="text-sm text-gray-500 mt-0.5">{empresaNome}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <FiXIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {planoAtualNome && (
            <p className="text-sm text-gray-600">
              Plano atual: <span className="font-medium text-gray-900">{planoAtualNome}</span>
            </p>
          )}

          <div>
            <p className="text-sm font-medium text-gray-800 mb-3">Escolha o novo plano</p>
            {loadingPlanos ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
                <div className="h-48 bg-gray-100 rounded-xl" />
                <div className="h-48 bg-gray-100 rounded-xl" />
              </div>
            ) : planos.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Planos Básico e Completo não encontrados. Execute a migration{' '}
                <code className="text-xs bg-white px-1 rounded">planos_dois_tiers.sql</code> no Supabase.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {planos.map((plano) => {
                  const selected = planoSelecionadoId === plano.id;
                  const isCompleto = plano.slug === PLANO_SLUGS.COMPLETO;
                  const modulos = modulosPremiumDoPlano(plano);
                  return (
                    <button
                      key={plano.id}
                      type="button"
                      onClick={() => selecionarPlano(plano.id)}
                      className={`text-left rounded-xl border p-4 transition-all ${
                        selected
                          ? 'border-gray-900 ring-2 ring-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-400 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{plano.nome}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{plano.descricao}</p>
                        </div>
                        {isCompleto && (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                            Completo
                          </span>
                        )}
                      </div>
                      <p className="text-xl font-bold text-gray-900 mb-3">
                        {formatarPrecoBRL(Number(plano.preco))}
                        <span className="text-sm font-normal text-gray-500">/mês</span>
                      </p>
                      <ul className="space-y-1">
                        {modulos.map((m) => (
                          <li
                            key={m.key}
                            className={`flex items-center gap-1.5 text-xs ${
                              m.incluido ? 'text-gray-700' : 'text-gray-400'
                            }`}
                          >
                            {m.incluido ? (
                              <FiCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <FiXIcon className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                            )}
                            {m.label}
                            {premiumModuleStatusBadge(m.status) && (
                              <span className="text-[9px] uppercase tracking-wide text-amber-700 font-semibold">
                                {premiumModuleStatusBadge(m.status)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {planoSelecionado && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600">
              {planoSelecionado.slug === PLANO_SLUGS.BASICO
                ? 'Gestão completa da assistência, sem módulos premium (NF, IA e CRM WhatsApp).'
                : 'Inclui módulos premium: Nota Fiscal, IA e CRM WhatsApp (em desenvolvimento).'}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor mensal para o plano {planoSelecionado?.nome || 'selecionado'} (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={valorMensalStr}
              onChange={(e) => setValorMensalStr(e.target.value)}
              placeholder={
                planoSelecionado
                  ? `Catálogo: ${formatarPrecoBRL(Number(planoSelecionado.preco))}`
                  : 'Ex: 149,90'
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Este valor fica gravado na assinatura e é o que o usuário vê ao renovar.
              {planoSelecionado && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="text-gray-800 underline underline-offset-2"
                    onClick={() =>
                      setValorMensalStr(String(Number(planoSelecionado.preco) || ''))
                    }
                  >
                    Usar catálogo ({formatarPrecoBRL(Number(planoSelecionado.preco))})
                  </button>
                </>
              )}
            </p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={limparRecursos}
              onChange={(e) => setLimparRecursos(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">
              Remover customizações de módulos e aplicar apenas os recursos do plano escolhido
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              rows={2}
              placeholder="Motivo da alteração, desconto acordado, etc."
            />
          </div>

          {erro && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erro}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
          <Button variant="outline" onClick={onClose} className="border-gray-300" disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            className="bg-gray-900 hover:bg-gray-800 text-white"
            disabled={!planoSelecionadoId || salvando || loadingPlanos}
          >
            {salvando ? 'Salvando...' : mudouPlano ? 'Confirmar alteração' : 'Atualizar assinatura'}
          </Button>
        </div>
      </div>
    </div>
  );
}

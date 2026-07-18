'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { FiCheck, FiRefreshCw } from 'react-icons/fi';
import { PLANO_SLUGS, PLANOS_VENDA, type PlanoSlug } from '@/config/planModules';

type PlanoCatalogo = {
  id: string;
  slug: string;
  nome: string;
  preco: number;
};

type Props = {
  empresaId: string;
  planoAtualSlug?: string | null;
  planoAtualNome?: string | null;
  valorMensalAtual?: number | null;
  precoCatalogoAtual?: number | null;
  assinaturaStatus?: string | null;
  onSaved: () => void | Promise<void>;
  onAlterarAssinatura: (planoSlug?: PlanoSlug) => void;
};

function formatarPrecoBRL(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseValorInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Valor cobrado organizado por plano (Básico / Completo):
 * mostra preço de catálogo e permite personalizar o valor do plano atual.
 */
export default function AdminEmpresaValorPorPlano({
  empresaId,
  planoAtualSlug,
  planoAtualNome,
  valorMensalAtual,
  precoCatalogoAtual,
  assinaturaStatus,
  onSaved,
  onAlterarAssinatura,
}: Props) {
  const [planos, setPlanos] = useState<PlanoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [valorStr, setValorStr] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const temAssinaturaEditavel =
    assinaturaStatus === 'active' ||
    assinaturaStatus === 'ativa' ||
    assinaturaStatus === 'trial' ||
    assinaturaStatus === 'expired' ||
    assinaturaStatus === 'cancelled';

  const slugAtual =
    planoAtualSlug === PLANO_SLUGS.BASICO || planoAtualSlug === PLANO_SLUGS.COMPLETO
      ? planoAtualSlug
      : null;

  const carregarPlanos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-saas/planos', {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Falha ao carregar planos');
      const list = (json.planos || [])
        .filter((p: PlanoCatalogo) => p.slug && PLANOS_VENDA.includes(p.slug as PlanoSlug))
        .map((p: PlanoCatalogo) => ({
          id: p.id,
          slug: p.slug,
          nome: p.nome,
          preco: Number(p.preco) || 0,
        }))
        .sort((a: PlanoCatalogo, b: PlanoCatalogo) => a.preco - b.preco);
      setPlanos(list);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarPlanos();
  }, [carregarPlanos]);

  useEffect(() => {
    const v = valorMensalAtual;
    setValorStr(v != null && Number.isFinite(Number(v)) ? String(Number(v)) : '');
    setOkMsg(null);
    setErro(null);
  }, [empresaId, valorMensalAtual, slugAtual]);

  async function salvarValorPlanoAtual() {
    const n = parseValorInput(valorStr);
    if (n == null) {
      setErro('Informe um valor válido maior que zero.');
      return;
    }
    if (!slugAtual) {
      setErro('Defina um plano (Básico ou Completo) em “Alterar assinatura” antes de personalizar o valor.');
      return;
    }

    setSalvando(true);
    setErro(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/admin-saas/empresas/${empresaId}/assinatura-valor`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: n }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Falha ao salvar valor');
      }
      setOkMsg(`Valor do plano ${planoAtualNome || slugAtual} atualizado. O usuário verá este preço ao renovar.`);
      await onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  function usarPrecoCatalogo(preco: number) {
    setValorStr(String(preco));
    setOkMsg(null);
    setErro(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Valor por plano</h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Preço de catálogo vs. valor cobrado nesta empresa. O valor personalizado vale para o plano atual
            (renovação e PIX).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void carregarPlanos()}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          title="Atualizar preços do catálogo"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && planos.length === 0 ? (
        <div className="text-sm text-gray-500 py-4">Carregando planos...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {planos.map((plano) => {
            const isAtual = slugAtual === plano.slug;
            const catalogo =
              isAtual && precoCatalogoAtual != null && Number.isFinite(precoCatalogoAtual)
                ? Number(precoCatalogoAtual)
                : plano.preco;
            const personalizado =
              isAtual &&
              valorMensalAtual != null &&
              Number.isFinite(Number(valorMensalAtual)) &&
              Math.abs(Number(valorMensalAtual) - catalogo) > 0.009;

            return (
              <div
                key={plano.id}
                className={`rounded-xl border p-4 ${
                  isAtual
                    ? 'border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-semibold text-gray-900">{plano.nome}</p>
                  {isAtual ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                      <FiCheck className="w-3 h-3" /> Atual
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      Catálogo
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-1">Preço do catálogo</p>
                <p className="text-lg font-bold text-gray-900 mb-3">
                  {formatarPrecoBRL(catalogo)}
                  <span className="text-sm font-normal text-gray-500">/mês</span>
                </p>

                {isAtual && temAssinaturaEditavel ? (
                  <div className="space-y-2 pt-2 border-t border-emerald-200/80">
                    <label className="block text-xs font-medium text-gray-700">
                      Valor cobrado nesta empresa
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={valorStr}
                        onChange={(e) => {
                          setValorStr(e.target.value);
                          setOkMsg(null);
                          setErro(null);
                        }}
                        className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent bg-white"
                        placeholder={String(catalogo)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={salvando}
                        onClick={() => void salvarValorPlanoAtual()}
                        className="bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        {salvando ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={() => usarPrecoCatalogo(catalogo)}
                      className="text-xs text-emerald-800 hover:underline"
                    >
                      Usar preço do catálogo ({formatarPrecoBRL(catalogo)})
                    </button>
                    {personalizado && (
                      <p className="text-xs text-emerald-800 font-medium">
                        Personalizado ativo — usuário vê {formatarPrecoBRL(Number(valorMensalAtual))}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">
                      {isAtual
                        ? 'Sem assinatura editável. Atribua o plano para definir o valor.'
                        : 'Para cobrar um valor diferente neste plano, atribua-o à empresa.'}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onAlterarAssinatura(plano.slug as PlanoSlug)}
                      className="border-gray-300 text-gray-800 text-xs"
                    >
                      {isAtual ? 'Alterar assinatura' : `Atribuir ${plano.nome}`}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!slugAtual && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Plano atual{planoAtualNome ? ` (${planoAtualNome})` : ''} não é Básico/Completo. Use
          &quot;Alterar assinatura&quot; para definir o plano e o valor mensal.
        </p>
      )}

      {erro && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
      )}
      {okMsg && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          {okMsg}
        </p>
      )}
    </div>
  );
}

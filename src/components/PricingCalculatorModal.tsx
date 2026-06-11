'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import {
  calcularPrecificacao,
  formatBRL,
  handleMoneyInputChange,
  isConfiguracaoValida,
  parseMoneyInput,
  SAUDE_LABELS,
  type ConfiguracaoPrecificacao,
} from '@/lib/pricingCalculator';
import { cn } from '@/lib/utils';
import { FiAlertCircle, FiPrinter, FiSettings, FiTrendingUp } from 'react-icons/fi';
import { Calculator } from 'lucide-react';
import PricingCalculatorPrintDialog from '@/components/PricingCalculatorPrintDialog';
import { Button } from '@/components/Button';

interface PricingCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONFIG_TAXAS_HREF = '/configuracoes?tab=3';

const SAUDE_STYLES = {
  saudavel: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  apertado: 'bg-amber-50 border-amber-200 text-amber-800',
  insuficiente: 'bg-red-50 border-red-200 text-red-800',
} as const;

function ResumoTaxas({ config }: { config: ConfiguracaoPrecificacao }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-gray-600 sm:grid-cols-4">
      <span>
        Markup: <strong className="text-gray-800">{config.markup_percent}%</strong>
      </span>
      <span>
        Imposto: <strong className="text-gray-800">{config.imposto_percent}%</strong>
      </span>
      <span>
        Juros: <strong className="text-gray-800">{config.juros_parcelamento_percent}%</strong>
      </span>
      <span>
        Frete: <strong className="text-gray-800">{formatBRL(config.frete_valor)}</strong>
      </span>
    </div>
  );
}

export default function PricingCalculatorModal({ isOpen, onClose }: PricingCalculatorModalProps) {
  const { usuarioData, empresaData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfiguracaoPrecificacao | null>(null);
  const [custoInput, setCustoInput] = useState('');
  const [maoDeObraInput, setMaoDeObraInput] = useState('');
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !usuarioData?.empresa_id) return;

    let cancelled = false;
    setLoading(true);
    setCustoInput('');
    setMaoDeObraInput('');
    setPrintOpen(false);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes_precificacao')
          .select('markup_percent, imposto_percent, juros_parcelamento_percent, frete_valor, configurado')
          .eq('empresa_id', usuarioData.empresa_id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setConfig(null);
          return;
        }

        if (data) {
          setConfig({
            markup_percent: Number(data.markup_percent ?? 0),
            imposto_percent: Number(data.imposto_percent ?? 0),
            juros_parcelamento_percent: Number(data.juros_parcelamento_percent ?? 0),
            frete_valor: Number(data.frete_valor ?? 0),
            configurado: Boolean(data.configurado),
          });
        } else {
          setConfig(null);
        }
      } catch {
        if (!cancelled) setConfig(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, usuarioData?.empresa_id]);

  const custo = useMemo(() => parseMoneyInput(custoInput), [custoInput]);
  const maoDeObra = useMemo(() => parseMoneyInput(maoDeObraInput), [maoDeObraInput]);

  const temValorInformado = custo > 0 || maoDeObra > 0;

  const resultado = useMemo(() => {
    if (!config || !isConfiguracaoValida(config) || !temValorInformado) return null;
    return calcularPrecificacao(custo, config, maoDeObra);
  }, [config, custo, maoDeObra, temValorInformado]);

  if (!isOpen) return null;

  const configurado = isConfiguracaoValida(config);

  return (
    <>
      <Dialog onClose={onClose} mobileBottomSheet>
        <div className="px-4 pb-5 pt-1 sm:px-6 sm:pb-6 sm:pt-6 w-full sm:w-[28rem]">
          <div className="flex items-start gap-3 mb-5 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
              <Calculator size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                Calculadora de Precificação
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Calcule o preço de venda com peça e mão de obra
              </p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3 py-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          ) : !configurado ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <FiAlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-900">Configuração necessária</p>
                  <p className="text-sm text-amber-800 mt-1">
                    A calculadora ainda não foi configurada para {empresaData?.nome || 'sua empresa'}.
                    Defina markup, imposto, juros e frete antes de utilizá-la.
                  </p>
                  <Button asChild className="w-full mt-4 sm:w-auto">
                    <Link href={CONFIG_TAXAS_HREF} onClick={onClose}>
                      <FiSettings className="mr-2" size={16} />
                      Configurar taxas
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {config && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Taxas ativas
                    </span>
                    <Button asChild variant="ghost" size="sm" className="h-8 shrink-0 px-2.5">
                      <Link href={CONFIG_TAXAS_HREF} onClick={onClose}>
                        <FiSettings size={14} className="mr-1.5" />
                        Editar
                      </Link>
                    </Button>
                  </div>
                  <ResumoTaxas config={config} />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Custo da peça
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={custoInput}
                    onChange={(e) => setCustoInput(handleMoneyInputChange(e.target.value))}
                    autoFocus
                    className="text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mão de obra
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={maoDeObraInput}
                    onChange={(e) => setMaoDeObraInput(handleMoneyInputChange(e.target.value))}
                    className="text-base sm:text-sm"
                  />
                </div>
              </div>

              {temValorInformado && resultado && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-sm text-gray-600">Preço de venda sugerido</span>
                      <span className="text-lg font-bold text-gray-900 tabular-nums shrink-0">
                        {formatBRL(resultado.precoVenda)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-sm text-gray-600">Preço com parcelamento</span>
                      <span className="text-base font-semibold text-gray-800 tabular-nums shrink-0">
                        {formatBRL(resultado.precoParcelado)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-3 border-t border-gray-200 pt-3">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <FiTrendingUp size={14} />
                        Lucro bruto
                      </span>
                      <span
                        className={cn(
                          'text-base font-semibold tabular-nums shrink-0',
                          resultado.lucroBruto >= 0 ? 'text-emerald-700' : 'text-red-600'
                        )}
                      >
                        {formatBRL(resultado.lucroBruto)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'rounded-xl border p-3 flex items-center justify-between gap-2',
                      SAUDE_STYLES[resultado.saude]
                    )}
                  >
                    <span className="text-sm font-medium">{SAUDE_LABELS[resultado.saude]}</span>
                    <span className="text-xs opacity-80 shrink-0">
                      Margem: {resultado.margemBrutaPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setPrintOpen(true)}
                    >
                      <FiPrinter className="mr-2" size={16} />
                      Enviar orçamento
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="w-full sm:w-auto text-gray-600">
                      <Link href={CONFIG_TAXAS_HREF} onClick={onClose}>
                        <FiSettings className="mr-1.5" size={14} />
                        Configurar taxas
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {!temValorInformado && (
                <p className="text-xs text-gray-500 text-center px-2">
                  Informe o custo da peça e/ou mão de obra para ver os valores calculados.
                </p>
              )}
            </div>
          )}
        </div>
      </Dialog>

      {resultado && empresaData && (
        <PricingCalculatorPrintDialog
          isOpen={printOpen}
          onClose={() => setPrintOpen(false)}
          empresa={{
            id: empresaData.id,
            nome: empresaData.nome,
            cnpj: empresaData.cnpj,
            endereco: empresaData.endereco,
            telefone: empresaData.telefone,
            email: empresaData.email,
            logo_url: empresaData.logo_url,
          }}
          resultado={resultado}
          maoDeObra={maoDeObra}
        />
      )}
    </>
  );
}

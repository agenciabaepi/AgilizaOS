'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { parsePercentInput, MODO_EXIBICAO_CLIENTE_OPTIONS, type ModoExibicaoPrecoCliente } from '@/lib/pricingCalculator';
import { FiPercent, FiDollarSign, FiSave } from 'react-icons/fi';
import { Calculator } from 'lucide-react';

interface ConfigPrecificacao {
  id?: string;
  empresa_id: string;
  markup_percent: number;
  imposto_percent: number;
  juros_parcelamento_percent: number;
  frete_valor: number;
  modo_exibicao_cliente: ModoExibicaoPrecoCliente;
  desconto_vista_percent: number;
  configurado: boolean;
}

function formFromData(d: ConfigPrecificacao) {
  return {
    markup_percent: String(d.markup_percent ?? ''),
    imposto_percent: String(d.imposto_percent ?? ''),
    juros_parcelamento_percent: String(d.juros_parcelamento_percent ?? ''),
    frete_valor: String(d.frete_valor ?? ''),
    modo_exibicao_cliente: (d.modo_exibicao_cliente ?? 'separado') as ModoExibicaoPrecoCliente,
    desconto_vista_percent: String(d.desconto_vista_percent ?? ''),
  };
}

export default function PrecificacaoPage() {
  const { usuarioData } = useAuth();
  const { podeAcessar } = useConfigPermission('precificacao');
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    markup_percent: '',
    imposto_percent: '',
    juros_parcelamento_percent: '',
    frete_valor: '',
    modo_exibicao_cliente: 'separado' as ModoExibicaoPrecoCliente,
    desconto_vista_percent: '',
  });

  const empresaId = usuarioData?.empresa_id;

  const carregarConfig = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracoes_precificacao')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        setForm(formFromData(data as ConfigPrecificacao));
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [empresaId, addToast]);

  useEffect(() => {
    carregarConfig();
  }, [carregarConfig]);

  const salvar = async () => {
    if (!empresaId) {
      addToast('error', 'Empresa não identificada. Recarregue a página e tente novamente.');
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        empresa_id: empresaId,
        markup_percent: parsePercentInput(form.markup_percent),
        imposto_percent: parsePercentInput(form.imposto_percent),
        juros_parcelamento_percent: parsePercentInput(form.juros_parcelamento_percent),
        frete_valor: parsePercentInput(form.frete_valor),
        modo_exibicao_cliente: form.modo_exibicao_cliente,
        desconto_vista_percent: parsePercentInput(form.desconto_vista_percent),
        configurado: true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('configuracoes_precificacao')
        .upsert(payload, { onConflict: 'empresa_id' })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        setForm(formFromData(data as ConfigPrecificacao));
      }

      addToast('success', 'Configurações da calculadora salvas com sucesso!');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erro ao salvar configurações');
    } finally {
      setSalvando(false);
    }
  };

  if (!podeAcessar) return <AcessoNegadoComponent />;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Calculator className="text-gray-600" size={20} />
          Calculadora de Precificação
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Defina os parâmetros usados pela calculadora flutuante para calcular o preço de venda das peças.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parâmetros de cálculo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Markup sobre a peça (%)
              </label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 30"
                  value={form.markup_percent}
                  onChange={(e) => setForm((f) => ({ ...f, markup_percent: e.target.value }))}
                  className="pr-10"
                />
                <FiPercent className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Percentual de markup aplicado sobre o custo + frete.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Imposto (%)
              </label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 6"
                  value={form.imposto_percent}
                  onChange={(e) => setForm((f) => ({ ...f, imposto_percent: e.target.value }))}
                  className="pr-10"
                />
                <FiPercent className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Imposto aplicado sobre o preço com markup.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Juros de parcelamento (%)
              </label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 2"
                  value={form.juros_parcelamento_percent}
                  onChange={(e) => setForm((f) => ({ ...f, juros_parcelamento_percent: e.target.value }))}
                  className="pr-10"
                />
                <FiPercent className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Percentual de juros sobre o valor à vista (aplicado no total parcelado, exibido de 2x até 12x).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Frete (R$)
              </label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 15,00"
                  value={form.frete_valor}
                  onChange={(e) => setForm((f) => ({ ...f, frete_valor: e.target.value }))}
                  className="pl-10"
                />
                <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Valor fixo de frete somado ao custo da peça.</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-800">Exibição para o cliente</p>
            <p className="text-xs text-gray-500">
              Define como o orçamento aparece no cupom e no WhatsApp.
            </p>
            <div className="space-y-2">
              {MODO_EXIBICAO_CLIENTE_OPTIONS.map((opcao) => (
                <label
                  key={opcao.value}
                  className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition-colors ${
                    form.modo_exibicao_cliente === opcao.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="modo_exibicao_cliente"
                    className="mt-1"
                    checked={form.modo_exibicao_cliente === opcao.value}
                    onChange={() => setForm((f) => ({ ...f, modo_exibicao_cliente: opcao.value }))}
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">{opcao.label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{opcao.description}</span>
                  </span>
                </label>
              ))}
            </div>

            {form.modo_exibicao_cliente === 'parcelado_destaque' && (
              <div className="max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Desconto à vista (%)
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 10"
                    value={form.desconto_vista_percent}
                    onChange={(e) => setForm((f) => ({ ...f, desconto_vista_percent: e.target.value }))}
                    className="pr-10"
                  />
                  <FiPercent className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Percentual exibido ao cliente no cupom e WhatsApp. Deixe em branco ou 0 para calcular automaticamente.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-800 mb-1">Como funciona o cálculo</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>Soma o custo da peça com o frete e aplica markup e imposto</li>
              <li>Adiciona o valor de mão de obra informado na calculadora</li>
              <li>Calcula o parcelado com os juros configurados (até 12x)</li>
            </ol>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={salvar} disabled={salvando}>
              <FiSave className="mr-2" />
              {salvando ? 'Salvando...' : 'Salvar configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

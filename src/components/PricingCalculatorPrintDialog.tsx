'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Textarea } from '@/components/textarea';
import { imprimirCupomOrcamento } from '@/lib/pricingCalculatorCupom';
import {
  clampParcelasExibicao,
  filtrarOpcoesParcelamento,
  listaParcelasExibicao,
  PARCELAS_MAX,
  type ResultadoPrecificacao,
  type ModoExibicaoPrecoCliente,
} from '@/lib/pricingCalculator';
import {
  abrirOrcamentoWhatsApp,
  buildOrcamentoWhatsAppMessage,
  handlePhoneInputChange,
  isTelefoneWhatsAppValido,
} from '@/lib/pricingCalculatorWhatsApp';
import { convertLogoToBlackForCupom } from '@/utils/logoCupomPreto';
import { supabase } from '@/lib/supabaseClient';
import { FiMessageCircle, FiPrinter } from 'react-icons/fi';

interface EmpresaPrintData {
  id?: string;
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  website?: string;
}

interface PricingCalculatorPrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  empresa: EmpresaPrintData;
  resultado: ResultadoPrecificacao;
  maoDeObra: number;
  modoExibicaoCliente: ModoExibicaoPrecoCliente;
  descontoVistaPercent: number;
  maxParcelas?: number;
}

async function prepararLogoCupom(logoUrl?: string): Promise<string | null> {
  const source = logoUrl || '/logo.png';
  try {
    return await convertLogoToBlackForCupom(source);
  } catch {
    if (source !== '/logo.png') {
      try {
        return await convertLogoToBlackForCupom('/logo.png');
      } catch {
        return null;
      }
    }
    return null;
  }
}

export default function PricingCalculatorPrintDialog({
  isOpen,
  onClose,
  empresa,
  resultado,
  maoDeObra,
  modoExibicaoCliente,
  descontoVistaPercent,
  maxParcelas = PARCELAS_MAX,
}: PricingCalculatorPrintDialogProps) {
  const [cliente, setCliente] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [modeloAparelho, setModeloAparelho] = useState('');
  const [textoPersonalizado, setTextoPersonalizado] = useState('');
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState('');
  const [parcelasExibir, setParcelasExibir] = useState(maxParcelas);
  const [exibirMaoDeObraSeparada, setExibirMaoDeObraSeparada] = useState(false);
  const [exibirParcelamento, setExibirParcelamento] = useState(true);
  const [processando, setProcessando] = useState(false);

  const parcelasSelecionadas = clampParcelasExibicao(parcelasExibir);
  const opcoesParcelamento = useMemo(
    () => filtrarOpcoesParcelamento(resultado.opcoesParcelamento, parcelasSelecionadas),
    [resultado.opcoesParcelamento, parcelasSelecionadas]
  );

  useEffect(() => {
    if (isOpen) {
      setCliente('');
      setWhatsapp('');
      setModeloAparelho('');
      setTextoPersonalizado('');
      setMensagemWhatsApp('');
      setParcelasExibir(clampParcelasExibicao(maxParcelas));
      setExibirMaoDeObraSeparada(false);
      setExibirParcelamento(false);
      setProcessando(false);
    }
  }, [isOpen, maxParcelas]);

  const orcamentoParaEnvio = useMemo(
    () => ({
      empresa: {
        nome: empresa.nome,
        cnpj: empresa.cnpj,
        endereco: empresa.endereco,
        telefone: empresa.telefone,
        email: empresa.email,
        website: empresa.website,
      },
      cliente: cliente.trim() || 'cliente',
      modeloAparelho: modeloAparelho.trim() || 'aparelho',
      precoPeca: resultado.precoPeca,
      maoDeObra,
      precoVenda: resultado.precoVenda,
      precoParcelado: resultado.precoParcelado,
      opcoesParcelamento,
      exibirMaoDeObraSeparada,
      exibirParcelamento,
      modoExibicaoCliente,
      descontoVistaPercent,
      maxParcelas: parcelasSelecionadas,
      textoPersonalizado,
    }),
    [
      empresa.nome,
      empresa.cnpj,
      empresa.endereco,
      empresa.telefone,
      empresa.email,
      empresa.website,
      cliente,
      modeloAparelho,
      resultado.precoPeca,
      resultado.precoVenda,
      resultado.precoParcelado,
      maoDeObra,
      opcoesParcelamento,
      exibirMaoDeObraSeparada,
      exibirParcelamento,
      modoExibicaoCliente,
      descontoVistaPercent,
      parcelasSelecionadas,
      textoPersonalizado,
    ]
  );

  const mensagemGerada = useMemo(
    () => buildOrcamentoWhatsAppMessage(orcamentoParaEnvio),
    [orcamentoParaEnvio]
  );

  useEffect(() => {
    if (!isOpen) return;
    setMensagemWhatsApp(mensagemGerada);
  }, [isOpen, mensagemGerada]);

  if (!isOpen) return null;

  const dadosBasicosPreenchidos = cliente.trim().length > 0 && modeloAparelho.trim().length > 0;
  const whatsappValido = isTelefoneWhatsAppValido(whatsapp);

  async function prepararDadosOrcamento() {
    let empresaCompleta = { ...empresa };

    if (empresa.id && !empresa.website) {
      const { data } = await supabase
        .from('empresas')
        .select('website, logo_url')
        .eq('id', empresa.id)
        .maybeSingle();
      if (data) {
        empresaCompleta = {
          ...empresaCompleta,
          website: data.website || empresaCompleta.website,
          logo_url: data.logo_url || empresaCompleta.logo_url,
        };
      }
    }

    const empresaCupom = {
      nome: empresaCompleta.nome,
      cnpj: empresaCompleta.cnpj,
      endereco: empresaCompleta.endereco,
      telefone: empresaCompleta.telefone,
      email: empresaCompleta.email,
      website: empresaCompleta.website,
    };

    const orcamentoBase = {
      empresa: empresaCupom,
      cliente: cliente.trim(),
      modeloAparelho: modeloAparelho.trim(),
      precoPeca: resultado.precoPeca,
      maoDeObra,
      precoVenda: resultado.precoVenda,
      precoParcelado: resultado.precoParcelado,
      opcoesParcelamento,
      exibirMaoDeObraSeparada,
      exibirParcelamento,
      modoExibicaoCliente,
      descontoVistaPercent,
      maxParcelas: parcelasSelecionadas,
      textoPersonalizado,
    };

    const logoCupomPreto = await prepararLogoCupom(empresaCompleta.logo_url);

    return { orcamentoBase, logoCupomPreto };
  }

  const handleImprimir = async () => {
    if (!dadosBasicosPreenchidos) return;

    setProcessando(true);
    try {
      const { orcamentoBase, logoCupomPreto } = await prepararDadosOrcamento();
      imprimirCupomOrcamento({ ...orcamentoBase, logoCupomPreto });
      onClose();
    } finally {
      setProcessando(false);
    }
  };

  const handleEnviarWhatsApp = async () => {
    if (!dadosBasicosPreenchidos || !whatsappValido) return;

    setProcessando(true);
    try {
      const { orcamentoBase } = await prepararDadosOrcamento();
      abrirOrcamentoWhatsApp(whatsapp, orcamentoBase, mensagemWhatsApp);
      onClose();
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog onClose={onClose} mobileBottomSheet>
      <div className="px-4 pb-5 pt-1 sm:px-6 sm:pb-6 sm:pt-6 w-full sm:w-[28rem] max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 pr-8">Enviar orçamento</h3>
        <p className="text-xs text-gray-500 mb-5">
          Personalize o texto e as parcelas antes de imprimir o cupom ou enviar pelo WhatsApp.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome do cliente
            </label>
            <Input
              type="text"
              placeholder="Ex: João Silva"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              WhatsApp do cliente
            </label>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(handlePhoneInputChange(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">
              Com DDD. Usado para abrir o WhatsApp com o orçamento formatado.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Modelo do aparelho
            </label>
            <Input
              type="text"
              placeholder="Ex: iPhone 13 Pro"
              value={modeloAparelho}
              onChange={(e) => setModeloAparelho(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Texto personalizado
            </label>
            <Textarea
              rows={3}
              placeholder="Ex: Consigo parcelar no cartão, ou 5% de desconto no PIX. Posso buscar o aparelho hoje."
              value={textoPersonalizado}
              onChange={(e) => setTextoPersonalizado(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Esse texto entra no WhatsApp e no cupom, do jeito que você escrever para este cliente.
            </p>
          </div>

          {maoDeObra > 0 && (
            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 p-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={exibirMaoDeObraSeparada}
                onChange={(e) => setExibirMaoDeObraSeparada(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Exibir mão de obra separada
                <span className="block text-xs text-gray-500 mt-0.5">
                  Se desmarcado, aparece apenas o valor total para o cliente.
                </span>
              </span>
            </label>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Parcelas para o cliente
            </p>
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-gray-700">Exibir até</label>
              <select
                value={parcelasSelecionadas}
                onChange={(e) => setParcelasExibir(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              >
                {listaParcelasExibicao().map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={exibirParcelamento}
                onChange={(e) => setExibirParcelamento(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Incluir tabela de parcelamento (2x até {parcelasSelecionadas}x)
                <span className="block text-xs text-gray-500 mt-0.5">
                  No cupom e no WhatsApp. O destaque fica na opção de {parcelasSelecionadas}x.
                </span>
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mensagem do WhatsApp
            </label>
            <Textarea
              rows={8}
              value={mensagemWhatsApp}
              onChange={(e) => setMensagemWhatsApp(e.target.value)}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Você pode editar o texto inteiro antes de enviar. O cupom usa o texto personalizado e as parcelas escolhidas.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <Button
            type="button"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleEnviarWhatsApp}
            disabled={!dadosBasicosPreenchidos || !whatsappValido || processando}
          >
            <FiMessageCircle className="mr-2" size={16} />
            {processando ? 'Preparando...' : 'Enviar pelo WhatsApp'}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose} disabled={processando}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleImprimir}
              disabled={!dadosBasicosPreenchidos || processando}
            >
              <FiPrinter className="mr-2" size={16} />
              Imprimir cupom
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

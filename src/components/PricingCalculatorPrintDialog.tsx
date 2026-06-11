'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { imprimirCupomOrcamento } from '@/lib/pricingCalculatorCupom';
import type { ResultadoPrecificacao } from '@/lib/pricingCalculator';
import {
  abrirOrcamentoWhatsApp,
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
}: PricingCalculatorPrintDialogProps) {
  const [cliente, setCliente] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [modeloAparelho, setModeloAparelho] = useState('');
  const [exibirMaoDeObraSeparada, setExibirMaoDeObraSeparada] = useState(false);
  const [exibirParcelamento, setExibirParcelamento] = useState(true);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCliente('');
      setWhatsapp('');
      setModeloAparelho('');
      setExibirMaoDeObraSeparada(false);
      setExibirParcelamento(true);
      setProcessando(false);
    }
  }, [isOpen]);

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
      exibirMaoDeObraSeparada,
      exibirParcelamento,
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
      abrirOrcamentoWhatsApp(whatsapp, orcamentoBase);
      onClose();
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog onClose={onClose} mobileBottomSheet>
      <div className="px-4 pb-5 pt-1 sm:px-6 sm:pb-6 sm:pt-6 w-full sm:w-[24rem]">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 pr-8">Enviar orçamento</h3>
        <p className="text-xs text-gray-500 mb-5">
          Preencha os dados do cliente para imprimir o cupom ou enviar pelo WhatsApp.
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

          <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 p-3">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={exibirParcelamento}
              onChange={(e) => setExibirParcelamento(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Exibir parcelamento em até 6x
              <span className="block text-xs text-gray-500 mt-0.5">
                Mostra o valor de cada parcela e o total com juros configurado.
              </span>
            </span>
          </label>
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

'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { imprimirCupomOrcamento } from '@/lib/pricingCalculatorCupom';
import type { ResultadoPrecificacao } from '@/lib/pricingCalculator';
import { convertLogoToBlackForCupom } from '@/utils/logoCupomPreto';
import { supabase } from '@/lib/supabaseClient';
import { FiPrinter } from 'react-icons/fi';

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
  const [modeloAparelho, setModeloAparelho] = useState('');
  const [exibirMaoDeObraSeparada, setExibirMaoDeObraSeparada] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCliente('');
      setModeloAparelho('');
      setExibirMaoDeObraSeparada(false);
      setImprimindo(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImprimir = async () => {
    if (!cliente.trim() || !modeloAparelho.trim()) return;

    setImprimindo(true);
    try {
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

      const logoCupomPreto = await prepararLogoCupom(empresaCompleta.logo_url);

      imprimirCupomOrcamento({
        empresa: {
          nome: empresaCompleta.nome,
          cnpj: empresaCompleta.cnpj,
          endereco: empresaCompleta.endereco,
          telefone: empresaCompleta.telefone,
          email: empresaCompleta.email,
          website: empresaCompleta.website,
        },
        logoCupomPreto,
        cliente: cliente.trim(),
        modeloAparelho: modeloAparelho.trim(),
        precoPeca: resultado.precoPeca,
        maoDeObra,
        precoVenda: resultado.precoVenda,
        exibirMaoDeObraSeparada,
      });

      onClose();
    } finally {
      setImprimindo(false);
    }
  };

  const podeImprimir = cliente.trim().length > 0 && modeloAparelho.trim().length > 0;

  return (
    <Dialog onClose={onClose}>
      <div className="p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 pr-6">Imprimir orçamento</h3>
        <p className="text-xs text-gray-500 mb-5">
          Preencha os dados para gerar o cupom. O cliente verá apenas o valor final.
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
                Exibir mão de obra separada no cupom
                <span className="block text-xs text-gray-500 mt-0.5">
                  Se desmarcado, aparece apenas o valor total para o cliente.
                </span>
              </span>
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={imprimindo}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleImprimir} disabled={!podeImprimir || imprimindo}>
            <FiPrinter className="mr-2" size={16} />
            {imprimindo ? 'Preparando...' : 'Imprimir'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

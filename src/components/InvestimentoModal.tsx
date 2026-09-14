import React, { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { CurrencyInput } from '@/components/CurrencyInput';
import { parseCurrencyNumber } from '@/lib/currencyMask';
import { FiX, FiDollarSign, FiAlertTriangle } from 'react-icons/fi';

interface InvestimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (valor: number, observacoes: string) => void;
}

export function InvestimentoModal({ 
  isOpen, 
  onClose, 
  onConfirm
}: InvestimentoModalProps) {
  const [valor, setValor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');

  const handleConfirm = () => {
    setErro('');
    
    if (!valor.trim()) {
      setErro('Informe o valor do investimento');
      return;
    }
    
    const valorNumerico = parseCurrencyNumber(valor);
    
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setErro('Valor deve ser maior que zero');
      return;
    }
    
    onConfirm(valorNumerico, observacoes.trim());
    
    // Limpar formulário
    setValor('');
    setObservacoes('');
    setErro('');
    onClose();
  };

  const handleClose = () => {
    setValor('');
    setObservacoes('');
    setErro('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog onClose={handleClose}>
      <div className="p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiDollarSign className="text-green-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">
              Registrar Investimento
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Registre um investimento ou entrada de capital no caixa. Este valor será adicionado como uma movimentação positiva.
        </p>

        {/* Valor */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor do Investimento (R$):
          </label>
          <CurrencyInput
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-right text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Observações */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações (opcional):
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: Investimento inicial para capital de giro..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            rows={3}
          />
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <FiAlertTriangle className="text-red-600" />
            <p className="text-sm text-red-600">{erro}</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Registrar Investimento
          </Button>
        </div>
      </div>
    </Dialog>
  );
}


import React, { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FiCreditCard, FiCalendar, FiX, FiDollarSign } from 'react-icons/fi';

interface VendaParceladaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (parcelas: number, valorParcela: number, formaPagamento: string) => void;
  total: number;
}

export function VendaParceladaModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  total 
}: VendaParceladaModalProps) {
  const [parcelas, setParcelas] = useState<number>(2);
  const [formaPagamento, setFormaPagamento] = useState<string>('cartao_credito');
  const [erro, setErro] = useState('');

  const formasPagamento = [
    { id: 'cartao_credito', nome: 'Cartão de Crédito', icon: FiCreditCard, cor: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 'cartao_debito', nome: 'Cartão de Débito', icon: FiCreditCard, cor: 'bg-blue-100 text-blue-700 border-blue-200' },
  ];

  const calcularValorParcela = () => {
    return parcelas > 0 ? total / parcelas : 0;
  };

  const handleConfirm = () => {
    setErro('');
    
    if (parcelas < 2 || parcelas > 24) {
      setErro('Número de parcelas deve ser entre 2 e 24');
      return;
    }
    
    const valorParcela = calcularValorParcela();
    if (valorParcela < 1) {
      setErro('Valor da parcela deve ser maior que R$ 1,00');
      return;
    }
    
    onConfirm(parcelas, valorParcela, formaPagamento);
    setParcelas(2);
    setFormaPagamento('cartao_credito');
    setErro('');
    onClose();
  };

  const handleClose = () => {
    setParcelas(2);
    setFormaPagamento('cartao_credito');
    setErro('');
    onClose();
  };

  const valorParcela = calcularValorParcela();

  if (!isOpen) return null;

  return (
    <Dialog onClose={handleClose}>
      <div className="p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Venda Parcelada
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Total da venda */}
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Total da Venda:</strong> R$ {total.toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* Forma de pagamento */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Forma de Pagamento:</h3>
          <div className="space-y-2">
            {formasPagamento.map((forma) => {
              const Icon = forma.icon;
              const isSelected = formaPagamento === forma.id;
              
              return (
                <button
                  key={forma.id}
                  onClick={() => setFormaPagamento(forma.id)}
                  className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                    isSelected 
                      ? `${forma.cor} border-current` 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{forma.nome}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Número de parcelas */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Parcelas:
          </label>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setParcelas(Math.max(2, parcelas - 1))}
              disabled={parcelas <= 2}
              className="px-3"
            >
              -
            </Button>
            <Input
              type="number"
              value={parcelas}
              onChange={(e) => setParcelas(Math.max(2, Math.min(24, parseInt(e.target.value) || 2)))}
              min="2"
              max="24"
              className="text-center flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setParcelas(Math.min(24, parcelas + 1))}
              disabled={parcelas >= 24}
              className="px-3"
            >
              +
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Mínimo: 2 parcelas | Máximo: 24 parcelas
          </p>
        </div>

        {/* Preview das parcelas */}
        {parcelas > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total:</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between">
                <span>Parcelas:</span>
                <span>{parcelas}x</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                <span>Valor por Parcela:</span>
                <span>R$ {valorParcela.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{erro}</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex space-x-3">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={parcelas < 2 || valorParcela < 1}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <FiCreditCard className="w-4 h-4 mr-2" />
            Confirmar Parcelamento
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default VendaParceladaModal;

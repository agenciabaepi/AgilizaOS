import React, { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { FiCreditCard, FiDollarSign, FiSmartphone, FiCheck } from 'react-icons/fi';

interface PagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (formaPagamento: string, valorPago?: number) => void;
  onParcelar: () => void;
  total: number;
}

const formasPagamento = [
  { id: 'dinheiro', nome: 'Dinheiro', icon: FiDollarSign, cor: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'cartao_debito', nome: 'Cartão Débito', icon: FiCreditCard, cor: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'cartao_credito', nome: 'Cartão Crédito', icon: FiCreditCard, cor: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'pix', nome: 'PIX', icon: FiSmartphone, cor: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
];

export function PagamentoModal({ isOpen, onClose, onConfirm, onParcelar, total }: PagamentoModalProps) {
  const [formaSelecionada, setFormaSelecionada] = useState<string>('');
  const [valorPago, setValorPago] = useState<string>('');
  const [troco, setTroco] = useState<number>(0);

  const handleValorPagoChange = (valor: string) => {
    setValorPago(valor);
    const valorNumerico = parseFloat(valor.replace(',', '.')) || 0;
    setTroco(Math.max(0, valorNumerico - total));
  };

  const handleConfirm = () => {
    if (!formaSelecionada) return;
    
    const valorPagoNumerico = formaSelecionada === 'dinheiro' && valorPago 
      ? parseFloat(valorPago.replace(',', '.')) 
      : total;
    
    onConfirm(formaSelecionada, valorPagoNumerico);
    onClose();
  };

  const handleClose = () => {
    setFormaSelecionada('');
    setValorPago('');
    setTroco(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog onClose={handleClose}>
      <div className="p-6 w-96">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Forma de Pagamento</h2>
        
        {/* Total da venda */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total da venda:</span>
            <span className="text-xl font-bold text-gray-900">
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* Formas de pagamento */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Selecione a forma de pagamento:</h3>
          {formasPagamento.map((forma) => {
            const Icon = forma.icon;
            const isSelected = formaSelecionada === forma.id;
            
            return (
              <button
                key={forma.id}
                onClick={() => setFormaSelecionada(forma.id)}
                className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                  isSelected 
                    ? `${forma.cor} border-current` 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{forma.nome}</span>
                {isSelected && <FiCheck className="ml-auto" size={16} />}
              </button>
            );
          })}
        </div>

        {/* Campo de valor pago (apenas para dinheiro) */}
        {formaSelecionada === 'dinheiro' && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Valor pago pelo cliente:
            </label>
            <input
              type="text"
              value={valorPago}
              onChange={(e) => handleValorPagoChange(e.target.value)}
              placeholder="0,00"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {troco > 0 && (
              <div className="mt-2 p-2 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700">
                  Troco: R$ {troco.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Botões */}
        <div className="space-y-3">
          {/* Botão de parcelamento */}
          {(formaSelecionada === 'cartao_credito' || formaSelecionada === 'cartao_debito') && (
            <button
              onClick={onParcelar}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <FiCreditCard className="w-4 h-4 mr-2" />
              Parcelar Venda
            </button>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!formaSelecionada || (formaSelecionada === 'dinheiro' && !valorPago)}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Confirmar Venda
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default PagamentoModal;

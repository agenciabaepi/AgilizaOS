import React, { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FiPercent, FiDollarSign, FiX } from 'react-icons/fi';

interface DescontoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tipo: 'percentual' | 'valor', valor: number) => void;
  total: number;
  tipo: 'item' | 'venda';
  itemNome?: string;
}

export function DescontoModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  total, 
  tipo, 
  itemNome 
}: DescontoModalProps) {
  const [tipoDesconto, setTipoDesconto] = useState<'percentual' | 'valor'>('percentual');
  const [valorDesconto, setValorDesconto] = useState('');
  const [erro, setErro] = useState('');

  const calcularDesconto = () => {
    if (!valorDesconto) return 0;
    
    const valor = parseFloat(valorDesconto.replace(',', '.'));
    if (isNaN(valor)) return 0;
    
    if (tipoDesconto === 'percentual') {
      return (total * valor) / 100;
    } else {
      return Math.min(valor, total); // Não pode ser maior que o total
    }
  };

  const handleConfirm = () => {
    setErro('');
    
    if (!valorDesconto) {
      setErro('Informe o valor do desconto');
      return;
    }
    
    const valor = parseFloat(valorDesconto.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      setErro('Valor deve ser maior que zero');
      return;
    }
    
    if (tipoDesconto === 'percentual' && valor > 100) {
      setErro('Desconto percentual não pode ser maior que 100%');
      return;
    }
    
    if (tipoDesconto === 'valor' && valor > total) {
      setErro('Desconto em valor não pode ser maior que o total');
      return;
    }
    
    onConfirm(tipoDesconto, valor);
    setValorDesconto('');
    setErro('');
    onClose();
  };

  const handleClose = () => {
    setValorDesconto('');
    setErro('');
    onClose();
  };

  const descontoCalculado = calcularDesconto();
  const novoTotal = total - descontoCalculado;

  if (!isOpen) return null;

  return (
    <Dialog onClose={handleClose}>
      <div className="p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Aplicar Desconto {tipo === 'item' ? 'no Item' : 'na Venda'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {tipo === 'item' && itemNome && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Item:</strong> {itemNome}
            </p>
            <p className="text-sm text-blue-600">
              <strong>Valor:</strong> R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>
        )}

        {tipo === 'venda' && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Total da Venda:</strong> R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>
        )}

        {/* Tipo de desconto */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tipo de Desconto:</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => setTipoDesconto('percentual')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                tipoDesconto === 'percentual'
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <FiPercent size={16} />
              <span className="font-medium">Percentual (%)</span>
            </button>
            <button
              onClick={() => setTipoDesconto('valor')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                tipoDesconto === 'valor'
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <FiDollarSign size={16} />
              <span className="font-medium">Valor (R$)</span>
            </button>
          </div>
        </div>

        {/* Valor do desconto */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor do Desconto {tipoDesconto === 'percentual' ? '(%)' : '(R$)'}:
          </label>
          <Input
            type="text"
            value={valorDesconto}
            onChange={(e) => setValorDesconto(e.target.value)}
            placeholder={tipoDesconto === 'percentual' ? '0' : '0,00'}
            className="text-right text-lg"
          />
        </div>

        {/* Preview do desconto */}
        {descontoCalculado > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Valor Original:</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Desconto:</span>
                <span>- R$ {descontoCalculado.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-1">
                <span>Novo Total:</span>
                <span>R$ {novoTotal.toFixed(2).replace('.', ',')}</span>
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
            disabled={!valorDesconto || descontoCalculado <= 0}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            Aplicar Desconto
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default DescontoModal;

import React, { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FiPercent, FiDollarSign, FiX, FiTrendingUp } from 'react-icons/fi';

interface AcrescimoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tipo: 'percentual' | 'valor', valor: number) => void;
  total: number;
  tipo: 'item' | 'venda';
  itemNome?: string;
}

export function AcrescimoModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  total, 
  tipo, 
  itemNome 
}: AcrescimoModalProps) {
  const [tipoAcrescimo, setTipoAcrescimo] = useState<'percentual' | 'valor'>('valor');
  const [valorAcrescimo, setValorAcrescimo] = useState('');
  const [erro, setErro] = useState('');

  const calcularAcrescimo = () => {
    if (!valorAcrescimo) return 0;
    
    const valor = parseFloat(valorAcrescimo.replace(',', '.'));
    if (isNaN(valor)) return 0;
    
    if (tipoAcrescimo === 'percentual') {
      return (total * valor) / 100;
    } else {
      return valor;
    }
  };

  const handleConfirm = () => {
    setErro('');
    
    if (!valorAcrescimo) {
      setErro('Informe o valor do acréscimo');
      return;
    }
    
    const valor = parseFloat(valorAcrescimo.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      setErro('Valor deve ser maior que zero');
      return;
    }
    
    onConfirm(tipoAcrescimo, valor);
    setValorAcrescimo('');
    setErro('');
    onClose();
  };

  const handleClose = () => {
    setValorAcrescimo('');
    setErro('');
    onClose();
  };

  const acrescimoCalculado = calcularAcrescimo();
  const novoTotal = total + acrescimoCalculado;

  if (!isOpen) return null;

  return (
    <Dialog onClose={handleClose}>
      <div className="p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Aplicar Acréscimo {tipo === 'item' ? 'no Item' : 'na Venda'}
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

        {/* Tipo de acréscimo */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tipo de Acréscimo:</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => setTipoAcrescimo('percentual')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                tipoAcrescimo === 'percentual'
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <FiPercent size={16} />
              <span className="font-medium">Percentual (%)</span>
            </button>
            <button
              onClick={() => setTipoAcrescimo('valor')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                tipoAcrescimo === 'valor'
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <FiDollarSign size={16} />
              <span className="font-medium">Valor (R$)</span>
            </button>
          </div>
        </div>

        {/* Valor do acréscimo */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor do Acréscimo {tipoAcrescimo === 'percentual' ? '(%)' : '(R$)'}:
          </label>
          <Input
            type="text"
            value={valorAcrescimo}
            onChange={(e) => setValorAcrescimo(e.target.value)}
            placeholder={tipoAcrescimo === 'percentual' ? '0' : '0,00'}
            className="text-right text-lg"
          />
        </div>

        {/* Preview do acréscimo */}
        {acrescimoCalculado > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Valor Original:</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Acréscimo:</span>
                <span>+ R$ {acrescimoCalculado.toFixed(2).replace('.', ',')}</span>
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
            disabled={!valorAcrescimo || acrescimoCalculado <= 0}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <FiTrendingUp className="w-4 h-4 mr-2" />
            Aplicar Acréscimo
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default AcrescimoModal;

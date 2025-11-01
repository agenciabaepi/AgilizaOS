import React, { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FiMinus, FiPlus, FiDollarSign, FiX, FiAlertTriangle } from 'react-icons/fi';

interface SangriaSuprimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (valor: number, observacoes: string, tipo: 'sangria' | 'suprimento') => void;
  tipo: 'sangria' | 'suprimento';
  saldoAtual: number;
}

export function SangriaSuprimentoModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  tipo,
  saldoAtual 
}: SangriaSuprimentoModalProps) {
  const [valor, setValor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');

  const handleConfirm = () => {
    setErro('');
    
    if (!valor.trim()) {
      setErro('Informe o valor');
      return;
    }
    
    const valorNumerico = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setErro('Valor deve ser maior que zero');
      return;
    }
    
    if (tipo === 'sangria' && valorNumerico > saldoAtual) {
      setErro('Valor da sangria não pode ser maior que o saldo atual');
      return;
    }
    
    onConfirm(valorNumerico, observacoes.trim(), tipo);
    
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

  const novoSaldo = tipo === 'sangria' 
    ? saldoAtual - (parseFloat(valor.replace(',', '.')) || 0)
    : saldoAtual + (parseFloat(valor.replace(',', '.')) || 0);

  if (!isOpen) return null;

  return (
    <Dialog onClose={handleClose}>
      <div className="p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {tipo === 'sangria' ? 'Sangria de Caixa' : 'Suprimento de Caixa'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Saldo atual */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-800">
            <strong>Saldo Atual:</strong> R$ {saldoAtual.toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* Valor */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor {tipo === 'sangria' ? 'da Sangria' : 'do Suprimento'} (R$):
          </label>
          <Input
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="text-right text-lg"
          />
        </div>

        {/* Preview do novo saldo */}
        {valor && parseFloat(valor.replace(',', '.')) > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Saldo Atual:</span>
                <span>R$ {saldoAtual.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between">
                <span>{tipo === 'sangria' ? 'Sangria:' : 'Suprimento:'}</span>
                <span className={tipo === 'sangria' ? 'text-red-600' : 'text-green-600'}>
                  {tipo === 'sangria' ? '-' : '+'} R$ {(parseFloat(valor.replace(',', '.')) || 0).toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-1">
                <span>Novo Saldo:</span>
                <span className={novoSaldo < 0 ? 'text-red-600' : 'text-green-600'}>
                  R$ {novoSaldo.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Observações */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações:
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder={`Motivo da ${tipo === 'sangria' ? 'sangria' : 'suprimento'}...`}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Aviso para sangria */}
        {tipo === 'sangria' && novoSaldo < 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-600">
                <strong>Atenção:</strong> Esta sangria deixará o caixa com saldo negativo!
              </p>
            </div>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-600">{erro}</p>
            </div>
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
            disabled={!valor || parseFloat(valor.replace(',', '.')) <= 0}
            className={`flex-1 ${
              tipo === 'sangria' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {tipo === 'sangria' ? (
              <>
                <FiMinus className="w-4 h-4 mr-2" />
                Confirmar Sangria
              </>
            ) : (
              <>
                <FiPlus className="w-4 h-4 mr-2" />
                Confirmar Suprimento
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default SangriaSuprimentoModal;

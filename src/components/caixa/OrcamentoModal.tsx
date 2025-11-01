import React, { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FiFileText, FiCalendar, FiX, FiSave, FiClock } from 'react-icons/fi';

interface OrcamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orcamento: {
    validade: number;
    observacoes: string;
    tipo: 'orcamento' | 'pre_venda';
  }) => void;
  total: number;
  cliente?: {
    nome: string;
    documento?: string;
  } | null;
}

export function OrcamentoModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  total,
  cliente 
}: OrcamentoModalProps) {
  const [tipo, setTipo] = useState<'orcamento' | 'pre_venda'>('orcamento');
  const [validade, setValidade] = useState<number>(7);
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');

  const handleConfirm = () => {
    setErro('');
    
    if (validade < 1 || validade > 365) {
      setErro('Validade deve ser entre 1 e 365 dias');
      return;
    }
    
    onConfirm({
      validade,
      observacoes: observacoes.trim(),
      tipo
    });
    
    setValidade(7);
    setObservacoes('');
    setErro('');
    onClose();
  };

  const handleClose = () => {
    setValidade(7);
    setObservacoes('');
    setErro('');
    onClose();
  };

  const dataValidade = new Date();
  dataValidade.setDate(dataValidade.getDate() + validade);

  if (!isOpen) return null;

  return (
    <Dialog onClose={handleClose}>
      <div className="p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {tipo === 'orcamento' ? 'Gerar Orçamento' : 'Pré-venda'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Informações da venda */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Total:</strong> R$ {total.toFixed(2).replace('.', ',')}
          </p>
          {cliente && (
            <p className="text-sm text-blue-600">
              <strong>Cliente:</strong> {cliente.nome}
            </p>
          )}
        </div>

        {/* Tipo de documento */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tipo de Documento:</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => setTipo('orcamento')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                tipo === 'orcamento'
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <FiFileText size={16} />
              <span className="font-medium">Orçamento</span>
            </button>
            <button
              onClick={() => setTipo('pre_venda')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                tipo === 'pre_venda'
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <FiClock size={16} />
              <span className="font-medium">Pré-venda</span>
            </button>
          </div>
        </div>

        {/* Validade */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Validade (dias):
          </label>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValidade(Math.max(1, validade - 1))}
              disabled={validade <= 1}
              className="px-3"
            >
              -
            </Button>
            <Input
              type="number"
              value={validade}
              onChange={(e) => setValidade(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
              min="1"
              max="365"
              className="text-center flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValidade(Math.min(365, validade + 1))}
              disabled={validade >= 365}
              className="px-3"
            >
              +
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Válido até: {dataValidade.toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Observações */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações:
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações adicionais..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Preview */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Tipo:</span>
              <span className="font-medium">
                {tipo === 'orcamento' ? 'Orçamento' : 'Pré-venda'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Validade:</span>
              <span>{validade} dias</span>
            </div>
            <div className="flex justify-between">
              <span>Válido até:</span>
              <span>{dataValidade.toLocaleDateString('pt-BR')}</span>
            </div>
            {observacoes && (
              <div className="mt-2 pt-2 border-t border-gray-300">
                <span className="text-gray-600">Obs:</span>
                <p className="text-xs text-gray-600 mt-1">{observacoes}</p>
              </div>
            )}
          </div>
        </div>

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
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <FiSave className="w-4 h-4 mr-2" />
            {tipo === 'orcamento' ? 'Gerar Orçamento' : 'Gerar Pré-venda'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default OrcamentoModal;

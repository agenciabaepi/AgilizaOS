import React, { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
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
    
    // Converter formato brasileiro para número
    // Remove pontos (separadores de milhar) e substitui vírgula por ponto
    const valorLimpo = valor.replace(/\./g, '').replace(',', '.');
    const valorNumerico = parseFloat(valorLimpo);
    
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

  const formatarMoeda = (valor: string) => {
    // Remove tudo que não é número, exceto vírgula
    let apenasNumeros = valor.replace(/[^\d,]/g, '');
    
    // Se estiver vazio, retorna vazio
    if (apenasNumeros === '') return '';
    
    // Garante que só há uma vírgula
    const partes = apenasNumeros.split(',');
    if (partes.length > 2) {
      apenasNumeros = partes[0] + ',' + partes.slice(1).join('');
    }
    
    // Remove pontos e formata
    const semPontos = apenasNumeros.replace(/\./g, '');
    const temVirgula = semPontos.includes(',');
    
    if (!temVirgula) {
      // Sem vírgula, apenas números
      const numero = parseInt(semPontos) || 0;
      if (numero === 0) return '';
      return numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    } else {
      // Com vírgula (decimais)
      const [inteiro, decimal] = semPontos.split(',');
      const numeroInteiro = parseInt(inteiro) || 0;
      const numeroDecimal = decimal ? decimal.substring(0, 2) : '';
      
      if (numeroInteiro === 0 && !numeroDecimal) return '';
      
      // Formata parte inteira com separadores de milhar
      const formatado = numeroInteiro.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      
      return numeroDecimal ? `${formatado},${numeroDecimal}` : formatado;
    }
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarMoeda(e.target.value);
    setValor(valorFormatado);
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
          <Input
            type="text"
            value={valor}
            onChange={handleValorChange}
            placeholder="0,00"
            className="text-right text-lg"
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


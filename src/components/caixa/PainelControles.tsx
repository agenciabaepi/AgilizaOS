import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { 
  FiPercent, 
  FiTrendingUp, 
  FiCreditCard, 
  FiFileText, 
  FiRotateCcw, 
  FiMinus, 
  FiPlus, 
  FiUser,
  FiDollarSign,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';

interface PainelControlesProps {
  // Desconto/Acréscimo
  onApplyDiscount: (tipo: 'percentual' | 'valor', valor: number, itemId?: string) => void;
  onApplyAddition: (tipo: 'percentual' | 'valor', valor: number, itemId?: string) => void;
  
  // Venda Parcelada
  onParcelar: (parcelas: number, formaPagamento: string) => void;
  
  // Orçamento
  onGerarOrcamento: (tipo: 'orcamento' | 'pre_venda', validade: number, observacoes: string) => void;
  
  // Devolução
  onDevolucao: (vendaId: string, produtos: any[], observacoes: string) => void;
  
  // Sangria/Suprimento
  onSangria: (valor: number, observacoes: string) => void;
  onSuprimento: (valor: number, observacoes: string) => void;
  
  // Vendedor
  vendedores: any[];
  vendedorSelecionado: any;
  onVendedorChange: (vendedor: any) => void;
  
  // Dados da venda
  total: number;
  saldoCaixa: number;
  itemSelecionado?: any;
}

export function PainelControles({
  onApplyDiscount,
  onApplyAddition,
  onParcelar,
  onGerarOrcamento,
  onDevolucao,
  onSangria,
  onSuprimento,
  vendedores,
  vendedorSelecionado,
  onVendedorChange,
  total,
  saldoCaixa,
  itemSelecionado
}: PainelControlesProps) {
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>(null);
  const [valores, setValores] = useState({
    desconto: '',
    acrescimo: '',
    parcelas: '2',
    validade: '7',
    sangria: '',
    suprimento: '',
    observacoes: ''
  });

  const toggleSecao = (secao: string) => {
    setSecaoAtiva(secaoAtiva === secao ? null : secao);
  };

  const aplicarDesconto = () => {
    const valor = parseFloat(valores.desconto.replace(',', '.'));
    if (valor > 0) {
      const tipo = valores.desconto.includes('%') ? 'percentual' : 'valor';
      const valorNumerico = valores.desconto.includes('%') ? valor : valor;
      onApplyDiscount(tipo, valorNumerico, itemSelecionado?.id);
      setValores(prev => ({ ...prev, desconto: '' }));
    }
  };

  const aplicarAcrescimo = () => {
    const valor = parseFloat(valores.acrescimo.replace(',', '.'));
    if (valor > 0) {
      const tipo = valores.acrescimo.includes('%') ? 'percentual' : 'valor';
      const valorNumerico = valores.acrescimo.includes('%') ? valor : valor;
      onApplyAddition(tipo, valorNumerico, itemSelecionado?.id);
      setValores(prev => ({ ...prev, acrescimo: '' }));
    }
  };

  const processarParcelamento = () => {
    const parcelas = parseInt(valores.parcelas);
    if (parcelas >= 2 && parcelas <= 24) {
      onParcelar(parcelas, 'cartao_credito');
      setValores(prev => ({ ...prev, parcelas: '2' }));
    }
  };

  const processarOrcamento = (tipo: 'orcamento' | 'pre_venda') => {
    const validade = parseInt(valores.validade);
    if (validade >= 1 && validade <= 365) {
      onGerarOrcamento(tipo, validade, valores.observacoes);
      setValores(prev => ({ ...prev, validade: '7', observacoes: '' }));
    }
  };

  const processarSangria = () => {
    const valor = parseFloat(valores.sangria.replace(',', '.'));
    if (valor > 0 && valor <= saldoCaixa) {
      onSangria(valor, valores.observacoes);
      setValores(prev => ({ ...prev, sangria: '', observacoes: '' }));
    }
  };

  const processarSuprimento = () => {
    const valor = parseFloat(valores.suprimento.replace(',', '.'));
    if (valor > 0) {
      onSuprimento(valor, valores.observacoes);
      setValores(prev => ({ ...prev, suprimento: '', observacoes: '' }));
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-bold text-gray-900">Controles Rápidos</h3>
        <p className="text-sm text-gray-600">Acesso rápido a todas as funções</p>
      </div>

      {/* Vendedor */}
      {vendedores.length > 0 && (
        <div className="p-3 border-b bg-blue-50">
          <label className="block text-xs font-medium text-blue-700 mb-1">Vendedor:</label>
          <select
            value={vendedorSelecionado?.id || ''}
            onChange={(e) => {
              const vendedor = vendedores.find(v => v.id === e.target.value);
              onVendedorChange(vendedor || null);
            }}
            className="w-full text-sm border border-blue-200 rounded px-2 py-1 bg-white"
          >
            <option value="">Selecionar vendedor</option>
            {vendedores.map(vendedor => (
              <option key={vendedor.id} value={vendedor.id}>
                {vendedor.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Seção Desconto/Acréscimo */}
      <div className="border-b">
        <button
          onClick={() => toggleSecao('desconto')}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <FiPercent className="text-red-600" size={16} />
            <span className="font-medium">Desconto/Acréscimo</span>
          </div>
          {secaoAtiva === 'desconto' ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>
        
        {secaoAtiva === 'desconto' && (
          <div className="p-3 bg-gray-50 space-y-3">
            {/* Desconto */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desconto:</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={valores.desconto}
                  onChange={(e) => setValores(prev => ({ ...prev, desconto: e.target.value }))}
                  placeholder="Ex: 10% ou 5,00"
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={aplicarDesconto}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 px-3"
                >
                  <FiPercent size={14} />
                </Button>
              </div>
            </div>

            {/* Acréscimo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Acréscimo:</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={valores.acrescimo}
                  onChange={(e) => setValores(prev => ({ ...prev, acrescimo: e.target.value }))}
                  placeholder="Ex: 5% ou 2,50"
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={aplicarAcrescimo}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 px-3"
                >
                  <FiTrendingUp size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção Pagamento */}
      <div className="border-b">
        <button
          onClick={() => toggleSecao('pagamento')}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <FiCreditCard className="text-blue-600" size={16} />
            <span className="font-medium">Pagamento</span>
          </div>
          {secaoAtiva === 'pagamento' ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>
        
        {secaoAtiva === 'pagamento' && (
          <div className="p-3 bg-gray-50 space-y-3">
            {/* Parcelamento */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Parcelas:</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={valores.parcelas}
                  onChange={(e) => setValores(prev => ({ ...prev, parcelas: e.target.value }))}
                  min="2"
                  max="24"
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={processarParcelamento}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 px-3"
                >
                  <FiCreditCard size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção Documentos */}
      <div className="border-b">
        <button
          onClick={() => toggleSecao('documentos')}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <FiFileText className="text-purple-600" size={16} />
            <span className="font-medium">Documentos</span>
          </div>
          {secaoAtiva === 'documentos' ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>
        
        {secaoAtiva === 'documentos' && (
          <div className="p-3 bg-gray-50 space-y-3">
            {/* Orçamento */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Validade (dias):</label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="number"
                  value={valores.validade}
                  onChange={(e) => setValores(prev => ({ ...prev, validade: e.target.value }))}
                  min="1"
                  max="365"
                  className="flex-1 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => processarOrcamento('orcamento')}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 flex-1"
                >
                  Orçamento
                </Button>
                <Button
                  onClick={() => processarOrcamento('pre_venda')}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 flex-1"
                >
                  Pré-venda
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção Caixa */}
      <div className="border-b">
        <button
          onClick={() => toggleSecao('caixa')}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <FiDollarSign className="text-green-600" size={16} />
            <span className="font-medium">Caixa</span>
          </div>
          {secaoAtiva === 'caixa' ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>
        
        {secaoAtiva === 'caixa' && (
          <div className="p-3 bg-gray-50 space-y-3">
            {/* Saldo */}
            <div className="text-center p-2 bg-white rounded border">
              <p className="text-xs text-gray-600">Saldo Atual</p>
              <p className="text-lg font-bold text-green-600">
                R$ {saldoCaixa.toFixed(2).replace('.', ',')}
              </p>
            </div>

            {/* Sangria */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sangria:</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={valores.sangria}
                  onChange={(e) => setValores(prev => ({ ...prev, sangria: e.target.value }))}
                  placeholder="0,00"
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={processarSangria}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 px-3"
                >
                  <FiMinus size={14} />
                </Button>
              </div>
            </div>

            {/* Suprimento */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Suprimento:</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={valores.suprimento}
                  onChange={(e) => setValores(prev => ({ ...prev, suprimento: e.target.value }))}
                  placeholder="0,00"
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={processarSuprimento}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 px-3"
                >
                  <FiPlus size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Observações Globais */}
      <div className="p-3 border-b">
        <label className="block text-xs font-medium text-gray-600 mb-1">Observações:</label>
        <textarea
          value={valores.observacoes}
          onChange={(e) => setValores(prev => ({ ...prev, observacoes: e.target.value }))}
          placeholder="Observações gerais..."
          className="w-full p-2 text-sm border border-gray-300 rounded resize-none"
          rows={2}
        />
      </div>

      {/* Total da Venda */}
      <div className="p-3 bg-green-50 border-t">
        <div className="text-center">
          <p className="text-xs text-gray-600">Total da Venda</p>
          <p className="text-2xl font-bold text-green-600">
            R$ {total.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PainelControles;

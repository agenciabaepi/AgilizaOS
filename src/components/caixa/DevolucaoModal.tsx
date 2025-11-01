import React, { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FiRotateCcw, FiSearch, FiX, FiAlertTriangle } from 'react-icons/fi';

interface DevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (devolucao: {
    vendaId: string;
    produtos: Array<{
      id: string;
      nome: string;
      quantidade: number;
      motivo: string;
    }>;
    observacoes: string;
  }) => void;
}

interface Venda {
  id: string;
  numero_venda?: string;
  data_venda: string;
  cliente?: {
    nome: string;
  };
  produtos: Array<{
    id: string;
    nome: string;
    quantidade: number;
    preco: number;
  }>;
  total: number;
}

export function DevolucaoModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: DevolucaoModalProps) {
  const [buscaVenda, setBuscaVenda] = useState('');
  const [vendaEncontrada, setVendaEncontrada] = useState<Venda | null>(null);
  const [produtosDevolucao, setProdutosDevolucao] = useState<Array<{
    id: string;
    nome: string;
    quantidade: number;
    motivo: string;
  }>>([]);
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const buscarVenda = async () => {
    if (!buscaVenda.trim()) {
      setErro('Digite o número da venda');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      // Simular busca de venda (substituir por chamada real da API)
      // const response = await fetch(`/api/vendas/buscar?numero=${buscaVenda}`);
      // const venda = await response.json();
      
      // Mock para demonstração
      const vendaMock: Venda = {
        id: 'venda-123',
        numero_venda: buscaVenda,
        data_venda: new Date().toISOString(),
        cliente: { nome: 'Cliente Teste' },
        produtos: [
          { id: 'prod-1', nome: 'Produto A', quantidade: 2, preco: 50.00 },
          { id: 'prod-2', nome: 'Produto B', quantidade: 1, preco: 100.00 }
        ],
        total: 200.00
      };

      setVendaEncontrada(vendaMock);
      setProdutosDevolucao([]);
    } catch (err) {
      setErro('Erro ao buscar venda');
    } finally {
      setLoading(false);
    }
  };

  const adicionarProdutoDevolucao = (produto: Venda['produtos'][0]) => {
    const jaExiste = produtosDevolucao.find(p => p.id === produto.id);
    if (jaExiste) {
      setErro('Produto já adicionado para devolução');
      return;
    }

    setProdutosDevolucao(prev => [...prev, {
      id: produto.id,
      nome: produto.nome,
      quantidade: 1,
      motivo: ''
    }]);
    setErro('');
  };

  const atualizarQuantidade = (produtoId: string, quantidade: number) => {
    setProdutosDevolucao(prev => 
      prev.map(p => 
        p.id === produtoId ? { ...p, quantidade: Math.max(1, quantidade) } : p
      )
    );
  };

  const atualizarMotivo = (produtoId: string, motivo: string) => {
    setProdutosDevolucao(prev => 
      prev.map(p => 
        p.id === produtoId ? { ...p, motivo } : p
      )
    );
  };

  const removerProdutoDevolucao = (produtoId: string) => {
    setProdutosDevolucao(prev => prev.filter(p => p.id !== produtoId));
  };

  const handleConfirm = () => {
    if (!vendaEncontrada) {
      setErro('Busque uma venda primeiro');
      return;
    }

    if (produtosDevolucao.length === 0) {
      setErro('Adicione pelo menos um produto para devolução');
      return;
    }

    const produtosSemMotivo = produtosDevolucao.filter(p => !p.motivo.trim());
    if (produtosSemMotivo.length > 0) {
      setErro('Todos os produtos devem ter um motivo para devolução');
      return;
    }

    onConfirm({
      vendaId: vendaEncontrada.id,
      produtos: produtosDevolucao,
      observacoes: observacoes.trim()
    });

    // Limpar formulário
    setBuscaVenda('');
    setVendaEncontrada(null);
    setProdutosDevolucao([]);
    setObservacoes('');
    setErro('');
    onClose();
  };

  const handleClose = () => {
    setBuscaVenda('');
    setVendaEncontrada(null);
    setProdutosDevolucao([]);
    setObservacoes('');
    setErro('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog onClose={handleClose}>
      <div className="p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Devolução de Produtos
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Busca da venda */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Buscar Venda:</h3>
          <div className="flex space-x-2">
            <Input
              type="text"
              value={buscaVenda}
              onChange={(e) => setBuscaVenda(e.target.value)}
              placeholder="Digite o número da venda"
              className="flex-1"
            />
            <Button
              onClick={buscarVenda}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FiSearch size={16} />
            </Button>
          </div>
        </div>

        {/* Venda encontrada */}
        {vendaEncontrada && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">Venda Encontrada:</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Número:</strong> {vendaEncontrada.numero_venda}</p>
              <p><strong>Data:</strong> {new Date(vendaEncontrada.data_venda).toLocaleDateString('pt-BR')}</p>
              <p><strong>Cliente:</strong> {vendaEncontrada.cliente?.nome || 'Consumidor Final'}</p>
              <p><strong>Total:</strong> R$ {vendaEncontrada.total.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
        )}

        {/* Produtos da venda */}
        {vendaEncontrada && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Produtos da Venda:</h3>
            <div className="space-y-2">
              {vendaEncontrada.produtos.map(produto => (
                <div key={produto.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{produto.nome}</p>
                    <p className="text-xs text-gray-500">
                      Qtd: {produto.quantidade} | R$ {produto.preco.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <Button
                    onClick={() => adicionarProdutoDevolucao(produto)}
                    disabled={produtosDevolucao.some(p => p.id === produto.id)}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <FiRotateCcw size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Produtos para devolução */}
        {produtosDevolucao.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Produtos para Devolução:</h3>
            <div className="space-y-3">
              {produtosDevolucao.map(produto => (
                <div key={produto.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm text-red-800">{produto.nome}</h4>
                    <Button
                      onClick={() => removerProdutoDevolucao(produto.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiX size={14} />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantidade:
                      </label>
                      <Input
                        type="number"
                        value={produto.quantidade}
                        onChange={(e) => atualizarQuantidade(produto.id, parseInt(e.target.value) || 1)}
                        min="1"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Motivo:
                      </label>
                      <select
                        value={produto.motivo}
                        onChange={(e) => atualizarMotivo(produto.id, e.target.value)}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="">Selecione...</option>
                        <option value="defeito">Produto com defeito</option>
                        <option value="tamanho">Tamanho incorreto</option>
                        <option value="cor">Cor diferente</option>
                        <option value="arrependimento">Arrependimento da compra</option>
                        <option value="outro">Outro motivo</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observações */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações:
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações adicionais sobre a devolução..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

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
            disabled={!vendaEncontrada || produtosDevolucao.length === 0}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            <FiRotateCcw className="w-4 h-4 mr-2" />
            Processar Devolução
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default DevolucaoModal;

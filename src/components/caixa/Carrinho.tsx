import React from 'react';
import { FiMinus, FiPlus, FiTrash2, FiUser, FiUserPlus, FiX, FiUnlock, FiLock, FiEye, FiShoppingCart, FiPercent, FiTrendingUp, FiFileText, FiRotateCcw } from 'react-icons/fi';
import { Button } from '@/components/Button';
import { SearchInput } from '@/components/SearchInput';
import { cn } from '@/lib/utils';

interface ItemCarrinho {
  id: string;
  nome: string;
  preco: number;
  qty: number;
  categoria?: string;
  estoque_atual?: number;
  marca?: string;
  desconto?: number;
  acrescimo?: number;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  celular: string;
  email: string;
  documento: string;
  numero_cliente: string;
}

interface CarrinhoItemProps {
  item: ItemCarrinho;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export function CarrinhoItem({ item, onUpdateQuantity, onRemove }: CarrinhoItemProps) {
  const subtotal = item.preco * item.qty;
  const descontoTotal = (item.desconto || 0) * item.qty;
  const acrescimoTotal = (item.acrescimo || 0) * item.qty;
  const subtotalFinal = subtotal - descontoTotal + acrescimoTotal;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
            <span className="text-gray-900">{item.nome}</span>
            {item.categoria && <span className="text-gray-500"> • {item.categoria}</span>}
            {item.marca && <span className="text-gray-500"> • {item.marca}</span>}
            {item.estoque_atual !== undefined && item.estoque_atual !== null && (
              <span className="text-gray-500"> • Estoque: {item.estoque_atual}</span>
            )}
          </h4>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-green-600">
              R$ {item.preco.toFixed(2).replace('.', ',')}
            </p>
            {(item.desconto || 0) > 0 && (
              <p className="text-xs text-red-600">
                Desconto: -R$ {item.desconto!.toFixed(2).replace('.', ',')}
              </p>
            )}
            {(item.acrescimo || 0) > 0 && (
              <p className="text-xs text-green-600">
                Acréscimo: +R$ {item.acrescimo!.toFixed(2).replace('.', ',')}
              </p>
            )}
            <p className="text-sm font-bold text-gray-900">
              Subtotal: R$ {subtotalFinal.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-3">
          {/* Controles de quantidade */}
          <div className="flex items-center border border-gray-200 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.qty - 1))}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <FiMinus size={14} />
            </Button>
            
            <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
              {item.qty}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUpdateQuantity(item.id, item.qty + 1)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <FiPlus size={14} />
            </Button>
          </div>
          
          {/* Botão remover */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 text-gray-400"
          >
            <FiTrash2 size={14} />
          </Button>
        </div>
      </div>
      
      {/* Subtotal */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Subtotal:</span>
          <span className="font-semibold text-sm text-gray-900">
            R$ {subtotal.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>
    </div>
  );
}

interface CarrinhoProps {
  items: ItemCarrinho[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  total: number;
  onFinalizar: () => void;
  turnoAtual: any;
  onAbrirCaixa: () => void;
  // Novos props para funcionalidades do caixa
  clienteSelecionado: Cliente | null;
  onClienteChange: (cliente: Cliente | null) => void;
  onSearchCliente: (search: string) => void;
  searchCliente: string;
  showClienteDropdown: boolean;
  clientes: Cliente[];
  loadingClientes: boolean;
  onSelecionarCliente: (cliente: Cliente) => void;
  onCadastrarCliente: () => void;
  orderType: string;
  onOrderTypeChange: (type: string) => void;
  onFecharCaixa: () => void;
}

export function Carrinho({ 
  items = [], 
  onUpdateQuantity, 
  onRemove, 
  total, 
  onFinalizar, 
  turnoAtual, 
  onAbrirCaixa,
  clienteSelecionado,
  onClienteChange,
  onSearchCliente,
  searchCliente,
  showClienteDropdown,
  clientes,
  loadingClientes,
  onSelecionarCliente,
  onCadastrarCliente,
  orderType,
  onOrderTypeChange,
  onFecharCaixa
}: CarrinhoProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white sticky top-0 z-10">
        <h2 className="text-xl font-bold text-gray-900">Meu Pedido</h2>
      </div>

      {/* Cliente */}
      <div className="px-4 py-3 border-b bg-white">
        <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
        {clienteSelecionado ? (
          <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{clienteSelecionado.nome}</p>
              <p className="text-xs text-gray-500">#{clienteSelecionado.numero_cliente}</p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onClienteChange(null)} 
              className="hover:bg-red-50 hover:text-red-600 transition-colors h-8 w-8 p-0 rounded-full"
            >
              <FiX size={16} />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <SearchInput
              value={searchCliente}
              onChange={(e) => onSearchCliente(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full"
            />
            {showClienteDropdown && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-auto mt-1">
                {loadingClientes ? (
                  <div className="p-3 text-center text-sm text-gray-500">Carregando...</div>
                ) : clientes.length === 0 ? (
                  <div className="p-3 text-center text-sm text-gray-500">
                    Nenhum cliente encontrado
                    <div className="mt-2">
                      <Button
                        size="sm"
                        onClick={onCadastrarCliente}
                        className="w-full"
                      >
                        Cadastrar cliente "{searchCliente}"
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {clientes.map((cliente) => (
                      <div
                        key={cliente.id}
                        onClick={() => onSelecionarCliente(cliente)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      >
                        <p className="font-medium text-sm">{cliente.nome}</p>
                        <p className="text-xs text-gray-500">#{cliente.numero_cliente}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tipo de Pedido */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="text-sm font-medium text-gray-700 mb-2">Tipo de Pedido</div>
        <div className="flex gap-2">
          {['Local', 'Retirada', 'Entrega'].map(type => (
            <Button
              key={type}
              variant={orderType === type ? 'default' : 'secondary'}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                orderType === type 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-white hover:bg-gray-100 text-gray-700 border'
              }`}
              onClick={() => onOrderTypeChange(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de itens */}
      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-8 flex flex-col items-center justify-center h-full">
            {!turnoAtual ? (
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 w-full max-w-sm">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiUnlock size={24} className="text-gray-400" />
                </div>
                <p className="text-sm mb-4 text-gray-600">Abra o caixa para começar</p>
                <Button 
                  onClick={onAbrirCaixa}
                  className="w-full bg-green-600 hover:bg-green-700 transition-colors"
                >
                  Abrir Caixa
                </Button>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 w-full max-w-sm">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiShoppingCart size={24} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">Nenhum item no carrinho</p>
                <p className="text-xs text-gray-500 mt-1">Adicione produtos para começar</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <CarrinhoItem
                key={item.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controles do Caixa (quando caixa aberto) */}
      {turnoAtual && (
        <div className="px-4 py-3 border-t border-b bg-gray-50">
          <div className="flex justify-end">
            <Button
              onClick={onFecharCaixa}
              size="sm"
              className="bg-red-600 hover:bg-red-700 flex items-center justify-center gap-1 h-9"
            >
              <FiLock size={12} />
              <span className="text-xs">Fechar Caixa</span>
            </Button>
          </div>
        </div>
      )}

      {/* Footer com total e botão finalizar */}
      {items.length > 0 && (
        <div className="p-4 border-t bg-white">
          <div className="mb-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-xl font-bold text-green-600">
                R$ {total.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
          
          <Button
            onClick={onFinalizar}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Finalizar Venda
          </Button>
        </div>
      )}
    </div>
  );
}

export default Carrinho;

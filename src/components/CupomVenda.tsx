import React from 'react';
import { formatarMoedaCupom, normalizarItensCupom } from '@/utils/normalizarItemCupom';

interface Cliente {
  nome: string;
  telefone?: string;
  celular?: string;
  numero_cliente: string;
}

interface CupomVendaProps {
  numeroVenda?: number;
  cliente?: Cliente;
  produtos: unknown;
  subtotal?: number;
  desconto?: number;
  acrescimo?: number;
  total?: number;
  formaPagamento: string;
  tipoPedido: string;
  data: string;
  nomeEmpresa?: string;
}

export const CupomVenda: React.FC<CupomVendaProps> = ({
  numeroVenda,
  cliente,
  produtos,
  subtotal,
  desconto,
  acrescimo,
  total,
  formaPagamento,
  tipoPedido,
  data,
  nomeEmpresa = 'Sua Empresa',
}) => {
  const itens = normalizarItensCupom(produtos);
  const subtotalCalc =
    subtotal ??
    itens.reduce((acc, item) => acc + item.preco * item.qty, 0);
  const descontoVal = desconto ?? 0;
  const acrescimoVal = acrescimo ?? 0;
  const totalVal = total ?? subtotalCalc - descontoVal + acrescimoVal;

  return (
    <div className="w-80 mx-auto bg-white p-4 text-black font-mono text-sm" style={{ fontFamily: 'Courier, monospace' }}>
      <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
        <h1 className="text-lg font-bold">{nomeEmpresa}</h1>
        <p className="text-xs">CUPOM FISCAL NÃO FISCAL</p>
        <p className="text-xs">{data}</p>
        {numeroVenda != null && <p className="text-xs">Venda #{numeroVenda}</p>}
      </div>

      {cliente && (
        <div className="mb-2 text-xs">
          <p>Cliente: {cliente.nome}</p>
          <p>Telefone: {cliente.telefone || cliente.celular || 'N/A'}</p>
          {cliente.numero_cliente && <p>Número: #{cliente.numero_cliente}</p>}
        </div>
      )}

      <div className="mb-2 text-xs">
        <p>Tipo: {tipoPedido || 'Balcão'}</p>
      </div>

      <div className="border-b border-dashed border-gray-400 mb-2" />

      <div className="mb-2">
        <div className="flex justify-between text-xs font-bold mb-1">
          <span>ITEM</span>
          <span>QTD</span>
          <span>VALOR</span>
        </div>
        {itens.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">Sem itens detalhados</p>
        ) : (
          itens.map((item) => (
            <div key={item.id}>
              <div className="text-xs mb-1">
                <div className="truncate">{item.nome}</div>
                <div className="flex justify-between">
                  <span>
                    {item.qty} x R$ {formatarMoedaCupom(item.preco)}
                  </span>
                  <span>R$ {formatarMoedaCupom(item.preco * item.qty)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-b border-dashed border-gray-400 mb-2" />

      <div className="mb-2 text-xs">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>R$ {formatarMoedaCupom(subtotalCalc)}</span>
        </div>
        {descontoVal > 0 && (
          <div className="flex justify-between">
            <span>Desconto:</span>
            <span>- R$ {formatarMoedaCupom(descontoVal)}</span>
          </div>
        )}
        {acrescimoVal > 0 && (
          <div className="flex justify-between">
            <span>Acréscimo:</span>
            <span>+ R$ {formatarMoedaCupom(acrescimoVal)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base border-t border-gray-400 pt-1 mt-1">
          <span>TOTAL:</span>
          <span>R$ {formatarMoedaCupom(totalVal)}</span>
        </div>
      </div>

      <div className="mb-2 text-xs">
        <div className="flex justify-between">
          <span>Pagamento:</span>
          <span>{formaPagamento || '—'}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-gray-400 mb-2" />

      <div className="text-center text-xs">
        <p>Obrigado pela preferência!</p>
        <p>Volte sempre!</p>
        <div className="mt-2">
          <p className="font-bold">Tecnologia que conecta soluções</p>
          <p>www.consert.app</p>
        </div>
      </div>
    </div>
  );
};

export default CupomVenda;

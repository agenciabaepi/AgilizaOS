import React from 'react';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { FiPrinter, FiX, FiFileText, FiSmartphone, FiDownload, FiShare2, FiCheckCircle } from 'react-icons/fi';

interface ItemVenda {
  id: string;
  nome: string;
  preco: number;
  qty: number;
  categoria?: string;
  marca?: string;
  estoque_atual?: number;
  codigo?: string;
}

interface CupomVendaProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  venda: {
    id: string;
    numero_venda?: string;
    cliente?: {
      nome: string;
      documento?: string;
    };
    items: ItemVenda[];
    total: number;
    desconto?: number;
    acrescimo?: number;
    forma_pagamento: string;
    tipo_pedido: string;
    data_venda: string;
    usuario?: string;
  };
}

export function CupomVenda({ isOpen, onClose, onPrint, venda }: CupomVendaProps) {
  const subtotal = venda.items.reduce((acc, item) => acc + (item.preco * item.qty), 0);
  const totalFinal = subtotal + (venda.acrescimo || 0) - (venda.desconto || 0);

  const handleCupomFiscal = () => {
    // Implementar impressão de cupom fiscal
    onPrint();
  };

  const handleA4 = () => {
    // Implementar impressão A4
    console.log('Imprimir A4');
  };

  const handleWhatsApp = () => {
    // Implementar envio por WhatsApp
    console.log('Enviar por WhatsApp');
  };

  const handleDownloadPDF = () => {
    // Implementar download PDF
    console.log('Download PDF');
  };

  const handleEmail = () => {
    // Implementar envio por email
    console.log('Enviar por email');
  };

  if (!isOpen) return null;

  return (
    <Dialog onClose={onClose}>
      <div className="p-8 w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Venda Finalizada!</h2>
              <p className="text-gray-600">Pedido #{venda.numero_venda || venda.id.slice(-6)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Resumo da Venda */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Informações da Venda</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cliente:</span>
                  <span className="font-medium">{venda.cliente?.nome || 'Consumidor Final'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pagamento:</span>
                  <span className="font-medium">{venda.forma_pagamento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Itens:</span>
                  <span className="font-medium">{venda.items.length}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Valores</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Desconto:</span>
                  <span className="font-medium text-red-600">- R$ {(venda.desconto || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-green-600">
                  <span>Total:</span>
                  <span>R$ {totalFinal.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Opções de Impressão e Envio */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Escolha uma opção:</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Cupom Fiscal */}
            <Button
              onClick={handleCupomFiscal}
              className="h-20 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200"
            >
              <FiPrinter className="w-6 h-6 text-green-600" />
              <div className="text-center">
                <div className="font-semibold text-gray-900">Cupom Fiscal</div>
                <div className="text-xs text-gray-600">Impressora térmica</div>
              </div>
            </Button>

            {/* A4 */}
            <Button
              onClick={handleA4}
              className="h-20 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
            >
              <FiFileText className="w-6 h-6 text-blue-600" />
              <div className="text-center">
                <div className="font-semibold text-gray-900">Relatório A4</div>
                <div className="text-xs text-gray-600">Formato completo</div>
              </div>
            </Button>

            {/* WhatsApp */}
            <Button
              onClick={handleWhatsApp}
              className="h-20 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200"
            >
              <FiSmartphone className="w-6 h-6 text-green-600" />
              <div className="text-center">
                <div className="font-semibold text-gray-900">WhatsApp</div>
                <div className="text-xs text-gray-600">Enviar por mensagem</div>
              </div>
            </Button>

            {/* Download PDF */}
            <Button
              onClick={handleDownloadPDF}
              className="h-20 flex flex-col items-center justify-center space-y-2 bg-white border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200"
            >
              <FiDownload className="w-6 h-6 text-purple-600" />
              <div className="text-center">
                <div className="font-semibold text-gray-900">Download PDF</div>
                <div className="text-xs text-gray-600">Salvar arquivo</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex space-x-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-12"
          >
            Fechar
          </Button>
          <Button
            onClick={handleEmail}
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
          >
            <FiShare2 className="w-4 h-4 mr-2" />
            Enviar por Email
          </Button>
        </div>

        {/* Cupom oculto para impressão */}
        <div style={{ display: 'none' }} id="cupom-content">
          {/* Cabeçalho */}
          <div className="header">
            <div className="logo-section">
              <img 
                src="https://nxamrvfusyrtkcshehfm.supabase.co/storage/v1/object/public/logos/logos/1756170250332_pa231220080841.png" 
                alt="Logo da Empresa" 
                className="logo"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="info-section">
              <h4 className="company-name">EMPRESA TESTE</h4>
              <p className="company-info">RUA DE TESTE 123, LOJA 1</p>
              <p className="company-info">CIDADE DA EMPRESA DE TESTE</p>
              <p className="company-info">CNPJ: 12.123.123/0001-23</p>
              <p className="company-info">Tel: (12) 11232-1223</p>
              <p className="company-info">empresateste@gmail.com</p>
            </div>
          </div>

          {/* Linha separadora */}
          <div className="separator"></div>

          {/* Informações da venda */}
          <div className="order-info">
            <div className="order-header">
              <span>Pedido Venda: {venda.numero_venda || venda.id.slice(-6)}</span>
              <span style={{float: 'right'}}>Data: {new Date(venda.data_venda).toLocaleDateString('pt-BR')}</span>
            </div>
            
            <div className="order-details">
              <div>Colaborador: {venda.usuario || 'Sistema'}</div>
              <div>Cliente: {venda.cliente?.nome || 'Consumidor Final'}</div>
              <div>CPF/CNPJ: {venda.cliente?.documento || ''}</div>
              <div>Endereço:</div>
              <div>Telefone:</div>
              <div>Transportador:</div>
              <div>Condições Pagamento: {venda.forma_pagamento}</div>
              <div>Validade:</div>
              <div>Prazo:</div>
            </div>
          </div>

          {/* Linha separadora */}
          <div className="separator"></div>

          {/* Tabela de produtos */}
          <div className="products-table">
            <div className="table-header">
              Item Código Descrição U.M. Vr. Unit. Quant. Valor Total
            </div>
            
            {venda.items.map((item, index) => (
              <div key={index} className="product-row">
                {index + 1} {item.codigo || item.id.slice(-4)} {item.nome} UN {item.preco.toFixed(2).replace('.', ',')} {item.qty.toFixed(4)} {(item.preco * item.qty).toFixed(2).replace('.', ',')}
              </div>
            ))}
            
            <div style={{borderTop: '1px dashed #000', margin: '3px 0'}}></div>
            <div className="order-details">
              Qtde. Produtos: {venda.items.reduce((acc, item) => acc + item.qty, 0).toFixed(2)}
            </div>
          </div>

          {/* Linha separadora */}
          <div className="separator"></div>

          {/* Resumo de valores */}
          <div className="totals">
            <div className="total-row">
              <span>Total Produtos: {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="total-row">
              <span>Descontos: {(venda.desconto || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="total-row">
              <span>Acréscimos: {(venda.acrescimo || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="total-row">
              <span>Total Frete: 0,00</span>
            </div>
            <div className="total-final">
              <span>Total Geral: {totalFinal.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          {/* Linha separadora */}
          <div className="separator"></div>

          {/* Forma de pagamento */}
          <div className="payment">
            <div className="payment-header">
              Forma de Pgto. Vencto Parcela Pagto
            </div>
            <div className="payment-row">
              {venda.forma_pagamento} {new Date(venda.data_venda).toLocaleDateString('pt-BR')} {totalFinal.toFixed(2).replace('.', ',')} {new Date(venda.data_venda).toLocaleDateString('pt-BR')}
            </div>
          </div>

          {/* Rodapé */}
          <div className="footer">
            <div>
              <span>Ass. Cliente:</span>
              <div className="signature-line"></div>
            </div>
            <div>
              <span>Caixa: 1</span>
              <span style={{float: 'right'}}>Usuário: {venda.usuario || 'Sistema'}</span>
            </div>
            <div style={{textAlign: 'right'}}>
              {new Date(venda.data_venda).toLocaleString('pt-BR')}
            </div>
            <div>
              <span>Observação:</span>
              <div className="observation-line"></div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default CupomVenda;
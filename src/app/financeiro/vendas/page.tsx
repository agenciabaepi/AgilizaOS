"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';
import { CupomVenda } from '@/components/CupomVenda';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { FiPrinter } from 'react-icons/fi';

interface VendaItem {
  id: string;
  nome: string;
  preco: number;
  qtd: number;
  codigo_barras?: string;
}

interface Cliente {
  nome: string;
  telefone?: string;
  celular?: string;
  numero_cliente: string;
}

interface Venda {
  id: string;
  numero_venda: number;
  data_venda: string;
  cliente_id: string | null;
  total: number;
  forma_pagamento: string;
  status: string;
  desconto: number;
  acrescimo: number;
  tipo_pedido: string;
  cliente_nome?: string;
  cliente?: Cliente;
  itens?: VendaItem[];
}

export default function ListaVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImprimir, setModalImprimir] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [loadingCupom, setLoadingCupom] = useState(false);
  const { empresaData } = useAuth();

  useEffect(() => {
    async function fetchVendas() {
      setLoading(true);
      const { data } = await supabase
        .from('vendas')
        .select(`
          id,
          numero_venda,
          data_venda, 
          cliente_id, 
          total, 
          forma_pagamento, 
          status, 
          desconto, 
          acrescimo, 
          tipo_pedido,
          cliente:cliente_id(nome, telefone, celular, numero_cliente)
        `)
        .order('data_venda', { ascending: false });
      if (data) {
        setVendas(data.map((v) => ({
          ...v,
          cliente_nome: v.cliente?.nome || '---',
        })));
      }
      setLoading(false);
    }
    fetchVendas();
  }, []);

  const buscarItensVenda = async (vendaId: string) => {
    setLoadingCupom(true);
    try {
      // Buscar a venda com os produtos armazenados na coluna produtos
      const { data: venda, error } = await supabase
        .from('vendas')
        .select('produtos')
        .eq('id', vendaId)
        .single();

      if (error) {
        console.error('Erro ao buscar venda:', error);
        return [];
      }

      // Retornar os produtos da venda (que já estão no formato correto)
      return venda?.produtos || [];
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      return [];
    } finally {
      setLoadingCupom(false);
    }
  };

  const abrirModalImprimir = async (venda: Venda) => {
    const itens = await buscarItensVenda(venda.id);
    setVendaSelecionada({
      ...venda,
      itens
    });
    setModalImprimir(true);
  };

  return (
    <MenuLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Vendas</h1>
        {loading ? (
          <div className="text-center text-gray-500 py-20">Carregando vendas...</div>
        ) : vendas.length === 0 ? (
          <div className="text-center text-gray-500 py-20">Nenhuma venda encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100 text-left text-sm">
                  <th className="p-3">#</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Pagamento</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map(venda => (
                  <tr key={venda.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap font-semibold text-blue-600">#{venda.numero_venda}</td>
                    <td className="p-3 whitespace-nowrap">{new Date(venda.data_venda).toLocaleString('pt-BR')}</td>
                    <td className="p-3 whitespace-nowrap">{venda.cliente_nome}</td>
                    <td className="p-3 whitespace-nowrap font-semibold text-green-700">R$ {venda.total.toFixed(2)}</td>
                    <td className="p-3 whitespace-nowrap">{venda.forma_pagamento}</td>
                    <td className="p-3 whitespace-nowrap">{venda.status}</td>
                    <td className="p-3 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => abrirModalImprimir(venda)}
                        className="flex items-center gap-2"
                      >
                        <FiPrinter size={16} />
                        Cupom
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal de impressão de cupom */}
        {modalImprimir && vendaSelecionada && (
          <Dialog onClose={() => setModalImprimir(false)}>
            <div className="p-6 max-w-lg w-full">
              <h2 className="text-xl font-bold mb-4 text-center">Cupom da Venda</h2>
              
              {loadingCupom ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Carregando dados do cupom...</div>
                </div>
              ) : (
                <>
                  <div className="cupom-impressao">
                                         <CupomVenda
                       numeroVenda={vendaSelecionada.numero_venda}
                       cliente={vendaSelecionada.cliente}
                       produtos={vendaSelecionada.itens?.map(item => ({
                         id: item.id,
                         nome: item.nome,
                         preco: item.preco,
                         qty: item.qtd
                       })) || []}
                       subtotal={vendaSelecionada.total - vendaSelecionada.acrescimo + vendaSelecionada.desconto}
                       desconto={vendaSelecionada.desconto || 0}
                       acrescimo={vendaSelecionada.acrescimo || 0}
                       total={vendaSelecionada.total}
                       formaPagamento={vendaSelecionada.forma_pagamento}
                       tipoPedido={vendaSelecionada.tipo_pedido || 'Balcão'}
                       data={new Date(vendaSelecionada.data_venda).toLocaleString('pt-BR')}
                       nomeEmpresa={empresaData?.nome || "AgilizaOS"}
                     />
                  </div>
                  
                  <div className="flex gap-2 mt-4 no-print">
                    <Button className="flex-1" variant="secondary" onClick={() => setModalImprimir(false)}>Fechar</Button>
                    <Button className="flex-1" onClick={() => window.print()}>Imprimir</Button>
                  </div>
                </>
              )}
            </div>
          </Dialog>
        )}
      </div>
    </MenuLayout>
  );
} 
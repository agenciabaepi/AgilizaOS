"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';

interface Venda {
  id: string;
  data_venda: string;
  cliente_id: string | null;
  total: number;
  forma_pagamento: string;
  status: string;
  cliente_nome?: string;
}

export default function ListaVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVendas() {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendas')
        .select('id, data_venda, cliente_id, total, forma_pagamento, status, cliente:cliente_id(nome)')
        .order('data_venda', { ascending: false });
      if (data) {
        setVendas(data.map((v: any) => ({
          ...v,
          cliente_nome: v.cliente?.nome || '---',
        })));
      }
      setLoading(false);
    }
    fetchVendas();
  }, []);

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
                  <th className="p-3">Data</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Pagamento</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map(venda => (
                  <tr key={venda.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap">{new Date(venda.data_venda).toLocaleString('pt-BR')}</td>
                    <td className="p-3 whitespace-nowrap">{venda.cliente_nome}</td>
                    <td className="p-3 whitespace-nowrap font-semibold text-green-700">R$ {venda.total.toFixed(2)}</td>
                    <td className="p-3 whitespace-nowrap">{venda.forma_pagamento}</td>
                    <td className="p-3 whitespace-nowrap">{venda.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MenuLayout>
  );
} 
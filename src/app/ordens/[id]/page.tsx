'use client';

import React, { useEffect, useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const VisualizarOrdemServicoPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const [ordem, setOrdem] = useState<any>(null);

  useEffect(() => {
    const fetchOrdem = async () => {
      console.log('ID da OS:', id);

      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:cliente_id (
            nome,
            telefone,
            cpf,
            endereco
          ),
          tecnico:tecnico_id (
            nome
          )
        `)
        .eq('id', String(id))
        .single();

      if (error || !data) {
        console.error('Erro ao buscar OS:', error || 'OS não encontrada');
      } else {
        setOrdem(data);
      }
    };

    if (id) fetchOrdem();
  }, [id]);

  if (!ordem) {
    return (
      <MenuLayout>
        <main className="min-h-screen flex items-center justify-center text-gray-600">
          Carregando...
        </main>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 px-6 py-10 text-black">
        <button
          onClick={() => router.push('/ordens')}
          className="mb-4 text-sm text-blue-600 hover:underline"
        >
          ← Voltar para Ordens de Serviço
        </button>

        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-blue-700 mb-2">
            Ordem de Serviço #{ordem.numero_os}
          </h1>
          <span className="text-sm text-gray-500">Criada em: {new Date(ordem.created_at).toLocaleDateString()}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Cliente</h2>
            <p className="text-gray-900 font-medium">{ordem.cliente?.nome}</p>
            <p className="text-gray-600 text-sm">Telefone: {ordem.cliente?.telefone}</p>
            <p className="text-gray-600 text-sm">CPF: {ordem.cliente?.cpf}</p>
            <p className="text-gray-600 text-sm">Endereço: {ordem.cliente?.endereco}</p>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Aparelho</h2>
            <p className="text-gray-600 text-sm">Categoria: {ordem.categoria}</p>
            <p className="text-gray-900 font-medium">Modelo: {ordem.modelo}</p>
            <p className="text-gray-600 text-sm">Cor: {ordem.cor}</p>
            <p className="text-gray-600 text-sm">Marca: {ordem.marca}</p>
            <p className="text-gray-600 text-sm">Número de Série: {ordem.numero_serie}</p>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Status</h2>
            <span className="inline-block px-3 py-1 text-sm font-medium bg-yellow-200 text-yellow-800 rounded-full">
              {ordem.status}
            </span>
            <p className="text-sm text-gray-500 mt-2">Técnico: {ordem.tecnico?.nome}</p>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 col-span-1 md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Relato do Cliente</h2>
            <p className="text-gray-700 text-sm whitespace-pre-line">{ordem.relato || 'Nenhum relato fornecido.'}</p>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 col-span-1 md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Observações </h2>
            <p className="text-gray-700 text-sm whitespace-pre-line">{ordem.observacao || 'Nenhuma observação interna registrada.'}</p>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200 col-span-1 md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold text-gray-700 mb-6">Valores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="rounded-xl bg-gradient-to-br from-green-100 to-green-200 p-5 shadow-inner flex flex-col items-center text-center">
                <h3 className="text-sm text-gray-600 mb-1">Peças</h3>
                <p className="text-2xl font-bold text-green-800">R$ {ordem.valor_peca?.toFixed(2) || '0,00'}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 p-5 shadow-inner flex flex-col items-center text-center">
                <h3 className="text-sm text-gray-600 mb-1">Serviços</h3>
                <p className="text-2xl font-bold text-blue-800">R$ {ordem.valor_servico?.toFixed(2) || '0,00'}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-200 p-5 shadow-inner flex flex-col items-center text-center">
                <h3 className="text-sm text-gray-600 mb-1">Total Faturado</h3>
                <p className="text-2xl font-bold text-yellow-800">R$ {ordem.valor_faturado?.toFixed(2) || '0,00'}</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </MenuLayout>
  );
};

export default VisualizarOrdemServicoPage;

'use client';

import React, { useEffect, useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { PencilIcon, PrinterIcon, ReceiptPercentIcon, ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';

const VisualizarOrdemServicoPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const [ordem, setOrdem] = useState<any>(null);
  const [statusEtapas, setStatusEtapas] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrdem = async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          created_at,
          cliente:cliente_id (
            nome,
            telefone,
            cpf,
            endereco
          ),
          tecnico:tecnico_id (
            nome
          ),
          categoria,
          modelo,
          cor,
          marca,
          numero_serie,
          status,
          status_tecnico,
          observacao,
          qtd_peca,
          peca,
          valor_peca,
          qtd_servico,
          servico,
          valor_servico,
          valor_faturado,
          empresa_id
        `)
        .eq('id', String(id))
        .single();

      const { data: statusFixos } = await supabase
        .from('status_fixo')
        .select('*')
        .eq('tipo', 'os');

      const { data: statusPersonalizados } = await supabase
        .from('status')
        .select('*')
        .eq('empresa_id', data?.empresa_id)
        .eq('tipo', 'os');

      const todosStatus = [...(statusFixos || []), ...(statusPersonalizados || [])].sort((a, b) => a.ordem - b.ordem);
      
      setStatusEtapas(todosStatus);
      setOrdem(data);
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
      <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 px-6 py-10 text-black print-area">
        <button
          onClick={() => router.push('/ordens')}
          className="mb-4 text-sm text-[#000000] hover:underline"
        >
          ← Voltar para Ordens de Serviço
        </button>
        <div className="no-print flex flex-wrap justify-end gap-3 mb-8">
          <button
            onClick={() => router.push(`/ordens/${id}/editar`)}
            className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-[#cffb6d]/30"
          >
            <PencilIcon className="h-5 w-5" />
            Editar
          </button>
          <a
            href={`/ordens/${id}/imprimir`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-[#cffb6d]/30"
          >
            <PrinterIcon className="h-5 w-5" />
            Imprimir A4
          </a>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-[#cffb6d]/30">
            <ReceiptPercentIcon className="h-5 w-5" />
            Cupom
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm text-green-600 border-green-500 hover:bg-green-50">
            <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
            WhatsApp
          </button>
        </div>

        <div className="mb-10">
          {/* Barra de progresso moderna com bolinhas e linhas conectando as etapas */}
          <div className="mb-6 overflow-x-auto">
            <div className="flex items-center space-x-4">
              {statusEtapas.map((etapa, index) => {
                const ativo = etapa.nome?.toLowerCase() === ordem?.status?.toLowerCase();
                const proximo = index < statusEtapas.length - 1;
                return (
                  <div key={etapa.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors`}
                        style={{
                          backgroundColor: ativo ? etapa.cor : '#fff',
                          borderColor: etapa.cor,
                          color: ativo ? '#000' : etapa.cor,
                        }}
                      >
                        {index + 1}
                      </div>
                      <span className="text-[10px] text-center mt-1 w-16 truncate">{etapa.nome}</span>
                    </div>
                    {proximo && (
                      <div
                        className="h-1 w-8 mx-1 transition-colors"
                        style={{ backgroundColor: etapa.cor }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-[#000000] mb-2">
            Ordem de Serviço #{ordem.numero_os}
          </h1>
          <span className="text-sm text-gray-500">Criada em: {new Date(ordem.created_at).toLocaleDateString()}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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
            <span className="inline-block px-3 py-1 text-sm font-medium bg-[#cffb6d] text-[#000000] rounded-full">
              {ordem.status}
            </span>
            <p className="text-sm text-gray-500 mt-2">Técnico: {ordem.tecnico?.nome}</p>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200">

            {/* Quebra de linha para evitar espaçamento residual do grid */}
            <div className="w-full h-0" />
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Status Técnico</h2>
            <span className="inline-block px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
              {ordem.status_tecnico || 'Não informado'}
            </span>
          </section>
        </div> {/* fecha grid dos cards superiores */}
        <div className="grid grid-cols-1 gap-6"> 
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Observações </h2>
            <p className="text-gray-700 text-sm whitespace-pre-line">{ordem.observacao || 'Nenhuma observação interna registrada.'}</p>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Peças e Serviços</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-600 mb-1">Peças</h3>
                <p className="text-sm text-gray-800">{ordem.qtd_peca && ordem.peca ? `${ordem.qtd_peca}x ${ordem.peca}` : 'Nenhuma peça registrada.'}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-600 mb-1">Serviços</h3>
                <p className="text-sm text-gray-800">{ordem.qtd_servico && ordem.servico ? `${ordem.qtd_servico}x ${ordem.servico}` : 'Nenhum serviço registrado.'}</p>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-6">Valores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  label: 'Peças',
                  value: ordem.valor_peca,
                  descricao: ordem.qtd_peca && ordem.peca ? `${ordem.qtd_peca}x ${ordem.peca}` : 'Sem descrição da peça.',
                },
                {
                  label: 'Serviços',
                  value: ordem.valor_servico,
                  descricao: ordem.qtd_servico && ordem.servico ? `${ordem.qtd_servico}x ${ordem.servico}` : 'Sem descrição do serviço.',
                },
                {
                  label: 'Total Faturado',
                  value: ordem.valor_faturado,
                  descricao: '',
                },
              ].map(({ label, value, descricao }) => (
                <div
                  key={label}
                  className="rounded-lg p-6 border border-gray-200 bg-white hover:shadow transition duration-200"
                >
                  <h3 className="text-sm text-gray-500 font-medium mb-1">{label}</h3>
                  <p className="text-3xl font-bold text-gray-800 mb-1">
                    R$ {(value ?? 0).toFixed(2)}
                  </p>
                  {descricao && (
                    <p className="text-sm text-gray-500">{descricao}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </MenuLayout>
  );
};

export default VisualizarOrdemServicoPage;

'use client';

import React, { useEffect, useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
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
          empresa_id,
          empresa:empresa_id (
            nome,
            cnpj,
            endereco,
            telefone,
            email,
            logo_url
          ),
          termo_garantia,
          vencimento_garantia,
          relato,
          desconto,
          acessorios,
          condicoes_equipamento,
          laudo
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
    <ProtectedArea area="ordens">
      <MenuLayout>
        <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 px-6 py-10 text-black print-area">
          <button
            onClick={() => router.push('/ordens')}
            className="mb-4 text-sm text-[#000000] hover:underline"
          >
            ← Voltar para Ordens de Serviço
          </button>
          <div className="flex flex-wrap justify-end gap-3 mb-8">
            {/* Botões de ação */}
            <button onClick={() => router.push(`/ordens/${id}/editar`)} className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-[#cffb6d]/30"><PencilIcon className="h-5 w-5" />Editar</button>
            <a href={`/ordens/${id}/imprimir`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-[#cffb6d]/30"><PrinterIcon className="h-5 w-5" />Imprimir A4</a>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-[#cffb6d]/30"><ReceiptPercentIcon className="h-5 w-5" />Cupom</button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm text-green-600 border-green-500 hover:bg-green-50"><ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />WhatsApp</button>
          </div>
          {/* Barra de progresso de status */}
          <div className="mb-10">
            <div className="mb-6 overflow-x-auto">
              <div className="flex items-center space-x-4">
                {statusEtapas.map((etapa, index) => {
                  const ativo = etapa.nome?.toLowerCase() === ordem?.status?.toLowerCase();
                  const proximo = index < statusEtapas.length - 1;
                  return (
                    <div key={etapa.id} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors`} style={{ backgroundColor: ativo ? etapa.cor : '#fff', borderColor: etapa.cor, color: ativo ? '#000' : etapa.cor }}>
                          {index + 1}
                        </div>
                        <span className="text-[10px] text-center mt-1 w-16 truncate">{etapa.nome}</span>
                      </div>
                      {proximo && (<div className="h-1 w-8 mx-1 transition-colors" style={{ backgroundColor: etapa.cor }} />)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-[#000000] mb-6">Ordem de Serviço #{ordem.numero_os}</h1>
          {/* Blocos principais em duas colunas responsivas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="flex flex-col gap-6">
              {/* Dados da OS */}
              <section className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Dados da OS</h2>
                <div className="flex flex-col gap-1 text-sm">
                  <span>Status: <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#cffb6d] text-[#000000] font-semibold"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2l4-4" /></svg>{ordem.status}</span></span>
                  <span>Técnico: {ordem.tecnico?.nome}</span>
                  <span>Garantia: {ordem.termo_garantia || '---'}</span>
                  <span>Venc. Garantia: {ordem.vencimento_garantia ? new Date(ordem.vencimento_garantia).toLocaleDateString() : '---'}</span>
                  <span>Criada em: {new Date(ordem.created_at).toLocaleDateString()}</span>
                </div>
              </section>
              {/* Cliente */}
              <section className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Cliente</h2>
                <p className="text-gray-900 font-medium">{ordem.cliente?.nome}</p>
                <p className="text-gray-600 text-sm">Telefone: {ordem.cliente?.telefone}</p>
                <p className="text-gray-600 text-sm">CPF: {ordem.cliente?.cpf}</p>
                <p className="text-gray-600 text-sm">Endereço: {ordem.cliente?.endereco}</p>
              </section>
              {/* Aparelho */}
              <section className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Aparelho</h2>
                <p className="text-gray-600 text-sm">Categoria: {ordem.categoria}</p>
                <p className="text-gray-900 font-medium">Modelo: {ordem.modelo}</p>
                <p className="text-gray-600 text-sm">Cor: {ordem.cor}</p>
                <p className="text-gray-600 text-sm">Marca: {ordem.marca}</p>
                <p className="text-gray-600 text-sm">Número de Série: {ordem.numero_serie}</p>
                <p className="text-gray-600 text-sm">Acessórios: {ordem.acessorios || '---'}</p>
                <p className="text-gray-600 text-sm">Condições: {ordem.condicoes_equipamento || '---'}</p>
              </section>
              {/* Relato */}
              <section className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Relato do Cliente</h2>
                <p className="text-gray-700 text-sm whitespace-pre-line">{ordem.relato || 'Nenhum relato registrado.'}</p>
              </section>
              {/* Observações Internas */}
              <section className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Observações Internas</h2>
                <p className="text-gray-700 text-sm whitespace-pre-line">{ordem.observacao || 'Nenhuma observação interna registrada.'}</p>
              </section>
            </div>
            <div className="flex flex-col gap-6">
              {/* Bloco Técnico: Status, Laudo */}
              <section className="bg-white p-6 rounded-lg border border-blue-200">
                <h2 className="text-xl font-semibold text-blue-700 mb-4">Informações Técnicas</h2>
                <div className="mb-2">
                  <span className="block text-sm font-medium text-gray-600">Status Técnico:</span>
                  <span className="inline-block px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
                    {ordem.status_tecnico || 'Não informado'}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="block text-sm font-medium text-gray-600">Laudo Técnico:</span>
                  <p className="text-gray-700 text-sm whitespace-pre-line">{ordem.laudo || 'Nenhum laudo registrado.'}</p>
                </div>
              </section>
              {/* Serviços e Peças */}
              <section className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Serviços e Peças</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-gray-200">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 text-left font-semibold">Item</th>
                        <th className="px-2 py-1 text-center font-semibold">Qtd</th>
                        <th className="px-2 py-1 text-center font-semibold">Valor Unit.</th>
                        <th className="px-2 py-1 text-right font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordem.servico && (
                        <tr>
                          <td className="px-2 py-1 text-left">{ordem.servico}</td>
                          <td className="px-2 py-1 text-center">{ordem.qtd_servico}</td>
                          <td className="px-2 py-1 text-center">R$ {(ordem.valor_servico ?? 0).toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">R$ {((ordem.qtd_servico ?? 0) * (ordem.valor_servico ?? 0)).toFixed(2)}</td>
                        </tr>
                      )}
                      {ordem.peca && (
                        <tr>
                          <td className="px-2 py-1 text-left">{ordem.peca}</td>
                          <td className="px-2 py-1 text-center">{ordem.qtd_peca}</td>
                          <td className="px-2 py-1 text-center">R$ {(ordem.valor_peca ?? 0).toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">R$ {((ordem.qtd_peca ?? 0) * (ordem.valor_peca ?? 0)).toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="px-2 py-1 text-right font-semibold">Desconto:</td>
                        <td className="px-2 py-1 text-right font-semibold">R$ {(ordem.desconto ?? 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-2 py-1 text-right font-bold">Total:</td>
                        <td className="px-2 py-1 text-right font-bold">R$ {(((ordem.qtd_servico ?? 0) * (ordem.valor_servico ?? 0)) + ((ordem.qtd_peca ?? 0) * (ordem.valor_peca ?? 0)) - (ordem.desconto ?? 0)).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-2 py-1 text-right font-bold">Valor Faturado:</td>
                        <td className="px-2 py-1 text-right font-bold">R$ {(ordem.valor_faturado ?? 0).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
              {/* Valores */}
              <section className="bg-white p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Valores</h2>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span>Peças</span>
                    <span className="font-semibold">R$ {(ordem.valor_peca ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Serviços</span>
                    <span className="font-semibold">R$ {(ordem.valor_servico ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Desconto</span>
                    <span className="font-semibold">R$ {(ordem.desconto ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base border-t pt-2 mt-2">
                    <span className="font-bold">Total Faturado</span>
                    <span className="font-bold">R$ {(ordem.valor_faturado ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </MenuLayout>
    </ProtectedArea>
  );
};

export default VisualizarOrdemServicoPage;

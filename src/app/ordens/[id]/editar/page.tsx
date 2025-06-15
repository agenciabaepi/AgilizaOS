'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';
import Link from 'next/link';

export default function EditarOrdemServico() {
  const { id } = useParams();
  const [ordem, setOrdem] = useState<any>(null);

  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Erro ao obter usuário:', error);
      } else {
        console.log('UID do usuário logado:', user?.id);
      }
    };
    getUserInfo();
  }, []);

  async function fetchOrdem() {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*, clientes(*), tecnicos(*)')
      .eq('id', id as string)
      .single();

    if (!error) setOrdem(data);
    else console.error('Erro ao buscar ordem:', error);
  }

  useEffect(() => {
    fetchOrdem();
  }, [id]);

  const handleSalvar = async () => {
    const inputs = document.querySelectorAll('input, textarea, select');
    const updatedData: any = {};

    inputs.forEach((input) => {
      const el = input as HTMLInputElement;
      if (!el.readOnly && el.name) {
        if (el.type === 'number') {
          updatedData[el.name] = parseInt(el.value, 10);
        } else {
          updatedData[el.name] = el.value;
        }
      }
    });

    console.log('ID da OS:', id);
    console.log('Dados para atualizar:', updatedData);

    if (Object.keys(updatedData).length === 0) {
      alert('Nenhum dado foi alterado.');
      return;
    }

    const { error: updateError } = await supabase
      .from('ordens_servico')
      .update(updatedData)
      .eq('id', id as string);

    const { data: check, error: checkError } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('id', id as string)
      .single();

    if (updateError || checkError) {
      console.error('Erro ao atualizar ordem:', updateError || checkError);
      alert('Erro ao salvar alterações: ' + ((updateError || checkError)?.message || 'Erro desconhecido'));
    } else {
      console.log('Atualização confirmada:', check);
      alert('Alterações salvas com sucesso.');
      await fetchOrdem();
    }
  };

  if (!ordem) return <div className="p-6 text-gray-600">Carregando...</div>;

  return (
    <MenuLayout>
      <div className="p-6 max-w-4xl mx-auto text-sm text-black">
        <h1 className="text-2xl font-semibold mb-8">Editar Ordem de Serviço</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Número da OS
            <input
              readOnly
              name="numero_os"
              defaultValue={ordem.numero_os}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
            />
          </label>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Data de Entrada
            <input
              readOnly
              name="data_entrada"
              defaultValue={ordem.data_entrada?.slice(0, 10)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
            />
          </label>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">Dados do Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nome
                <input
                  readOnly
                  name="nome_cliente"
                  defaultValue={ordem.clientes?.nome}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                />
              </label>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Telefone
                <input
                  readOnly
                  name="telefone_cliente"
                  defaultValue={ordem.clientes?.telefone}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                />
              </label>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                CPF
                <input
                  readOnly
                  name="cpf_cliente"
                  defaultValue={ordem.clientes?.cpf}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                />
              </label>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Endereço
                <input
                  readOnly
                  name="endereco_cliente"
                  defaultValue={ordem.clientes?.endereco}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed"
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">Informações do Aparelho</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Marca
                <input
                  name="marca"
                  defaultValue={ordem.marca}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                />
              </label>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Modelo
                <input
                  name="modelo"
                  defaultValue={ordem.modelo}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                />
              </label>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Cor
                <input
                  name="cor"
                  defaultValue={ordem.cor}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                />
              </label>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Número de Série
                <input
                  name="numero_serie"
                  defaultValue={ordem.numero_serie}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">Situação e Relatos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Status da OS
                <select
                  name="status"
                  defaultValue={ordem.status}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                >
                  <option value="orcamento">Orçamento</option>
                  <option value="aguardando_aprovacao">Aguardando aprovação</option>
                  <option value="nao_aprovado">Não aprovado</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="aguardando_retirada">Aguardando retirada</option>
                  <option value="concluido">Concluído</option>
                </select>
              </label>

              <label className="block text-xs font-medium text-gray-500 mb-1">
                Status Técnico
                <select
                  name="status_tecnico"
                  defaultValue={ordem.status_tecnico}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                >
                  <option value="iniciada">Iniciada</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="orcamento_finalizado">Orçamento finalizado</option>
                  <option value="aguardando_peca">Aguardando peça</option>
                  <option value="testes_finais">Testes finais</option>
                  <option value="sem_conserto">Sem conserto</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Relato do Cliente
                <textarea
                  name="relato"
                  defaultValue={ordem.relato}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm resize-none h-20"
                />
              </label>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Observações Internas
                <textarea
                  name="observacao"
                  defaultValue={ordem.observacao}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm resize-none h-20"
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 border-b border-gray-300 pb-1">Produtos e Serviços</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Serviço
                <input
                  name="servico"
                  list="lista-servicos"
                  defaultValue={ordem.servico}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                />
                <datalist id="lista-servicos">
                  <option value="Formatação" />
                  <option value="Limpeza interna" />
                  <option value="Reinstalação de sistema" />
                </datalist>
              </label>

              <label className="block text-xs font-medium text-gray-500 mb-1">
                Qtd Serviço
                <input
                  type="number"
                  name="qtd_servico"
                  defaultValue={ordem.qtd_servico}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                />
              </label>

              <label className="block text-xs font-medium text-gray-500 mb-1">
                Peça
                <input
                  name="peca"
                  list="lista-pecas"
                  defaultValue={ordem.peca}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                />
                <datalist id="lista-pecas">
                  <option value="Bateria" />
                  <option value="Tela" />
                  <option value="Conector de carga" />
                </datalist>
              </label>

              <label className="block text-xs font-medium text-gray-500 mb-1">
                Qtd Peça
                <input
                  type="number"
                  name="qtd_peca"
                  defaultValue={ordem.qtd_peca}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                />
              </label>

              <div className="col-span-1 md:col-span-2 lg:col-span-3 text-right text-sm text-gray-600 pt-2">
                {/* Exemplo estático, depois podemos calcular automático */}
                Valor estimado: <span className="font-semibold">R$ 180,00</span>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 flex gap-4">
          <button
            onClick={handleSalvar}
            className="px-5 py-2 rounded-md text-sm transition-colors bg-[#cffb6d] hover:bg-[#b9e457] text-black font-semibold shadow"
          >
            Salvar Alterações
          </button>
          <Link href={`/ordens/${id}`}>
            <button className="px-5 py-2 rounded-md text-sm transition-colors bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow">
              Cancelar
            </button>
          </Link>
        </div>
      </div>
    </MenuLayout>
  );
}

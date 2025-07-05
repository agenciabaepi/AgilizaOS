'use client';

import { useEffect, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';
import Link from 'next/link';
import { Combobox } from '@headlessui/react';

export default function EditarOrdemServico() {
  const [statusOS, setStatusOS] = useState<any[]>([]);
  const [statusSelecionado, setStatusSelecionado] = useState<any>(null);

  useEffect(() => {
    const fetchStatusOS = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return;
  
      const empresaId = userData.user.user_metadata?.empresa_id;
  
      // Busca status da empresa
      const { data: statusEmpresa, error: erroEmpresa } = await supabase
        .from('status')
        .select('*')
        .eq('tipo', 'os')
        .eq('empresa_id', empresaId);
  
      // Busca status fixos do sistema
      const { data: statusFixos, error: erroFixos } = await supabase
        .from('status_fixo')
        .select('*')
        .eq('tipo', 'os');
  
      if (!erroEmpresa && !erroFixos) {
        const todosStatus = [...(statusFixos || []), ...(statusEmpresa || [])];
        setStatusOS(todosStatus);
      }
    };
  
    fetchStatusOS();
  }, []);
  const { id } = useParams();
  const [ordem, setOrdem] = useState<any>(null);
  const [servicos, setServicos] = useState([]);
  const [pecas, setPecas] = useState([]);

  const [servicoSelecionado, setServicoSelecionado] = useState<any>(null);
  const [pecaSelecionada, setPecaSelecionada] = useState<any>(null);
  const [queryServico, setQueryServico] = useState('');
  const [queryPeca, setQueryPeca] = useState('');

  useEffect(() => {
    const fetchProdutosEServicos = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return;

      const empresaId = userData.user.user_metadata?.empresa_id;
      if (!empresaId) return;

      const { data: produtosEServicos, error } = await supabase
        .from('produtos_servicos')
        .select('id, nome, tipo, preco, empresa_id')
        .eq('empresa_id', empresaId);

      if (error) {
        console.error('Erro ao buscar produtos e serviços:', error);
      } else {
        const servicosData = produtosEServicos.filter((item: any) => item.tipo === 'servico');
        const pecasData = produtosEServicos.filter((item: any) => item.tipo === 'produto');

        setServicos(servicosData);
        setPecas(pecasData);
      }
    };

    fetchProdutosEServicos();
  }, []);

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
      .select('*, clientes(*), usuarios!tecnico_id ( nome )')
      .eq('id', id as string)
      .single();

    if (!error) {
      setOrdem(data);
      // Set initial selected servico and peca based on ordem data
      if (data.servico) {
        const servicoEncontrado = servicos.find((s: any) => s.nome === data.servico);
        setServicoSelecionado(servicoEncontrado || null);
      }
      if (data.peca) {
        const pecaEncontrada = pecas.find((p: any) => p.nome === data.peca);
        setPecaSelecionada(pecaEncontrada || null);
      }
      // Set initial selected status
      // statusOS pode não estar carregado ainda, então buscamos nos status fixos e empresa
      const statusFixos = statusOS.filter((s: any) => s.tipo === 'os' && !s.empresa_id);
      const statusEmpresa = statusOS.filter((s: any) => s.tipo === 'os' && s.empresa_id);
      const statusInicial = (statusFixos || []).concat(statusEmpresa || []).find(s => s.nome === data.status);
      setStatusSelecionado(statusInicial || null);
    } else console.error('Erro ao buscar ordem:', error);
  }

  useEffect(() => {
    fetchOrdem();
  }, [id, servicos, pecas]);

  const servicosFiltrados = queryServico === ''
    ? servicos.slice(0, 5)
    : servicos.filter((s: any) =>
        s.nome.toLowerCase().includes(queryServico.toLowerCase())
      );

  const pecasFiltradas = queryPeca === ''
    ? pecas.slice(0, 5)
    : pecas.filter((p: any) =>
        p.nome.toLowerCase().includes(queryPeca.toLowerCase())
      );

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
          if (el.name === 'status' && statusSelecionado?.nome === 'FINALIZADO') {
            updatedData['data_entrega'] = new Date().toISOString();
          }
        }
      }
    });

    // Substitui valor do status pelo selecionado no Listbox
    updatedData['status'] = statusSelecionado?.nome || '';

    // Add servico and peca from selected comboboxes
    if (servicoSelecionado) {
      updatedData['servico'] = servicoSelecionado.nome;
    } else {
      updatedData['servico'] = '';
    }
    if (pecaSelecionada) {
      updatedData['peca'] = pecaSelecionada.nome;
    } else {
      updatedData['peca'] = '';
    }
    // Salvar também os preços individuais da peça e do serviço
    updatedData['valor_servico'] = servicoSelecionado?.preco || 0;
    updatedData['valor_peca'] = pecaSelecionada?.preco || 0;

    // Calcular valor_faturado com base nas quantidades e preços selecionados
    const qtdServico = parseInt((document.querySelector('input[name="qtd_servico"]') as HTMLInputElement)?.value || '0', 10);
    const qtdPeca = parseInt((document.querySelector('input[name="qtd_peca"]') as HTMLInputElement)?.value || '0', 10);
    const precoServico = servicoSelecionado?.preco || 0;
    const precoPeca = pecaSelecionada?.preco || 0;
    const valorFaturado = qtdServico * precoServico + qtdPeca * precoPeca;

    updatedData['valor_faturado'] = valorFaturado;

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
      window.location.href = `/ordens/${id}`;
      await fetchOrdem();
    }
  };

  if (!ordem) return <div className="p-6 text-gray-600">Carregando...</div>;

  return (
    <MenuLayout>
      <div className="p-6 max-w-4xl mx-auto text-sm text-black">
        <Link href={`/ordens/${id}`}>
          <button className="mb-4 px-4 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 text-gray-600">
            ← Voltar
          </button>
        </Link>
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
                <Listbox value={statusSelecionado} onChange={setStatusSelecionado}>
                  <div className="relative mt-1">
                    <Listbox.Button className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-white text-left">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: statusSelecionado?.cor || 'black' }}
                        ></span>
                        {statusSelecionado?.nome || 'Selecione...'}
                      </span>
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                      <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-gray-200 rounded-md shadow-lg text-sm">
                        {statusOS.map((status) => (
                          <Listbox.Option
                            key={status.id}
                            value={status}
                            className={({ active }) =>
                              `cursor-pointer select-none px-3 py-2 flex items-center gap-2 ${
                                active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                              }`
                            }
                          >
                            <span
                              className="inline-block w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.cor || 'black' }}
                            ></span>
                            {status.nome}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
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
            <div className="grid grid-cols-1 gap-6">

              <div className="grid md:grid-cols-3 gap-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Serviço
                  <Combobox value={servicoSelecionado} onChange={setServicoSelecionado}>
                    <div className="relative">
                      <Combobox.Input
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                        onFocus={() => setQueryServico('')}
                        onChange={(e) => setQueryServico(e.target.value)}
                        displayValue={(s) => s?.nome ? `${s.nome} - R$ ${s.preco?.toFixed(2)}` : ''}
                        placeholder="Buscar serviço..."
                        autoComplete="off"
                      />
                      <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
                        {servicosFiltrados.length === 0 && (
                          <div className="px-3 py-2 text-gray-500">Nenhum serviço encontrado.</div>
                        )}
                        {servicosFiltrados.map((s) => (
                          <Combobox.Option
                            key={s.id}
                            value={s}
                            className={({ active }) =>
                              `cursor-pointer select-none px-3 py-2 ${
                                active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                              }`
                            }
                          >
                            {s.nome} – R$ {s.preco?.toFixed(2)}
                          </Combobox.Option>
                        ))}
                      </Combobox.Options>
                    </div>
                  </Combobox>
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
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Peça
                  <Combobox value={pecaSelecionada} onChange={setPecaSelecionada}>
                    <div className="relative">
                      <Combobox.Input
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                        onFocus={() => setQueryPeca('')}
                        onChange={(e) => setQueryPeca(e.target.value)}
                        displayValue={(p) => p?.nome ? `${p.nome} - R$ ${p.preco?.toFixed(2)}` : ''}
                        placeholder="Buscar peça..."
                        autoComplete="off"
                      />
                      <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
                        {pecasFiltradas.length === 0 && (
                          <div className="px-3 py-2 text-gray-500">Nenhuma peça encontrada.</div>
                        )}
                        {pecasFiltradas.map((p) => (
                          <Combobox.Option
                            key={p.id}
                            value={p}
                            className={({ active }) =>
                              `cursor-pointer select-none px-3 py-2 ${
                                active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                              }`
                            }
                          >
                            {p.nome} – R$ {p.preco?.toFixed(2)}
                          </Combobox.Option>
                        ))}
                      </Combobox.Options>
                    </div>
                  </Combobox>
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
              </div>

              <div className="text-right text-sm text-gray-700 font-semibold border-t border-gray-200 pt-4">
                {(() => {
                  const qtdServico = ordem.qtd_servico || 0;
                  const qtdPeca = ordem.qtd_peca || 0;
                  const precoServico = servicoSelecionado?.preco || 0;
                  const precoPeca = pecaSelecionada?.preco || 0;
                  const total = qtdServico * precoServico + qtdPeca * precoPeca;
                  return (
                    <>
                      Valor estimado: <span className="text-black font-bold">R$ {total.toFixed(2)}</span>
                    </>
                  );
                })()}
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

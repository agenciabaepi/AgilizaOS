'use client';

import { useEffect, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import { Combobox } from '@headlessui/react';
import { FiArrowLeft, FiSave, FiX, FiUser, FiSmartphone, FiFileText, FiTool, FiDollarSign, FiMessageCircle, FiPackage, FiCheckCircle, FiRefreshCw, FiShield } from 'react-icons/fi';

interface Termo {
  id: string;
  nome: string;
  conteudo: string;
  ativo: boolean;
  ordem: number;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

export default function EditarOrdemServico() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ordem, setOrdem] = useState<any>(null);
  const [statusOS, setStatusOS] = useState<any[]>([]);
  const [statusSelecionado, setStatusSelecionado] = useState<any>(null);
  const [servicos, setServicos] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [servicoSelecionado, setServicoSelecionado] = useState<any>(null);
  const [pecaSelecionada, setPecaSelecionada] = useState<any>(null);
  const [queryServico, setQueryServico] = useState('');
  const [queryPeca, setQueryPeca] = useState('');
  const [termos, setTermos] = useState<Termo[]>([]);
  const [loadingTermos, setLoadingTermos] = useState(false);
  const [termoSelecionado, setTermoSelecionado] = useState<string | null>(null);
  const [valorServico, setValorServico] = useState<number>(0);
  const [valorPeca, setValorPeca] = useState<number>(0);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState<any>(null);

  // Função para detectar se é retorno
  const isRetorno = (ordem: any) => {
    const tipo = ordem?.tipo?.toLowerCase();
    return tipo === 'retorno' || tipo === 'Retorno';
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar status
        const { data: userData } = await supabase.auth.getUser();
        const empresaId = userData.user?.user_metadata?.empresa_id;

        const { data: statusEmpresa } = await supabase
          .from('status')
          .select('*')
          .eq('tipo', 'os')
          .eq('empresa_id', empresaId);

        const { data: statusFixos } = await supabase
          .from('status_fixo')
          .select('*')
          .eq('tipo', 'os');

        const todosStatus = [...(statusFixos || []), ...(statusEmpresa || [])];
        setStatusOS(todosStatus);

        // Buscar produtos e serviços
        const { data: produtosEServicos } = await supabase
          .from('produtos_servicos')
          .select('id, nome, tipo, preco, empresa_id')
          .eq('empresa_id', empresaId);

        let servicosData: any[] = [];
        let pecasData: any[] = [];

        if (produtosEServicos) {
          servicosData = produtosEServicos.filter((item: any) => item.tipo === 'servico');
          pecasData = produtosEServicos.filter((item: any) => item.tipo === 'produto');
          setServicos(servicosData);
          setPecas(pecasData);
        }

        // Buscar termos de garantia
        setLoadingTermos(true);
        const { data: termosData } = await supabase
          .from('termos_garantia')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('ordem', { ascending: true });
        
        if (termosData) {
          setTermos(termosData);
        }
        setLoadingTermos(false);

        // Buscar técnicos da empresa
        const { data: tecnicosData, error: tecnicosError } = await supabase
          .from('usuarios')
          .select('id, nome, email, auth_user_id')
          .eq('empresa_id', empresaId)
          .eq('nivel', 'tecnico')
          .order('nome', { ascending: true });

        console.log('Técnicos encontrados:', tecnicosData);
        console.log('Erro ao buscar técnicos:', tecnicosError);

        if (tecnicosData) {
          setTecnicos(tecnicosData);
        }

        // Buscar ordem
        const { data: ordemData, error } = await supabase
          .from('ordens_servico')
          .select(`
            *,
            clientes(*),
            usuarios!tecnico_id ( nome ),
            termo_garantia:termo_garantia_id (
              id,
              nome,
              conteudo
            )
          `)
          .eq('id', id as string)
          .single();

        if (error) {
          console.error('Erro ao carregar OS:', error);
        } else {
          setOrdem(ordemData);
          
          // Set initial selected servico and peca
          if (ordemData.servico) {
            const servicoEncontrado = servicosData.find((s: any) => s.nome === ordemData.servico);
            setServicoSelecionado(servicoEncontrado || null);
          }
          if (ordemData.peca) {
            const pecaEncontrada = pecasData.find((p: any) => p.nome === ordemData.peca);
            setPecaSelecionada(pecaEncontrada || null);
          }

          // Set initial selected status
          const statusInicial = todosStatus.find(s => s.nome === ordemData.status);
          setStatusSelecionado(statusInicial || null);

          // Set initial selected termo
          if (ordemData.termo_garantia_id) {
            setTermoSelecionado(ordemData.termo_garantia_id);
          }

          // Set initial selected tecnico
          if (ordemData.tecnico_id && tecnicosData) {
            const tecnicoEncontrado = tecnicosData.find((t: any) => t.auth_user_id === ordemData.tecnico_id);
            console.log('Técnico encontrado:', tecnicoEncontrado);
            setTecnicoSelecionado(tecnicoEncontrado || null);
          } else {
            console.log('Nenhum técnico encontrado para:', ordemData.tecnico_id);
            setTecnicoSelecionado(null);
          }

          // Set initial values
          setValorServico(parseFloat(ordemData.valor_servico || '0'));
          setValorPeca(parseFloat(ordemData.valor_peca || '0'));
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const calcularTotal = () => {
    const qtdServico = ordem?.qtd_servico || 0;
    const qtdPeca = ordem?.qtd_peca || 0;
    return qtdServico * valorServico + qtdPeca * valorPeca;
  };

  const handleSalvar = async () => {
    setSaving(true);
    try {
      const inputs = document.querySelectorAll('input, textarea, select');
      const updatedData: any = {};

      inputs.forEach((input) => {
        const el = input as HTMLInputElement;
        if (!el.readOnly && el.name) {
          if (el.type === 'number') {
            const value = parseInt(el.value, 10);
            if (!isNaN(value)) {
              updatedData[el.name] = value;
            }
          } else {
            const value = el.value.trim();
            if (value !== '') {
              updatedData[el.name] = value;
            }
            if (el.name === 'status' && statusSelecionado?.nome === 'FINALIZADO') {
              updatedData['data_entrega'] = new Date().toISOString();
            }
          }
        }
      });

      updatedData['status'] = statusSelecionado?.nome || '';
      updatedData['servico'] = servicoSelecionado?.nome || '';
      updatedData['peca'] = pecaSelecionada?.nome || '';
      // Usar os valores dos estados
      updatedData['valor_servico'] = valorServico;
      updatedData['valor_peca'] = valorPeca;
      updatedData['valor_faturado'] = calcularTotal();
      updatedData['termo_garantia_id'] = termoSelecionado || null;
      // Incluir tecnico_id se um técnico válido foi selecionado
      console.log('TÉCNICO SELECIONADO:', tecnicoSelecionado);
      console.log('TÉCNICOS DISPONÍVEIS:', tecnicos);
      console.log('TÉCNICO ATUAL DA OS:', ordem.tecnico_id);
      
      if (tecnicoSelecionado?.auth_user_id && tecnicos.some(t => t.auth_user_id === tecnicoSelecionado.auth_user_id)) {
        console.log('Técnico válido selecionado:', tecnicoSelecionado.auth_user_id);
        console.log('Nome do técnico:', tecnicoSelecionado.nome);
        console.log('Técnico existe na lista:', tecnicos.find(t => t.auth_user_id === tecnicoSelecionado.auth_user_id));
        updatedData['tecnico_id'] = tecnicoSelecionado.auth_user_id;
      } else if (tecnicoSelecionado === null) {
        // Se nenhum técnico foi selecionado, remover o campo
        console.log('Nenhum técnico selecionado, removendo tecnico_id');
        delete updatedData['tecnico_id'];
      } else {
        // Se o técnico selecionado é inválido, manter o atual
        console.log('Técnico inválido, mantendo atual:', ordem.tecnico_id);
        console.log('Técnico selecionado inválido:', tecnicoSelecionado);
        if (ordem.tecnico_id) {
          updatedData['tecnico_id'] = ordem.tecnico_id;
        }
      }

      // Remover campos undefined/null
      Object.keys(updatedData).forEach(key => {
        if (updatedData[key] === undefined || updatedData[key] === null || updatedData[key] === '') {
          delete updatedData[key];
        }
      });

      // Verificar se tecnico_id é um UUID válido
      if (updatedData.tecnico_id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(updatedData.tecnico_id)) {
          console.error('tecnico_id não é um UUID válido:', updatedData.tecnico_id);
          delete updatedData.tecnico_id;
        } else {
          console.log('tecnico_id é um UUID válido:', updatedData.tecnico_id);
        }
      }

      console.log('Dados para atualizar (limpos):', updatedData);
      console.log('Técnico selecionado:', tecnicoSelecionado);
      console.log('Técnicos disponíveis:', tecnicos);
      console.log('ID da OS:', id);

      const { data, error } = await supabase
        .from('ordens_servico')
        .update(updatedData)
        .eq('id', id as string)
        .select();

      console.log('Resposta do Supabase:', { data, error });

      if (error) {
        console.error('Erro ao atualizar ordem:', error);
        console.error('Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert('Erro ao salvar alterações: ' + (error.message || 'Erro desconhecido'));
      } else {
        console.log('OS atualizada com sucesso:', data);
        alert('Alterações salvas com sucesso!');
        router.push(`/ordens/${id}`);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MenuLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando ordem de serviço...</p>
          </div>
        </div>
      </MenuLayout>
    );
  }

  if (!ordem) {
    return (
      <MenuLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ordem não encontrada</h2>
            <p className="text-gray-600 mb-4">A ordem de serviço solicitada não foi encontrada.</p>
            <button
              onClick={() => router.push('/ordens')}
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Voltar para Ordens
            </button>
          </div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <ProtectedArea area="ordens">
      <MenuLayout>
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/ordens/${id}`)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
                <span>Voltar</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Editar OS #{ordem.numero_os}
                  </h1>
                  {isRetorno(ordem) && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-red-700">Retorno</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 mt-1">
                  Editando ordem de serviço
                </p>
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/ordens/${id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FiX className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <FiSave className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Grid Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna Esquerda - Informações Principais */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cliente (Somente Leitura) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiUser className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Cliente</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Nome:</span>
                    <p className="font-medium text-gray-900">{ordem.clientes?.nome}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Telefone:</span>
                    <p className="font-medium text-gray-900">{ordem.clientes?.telefone}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">CPF:</span>
                    <p className="font-medium text-gray-900">{ordem.clientes?.cpf || '---'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Endereço:</span>
                    <p className="font-medium text-gray-900">{ordem.clientes?.endereco || '---'}</p>
                  </div>
                </div>
              </div>

              {/* Aparelho */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiSmartphone className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Aparelho</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
                    <input
                      name="marca"
                      defaultValue={ordem.marca}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                    <input
                      name="modelo"
                      defaultValue={ordem.modelo}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
                    <input
                      name="cor"
                      defaultValue={ordem.cor}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número de Série</label>
                    <input
                      name="numero_serie"
                      defaultValue={ordem.numero_serie}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Status, Técnico e Relatos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FiCheckCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Status</h2>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status da OS</label>
                    <Listbox value={statusSelecionado} onChange={setStatusSelecionado}>
                      <div className="relative">
                        <Listbox.Button className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block w-3 h-3 rounded-full"
                              style={{ backgroundColor: statusSelecionado?.cor || 'black' }}
                            ></span>
                            {statusSelecionado?.nome || 'Selecione...'}
                          </span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                            {statusOS.map((status) => (
                              <Listbox.Option
                                key={status.id}
                                value={status}
                                className={({ active }) =>
                                  `cursor-pointer select-none px-3 py-2 flex items-center gap-2 ${
                                    active ? 'bg-blue-600 text-white' : 'text-gray-900'
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
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FiTool className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Técnico</h2>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Técnico Responsável</label>
                    <Listbox value={tecnicoSelecionado} onChange={setTecnicoSelecionado}>
                      <div className="relative">
                        <Listbox.Button className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <span className="flex items-center gap-2">
                            <FiUser className="w-4 h-4 text-gray-400" />
                            {tecnicoSelecionado?.nome || 'Selecione um técnico...'}
                          </span>
                        </Listbox.Button>
                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                            {tecnicos.map((tecnico) => (
                              <Listbox.Option
                                key={tecnico.id}
                                value={tecnico}
                                className={({ active }) =>
                                  `cursor-pointer select-none px-3 py-2 flex items-center gap-2 ${
                                    active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                  }`
                                }
                              >
                                <FiUser className="w-4 h-4 text-gray-400" />
                                {tecnico.nome}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <FiMessageCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Relatos</h2>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Relato do Cliente</label>
                    <textarea
                      name="relato"
                      defaultValue={ordem.relato}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FiFileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Observações</h2>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observações Internas</label>
                  <textarea
                    name="observacao"
                    defaultValue={ordem.observacao}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Coluna Direita - Produtos e Serviços */}
            <div className="space-y-6">
              {/* Serviços */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiTool className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Serviços</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Serviço</label>
                    <Combobox value={servicoSelecionado} onChange={setServicoSelecionado}>
                      <div className="relative">
                        <Combobox.Input
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onFocus={() => setQueryServico('')}
                          onChange={(e) => setQueryServico(e.target.value)}
                          displayValue={(s) => s?.nome ? `${s.nome} - ${formatCurrency(s.preco)}` : ''}
                          placeholder="Buscar serviço..."
                          autoComplete="off"
                        />
                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {servicosFiltrados.length === 0 && (
                            <div className="px-3 py-2 text-gray-500">Nenhum serviço encontrado.</div>
                          )}
                          {servicosFiltrados.map((s) => (
                            <Combobox.Option
                              key={s.id}
                              value={s}
                              className={({ active }) =>
                                `cursor-pointer select-none px-3 py-2 ${
                                  active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                }`
                              }
                            >
                              {s.nome} – {formatCurrency(s.preco)}
                            </Combobox.Option>
                          ))}
                        </Combobox.Options>
                      </div>
                    </Combobox>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                    <input
                      type="number"
                      name="qtd_servico"
                      defaultValue={ordem.qtd_servico}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor do Serviço</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor_servico"
                      value={valorServico}
                      onChange={(e) => setValorServico(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {/* Peças */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FiPackage className="w-5 h-5 text-yellow-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Peças</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Peça</label>
                    <Combobox value={pecaSelecionada} onChange={setPecaSelecionada}>
                      <div className="relative">
                        <Combobox.Input
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onFocus={() => setQueryPeca('')}
                          onChange={(e) => setQueryPeca(e.target.value)}
                          displayValue={(p) => p?.nome ? `${p.nome} - ${formatCurrency(p.preco)}` : ''}
                          placeholder="Buscar peça..."
                          autoComplete="off"
                        />
                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {pecasFiltradas.length === 0 && (
                            <div className="px-3 py-2 text-gray-500">Nenhuma peça encontrada.</div>
                          )}
                          {pecasFiltradas.map((p) => (
                            <Combobox.Option
                              key={p.id}
                              value={p}
                              className={({ active }) =>
                                `cursor-pointer select-none px-3 py-2 ${
                                  active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                }`
                              }
                            >
                              {p.nome} – {formatCurrency(p.preco)}
                            </Combobox.Option>
                          ))}
                        </Combobox.Options>
                      </div>
                    </Combobox>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                    <input
                      type="number"
                      name="qtd_peca"
                      defaultValue={ordem.qtd_peca}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor da Peça</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor_peca"
                      value={valorPeca}
                      onChange={(e) => setValorPeca(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {/* Garantia */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FiShield className="w-5 h-5 text-yellow-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Garantia</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Termo de Garantia</label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={termoSelecionado || ''}
                      onChange={(e) => setTermoSelecionado(e.target.value || null)}
                    >
                      <option value="">Selecione um termo de garantia (opcional)</option>
                      {termos.map((termo) => (
                        <option key={termo.id} value={termo.id}>
                          {termo.nome}
                        </option>
                      ))}
                    </select>
                    {loadingTermos && <div className="text-xs text-gray-500 mt-1">Carregando termos...</div>}
                    {termos.length === 0 && !loadingTermos && (
                      <div className="text-xs text-gray-500 mt-1">
                        Nenhum termo de garantia cadastrado. 
                        <a href="/configuracoes?tab=2" className="text-blue-600 hover:underline ml-1">
                          Cadastrar termos
                        </a>
                      </div>
                    )}

                  </div>
                </div>
              </div>

              {/* Valores */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiDollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Valores</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Serviços:</span>
                    <span className="font-medium">{formatCurrency(valorServico * (ordem?.qtd_servico || 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Peças:</span>
                    <span className="font-medium">{formatCurrency(valorPeca * (ordem?.qtd_peca || 0))}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Estimado:</span>
                      <span className="text-green-600">{formatCurrency(calcularTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MenuLayout>
    </ProtectedArea>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { Combobox } from '@headlessui/react';
import { FiArrowLeft, FiSave, FiX, FiUser, FiSmartphone, FiFileText, FiTool, FiDollarSign, FiMessageCircle, FiPackage, FiCheckCircle, FiShield } from 'react-icons/fi';

interface Servico {
  id: string;
  nome: string;
  preco: number;
  tipo: string;
  empresa_id: string;
}

interface Peca {
  id: string;
  nome: string;
  preco: number;
  tipo: string;
  empresa_id: string;
}

interface Status {
  id: string;
  nome: string;
  tipo: string;
  empresa_id?: string;
  cor?: string;
}

interface Tecnico {
  id: string;
  nome: string;
  email?: string;
  nivel?: string;
  auth_user_id: string;
  empresa_id?: string;
}

interface Ordem {
  id: string;
  numero_os: string;
  servico?: string;
  peca?: string;
  qtd_servico?: number;
  qtd_peca?: number;
  valor_servico?: number;
  valor_peca?: number;
  valor_faturado?: number;
  status_id?: string;
  tecnico_id?: string;
  termo_garantia_id?: string;
  tipo?: string;
  imagens?: string;
  clientes?: {
    nome: string;
    email: string;
    telefone: string;
    cpf?: string;
    endereco?: string;
  };
  marca?: string;
  modelo?: string;
  cor?: string;
  numero_serie?: string;
  relato?: string;
  observacao?: string;
}

export default function EditarOrdemServico() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  const [ordem, setOrdem] = useState<Ordem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [status, setStatus] = useState<Status[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [termos, setTermos] = useState<Array<{ id: string; nome: string; ordem: number; ativo: boolean; empresa_id: string }>>([]);
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null);
  const [pecaSelecionada, setPecaSelecionada] = useState<Peca | null>(null);
  const [statusSelecionado, setStatusSelecionado] = useState<Status | null>(null);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState<Tecnico | null>(null);
  const [termoSelecionado, setTermoSelecionado] = useState<string>('');
  const [valorServico, setValorServico] = useState<number>(0);
  const [valorPeca, setValorPeca] = useState<number>(0);
  const [queryServico, setQueryServico] = useState('');
  const [queryPeca, setQueryPeca] = useState('');
  const [imagens, setImagens] = useState<File[]>([]);
  const [previewImagens, setPreviewImagens] = useState<string[]>([]);
  const [imagensExistentes, setImagensExistentes] = useState<string[]>([]);

  // Estados para os campos que não estão sendo salvos
  const [marca, setMarca] = useState<string>('');
  const [modelo, setModelo] = useState<string>('');
  const [cor, setCor] = useState<string>('');
  const [numeroSerie, setNumeroSerie] = useState<string>('');
  const [relato, setRelato] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [qtdServico, setQtdServico] = useState<number>(0);
  const [qtdPeca, setQtdPeca] = useState<number>(0);

  // Função para detectar se é retorno
  const isRetorno = (ordem: Ordem | null) => {
    const tipo = ordem?.tipo?.toLowerCase();
    return tipo === 'retorno' || tipo === 'Retorno';
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar dados do usuário
        const { data: userData } = await supabase.auth.getUser();
        const empresaId = userData.user?.user_metadata?.empresa_id;

        if (!empresaId) {
          console.error('Empresa ID não encontrado');
          setLoading(false);
          return;
        }

        // Buscar status
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
        setStatus(todosStatus);

        // Buscar produtos e serviços
        const { data: produtosEServicos } = await supabase
          .from('produtos_servicos')
          .select('id, nome, tipo, preco, empresa_id')
          .eq('empresa_id', empresaId);

        let servicosData: Servico[] = [];
        let pecasData: Peca[] = [];

        if (produtosEServicos) {
          servicosData = produtosEServicos.filter((item: { tipo: string }) => item.tipo === 'servico') as Servico[];
          pecasData = produtosEServicos.filter((item: { tipo: string }) => item.tipo === 'produto') as Peca[];
          setServicos(servicosData);
          setPecas(pecasData);
        }

        // Buscar termos de garantia
        const { data: termosData } = await supabase
          .from('termos_garantia')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('ordem', { ascending: true });
        
        if (termosData) {
          setTermos(termosData);
        }

        // Buscar técnicos
        const { data: tecnicosData } = await supabase
          .from('usuarios')
          .select('id, nome, email, nivel, auth_user_id')
          .eq('empresa_id', empresaId)
          .eq('nivel', 'tecnico');

        setTecnicos(tecnicosData || []);

        // Buscar a OS
        if (!id) {
          console.error('ID da OS não encontrado');
          setLoading(false);
          return;
        }

        const { data: ordemData, error: ordemError } = await supabase
          .from('ordens_servico')
          .select('*')
          .eq('id', id)
          .single();

        console.log('📋 Dados da OS carregados:', ordemData);
        console.log('❌ Erro ao carregar OS:', ordemError);

        if (ordemError) {
          console.error('Erro ao buscar OS:', ordemError);
          setLoading(false);
          return;
        }

        if (ordemData) {
          setOrdem(ordemData);
          setServicoSelecionado(servicosData.find(s => s.nome === ordemData.servico) || null);
          setPecaSelecionada(pecasData.find(p => p.nome === ordemData.peca) || null);
          setStatusSelecionado(todosStatus.find(s => s.nome === ordemData.status) || null);
          setTecnicoSelecionado(tecnicosData?.find(t => t.auth_user_id === ordemData.tecnico_id) || null);
          setTermoSelecionado(ordemData.termo_garantia_id || '');
          setValorServico(parseFloat(ordemData.valor_servico?.toString() || '0'));
          setValorPeca(parseFloat(ordemData.valor_peca?.toString() || '0'));
          setQtdServico(ordemData.qtd_servico || 0);
          setQtdPeca(ordemData.qtd_peca || 0);
          // Carregar valores dos campos adicionais
          setMarca(ordemData.marca || '');
          setModelo(ordemData.modelo || '');
          setCor(ordemData.cor || '');
          setNumeroSerie(ordemData.numero_serie || '');
          setRelato(ordemData.relato || '');
          setObservacao(ordemData.observacao || '');
        }

        // Carregar imagens existentes
        if (ordemData.imagens) {
          const urls = ordemData.imagens.split(',').filter((url: string) => url.trim());
          setImagensExistentes(urls);
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
          const tecnicoEncontrado = tecnicosData.find((t: Tecnico) => t.auth_user_id === ordemData.tecnico_id);
          console.log('Técnico encontrado:', tecnicoEncontrado);
          setTecnicoSelecionado(tecnicoEncontrado || null);
        } else {
          console.log('Nenhum técnico encontrado para:', ordemData.tecnico_id);
          setTecnicoSelecionado(null);
        }

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const calcularTotal = () => {
    const qtdServico = ordem?.qtd_servico || 0;
    const qtdPeca = ordem?.qtd_peca || 0;
    return qtdServico * valorServico + qtdPeca * valorPeca;
  };

  // Filtrar serviços e peças baseado na query
  const servicosFiltrados = servicos?.filter((s: Servico) =>
    s.nome?.toLowerCase().includes(queryServico.toLowerCase())
  ) || [];

  const pecasFiltradas = pecas?.filter((p: Peca) =>
    p.nome?.toLowerCase().includes(queryPeca.toLowerCase())
  ) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleSalvar = async () => {
    addToast('info', '🔄 Salvando ordem de serviço...');
    
    if (!id) {
      addToast('error', '❌ ID da OS não encontrado');
      return;
    }
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      addToast('error', '❌ Erro de autenticação. Faça login novamente.');
      return;
    }
    
    setSaving(true);
    try {
      // Upload das imagens (se houver)
      let urlsImagens = '';
      if (imagens.length > 0) {
        addToast('info', `📸 Enviando ${imagens.length} imagem(ns)...`);
        
        try {
          const imageFormData = new FormData();
          imageFormData.append('ordemId', id);
          imagens.forEach((file) => {
            imageFormData.append('files', file);
          });

          const uploadResult = await fetch('/api/upload', {
            method: 'POST',
            body: imageFormData
          });

          if (uploadResult.ok) {
            const uploadData = await uploadResult.json();
            addToast('success', `✅ ${imagens.length} imagem(ns) enviada(s) com sucesso!`);
            
            // Preparar URLs das imagens para salvar
            urlsImagens = uploadData.files.map((file: { url: string }) => file.url).join(',');
          }
        } catch {
          addToast('error', '❌ Erro ao enviar imagens. Tente novamente.');
        }
      }

      // Combinar imagens existentes com novas imagens
      if (imagensExistentes.length > 0 && urlsImagens) {
        urlsImagens = imagensExistentes.join(',') + ',' + urlsImagens;
      } else if (imagensExistentes.length > 0) {
        urlsImagens = imagensExistentes.join(',');
      }



      // Obter valores dos campos do formulário usando os estados
      const marcaValue = marca || '';
      const modeloValue = modelo || '';
      const corValue = cor || '';
      const numeroSerieValue = numeroSerie || '';
      const relatoValue = relato || '';
      const observacaoValue = observacao || '';
      const qtdServicoValue = qtdServico || 0;
      const qtdPecaValue = qtdPeca || 0;

      // Preparar dados para envio - incluindo todos os campos
      const novoStatus = statusSelecionado?.nome || 'aberta';
      let novoStatusTecnico = ordem?.status_tecnico || '';
      
      // Lógica automática para status técnico
      if (novoStatus === 'APROVADO') {
        novoStatusTecnico = 'APROVADO';
      } else if (novoStatus === 'ENTREGUE') {
        novoStatusTecnico = 'FINALIZADA';
      }
      
      const updateData = {
        servico: servicoSelecionado?.nome || '',
        qtd_servico: qtdServicoValue,
        qtd_peca: qtdPecaValue,
        peca: pecaSelecionada?.nome || '',
        valor_servico: valorServico,
        valor_peca: valorPeca,
        valor_faturado: (qtdServicoValue * valorServico) + (qtdPecaValue * valorPeca),
        status: novoStatus,
        status_tecnico: novoStatusTecnico,
        tecnico_id: tecnicoSelecionado?.auth_user_id || '',
        termo_garantia_id: termoSelecionado || '',
        tecnico: tecnicoSelecionado?.nome || '',
        atendente: 'LUCAS OLIVEIRA', // ou pegar do contexto do usuário logado
        empresa_id: user.user_metadata?.empresa_id,
        // Campo de imagens
        imagens: urlsImagens,
        // Campos adicionais que estavam faltando
        marca: marcaValue,
        modelo: modeloValue,
        cor: corValue,
        numero_serie: numeroSerieValue,
        relato: relatoValue,
        observacao: observacaoValue
      };

      console.log('📤 Enviando dados para atualização:', updateData);
      // Fazer a atualização completa
      const { error } = await supabase
        .from('ordens_servico')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        addToast('error', `❌ Erro ao salvar OS: ${error.message}`);
      } else {
        addToast('success', '✅ OS salva com sucesso!');
        router.push('/ordens');
      }
    } catch (error) {
      addToast('error', `❌ Erro ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedArea area="ordens">
        <MenuLayout>
          <div className="p-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando OS...</p>
              </div>
            </div>
          </div>
        </MenuLayout>
      </ProtectedArea>
    );
  }

  if (!ordem) {
    return (
      <ProtectedArea area="ordens">
        <MenuLayout>
          <div className="p-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 text-lg font-semibold mb-2">OS não encontrada</p>
                <p className="text-gray-600">A ordem de serviço solicitada não foi encontrada.</p>
                <button
                  onClick={() => router.push('/ordens')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Voltar para Ordens
                </button>
              </div>
            </div>
          </div>
        </MenuLayout>
      </ProtectedArea>
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
                    Editar OS #{ordem?.numero_os || 'N/A'}
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
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Confirmar Salvamento',
                    message: 'Deseja salvar as alterações desta ordem de serviço?',
                    confirmText: 'Salvar',
                    cancelText: 'Cancelar'
                  });
                  
                  if (confirmed) {
                    handleSalvar();
                  }
                }}
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
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                    <input
                      name="modelo"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
                    <input
                      name="cor"
                      value={cor}
                      onChange={(e) => setCor(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número de Série</label>
                    <input
                      name="numero_serie"
                      value={numeroSerie}
                      onChange={(e) => setNumeroSerie(e.target.value)}
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
                            {status.map((status) => (
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
                      value={relato}
                      onChange={(e) => setRelato(e.target.value)}
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
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
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
                          displayValue={(s: Servico | null) => s?.nome ? `${s.nome} - ${formatCurrency(s.preco)}` : ''}
                          placeholder="Buscar serviço..."
                          autoComplete="off"
                        />
                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {servicosFiltrados.length === 0 && (
                            <div className="px-3 py-2 text-gray-500">Nenhum serviço encontrado.</div>
                          )}
                          {servicosFiltrados.map((s: Servico) => (
                            <Combobox.Option
                              key={s.id}
                              value={s}
                              className={({ active }) =>
                                `cursor-pointer select-none px-3 py-2 ${
                                  active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                }`
                              }
                            >
                              {s.nome} – {formatCurrency(s.preco || 0)}
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
                      value={qtdServico}
                      onChange={(e) => setQtdServico(parseInt(e.target.value) || 0)}
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
                          displayValue={(p: Peca | null) => p?.nome ? `${p.nome} - ${formatCurrency(p.preco)}` : ''}
                          placeholder="Buscar peça..."
                          autoComplete="off"
                        />
                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {pecasFiltradas.length === 0 && (
                            <div className="px-3 py-2 text-gray-500">Nenhuma peça encontrada.</div>
                          )}
                          {pecasFiltradas.map((p: Peca) => (
                            <Combobox.Option
                              key={p.id}
                              value={p}
                              className={({ active }) =>
                                `cursor-pointer select-none px-3 py-2 ${
                                  active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                }`
                              }
                            >
                              {p.nome} – {formatCurrency(p.preco || 0)}
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
                      value={qtdPeca}
                      onChange={(e) => setQtdPeca(parseInt(e.target.value) || 0)}
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

              {/* Imagens */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiPackage className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Imagens do Equipamento</h2>
                </div>
                
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Fotos do Equipamento</label>
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                      
                      const files = Array.from(e.dataTransfer.files).filter(file => 
                        file.type.startsWith('image/')
                      );
                      
                      if (files.length > 0) {
                        setImagens(prev => [...prev, ...files]);
                        const previews = files.map(file => URL.createObjectURL(file));
                        setPreviewImagens(prev => [...prev, ...previews]);
                      }
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      id="image-upload"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setImagens(prev => [...prev, ...files]);
                        
                        // Criar previews
                        const previews = files.map(file => URL.createObjectURL(file));
                        setPreviewImagens(prev => [...prev, ...previews]);
                      }}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <div className="text-4xl">📷</div>
                        <p className="text-sm text-gray-600">
                          Clique para selecionar imagens ou arraste aqui
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG até 5MB cada • Máximo 10 imagens
                        </p>
                        {imagens.length > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            {imagens.length} imagem{imagens.length !== 1 ? 'ns' : ''} selecionada{imagens.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Imagens existentes */}
                {imagensExistentes.length > 0 && (
                  <div className="space-y-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700">Imagens Existentes</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imagensExistentes.map((url, index) => (
                        <div key={index} className="relative group">
                          <Image
                            src={url}
                            alt={`Imagem ${index + 1}`}
                            width={100}
                            height={100}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                          />
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            Imagem {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview das novas imagens */}
                {previewImagens.length > 0 && (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">Novas Imagens</h4>
                      <button
                        onClick={() => {
                          setImagens([]);
                          setPreviewImagens([]);
                        }}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Limpar todas
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {previewImagens.map((preview, index) => (
                        <div key={index} className="relative group">
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            width={100}
                            height={100}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => {
                                setImagens(prev => prev.filter((_, i) => i !== index));
                                setPreviewImagens(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {imagens[index]?.name?.substring(0, 15)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">💡 Dica</h4>
                  <p className="text-sm text-blue-600">
                    Tire fotos do equipamento para documentar seu estado atual. 
                    Isso ajuda a evitar problemas futuros e facilita a identificação.
                  </p>
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
                      onChange={(e) => setTermoSelecionado(e.target.value || '')}
                    >
                      <option value="">Selecione um termo de garantia (opcional)</option>
                      {termos.map((termo) => (
                        <option key={termo.id} value={termo.id}>
                          {termo.nome}
                        </option>
                      ))}
                    </select>
                    {termos.length === 0 && (
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

"use client";

import MenuLayout from "@/components/MenuLayout";
import ProtectedArea from '@/components/ProtectedArea';
import { Button } from '@/components/Button';
import ReactSelect from 'react-select';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Suspense } from 'react';

const etapas = ["Cliente", "Aparelho", "Técnico", "Status", "Obs.", "Imagens"];

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  celular: string;
  email?: string;
  documento?: string;
  numero_cliente: number;
}



interface Usuario {
  id: string;
  nome: string;
  email: string;
  nivel: string;
  auth_user_id: string;
}

interface Status {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  tipo: string;
  empresa_id?: string;
}

interface ProdutoServico {
  id: string;
  nome: string;
  tipo: string;
  preco: number;
  unidade: string;
}



function NovaOS2Content() {
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [showCadastroCliente, setShowCadastroCliente] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  

  
  // Estado para etapa 2 - Aparelho
  const [dadosEquipamento, setDadosEquipamento] = useState({
    tipo: 'Smartphone',
    marca: 'Samsung',
    modelo: 'Galaxy S21',
    numero_serie: 'SM-G991B/DS',
    descricao_problema: 'Tela quebrada e não carrega',
    observacoes: 'Cliente relatou que caiu no chão e quebrou a tela. Também não está carregando.'
  });


  
  // Estado para etapa 3 - Técnico Responsável
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [tecnicoResponsavel, setTecnicoResponsavel] = useState<string | null>(null);
  
  // Estado para etapa 4 - Status
  const [statusOS, setStatusOS] = useState<Status[]>([]);
  const [statusSelecionado, setStatusSelecionado] = useState<string | null>(null);
  
  // Estado para produtos e serviços aprovados
  const [produtosServicos, setProdutosServicos] = useState<ProdutoServico[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [produtosSelecionados, setProdutosSelecionados] = useState<ProdutoServico[]>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<ProdutoServico[]>([]);
  
  // Dados de teste para produtos e serviços
  const produtosTeste: ProdutoServico[] = [
    { id: '1', nome: 'Tela LCD Samsung Galaxy S21', tipo: 'produto', preco: 450.00, unidade: 'un' },
    { id: '2', nome: 'Bateria Original Samsung', tipo: 'produto', preco: 120.00, unidade: 'un' },
    { id: '3', nome: 'Cabo USB-C Original', tipo: 'produto', preco: 35.00, unidade: 'un' }
  ];
  
  const servicosTeste: ProdutoServico[] = [
    { id: '4', nome: 'Troca de Tela', tipo: 'servico', preco: 80.00, unidade: 'un' },
    { id: '5', nome: 'Diagnóstico de Hardware', tipo: 'servico', preco: 50.00, unidade: 'un' },
    { id: '6', nome: 'Limpeza Interna', tipo: 'servico', preco: 30.00, unidade: 'un' }
  ];
  
  // Estado para etapa 5 - Observações
  const [observacoes, setObservacoes] = useState('Equipamento com tela trincada e problema de carregamento. Cliente deixou carregador e cabo USB. Precisa de orçamento para troca da tela e verificação da placa.');
  const [condicoesEquipamento, setCondicoesEquipamento] = useState('Tela trincada, bordas amassadas, não carrega, mas liga');
  
  // Estado para etapa 6 - Imagens
  const [imagens, setImagens] = useState<File[]>([]);
  const [previewImagens, setPreviewImagens] = useState<string[]>([]);
  
  // Estado de loading
  const [salvando, setSalvando] = useState(false);
  
  const router = useRouter();
  const { empresaData, usuarioData } = useAuth();
  const searchParams = useSearchParams();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ nome: string; whatsapp: string; cpf: string; numero_reserva?: string; email?: string }>();


  useEffect(() => {
    async function fetchClientes() {
      if (!empresaData?.id) return;
      setLoadingClientes(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, celular, email, documento, numero_cliente')
        .eq('empresa_id', empresaData.id);
      if (!error && data) {
        setClientes(data);
        
        // Verificar se há clienteId na URL para selecionar automaticamente
        const clienteIdFromURL = searchParams.get('clienteId');
        console.log('ClienteId da URL:', clienteIdFromURL);
        if (clienteIdFromURL && clienteIdFromURL !== 'null' && data.find(c => c.id === clienteIdFromURL)) {
          console.log('Selecionando cliente:', clienteIdFromURL);
          setClienteSelecionado(clienteIdFromURL);
        }
      }
      setLoadingClientes(false);
    }
    fetchClientes();
  }, [empresaData?.id, searchParams]);

  useEffect(() => {
    async function fetchUsuarios() {
      if (!empresaData?.id) return;
      setLoadingUsuarios(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, nivel, auth_user_id')
        .eq('empresa_id', empresaData.id)
        .order('nome', { ascending: true });
      
      if (!error && data) {
        setUsuarios(data);
        setTecnicos(data.filter(u => u.nivel === 'tecnico'));
        
        // Auto-atribuir baseado no usuário logado
        if (usuarioData) {
          const usuarioLogado = data.find(u => u.auth_user_id === usuarioData.auth_user_id);
          if (usuarioLogado && usuarioLogado.nivel === 'tecnico') {
            setTecnicoResponsavel(usuarioLogado.auth_user_id);
          }
        }
      }
      setLoadingUsuarios(false);
    }
    fetchUsuarios();
  }, [empresaData?.id, usuarioData]);

  useEffect(() => {
    async function fetchStatus() {
      if (!empresaData?.id) return;
      
      // Status essenciais para nova OS
      const statusEssenciais: Status[] = [
        {
          id: 'orcamento',
          nome: 'Aguardando Orçamento',
          cor: '#f59e0b',
          ordem: 1,
          tipo: 'os',
          empresa_id: undefined
        },
        {
          id: 'aprovado',
          nome: 'Valor Aprovado',
          cor: '#10b981',
          ordem: 2,
          tipo: 'os',
          empresa_id: undefined
        }
      ];
      
      setStatusOS(statusEssenciais);
      setStatusSelecionado('orcamento'); // Padrão: Aguardando Orçamento
      
      // Para teste: pré-selecionar alguns produtos e serviços
      setProdutosSelecionados([produtosTeste[0]]); // Tela LCD
      setServicosSelecionados([servicosTeste[0], servicosTeste[1]]); // Troca de Tela + Diagnóstico
    }
    fetchStatus();
  }, [empresaData?.id]);

  useEffect(() => {
    async function fetchProdutosServicos() {
      if (!empresaData?.id) return;
      setLoadingProdutos(true);
      
      const { data, error } = await supabase
        .from('produtos_servicos')
        .select('id, nome, tipo, preco, unidade')
        .eq('empresa_id', empresaData.id)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      if (!error && data && data.length > 0) {
        setProdutosServicos(data);
      } else {
        // Usar dados de teste se não houver dados no banco
        setProdutosServicos([...produtosTeste, ...servicosTeste]);
      }
      setLoadingProdutos(false);
    }
    fetchProdutosServicos();
  }, [empresaData?.id]);



  async function onCadastrarCliente(data: { nome: string; whatsapp: string; cpf: string; numero_reserva?: string; email?: string }) {
    if (!empresaData?.id) {
      alert('Empresa não encontrada!');
      return;
    }

    setCadastrando(true);
    
    // Buscar próximo número de cliente
    const { data: maxResult } = await supabase
      .from('clientes')
      .select('numero_cliente')
      .eq('empresa_id', empresaData.id)
      .order('numero_cliente', { ascending: false })
      .limit(1)
      .single();

    const proximoNumero = maxResult?.numero_cliente ? maxResult.numero_cliente + 1 : 1;

    const clientePayload = {
      empresa_id: empresaData.id,
      nome: data.nome,
      telefone: data.whatsapp,
      celular: data.whatsapp,
      email: data.email || '',
      documento: data.cpf,
      numero_cliente: proximoNumero,
      data_cadastro: new Date().toISOString(),
      status: 'ativo',
      tipo: 'pf'
    };

    const { data: novo, error } = await supabase.from('clientes').insert(clientePayload).select().single();
    setCadastrando(false);
    
    if (error || !novo) {
      console.error('Erro ao cadastrar:', error);
      alert('Erro ao cadastrar cliente!');
      return;
    }
    
    setClientes(prev => [...prev, novo]);
    setClienteSelecionado(novo.id);
    setShowCadastroCliente(false);
    reset();
  }



  function proximaEtapa() {
    if (etapaAtual < etapas.length) {
      setEtapaAtual(etapaAtual + 1);
    }
  }

  function etapaAnterior() {
    if (etapaAtual > 1) {
      setEtapaAtual(etapaAtual - 1);
    }
  }

  // Função para verificar se o formulário está completo
  function formularioCompleto() {
    return clienteSelecionado && 
           dadosEquipamento.tipo && 
           dadosEquipamento.marca && 
           dadosEquipamento.modelo &&
           tecnicoResponsavel &&
           statusSelecionado;
  }

  async function finalizarOS() {
    // Validar se todos os campos obrigatórios estão preenchidos
    if (!clienteSelecionado) {
      alert('Selecione um cliente');
      return;
    }
    
    if (!dadosEquipamento.tipo || !dadosEquipamento.marca || !dadosEquipamento.modelo) {
      alert('Preencha os dados do equipamento');
      return;
    }
    
    if (!tecnicoResponsavel) {
      alert('Selecione um técnico responsável');
      return;
    }
    
    if (!statusSelecionado) {
      alert('Selecione um status');
      return;
    }

    setSalvando(true);

    try {
      // Buscar dados do técnico selecionado
      const tecnicoSelecionado = tecnicos.find(t => t.auth_user_id === tecnicoResponsavel);
      
      // Preparar dados da OS para salvar no banco
      const dadosOS = {
        cliente_id: clienteSelecionado,
        tecnico_id: tecnicoResponsavel,
        status: statusSelecionado,
        categoria: dadosEquipamento.tipo,
        marca: dadosEquipamento.marca,
        modelo: dadosEquipamento.modelo,
        numero_serie: dadosEquipamento.numero_serie,
        relato: dadosEquipamento.descricao_problema,
        observacao: observacoes,
        empresa_id: empresaData?.id,
        atendente: usuarioData?.nome || 'Usuário Logado',
        tecnico: tecnicoSelecionado?.nome || 'Técnico Selecionado',
        acessorios: "Carregador original Samsung, cabo USB-C, capa protetora",
        condicoes_equipamento: condicoesEquipamento,
        data_cadastro: new Date().toISOString()
      };

      console.log('Salvando OS no banco:', dadosOS);

      // Salvar a OS usando a API route (contorna RLS)
      const response = await fetch('/api/ordens/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosOS)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Erro ao salvar OS:', result.error);
        alert('Erro ao criar a Ordem de Serviço: ' + result.error);
        return;
      }

      const osData = result.data;

      console.log('OS criada com sucesso:', osData);

      // Se há produtos/serviços selecionados, atualizar a OS com os dados
      if (statusSelecionado === 'aprovado' && (produtosSelecionados.length > 0 || servicosSelecionados.length > 0)) {
        const servicos = servicosSelecionados.map(s => s.nome).join(', ');
        const pecas = produtosSelecionados.map(p => p.nome).join(', ');
        const qtdServico = servicosSelecionados.length;
        const qtdPeca = produtosSelecionados.length;
        const valorServico = servicosSelecionados.reduce((total, s) => total + s.preco, 0);
        const valorPeca = produtosSelecionados.reduce((total, p) => total + p.preco, 0);
        const valorFaturado = valorServico + valorPeca;

        // Atualizar a OS com os dados dos produtos/serviços
        const { error: updateError } = await supabase
          .from('ordens_servico')
          .update({
            servico: servicos || null,
            qtd_servico: qtdServico,
            peca: pecas || null,
            qtd_peca: qtdPeca,
            valor_servico: valorServico,
            valor_peca: valorPeca,
            valor_faturado: valorFaturado
          })
          .eq('id', osData.id);

        if (updateError) {
          console.error('Erro ao atualizar dados dos produtos/serviços:', updateError);
        }
      }

      // Upload das imagens (se houver)
      if (imagens.length > 0) {
        console.log('Imagens selecionadas:', imagens.length, 'arquivos');
        // TODO: Implementar upload de imagens quando o bucket estiver configurado
      }

      alert('Ordem de Serviço criada com sucesso!');
      
      // Redirecionar para visualizar a OS criada
      router.push(`/ordens/${osData.id}`);

    } catch (error) {
      console.error('Erro geral ao finalizar OS:', error);
      alert('Erro inesperado ao criar a Ordem de Serviço');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <MenuLayout>
      <ProtectedArea area="ordens">
        <div className="max-w-4xl mx-auto py-10">
          {/* Cabeçalho */}
          <div className="w-full text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Nova Ordem de Serviço</h1>
            <div className="text-gray-500 text-base font-medium">
              Etapa {etapaAtual} de {etapas.length} — <span className="font-semibold">{etapas[etapaAtual-1]}</span>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div className="bg-black h-2 rounded-full transition-all duration-300" style={{ width: `${(etapaAtual/etapas.length)*100}%` }} />
          </div>

          {/* Etapas */}
          <div className="flex items-center justify-between w-full mb-8 gap-4">
            {etapas.map((label, idx) => (
              <div key={label} className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 ${
                  etapaAtual === idx+1 ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                } font-bold`}>
                  {idx + 1}
                </div>
                <span className="text-xs mt-2 text-center font-medium text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          {/* Card/Container da etapa */}
          <div className="bg-white rounded-xl border border-gray-200 shadow p-8 mb-8 min-h-[200px] flex flex-col items-center justify-center">
            {etapaAtual === 1 && (
              <div className="w-full max-w-md mx-auto flex flex-col gap-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o cliente</label>
                <ReactSelect
                  options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                  value={clientes.find(c => c.id === clienteSelecionado) ? { value: clienteSelecionado, label: clientes.find(c => c.id === clienteSelecionado)?.nome || "" } : null}
                  onChange={opt => setClienteSelecionado(opt?.value || null)}
                  isLoading={loadingClientes}
                  placeholder={loadingClientes ? "Carregando clientes..." : "Buscar cliente..."}
                  className="mb-4"
                  styles={{
                    control: (provided) => ({
                      ...provided,
                      borderRadius: '0.5rem',
                      borderColor: '#e5e7eb',
                      minHeight: '44px',
                      fontSize: '1rem',
                      boxShadow: 'none',
                      ':hover': { borderColor: '#3b82f6' }
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isSelected
                        ? '#111827'
                        : state.isFocused
                        ? '#e0e7ef'
                        : 'white',
                      color: state.isSelected ? 'white' : '#111827',
                      fontSize: '1rem',
                    }),
                  }}
                />
                <Button variant="secondary" className="w-full" onClick={() => setShowCadastroCliente(true)}>Cadastrar novo cliente</Button>
                {showCadastroCliente && (
                  <form className="bg-gray-50 border border-gray-200 rounded-xl p-6 mt-4 flex flex-col gap-4" onSubmit={handleSubmit(onCadastrarCliente)}>
                    <div>
                      <input
                        type="text"
                        placeholder="Nome completo"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        {...register("nome", { required: true })}
                      />
                      {errors.nome && <span className="text-red-500 text-xs">Nome obrigatório</span>}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="WhatsApp"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        {...register("whatsapp", { required: true })}
                      />
                      {errors.whatsapp && <span className="text-red-500 text-xs">WhatsApp obrigatório</span>}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="CPF"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        {...register("cpf", { required: true })}
                      />
                      {errors.cpf && <span className="text-red-500 text-xs">CPF obrigatório</span>}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Número reserva (opcional)"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        {...register("numero_reserva")}
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="E-mail (opcional)"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        {...register("email")}
                      />
                    </div>
                    <div className="flex gap-2 justify-between mt-2">
                      <Button type="button" variant="secondary" onClick={() => { setShowCadastroCliente(false); reset(); }}>Cancelar</Button>
                      <Button type="button" variant="ghost" onClick={() => router.push('/clientes/novo?returnToOS=true')}>Cadastro completo</Button>
                      <Button type="submit" variant="default" disabled={cadastrando}>{cadastrando ? 'Salvando...' : 'Salvar'}</Button>
                    </div>
                  </form>
                )}
              </div>
            )}



            {etapaAtual === 2 && (
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Dados do Equipamento</h3>
                
                {/* Dados do equipamento */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Informações do equipamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de equipamento</label>
                      <input
                        type="text"
                        placeholder="Ex: Smartphone, Notebook, etc."
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={dadosEquipamento.tipo}
                        onChange={(e) => setDadosEquipamento(prev => ({ ...prev, tipo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                      <input
                        type="text"
                        placeholder="Ex: Samsung, Apple, etc."
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={dadosEquipamento.marca}
                        onChange={(e) => setDadosEquipamento(prev => ({ ...prev, marca: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                      <input
                        type="text"
                        placeholder="Ex: Galaxy S21, iPhone 13, etc."
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={dadosEquipamento.modelo}
                        onChange={(e) => setDadosEquipamento(prev => ({ ...prev, modelo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número de série</label>
                      <input
                        type="text"
                        placeholder="Número de série do equipamento"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={dadosEquipamento.numero_serie}
                        onChange={(e) => setDadosEquipamento(prev => ({ ...prev, numero_serie: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do problema</label>
                    <textarea
                      placeholder="Descreva o problema apresentado pelo equipamento..."
                      className="w-full border border-gray-300 rounded px-3 py-2 h-24 resize-none"
                      value={dadosEquipamento.descricao_problema}
                      onChange={(e) => setDadosEquipamento(prev => ({ ...prev, descricao_problema: e.target.value }))}
                    />
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observações adicionais</label>
                    <textarea
                      placeholder="Observações, acessórios, etc..."
                      className="w-full border border-gray-300 rounded px-3 py-2 h-20 resize-none"
                      value={dadosEquipamento.observacoes}
                      onChange={(e) => setDadosEquipamento(prev => ({ ...prev, observacoes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {etapaAtual === 3 && (
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Técnico Responsável</h3>
                
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Selecione o Técnico Responsável</label>
                  <ReactSelect
                    options={tecnicos.map(tecnico => ({ 
                      value: tecnico.auth_user_id, 
                      label: tecnico.nome 
                    }))}
                    value={tecnicoResponsavel ? { 
                      value: tecnicoResponsavel, 
                      label: tecnicos.find(t => t.auth_user_id === tecnicoResponsavel)?.nome || '' 
                    } : null}
                    onChange={(option) => setTecnicoResponsavel(option?.value || null)}
                    isLoading={loadingUsuarios}
                    placeholder={loadingUsuarios ? "Carregando técnicos..." : "Selecione o técnico..."}
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        borderRadius: '0.5rem',
                        borderColor: '#e5e7eb',
                        minHeight: '44px',
                        fontSize: '1rem',
                        boxShadow: 'none',
                        ':hover': { borderColor: '#3b82f6' }
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isSelected
                          ? '#111827'
                          : state.isFocused
                          ? '#e0e7ef'
                          : 'white',
                        color: state.isSelected ? 'white' : '#111827',
                        fontSize: '1rem',
                      }),
                    }}
                  />
                </div>

                {tecnicoResponsavel && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Técnico Selecionado</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {tecnicos.find(t => t.auth_user_id === tecnicoResponsavel)?.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {tecnicos.find(t => t.auth_user_id === tecnicoResponsavel)?.nome}
                        </p>
                        <p className="text-xs text-gray-500">
                          Técnico responsável pela execução
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {etapaAtual === 4 && (
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Status da Ordem de Serviço</h3>
                
                {/* Seleção de Status */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Entrada</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {statusOS.map((status) => (
                      <div 
                        key={status.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          statusSelecionado === status.id 
                            ? 'border-black bg-gray-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setStatusSelecionado(status.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: status.cor }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-700">{status.nome}</p>
                            <p className="text-xs text-gray-500">
                              {status.id === 'orcamento' 
                                ? 'Cliente deixou para orçamento' 
                                : 'Cliente já aprovou o valor'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Informações do Status Selecionado */}
                {statusSelecionado && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Status Selecionado</h4>
                    {(() => {
                      const status = statusOS.find(s => s.id === statusSelecionado);
                      if (!status) return null;
                      
                      return (
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: status.cor }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-700">{status.nome}</p>
                            <p className="text-xs text-gray-500">
                              {status.id === 'orcamento' 
                                ? 'Será necessário fazer orçamento posteriormente' 
                                : 'OS pode prosseguir para execução'}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Campos para produtos e serviços quando valor aprovado */}
                {statusSelecionado === 'aprovado' && (
                  <div className="space-y-6">
                    <div className="border-t pt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-4">Produtos e Serviços Aprovados</h4>
                      
                      {/* Seleção de Produtos */}
                      <div className="space-y-4 mb-6">
                        <label className="block text-sm font-medium text-gray-700">Produtos</label>
                        <ReactSelect
                          isMulti
                          options={produtosServicos.filter(p => p.tipo === 'produto').map(p => ({ 
                            value: p.id, 
                            label: `${p.nome} - R$ ${p.preco.toFixed(2)}/${p.unidade}`,
                            data: p 
                          }))}
                          value={produtosSelecionados.map(p => ({ 
                            value: p.id, 
                            label: `${p.nome} - R$ ${p.preco.toFixed(2)}/${p.unidade}`,
                            data: p 
                          }))}
                          onChange={(options) => {
                            const selected = options ? options.map(opt => opt.data) : [];
                            setProdutosSelecionados(selected);
                          }}
                          isLoading={loadingProdutos}
                          placeholder={loadingProdutos ? "Carregando produtos..." : "Selecione os produtos..."}
                          styles={{
                            control: (provided) => ({
                              ...provided,
                              borderRadius: '0.5rem',
                              borderColor: '#e5e7eb',
                              minHeight: '44px',
                              fontSize: '1rem',
                              boxShadow: 'none',
                              ':hover': { borderColor: '#3b82f6' }
                            }),
                            option: (provided, state) => ({
                              ...provided,
                              backgroundColor: state.isSelected
                                ? '#111827'
                                : state.isFocused
                                ? '#e0e7ef'
                                : 'white',
                              color: state.isSelected ? 'white' : '#111827',
                              fontSize: '1rem',
                            }),
                          }}
                        />
                      </div>

                      {/* Seleção de Serviços */}
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">Serviços</label>
                        <ReactSelect
                          isMulti
                          options={produtosServicos.filter(s => s.tipo === 'servico').map(s => ({ 
                            value: s.id, 
                            label: `${s.nome} - R$ ${s.preco.toFixed(2)}`,
                            data: s 
                          }))}
                          value={servicosSelecionados.map(s => ({ 
                            value: s.id, 
                            label: `${s.nome} - R$ ${s.preco.toFixed(2)}`,
                            data: s 
                          }))}
                          onChange={(options) => {
                            const selected = options ? options.map(opt => opt.data) : [];
                            setServicosSelecionados(selected);
                          }}
                          isLoading={loadingProdutos}
                          placeholder={loadingProdutos ? "Carregando serviços..." : "Selecione os serviços..."}
                          styles={{
                            control: (provided) => ({
                              ...provided,
                              borderRadius: '0.5rem',
                              borderColor: '#e5e7eb',
                              minHeight: '44px',
                              fontSize: '1rem',
                              boxShadow: 'none',
                              ':hover': { borderColor: '#3b82f6' }
                            }),
                            option: (provided, state) => ({
                              ...provided,
                              backgroundColor: state.isSelected
                                ? '#111827'
                                : state.isFocused
                                ? '#e0e7ef'
                                : 'white',
                              color: state.isSelected ? 'white' : '#111827',
                              fontSize: '1rem',
                            }),
                          }}
                        />
                      </div>

                      {/* Resumo dos itens selecionados */}
                      {(produtosSelecionados.length > 0 || servicosSelecionados.length > 0) && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h5 className="text-sm font-medium text-blue-700 mb-2">Itens Selecionados</h5>
                          <div className="space-y-2">
                            {produtosSelecionados.map(produto => (
                              <div key={produto.id} className="flex justify-between text-sm">
                                <span className="text-gray-700">📦 {produto.nome}</span>
                                <span className="text-gray-600">R$ {produto.preco.toFixed(2)}/{produto.unidade}</span>
                              </div>
                            ))}
                            {servicosSelecionados.map(servico => (
                              <div key={servico.id} className="flex justify-between text-sm">
                                <span className="text-gray-700">🔧 {servico.nome}</span>
                                <span className="text-gray-600">R$ {servico.preco.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2">
                              <div className="flex justify-between text-sm font-medium">
                                <span className="text-blue-700">Total:</span>
                                <span className="text-blue-700">
                                  R$ {(
                                    produtosSelecionados.reduce((sum, p) => sum + p.preco, 0) +
                                    servicosSelecionados.reduce((sum, s) => sum + s.preco, 0)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {etapaAtual === 5 && (
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Observações</h3>
                
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Observações da Ordem de Serviço</label>
                  <textarea
                    placeholder="Digite observações importantes sobre o equipamento, problema, acessórios, etc..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Descreva detalhes importantes como: acessórios que acompanham, condições especiais, 
                    observações do cliente, etc.
                  </p>
                </div>

                {/* Campos adicionais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Acessórios</label>
                    <textarea
                      placeholder="Carregador, cabo, capa, etc..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none"
                      value="Carregador original Samsung, cabo USB-C, capa protetora"
                      onChange={(e) => setDadosEquipamento(prev => ({ ...prev, observacoes: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Condições do Equipamento</label>
                    <textarea
                      placeholder="Riscos, amassados, funcionando, etc..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20 resize-none"
                      value={condicoesEquipamento}
                      onChange={(e) => setCondicoesEquipamento(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {etapaAtual === 6 && (
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Imagens do Equipamento</h3>
                
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Fotos do Equipamento</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      id="image-upload"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setImagens(files);
                        
                        // Criar previews
                        const previews = files.map(file => URL.createObjectURL(file));
                        setPreviewImagens(previews);
                      }}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <div className="text-4xl">📷</div>
                        <p className="text-sm text-gray-600">
                          Clique para selecionar imagens ou arraste aqui
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG até 5MB cada
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Preview das imagens */}
                {previewImagens.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">Imagens Selecionadas</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {previewImagens.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => {
                              setImagens(prev => prev.filter((_, i) => i !== index));
                              setPreviewImagens(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">💡 Dica</h4>
                  <p className="text-sm text-blue-600">
                    Tire fotos do equipamento para documentar seu estado atual. 
                    Isso ajuda a evitar problemas futuros e facilita a identificação.
                  </p>
                </div>
              </div>
            )}

            {etapaAtual > 6 && (
              <div className="text-center text-gray-500">
                <p>Etapa {etapaAtual} em desenvolvimento...</p>
              </div>
            )}
          </div>

          {/* Botões de navegação */}
          <div className="flex justify-between">
            <Button 
              variant="secondary" 
              onClick={etapaAnterior}
              disabled={etapaAtual === 1}
            >
              Anterior
            </Button>
            <Button 
              variant="default" 
              onClick={etapaAtual === etapas.length ? finalizarOS : proximaEtapa}
              disabled={etapaAtual === etapas.length && (!formularioCompleto() || salvando)}
              className={etapaAtual === etapas.length && formularioCompleto() ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {etapaAtual === etapas.length ? (salvando ? 'Salvando...' : 'Finalizar') : 'Próxima'}
            </Button>
          </div>
        </div>
      </ProtectedArea>
    </MenuLayout>
  );
}

export default function NovaOS2Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NovaOS2Content />
    </Suspense>
  );
} 
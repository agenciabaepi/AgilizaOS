'use client';

import MenuLayout from "@/components/MenuLayout";

import Image from 'next/image';

function BarraDeProgresso({ etapaAtual, total }: { etapaAtual: number; total: number }) {
  const porcentagem = (etapaAtual / total) * 100;
  const corProgresso = etapaAtual === total ? 'bg-green-500' : 'bg-blue-600';
  return (
    <div className="mb-6">
      <div className="text-sm font-medium text-gray-600 text-center mb-1">
        Etapa {etapaAtual} de {total} — {Math.round(porcentagem)}% concluído
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${corProgresso} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${porcentagem}%` }}
        />
      </div>
    </div>
  );
}

import { supabase } from "@/lib/supabaseClient";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import { components, SingleValue } from 'react-select';
import { SingleValueProps } from 'react-select';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, UserCircle, DeviceMobileCamera, UsersThree, ClipboardText, NotePencil } from 'phosphor-react';
import { Image as IconImage } from 'phosphor-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Cleave from 'cleave.js/react';
import Lottie from 'lottie-react';
import checkmarkAnimation from '@/assets/animations/checkmark.json';
import errorAnimation from '@/assets/animations/error.json';
// Custom SingleValue for react-select to show animated checkmark at right
const CustomSingleValue = (props: SingleValueProps<any>) => (
  <components.SingleValue {...props}>
    <div className="flex items-center justify-between w-full">
      <span>{props.data.label}</span>
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
        <Lottie animationData={checkmarkAnimation} loop={false} />
      </div>
    </div>
  </components.SingleValue>
);
import '@/styles/animations.css'; // precisa existir esse CSS

export default function NovaOSPage() {
  // Etapa da navegação
  const [etapaAtual, setEtapaAtual] = useState<number>(1);
  const [showModal, setShowModal] = useState(false);
  const [showResumoModal, setShowResumoModal] = useState(false);
  const [status, setStatus] = useState("analise");
  const [servicoSelecionado, setServicoSelecionado] = useState("");
  const [pecaSelecionada, setPecaSelecionada] = useState('');
  const [qtdPecaAdicionar, setQtdPecaAdicionar] = useState(1);
  // Estado para clientes e cliente selecionado
  interface Cliente {
    id: string;
    nome: string;
    telefone: string;
    celular?: string;
    email?: string;
    documento?: string;
    cep?: string;
    origem?: string;
    cadastrado_por?: string;
  }
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Estados para animação de campos e preview de imagens
  const [modelo, setModelo] = useState(""); // Modelo como string
  const [numeroSerie, setNumeroSerie] = useState("");
  const [cor, setCor] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [atendente, setAtendente] = useState("");
  const [relato, setRelato] = useState("");
  const [observacao, setObservacao] = useState("");
  const [previewEntrada, setPreviewEntrada] = useState<string | null>(null);
  const [previewSaida, setPreviewSaida] = useState<string | null>(null);
  // Técnicos
  const [tecnicos, setTecnicos] = useState<{ id: string; nome: string }[]>([]);
  // Serviços adicionados
  const [servicosAdicionados, setServicosAdicionados] = useState<
    { id: string; nome: string; valor: number; quantidade: number }[]
  >([]);
  // Peças adicionadas
  const [pecasAdicionadas, setPecasAdicionadas] = useState<any[]>([]);
  // Termo de Garantia
  const [termoGarantia, setTermoGarantia] = useState('');

  // Estados para categorias, marcas e modelos de equipamentos
  const [categoriasEquip, setCategoriasEquip] = useState<{ id: string; nome: string }[]>([]);
  const [categoriaEquip, setCategoriaEquip] = useState('');
  const [marcasEquip, setMarcasEquip] = useState<{ id: string; nome: string }[]>([]);
  const [marcaSelecionada, setMarcaSelecionada] = useState('');
  const [modelosEquip, setModelosEquip] = useState<{ id: string; nome: string }[]>([]);

  const router = useRouter();

  // Buscar clientes e equipamentos ao montar
  useEffect(() => {
    async function fetchClientes() {
      setIsLoading(true);
      const { data, error } = await supabase.from('clientes').select('*');
      if (!error && data) setClientes(data);
      setIsLoading(false);
    }
    async function fetchEquipamentos() {
      const { data: categoriasData } = await supabase.from("categorias").select("*");
      const { data: marcasData } = await supabase.from("marcas").select("*");
      const { data: modelosData } = await supabase.from("modelos").select("*");
      if (categoriasData) setCategoriasEquip(categoriasData);
      if (marcasData) setMarcasEquip(marcasData);
      if (modelosData) setModelosEquip(modelosData);
    }
    async function fetchTecnicos() {
      const { data } = await supabase.from("tecnicos").select("id, nome");
      if (data) setTecnicos(data);
    }
    fetchClientes();
    fetchEquipamentos();
    fetchTecnicos();
  }, []);

  // Função para validar UUID
  function isValidUUID(uuid: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid);
  }

  // Estado para armazenar a data de entrega selecionada
  // Removido campos de data de entrega e vencimento de garantia

  // Função para submissão do formulário principal de Nova OS
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    if (!clienteSelecionado) {
      toast.error("Selecione um cliente!");
      setIsLoading(false);
      return;
    }
    try {
      // Nova lógica: busca usuário autenticado e empresa, faz insert amarrando empresa_id
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Erro ao obter usuário:", userError);
        setIsLoading(false);
        return;
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("id")
        .eq("user_id", userData?.user?.id)
        .single();

      if (empresaError || !empresaData) {
        console.error("Erro ao buscar empresa:", empresaError);
        setIsLoading(false);
        return;
      }

      const empresa_id = empresaData.id;
      // Variáveis de estado adicionais
      // Definições para garantir que os campos estejam definidos
      // Para campos de serviço e peça, vamos considerar apenas o primeiro serviço/peça adicionado para simplificação (ajuste conforme sua lógica)
      const aparelho = modelo || null;
      const categoria = categoriaEquip || null;
      const marca = marcaSelecionada || null;
      const modeloAparelho = modelo || null;
      const corAparelho = cor || null;
      const numero_serie = numeroSerie || null;
      // Para serviços e peças: pegar o primeiro ou null
      const servico = servicosAdicionados.length > 0 ? servicosAdicionados[0].nome : null;
      const qtd_servico = servicosAdicionados.length > 0 ? servicosAdicionados[0].quantidade : null;
      const valor_servico = servicosAdicionados.length > 0 ? servicosAdicionados[0].valor : null;
      const peca = pecasAdicionadas.length > 0 ? pecasAdicionadas[0].nome : null;
      const qtd_peca = pecasAdicionadas.length > 0 ? pecasAdicionadas[0].quantidade : null;
      const valor_peca = pecasAdicionadas.length > 0 && pecas[pecasAdicionadas[0].id] ? pecas[pecasAdicionadas[0].id].preco : null;
      // Totais
      const valorFaturado =
        servicosAdicionados.reduce((acc, s) => acc + (s.valor * (s.quantidade || 1)), 0) +
        pecasAdicionadas.reduce((acc, peca) => acc + (pecas[peca.id]?.preco * peca.quantidade), 0);
      // Desconto (não implementado no seu código, ajuste se precisar)
      const desconto = null;
      // Data de entrega e vencimento de garantia (não implementados, ajuste se necessário)
      const dataEntrega = null;
      const vencimentoGarantia = null;

      // Adicione console.log para depuração dos valores enviados
      console.log('Valores enviados para OS:', {
        empresa_id,
        cliente_id: clienteSelecionado?.id,
        tecnico_id: tecnico || null,
        status: status || "pendente",
        aparelho,
        atendente: atendente || null,
        tecnico: tecnico || null,
        categoria,
        marca,
        modelo: modeloAparelho,
        cor: corAparelho,
        numero_serie,
        servico,
        qtd_servico,
        peca,
        qtd_peca,
        termo_garantia: termoGarantia,
        relato: relato || null,
        observacao: observacao || null,
        data_cadastro: new Date(),
        numero_os: null,
        data_entrega: dataEntrega,
        vencimento_garantia: vencimentoGarantia,
        valor_peca,
        valor_servico,
        desconto,
        valor_faturado: valorFaturado || null,
      });

      const { error: insertError } = await supabase.from("ordens_servico").insert([
        {
          empresa_id,
          cliente_id: clienteSelecionado?.id,
          tecnico_id: tecnico || null,
          status: status || "pendente",
          atendente: atendente || null,
          tecnico: tecnico || null,
          categoria,
          marca,
          modelo: modeloAparelho,
          cor: corAparelho,
          numero_serie,
          servico,
          qtd_servico,
          peca,
          qtd_peca,
          termo_garantia: termoGarantia,
          relato: relato || null,
          observacao: observacao || null,
          data_cadastro: new Date(),
          numero_os: null, // será gerado automaticamente pelo trigger
          data_entrega: dataEntrega,
          vencimento_garantia: vencimentoGarantia,
          valor_peca,
          valor_servico,
          desconto,
          valor_faturado: valorFaturado || null,
        }
      ]);

      if (insertError) {
        console.error("❌ Erro ao inserir OS:", insertError.message, insertError.details, insertError.hint);
        toast.error("Erro ao cadastrar OS: " + insertError.message);
      } else {
        console.log("✅ OS inserida com sucesso.");
        toast.success("Ordem de Serviço cadastrada com sucesso!");
        setTimeout(() => {
          router.push("/dashboard/ordens");
        }, 1200);
      }
    } catch (err: any) {
      console.error("Erro ao inserir OS:", err);
      toast.error(`Erro ao cadastrar OS: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Função para cadastro rápido de cliente (modal)
  async function handleFastRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const nome = String(formData.get("nome") || "").trim();
    const telefone = String(formData.get("telefone") || "").trim();
    const celular = String(formData.get("celular") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const documento = String(formData.get("documento") || "").trim();
    const cep = String(formData.get("cep") || "").trim();
    const origem = String(formData.get("origem") || "");
    const cadastradoPor = String(formData.get("cadastradoPor") || "");
    if (!nome || !telefone || !origem || !cadastradoPor) {
      toast.error("Preencha todos os campos obrigatórios!");
      setIsLoading(false);
      return;
    }
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error("Erro ao obter usuário autenticado");
      const userId = userData?.user?.id;
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .select("id")
        .eq("user_id", userId)
        .single();
      if (empresaError) throw new Error("Erro ao obter dados da empresa");
      const empresa_id = empresaData?.id;
      // Buscar último número_cliente para a empresa
      const { data: lastClient, error: numeroError } = await supabase
        .from('clientes')
        .select('numero_cliente')
        .eq('empresa_id', empresa_id)
        .order('numero_cliente', { ascending: false })
        .limit(1);
      if (numeroError) throw numeroError;
      const proximoNumero = lastClient?.[0]?.numero_cliente ? lastClient[0].numero_cliente + 1 : 1;
      const { data: insertedCliente, error: insertError } = await supabase
        .from("clientes")
        .insert({
          empresa_id,
          nome,
          telefone,
          celular,
          email,
          documento,
          cep,
          origem,
          cadastrado_por: cadastradoPor,
          data_cadastro: new Date().toISOString(),
          numero_cliente: proximoNumero
        })
        .select()
        .single();
      if (insertError) throw insertError;
      toast.success("Cliente cadastrado com sucesso!");
      setShowModal(false);
      // Atualiza lista de clientes com o novo
      setClientes((prev) => [...prev, insertedCliente]);
      // Define automaticamente como selecionado o cliente recém cadastrado
      setClienteSelecionado(insertedCliente);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao cadastrar cliente: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const servicos: Record<string, { nome: string; preco: number }> = {
    formatacao: { nome: "Formatação", preco: 80 },
    troca_tela: { nome: "Troca de Tela", preco: 200 },
  };

  const pecas: Record<string, { nome: string; preco: number }> = {
    bateria: { nome: "Bateria", preco: 120 },
    tela_iphone: { nome: "Tela iPhone", preco: 350 },
  };

  // Remove estados e lógica de serviços, peças e descontos

  // Handler para adicionar serviço à lista
  function handleAdicionarServico() {
    if (!servicoSelecionado) {
      toast.error("Selecione um serviço!");
      return;
    }
    const servicoObj = servicos[servicoSelecionado];
    if (!servicoObj) {
      toast.error("Serviço inválido!");
      return;
    }
    // Evita adicionar duplicado
    if (servicosAdicionados.some(s => s.id === servicoSelecionado)) {
      toast.error("Serviço já adicionado!");
      return;
    }
    setServicosAdicionados(prev => [
      ...prev,
      { id: servicoSelecionado, nome: servicoObj.nome, valor: servicoObj.preco, quantidade: 1 }
    ]);
    setServicoSelecionado("");
  }

  // Handler para remover serviço da lista
  function handleRemoverServico(index: number) {
    setServicosAdicionados(prev => prev.filter((_, i) => i !== index));
  }

  // Handler para alterar a quantidade de um serviço
  function handleAlterarQuantidadeServico(index: number, quantidade: number) {
    setServicosAdicionados(prev =>
      prev.map((servico, i) =>
        i === index ? { ...servico, quantidade: quantidade < 1 ? 1 : quantidade } : servico
      )
    );
  }
  // Handler para remover peça da lista
  function handleRemoverProduto(index: number) {
    setPecasAdicionadas(prev => prev.filter((_, i) => i !== index));
  }

  // Handler para adicionar peça à lista
  function handleAdicionarPeca() {
    if (!pecaSelecionada || !qtdPecaAdicionar || qtdPecaAdicionar < 1) {
      toast.error("Selecione uma peça e quantidade válida!");
      return;
    }
    const pecaObj = pecas[pecaSelecionada];
    if (!pecaObj) {
      toast.error("Peça inválida!");
      return;
    }
    setPecasAdicionadas(prev => [
      ...prev,
      { id: pecaSelecionada, nome: pecaObj.nome, quantidade: qtdPecaAdicionar }
    ]);
    setPecaSelecionada("");
    setQtdPecaAdicionar(1);
  }

  // Função auxiliar para mostrar modelo do aparelho (modelo + cor)
  const modeloAparelho = modelo
    ? `${modelo}${cor ? ` - ${cor}` : ''}`
    : '';
  // Nome do técnico selecionado (mock para exemplo)
  const tecnicoSelecionado = tecnico
    ? { nome: tecnico.charAt(0).toUpperCase() + tecnico.slice(1) }
    : null;
  return (
    <MenuLayout>
      {/* Título principal fora do container */}
      <div className="w-full">
        <h1 className="text-3xl font-bold text-blue-600 text-center mb-8">
          Nova Ordem de Serviço
        </h1>
      </div>
      {/* Mini-resumo moderno logo abaixo do título */}
      <div className="flex justify-center mb-4">
        <div className="flex items-center space-x-4 bg-white shadow-md rounded-full px-6 py-2">
          <div className="text-sm text-gray-600 font-medium">Etapa: <span className="text-blue-600 font-semibold">{etapaAtual + 1} de 6</span></div>
          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          <div className="text-sm text-gray-600 font-medium">
            {etapaAtual === 0 && "Informações do Cliente"}
            {etapaAtual === 1 && "Informações do Aparelho"}
            {etapaAtual === 2 && "Serviços e Peças"}
            {etapaAtual === 3 && "Finalização"}
          </div>
        </div>
      </div>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-0">
        <div className="w-full max-w-6xl bg-white dark:bg-gray-800 text-black dark:text-white rounded-xl shadow-lg p-8 mx-auto mt-2">
        <ThemeSwitcher />
        <div className="w-full space-y-8 gap-8">
        <BarraDeProgresso etapaAtual={etapaAtual} total={6} />
        {/* Botão Voltar acima do título principal */}
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-blue-600 hover:underline"
        >
          ← Voltar
        </button>
        <div className="mt-2">
          <div className="flex items-center justify-between w-full mb-4">
            {[1, 2, 3, 4, 5, 6].map((etapa) => (
              <div key={etapa} className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                  etapaAtual > etapa ? 'bg-green-500 text-white' : etapaAtual === etapa ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
                }`}>
                  {etapaAtual > etapa ? '✔️' : 
                    (etapa === 1 && <UserCircle size={16} />) ||
                    (etapa === 2 && <DeviceMobileCamera size={16} />) ||
                    (etapa === 3 && <UsersThree size={16} />) ||
                    (etapa === 4 && <ClipboardText size={16} />) ||
                    (etapa === 5 && <NotePencil size={16} />) ||
                    (etapa === 6 && <IconImage size={16} />)
                  }
                </div>
                <span className="text-xs mt-1 text-center">
                  {etapa === 1 && 'Cliente'}
                  {etapa === 2 && 'Aparelho'}
                  {etapa === 3 && 'Responsáveis'}
                  {etapa === 4 && 'Status'}
                  {etapa === 5 && 'Obs.'}
                  {etapa === 6 && 'Imagens'}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="text-center mt-4">
            <div className="space-y-6 gap-6">
              {/* Etapa 1: Informações do Cliente */}
              {etapaAtual === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 gap-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      {isLoading ? (
                        <Skeleton count={1} height={44} />
                      ) : (
                      <Select
                        options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                        placeholder="Selecionar cliente"
                        className="w-full rounded-md"
                        value={clienteSelecionado ? { value: clienteSelecionado.id, label: clienteSelecionado.nome } : null}
                        onChange={(newValue, _actionMeta) => {
                          const selectedValue = Array.isArray(newValue)
                            ? newValue.length > 0 ? newValue[0].value : undefined
                            : newValue?.value;

                          if (!selectedValue) return;

                          supabase
                            .from('clientes')
                            .select('*')
                            .eq('id', selectedValue)
                            .single()
                            .then(({ data, error }) => {
                              if (!error && data) setClienteSelecionado(data);
                            });
                        }}
                        components={{ SingleValue: CustomSingleValue }}
                        styles={{
                          control: (provided: any) => ({
                            ...provided,
                            borderRadius: '0.375rem',
                            borderColor: '#e5e7eb',
                            backgroundColor: 'white',
                            boxShadow: 'none',
                            ':hover': { borderColor: '#3b82f6' }
                          }),
                          option: (provided: any, state: any) => ({
                            ...provided,
                            backgroundColor: state.isSelected
                              ? '#3b82f6'
                              : state.isFocused
                              ? '#e0f2fe'
                              : 'white',
                            color: state.isSelected ? 'white' : '#111827',
                            padding: '0.75rem 1rem',
                            fontSize: '0.875rem',
                          }),
                          singleValue: (provided: any) => ({
                            ...provided,
                            fontSize: '0.875rem',
                            lineHeight: '1.25rem',
                          }),
                        }}
                      />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      className="p-3 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
                    >
                      <UserPlus size={20} />
                    </button>
                  </div>
                  <div className="flex mt-4 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (!clienteSelecionado) {
                          toast.error("Selecione um cliente!");
                          return;
                        }
                        setEtapaAtual(etapaAtual + 1);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 mx-auto"
                    >
                      Próximo
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Etapa 2: Informações do Aparelho */}
              {etapaAtual === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 gap-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Categoria */}
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={categoriaEquip}
                        onChange={(e) => setCategoriaEquip(e.target.value)}
                        placeholder="Digite a categoria"
                        className="input input-bordered w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20"
                      />
                    </div>
                    {/* Marca */}
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={marcaSelecionada}
                        onChange={(e) => setMarcaSelecionada(e.target.value)}
                        placeholder="Digite a marca"
                        className="input input-bordered w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Modelo */}
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        placeholder="Digite o modelo"
                        className="input input-bordered w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20"
                      />
                    </div>
                    {/* Número de Série */}
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        name="numero_serie"
                        placeholder="Número de Série ou Referência"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20"
                        value={numeroSerie}
                        onChange={(e) => setNumeroSerie(e.target.value)}
                      />
                      {numeroSerie && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
                          <Lottie animationData={checkmarkAnimation} loop={false} />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Cor */}
                  <div className="flex gap-4 mt-4">
                    <div className="w-1/2">
                      <input
                        type="text"
                        placeholder="Cor do aparelho"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20"
                        value={cor}
                        onChange={(e) => setCor(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between mt-4 gap-4">
                    <button
                      type="button"
                      onClick={() => setEtapaAtual(etapaAtual - 1)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 mx-auto"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!categoriaEquip || !marcaSelecionada || !modelo || !numeroSerie) {
                          toast.error("Preencha todas as informações do aparelho!");
                          return;
                        }
                        setEtapaAtual(etapaAtual + 1);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 mx-auto"
                    >
                      Próximo
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Etapa 3: Responsáveis */}
              {etapaAtual === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 gap-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                    {/* Técnico */}
                    <div className="relative flex items-center">
                      <Select
                        options={tecnicos.map((t) => ({ value: t.id, label: t.nome }))}
                        placeholder="Selecionar técnico"
                        className="w-full rounded-md"
                        value={tecnico ? { value: tecnico, label: tecnicos.find(t => t.id === tecnico)?.nome || "" } : null}
                        onChange={(newValue, _actionMeta) => {
                          if (!newValue || Array.isArray(newValue)) return;
                          setTecnico(newValue.value);
                        }}
                        components={{ SingleValue: CustomSingleValue }}
                        styles={{
                          control: (provided: any) => ({
                            ...provided,
                            borderRadius: '0.375rem',
                            borderColor: '#e5e7eb',
                            backgroundColor: 'white',
                            boxShadow: 'none',
                            ':hover': { borderColor: '#3b82f6' }
                          }),
                          option: (provided: any, state: any) => ({
                            ...provided,
                            backgroundColor: state.isSelected
                              ? '#3b82f6'
                              : state.isFocused
                              ? '#e0f2fe'
                              : 'white',
                            color: state.isSelected ? 'white' : '#111827',
                            padding: '0.75rem 1rem',
                            fontSize: '0.875rem',
                          }),
                          singleValue: (provided: any) => ({
                            ...provided,
                            fontSize: '0.875rem',
                            lineHeight: '1.25rem',
                          }),
                        }}
                      />
                    </div>
                    {/* Atendente */}
                    <div className="relative flex items-center">
                      <Select
                        options={[
                          { value: 'camila', label: 'Camila' },
                          { value: 'joao', label: 'João' },
                        ]}
                        placeholder="Selecionar atendente"
                        className="w-full rounded-md"
                        value={atendente ? { value: atendente, label: atendente.charAt(0).toUpperCase() + atendente.slice(1) } : null}
                        onChange={(newValue, _actionMeta) => {
                          if (!newValue || Array.isArray(newValue)) return;
                          setAtendente(newValue.value);
                        }}
                        components={{ SingleValue: CustomSingleValue }}
                        styles={{
                          control: (provided: any) => ({
                            ...provided,
                            borderRadius: '0.375rem',
                            borderColor: '#e5e7eb',
                            backgroundColor: 'white',
                            boxShadow: 'none',
                            ':hover': { borderColor: '#3b82f6' }
                          }),
                          option: (provided: any, state: any) => ({
                            ...provided,
                            backgroundColor: state.isSelected
                              ? '#3b82f6'
                              : state.isFocused
                              ? '#e0f2fe'
                              : 'white',
                            color: state.isSelected ? 'white' : '#111827',
                            padding: '0.75rem 1rem',
                            fontSize: '0.875rem',
                          }),
                          singleValue: (provided: any) => ({
                            ...provided,
                            fontSize: '0.875rem',
                            lineHeight: '1.25rem',
                          }),
                        }}
                      />
                    </div>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20"
                    />
                  </div>
                    <div className="flex justify-between mt-4 gap-4">
                    <button
                      type="button"
                      onClick={() => setEtapaAtual(etapaAtual - 1)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 mx-auto"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!tecnico || !atendente) {
                          toast.error("Selecione técnico e atendente!");
                          return;
                        }
                        setEtapaAtual(etapaAtual + 1);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 mx-auto"
                    >
                      Próximo
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Etapa 4: Status e Aplicações */}
              {etapaAtual === 4 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 gap-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  {/* Status Select */}
                  <div className="relative flex items-center">
                    <Select
                      options={[
                        { value: 'orcamento', label: 'Orçamento' },
                        { value: 'aprovado', label: 'Aprovado' },
                      ]}
                      value={
                        status
                          ? [
                              { value: 'orcamento', label: 'Orçamento' },
                              { value: 'aprovado', label: 'Aprovado' },
                            ].find(opt => opt.value === status)
                          : null
                      }
                      onChange={(newValue, _actionMeta) => {
                        if (!newValue || Array.isArray(newValue)) return;
                        setStatus(newValue.value);
                      }}
                      placeholder="Selecionar status"
                      className="w-full rounded-md"
                      components={{ SingleValue: CustomSingleValue }}
                      styles={{
                        control: (provided: any) => ({
                          ...provided,
                          borderRadius: '0.375rem',
                          borderColor: '#e5e7eb',
                          backgroundColor: 'white',
                          boxShadow: 'none',
                          ':hover': { borderColor: '#3b82f6' }
                        }),
                        option: (provided: any, state: any) => ({
                          ...provided,
                          backgroundColor: state.isSelected
                            ? '#3b82f6'
                            : state.isFocused
                            ? '#e0f2fe'
                            : 'white',
                          color: state.isSelected ? 'white' : '#111827',
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                        }),
                        singleValue: (provided: any) => ({
                          ...provided,
                          fontSize: '0.875rem',
                          lineHeight: '1.25rem',
                        }),
                      }}
                    />
                  </div>
                  {/* Serviços e Peças (nova visualização estilo tabela, aparece apenas se aprovado) */}
                  {status === "aprovado" && (
                    <>
                        {/* Nova organização estilo card com totais */}
                        <div className="space-y-8">
                          {/* Seleção de Serviços */}
                          <div className="shadow-sm border rounded-lg p-4 bg-white">
                            <div className="space-y-4">
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Serviços</label>
                              <div className="grid grid-cols-4 gap-2 items-center">
                                <div className="col-span-2">
                                  <Select
                                    options={Object.entries(servicos).map(([id, servico]) => ({
                                      value: id,
                                      label: `${servico.nome} - R$ ${servico.preco.toFixed(2)}`,
                                    }))}
                                    value={
                                      servicoSelecionado
                                        ? {
                                            value: servicoSelecionado,
                                            label:
                                              servicos[servicoSelecionado]?.nome +
                                              " - R$ " +
                                              (servicos[servicoSelecionado]?.preco?.toFixed(2) ?? "")
                                          }
                                        : null
                                    }
                                    onChange={(newValue) => {
                                      if (!newValue || Array.isArray(newValue)) return;
                                      setServicoSelecionado(newValue.value);
                                    }}
                                    className="w-full"
                                    placeholder="Selecione um serviço"
                                    isSearchable
                                  />
                                </div>
                                <div>
                                  {/* Espaço reservado para futura quantidade, se necessário */}
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={handleAdicionarServico}
                                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                                  >
                                    Adicionar
                                  </button>
                                </div>
                              </div>
                              {/* Lista de Serviços Adicionados */}
                              {servicosAdicionados.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <div className="grid grid-cols-5 gap-2 items-center text-sm font-semibold text-gray-600 border-b pb-2">
                                    <div>Serviço</div>
                                    <div>Qtd</div>
                                    <div>Valor Unitário</div>
                                    <div>Subtotal</div>
                                    <div>Ação</div>
                                  </div>
                                  {servicosAdicionados.map((servico, index) => (
                                    <div
                                      key={index}
                                      className="grid grid-cols-5 gap-2 items-center text-sm border-b py-2"
                                    >
                                      <div>{servico.nome}</div>
                                      <div>
                                        <input
                                          type="number"
                                          min={1}
                                          value={servico.quantidade}
                                          onChange={e => handleAlterarQuantidadeServico(index, Number(e.target.value))}
                                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                        />
                                      </div>
                                      <div>R$ {servico.valor.toFixed(2)}</div>
                                      <div className="font-semibold">
                                        R$ {(servico.valor * servico.quantidade).toFixed(2)}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoverServico(index)}
                                        className="text-red-500 hover:text-red-700 text-base"
                                        title="Remover serviço"
                                      >
                                        ❌
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Adicionar Peça */}
                          <div className="shadow-sm border rounded-lg p-4 bg-white">
                            <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                              📦 Peças Utilizadas
                            </h3>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Adicionar peça</h4>
                              <div className="grid grid-cols-3 gap-2 items-center">
                                <div className="col-span-2">
                                  <Select
                                    options={Object.entries(pecas).map(([id, peca]) => ({
                                      value: id,
                                      label: `${peca.nome} - R$ ${peca.preco}`
                                    }))}
                                    value={pecaSelecionada ? {
                                      value: pecaSelecionada,
                                      label: pecas[pecaSelecionada]
                                        ? `${pecas[pecaSelecionada].nome} - R$ ${pecas[pecaSelecionada].preco}` : ''
                                    } : null}
                                    onChange={(selected) => {
                                      if (!selected || Array.isArray(selected)) return;
                                      setPecaSelecionada(selected.value);
                                    }}
                                    placeholder="Selecionar peça"
                                  />
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={handleAdicionarPeca}
                                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                                  >
                                    ➕ Adicionar
                                  </button>
                                </div>
                              </div>
                            </div>
                            {/* Lista de peças adicionadas */}
                            {pecasAdicionadas.length > 0 ? (
                              <div className="mt-6" aria-label="Lista de peças adicionadas">
                                <div className="grid grid-cols-5 gap-2 items-center text-sm font-semibold text-gray-600 border-b pb-2">
                                  <div>Peça</div>
                                  <div>Qtd</div>
                                  <div>Preço Unitário</div>
                                  <div>Subtotal</div>
                                  <div>Ação</div>
                                </div>
                                {pecasAdicionadas.map((peca, index) => (
                                  <div key={index} className="grid grid-cols-5 gap-2 items-center text-sm border-b py-2">
                                    <div>{peca.nome}</div>
                                    <div>
                                      <input
                                        type="number"
                                        min={1}
                                        value={peca.quantidade}
                                        onChange={(e) => {
                                          const novaQtd = Number(e.target.value);
                                          setPecasAdicionadas((prev) =>
                                            prev.map((p, i) =>
                                              i === index ? { ...p, quantidade: novaQtd < 1 ? 1 : novaQtd } : p
                                            )
                                          );
                                        }}
                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                      />
                                    </div>
                                    <div>R$ {pecas[peca.id]?.preco.toFixed(2)}</div>
                                    <div className="font-semibold">
                                      R$ {(pecas[peca.id]?.preco * peca.quantidade).toFixed(2)}
                                    </div>
                                    <button
                                      type="button"
                                      className="text-red-500 hover:text-red-700 text-base"
                                      title="Remover produto"
                                      onClick={() => handleRemoverProduto(index)}
                                    >
                                      ❌
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 mt-6" aria-label="Nenhuma peça adicionada">Nenhuma peça adicionada.</p>
                            )}
                          </div>

                          {/* Totais */}
                          <div className="shadow-sm border rounded-lg p-4 bg-white">
                            <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                              🧾 Totais
                            </h3>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-sm">
                              <div>
                                <label className="block mb-1 text-gray-600 text-sm">Serviços</label>
                                <input
                                  type="text"
                                  readOnly
                                  className="w-full px-3 py-2 border rounded bg-gray-100 text-sm"
                                  value={`R$ ${servicosAdicionados.reduce((acc, s) => acc + (s.valor * (s.quantidade || 1)), 0).toFixed(2)}`}
                                />
                              </div>
                              <div>
                                <label className="block mb-1 text-gray-600 text-sm">Peças</label>
                                <input
                                  type="text"
                                  readOnly
                                  className="w-full px-3 py-2 border rounded bg-gray-100 text-sm"
                                  value={`R$ ${pecasAdicionadas.reduce((acc, peca) => acc + (pecas[peca.id]?.preco * peca.quantidade), 0).toFixed(2)}`}
                                />
                              </div>
                              <div className="col-span-1 md:col-span-1 flex flex-col items-center justify-center">
                                <label className="block mb-1 text-green-700 font-semibold text-sm text-center">Valor Total</label>
                                <input
                                  type="text"
                                  readOnly
                                  className="w-full px-3 py-2 border rounded bg-green-100 text-green-800 font-bold text-lg text-center"
                                  value={`R$ ${(servicosAdicionados.reduce((acc, s) => acc + (s.valor * (s.quantidade || 1)), 0) + pecasAdicionadas.reduce((acc, peca) => acc + (pecas[peca.id]?.preco * peca.quantidade), 0)).toFixed(2)}`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                    </>
                  )}
                  {/* Termo de Garantia */}
                  <div className="space-y-4 gap-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Termo de Garantia</h3>
                    <div className="relative flex items-center">
                      <textarea
                        value={termoGarantia}
                        onChange={(e) => setTermoGarantia(e.target.value)}
                        placeholder="Termo de garantia"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20 placeholder-gray-400"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between mt-4 gap-4">
                    <button
                      type="button"
                      onClick={() => setEtapaAtual(etapaAtual - 1)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 mx-auto"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          status === 'aprovado' &&
                          (servicosAdicionados.length === 0 || pecasAdicionadas.length === 0)
                        ) {
                          toast.error("Adicione pelo menos um serviço e uma peça!");
                          return;
                        }
                        setEtapaAtual(etapaAtual + 1);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 mx-auto"
                    >
                      Próximo
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Etapa 5: Observações */}
              {etapaAtual === 5 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 gap-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  {/* Relato do cliente */}
                  <div className="relative flex items-center">
                    <textarea
                      placeholder="Relato do cliente"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20 placeholder-gray-400"
                      rows={3}
                      value={relato}
                      onChange={(e) => setRelato(e.target.value)}
                    />
                  </div>
                  {/* Observações internas */}
                  <div className="relative flex items-center">
                    <textarea
                      placeholder="Observações internas"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20 placeholder-gray-400"
                      rows={3}
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between mt-4 gap-4">
                    <button
                      type="button"
                      onClick={() => setEtapaAtual(etapaAtual - 1)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 mx-auto"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEtapaAtual(etapaAtual + 1)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 mx-auto"
                    >
                      Próximo
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Etapa 6: Imagens */}
              {etapaAtual === 6 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 gap-4 bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2">Imagem de Entrada</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setPreviewEntrada(URL.createObjectURL(e.target.files[0]));
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20 cursor-pointer hover:bg-gray-100"
                      />
                      {previewEntrada && (
                        <Image src={previewEntrada} alt="Preview" width={128} height={128} className="w-32 h-32 object-cover rounded-lg mt-2" />
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2">Imagem de Saída</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setPreviewSaida(URL.createObjectURL(e.target.files[0]));
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20 cursor-pointer hover:bg-gray-100"
                      />
                      {previewSaida && (
                        <Image src={previewSaida} alt="Preview" width={128} height={128} className="w-32 h-32 object-cover rounded-lg mt-2" />
                      )}
                    </div>
                  </div>
                  <div className="p-6 bg-gray-100 rounded-lg mt-6 text-base">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <p><strong>Cliente:</strong> {clienteSelecionado?.nome}</p>
                      <p><strong>Aparelho:</strong> {categoriasEquip.find(c => c.id === categoriaEquip)?.nome || categoriaEquip} - {modelo} {cor && `- ${cor}`}</p>
                      {/* <p><strong>Descrição do serviço:</strong> {relatorio}</p> */}
                      <p><strong>Relato do cliente:</strong> {relato}</p>
                      <p><strong>Observações internas:</strong> {observacao}</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row justify-between mt-4 gap-4">
                    <button
                      type="button"
                      onClick={() => setEtapaAtual(etapaAtual - 1)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 mx-auto"
                    >
                      Voltar
                    </button>
                    <div className="flex flex-col md:flex-row gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 mx-auto"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResumoModal(true)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-500 text-white hover:bg-gray-600 mx-auto"
                      >
                        Visualizar Resumo
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </form>
        </div>

        {/* Modal para cadastrar novo cliente */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 text-center">Cadastro Rápido</h2>
              <FastRegisterForm
                onClose={() => setShowModal(false)}
                onSubmit={handleFastRegister}
                isLoading={isLoading}
              />
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Modal de Resumo da Ordem de Serviço */}
        {showResumoModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 text-center">Resumo da Ordem de Serviço</h2>
              {/* Novo layout minimalista e organizado */}
              <div className="p-6 bg-white rounded-lg mt-6 text-base space-y-6 border border-gray-200">
                {/* Dados do Cliente */}
                <div>
                  <h2 className="text-xl font-semibold text-blue-600 mb-2">Dados do Cliente</h2>
                  <p><strong>Nome:</strong> {clienteSelecionado?.nome}</p>
                  <p><strong>Telefone:</strong> {clienteSelecionado?.telefone}</p>
                </div>

                {/* Dados do Aparelho */}
                <div>
                  <h2 className="text-xl font-semibold text-blue-600 mb-2">Aparelho</h2>
                  <p><strong>Categoria:</strong> {categoriasEquip.find(c => c.id === categoriaEquip)?.nome || categoriaEquip}</p>
                  <p><strong>Modelo:</strong> {modelo}</p>
                  <p><strong>Cor:</strong> {cor}</p>
                  <p><strong>Número de série:</strong> {numeroSerie}</p>
                </div>

                {/* Descrição do Serviço */}
                <div>
                  <h2 className="text-xl font-semibold text-blue-600 mb-2">Serviço</h2>
                  {/* <p><strong>Descrição:</strong> {relatorio}</p> */}
                  <p><strong>Relato do cliente:</strong> {relato}</p>
                  <p><strong>Observações internas:</strong> {observacao}</p>
                </div>

                {/* Lista de Serviços */}
                <div>
                  <h2 className="text-xl font-semibold text-blue-600 mb-2">Serviços Adicionados</h2>
                  {servicosAdicionados.length > 0 ? (
                    <ul className="list-disc ml-6 space-y-1">
                      {servicosAdicionados.map((s, index) => (
                        <li key={index}>
                          {s.nome} (x{s.quantidade}) — R$ {(s.valor * s.quantidade).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum serviço adicionado.</p>
                  )}
                </div>

                {/* Lista de Peças */}
                <div>
                  <h2 className="text-xl font-semibold text-blue-600 mt-6 mb-2">Peças Utilizadas</h2>
                  {pecasAdicionadas.length > 0 ? (
                    <ul className="list-disc ml-6 space-y-1">
                      {pecasAdicionadas.map((p, index) => (
                        <li key={index}>
                          {pecas[p.id]?.nome || p.id} (x{p.quantidade}) — R$ {(pecas[p.id]?.preco * p.quantidade).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhuma peça adicionada.</p>
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setShowResumoModal(false)}
                  className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-200"
                >
                  Voltar e Editar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={() => {
                    setShowResumoModal(false);
                    document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }}
                >
                  Confirmar e Cadastrar
                </button>
              </div>
              <button
                onClick={() => setShowResumoModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
      </div>
    </MenuLayout>
  );
}
// Componente para o formulário da modal de cadastro rápido de cliente
import React from 'react';

// Função para validar CPF
function validarCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11) return false;
  let soma = 0;
  let resto;

  if (/^(\d)\1{10}$/.test(cpf)) return false;

  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

function FastRegisterForm({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; isLoading?: boolean }) {
  const [cpfValue, setCpfValue] = useState('');
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'documento') setCpfValue(value.replace(/\D/g, ''));
  }
  function handleSelectChange(name: string, option: any) {
    setFormData((prev) => ({ ...prev, [name]: option?.value || '' }));
  }
  return (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center" onSubmit={onSubmit}>
      <div className="col-span-2 relative flex items-center">
        <input
          type="text"
          name="nome"
          placeholder="Nome completo"
          required
          className="w-full px-4 py-3 pl-4 border border-gray-200 rounded-lg bg-white shadow-sm focus:ring focus:ring-blue-500/20 text-sm placeholder-gray-400"
          onChange={handleInputChange}
        />
        {formData.nome && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
            <Lottie animationData={checkmarkAnimation} loop={false} />
          </div>
        )}
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          name="telefone"
          placeholder="Telefone"
          required
          className="w-full px-4 py-3 pl-4 border border-gray-200 rounded-lg bg-white shadow-sm focus:ring focus:ring-blue-500/20 text-sm placeholder-gray-400"
          onChange={handleInputChange}
        />
        {formData.telefone && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
            <Lottie animationData={checkmarkAnimation} loop={false} />
          </div>
        )}
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          name="celular"
          placeholder="Celular"
          className="w-full px-4 py-3 pl-4 border border-gray-200 rounded-lg bg-white shadow-sm focus:ring focus:ring-blue-500/20 text-sm placeholder-gray-400"
          onChange={handleInputChange}
        />
        {formData.celular && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
            <Lottie animationData={checkmarkAnimation} loop={false} />
          </div>
        )}
      </div>
      <div className="col-span-2 relative flex items-center">
        <input
          type="email"
          name="email"
          placeholder="E-mail"
          className="w-full px-4 py-3 pl-4 border border-gray-200 rounded-lg bg-white shadow-sm focus:ring focus:ring-blue-500/20 text-sm placeholder-gray-400"
          onChange={handleInputChange}
        />
        {formData.email && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
            <Lottie animationData={checkmarkAnimation} loop={false} />
          </div>
        )}
      </div>
      {/* Documento (CPF/CNPJ) com validação e animação */}
      <div className="relative flex items-center">
        <Cleave
          name="documento"
          options={{ delimiters: ['.', '.', '-'], blocks: [3, 3, 3, 2], numericOnly: true }}
          placeholder="CNPJ/CPF"
          className="w-full pr-12 px-4 py-3 pl-4 border border-gray-200 rounded-lg bg-white shadow-sm focus:ring focus:ring-blue-500/20 text-sm placeholder-gray-400"
          value={formData.documento || ''}
          onChange={handleInputChange}
        />
        {cpfValue.length === 11 && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
            <Lottie
              animationData={validarCPF(cpfValue) ? checkmarkAnimation : errorAnimation}
              loop={false}
            />
          </div>
        )}
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          name="cep"
          placeholder="CEP"
          className="w-full px-4 py-3 pl-4 border border-gray-200 rounded-lg bg-white shadow-sm focus:ring focus:ring-blue-500/20 text-sm placeholder-gray-400"
          onChange={handleInputChange}
        />
        {formData.cep && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
            <Lottie animationData={checkmarkAnimation} loop={false} />
          </div>
        )}
      </div>
      <div className="relative flex items-center">
        <Select
          name="origem"
          options={[
            { value: 'indicacao', label: 'Indicação' },
            { value: 'google', label: 'Google' },
            { value: 'instagram', label: 'Instagram' },
          ]}
          placeholder="Origem do cliente*"
          className="w-full"
          components={{ SingleValue: CustomSingleValue }}
          styles={{
            control: (provided: any) => ({
              ...provided,
              borderRadius: '0.5rem',
              borderColor: '#e5e7eb',
              backgroundColor: 'white',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              ':hover': { borderColor: '#3b82f6' }
            }),
            option: (provided: any, state: any) => ({
              ...provided,
              backgroundColor: state.isSelected
                ? '#3b82f6'
                : state.isFocused
                ? '#e0f2fe'
                : 'white',
              color: state.isSelected ? 'white' : '#111827',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
            }),
            singleValue: (provided: any) => ({
              ...provided,
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
            }),
          }}
          onChange={(newValue, _actionMeta) => {
            if (!newValue || Array.isArray(newValue)) return;
            handleSelectChange('origem', newValue);
          }}
        />
        {formData.origem && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
            <Lottie animationData={checkmarkAnimation} loop={false} />
          </div>
        )}
      </div>
      <div className="relative flex items-center">
        <Select
          name="cadastradoPor"
          options={[
            { value: 'computadores', label: 'Computadores Geral' },
            { value: 'celulares', label: 'Celulares Geral' },
          ]}
          placeholder="Cadastrado por"
          className="w-full"
          components={{ SingleValue: CustomSingleValue }}
          styles={{
            control: (provided: any) => ({
              ...provided,
              borderRadius: '0.5rem',
              borderColor: '#e5e7eb',
              backgroundColor: 'white',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              ':hover': { borderColor: '#3b82f6' }
            }),
            option: (provided: any, state: any) => ({
              ...provided,
              backgroundColor: state.isSelected
                ? '#3b82f6'
                : state.isFocused
                ? '#e0f2fe'
                : 'white',
              color: state.isSelected ? 'white' : '#111827',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem', 
            }),
            singleValue: (provided: any) => ({
              ...provided,
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
            }),
          }}
          onChange={(newValue, _actionMeta) => {
            if (!newValue || Array.isArray(newValue)) return;
            handleSelectChange('cadastradoPor', newValue);
          }}
        />
        {formData.cadastradoPor && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
            <Lottie animationData={checkmarkAnimation} loop={false} />
          </div>
        )}
      </div>
      <div className="col-span-2 flex justify-between items-center mt-4">
        <button
          type="button"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition mx-auto"
        >
          Fazer cadastro completo
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-5 py-2 shadow-md"
            disabled={isLoading}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ThemeSwitcher para dark/light mode toggle
import ReactSwitch from 'react-switch';
import { useEffect as useReactEffect } from 'react';
function ThemeSwitcher() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useReactEffect(() => {
    document.documentElement.className = theme === 'dark' ? 'dark' : '';
  }, [theme]);
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <span className="text-xs text-gray-600 dark:text-gray-300">🌞</span>
      <ReactSwitch
        onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        checked={theme === 'dark'}
        offColor="#ddd"
        onColor="#222"
        uncheckedIcon={false}
        checkedIcon={false}
        height={20}
        width={40}
        handleDiameter={18}
      />
      <span className="text-xs text-gray-600 dark:text-gray-300">🌚</span>
    </div>
  );
}
'use client';

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
  const [modoCompacto, setModoCompacto] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showResumoModal, setShowResumoModal] = useState(false);
  const [status, setStatus] = useState("analise");
  const [pecaSelecionada, setPecaSelecionada] = useState("");
  const [servicoSelecionado, setServicoSelecionado] = useState("");
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
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [atendente, setAtendente] = useState("");
  const [termoGarantia, setTermoGarantia] = useState("");
  const [relato, setRelato] = useState("");
  const [observacao, setObservacao] = useState("");
  const [previewEntrada, setPreviewEntrada] = useState<string | null>(null);
  const [previewSaida, setPreviewSaida] = useState<string | null>(null);

  // Buscar clientes ao montar
  useEffect(() => {
    async function fetchClientes() {
      setIsLoading(true);
      const { data, error } = await supabase.from('clientes').select('*');
      if (!error && data) setClientes(data);
      setIsLoading(false);
    }
    fetchClientes();
  }, []);

  // Função para submissão do formulário principal de Nova OS
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    if (!clienteSelecionado) {
      toast.error("Selecione um cliente!");
      setIsLoading(false);
      return;
    }
    // Coleta categoria, marca e cor do formulário
    const formData = new FormData(e.currentTarget);
    const categoria = formData.get("categoria");
    const marca = formData.get("marca");
    const cor = formData.get("cor");
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
      const { error: insertError } = await supabase.from("ordens_servico").insert({
        cliente_id: clienteSelecionado.id,
        empresa_id,
        status,
        servico: servicoSelecionado,
        qtd_servico: qtdServico,
        peca: pecaSelecionada,
        qtd_peca: qtdPeca,
        categoria,
        marca,
        cor,
        data_cadastro: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      toast.success("Ordem de Serviço cadastrada com sucesso!");
      setTimeout(() => {
        window.location.href = "/dashboard/ordens";
      }, 1200);
    } catch (err: any) {
      console.error(err);
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

  const [qtdServico, setQtdServico] = useState(1);
  const [qtdPeca, setQtdPeca] = useState(1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-0">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 text-black dark:text-white rounded-xl shadow-lg p-8 mx-auto">
        <ThemeSwitcher />
        <div className="flex justify-end mb-4">
          <label className="inline-flex items-center space-x-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Modo Compacto</span>
            <ReactSwitch
              checked={modoCompacto}
              onChange={() => setModoCompacto(!modoCompacto)}
              offColor="#ddd"
              onColor="#3b82f6"
              uncheckedIcon={false}
              checkedIcon={false}
              height={20}
              width={40}
              handleDiameter={18}
            />
          </label>
        </div>
        <div className={`w-full ${modoCompacto ? 'space-y-2 gap-2' : 'space-y-8 gap-8'}`}>
        <BarraDeProgresso etapaAtual={etapaAtual} total={6} />
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition mb-2"
        >
          <ArrowLeft size={20} />
          Voltar para Ordens de Serviço
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
          <h1 className="text-3xl font-semibold text-blue-600 tracking-tight text-center mt-2">Nova Ordem de Serviço</h1>
          <form onSubmit={handleSubmit} className="text-center mt-4">
            <div className={`${modoCompacto ? 'space-y-2 gap-2' : 'space-y-6 gap-6'}`}>
              {/* Etapa 1: Informações do Cliente */}
              {etapaAtual === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${modoCompacto ? 'space-y-2 gap-2' : 'space-y-4 gap-4'} bg-white rounded-lg shadow-md p-4 border border-gray-200`}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Informações do Cliente</h3>
                  <div className={`flex items-center ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
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
                          if (!newValue || Array.isArray(newValue)) return;
                          supabase
                            .from('clientes')
                            .select('*')
                            .eq('id', newValue.value)
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
                  <div className={`flex mt-4 ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${modoCompacto ? 'space-y-2 gap-2' : 'space-y-4 gap-4'} bg-white rounded-lg shadow-md p-4 border border-gray-200`}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Informações do Aparelho</h3>
                  <div className={`grid grid-cols-1 md:grid-cols-2 ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
                    {/* Categoria */}
                    <div className="relative flex items-center">
                      <Select
                        name="categoria"
                        options={[
                          { value: 'celular', label: 'Celular' },
                          { value: 'notebook', label: 'Notebook' },
                          { value: 'computador', label: 'Computador' },
                        ]}
                        placeholder="Selecione a categoria"
                        className="w-full rounded-md"
                        onChange={(newValue, _actionMeta) => {
                          if (!newValue || Array.isArray(newValue)) return;
                          setCategoria(newValue.value);
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
                    {/* Marca */}
                    <div className="relative flex items-center">
                      <Select
                        name="marca"
                        options={[
                          { value: 'apple', label: 'Apple' },
                          { value: 'samsung', label: 'Samsung' },
                          { value: 'dell', label: 'Dell' },
                          { value: 'lenovo', label: 'Lenovo' },
                        ]}
                        placeholder="Selecione a marca"
                        className="w-full rounded-md"
                        onChange={(newValue, _actionMeta) => {
                          if (!newValue || Array.isArray(newValue)) return;
                          setMarca(newValue.value);
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
                    {/* Modelo */}
                    <div className="relative flex items-center">
                      <Select
                        options={[
                          { value: 'iphone13', label: '📱 iPhone 13' },
                          { value: 'galaxyS22', label: '📱 Galaxy S22' },
                          { value: 'inspiron', label: '💻 Dell Inspiron 15' },
                          { value: 'ideapad', label: '💻 Lenovo IdeaPad 3' },
                        ]}
                        placeholder="Selecione o modelo"
                        className="w-full rounded-md"
                        onChange={(newValue, _actionMeta) => {
                          if (!newValue || Array.isArray(newValue)) return;
                          setModelo(newValue.value);
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
                    {/* Cor */}
                    <div className="relative flex items-center">
                      <Select
                        name="cor"
                        options={[
                          { value: 'preto', label: 'Preto' },
                          { value: 'branco', label: 'Branco' },
                          { value: 'cinza', label: 'Cinza' },
                          { value: 'azul', label: 'Azul' },
                        ]}
                        placeholder="Selecione a cor"
                        className="w-full rounded-md"
                        onChange={(newValue, _actionMeta) => {
                          if (!newValue || Array.isArray(newValue)) return;
                          setCor(newValue.value);
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
                    <div className={`flex justify-between mt-4 ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
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
                        if (!categoria || !marca || !modelo || !cor || !numeroSerie) {
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${modoCompacto ? 'space-y-2 gap-2' : 'space-y-4 gap-4'} bg-white rounded-lg shadow-md p-4 border border-gray-200`}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Responsáveis</h3>
                  <div className={`grid grid-cols-1 md:grid-cols-2 items-center ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
                    {/* Técnico */}
                    <div className="relative flex items-center">
                      <Select
                        options={[
                          { value: 'marcos', label: 'Marcos' },
                          { value: 'ana', label: 'Ana' },
                          { value: 'paulo', label: 'Paulo' },
                        ]}
                        placeholder="Selecionar técnico"
                        className="w-full rounded-md"
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
                    <div className={`flex justify-between mt-4 ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${modoCompacto ? 'space-y-2 gap-2' : 'space-y-4 gap-4'} bg-white rounded-lg shadow-md p-4 border border-gray-200`}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Status e Aplicações</h3>
                  <div className="relative flex items-center">
                    <Select
                      options={[
                        { value: 'analise', label: 'Em análise' },
                        { value: 'orcamento', label: 'Orçamento enviado' },
                        { value: 'aprovado', label: 'Aprovado' },
                        { value: 'concluido', label: 'Concluído' },
                      ]}
                      value={{
                        value: status,
                        label:
                          status === 'analise'
                            ? 'Em análise'
                            : status === 'orcamento'
                            ? 'Orçamento enviado'
                            : status === 'aprovado'
                            ? 'Aprovado'
                            : 'Concluído',
                      }}
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
// SERVIÇO
                  </div>
                  {status === "aprovado" && (
                  <div className="transition-all duration-500 ease-in-out animate-fadeIn">
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
                        <div>
                          <label className="text-sm font-semibold text-gray-700 mb-2">Serviço</label>
                          <div className={`flex items-center ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
                            <div className="w-full relative flex items-center">
                              <Select
                                options={[
                                  { value: 'formatacao', label: 'Formatação - R$ 80,00' },
                                  { value: 'troca_tela', label: 'Troca de Tela - R$ 200,00' },
                                ]}
                                value={
                                  servicoSelecionado
                                    ? {
                                        value: servicoSelecionado,
                                        label:
                                          servicoSelecionado && servicos[servicoSelecionado]
                                            ? `${servicos[servicoSelecionado].nome} - R$ ${servicos[servicoSelecionado].preco}`
                                            : "",
                                      }
                                    : null
                                }
                                onChange={(newValue, _actionMeta) => {
                                  if (!newValue || Array.isArray(newValue)) return;
                                  setServicoSelecionado(newValue.value);
                                }}
                                placeholder="Selecionar serviço"
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
// PEÇA
                            </div>
                            <input
                              type="number"
                              value={qtdServico}
                              onChange={(e) => setQtdServico(Number(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20"
                            />
                            <input
                              type="text"
                              readOnly
                              className="w-28 px-3 py-2 text-center text-sm border border-gray-300 rounded-md bg-white"
                              value={
                                servicoSelecionado && servicos[servicoSelecionado]
                                  ? `R$ ${(servicos[servicoSelecionado].preco * qtdServico).toFixed(2)}`
                                  : ""
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-gray-700 mb-2">Peça</label>
                          <div className={`flex items-center ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
                            <div className="w-full relative flex items-center">
                              <Select
                                options={[
                                  { value: 'bateria', label: 'Bateria - R$ 120,00' },
                                  { value: 'tela_iphone', label: 'Tela iPhone - R$ 350,00' },
                                ]}
                                value={
                                  pecaSelecionada
                                    ? {
                                        value: pecaSelecionada,
                                        label:
                                          pecas[pecaSelecionada].nome +
                                          ` - R$ ${pecas[pecaSelecionada].preco}`,
                                      }
                                    : null
                                }
                                onChange={(newValue, _actionMeta) => {
                                  if (!newValue || Array.isArray(newValue)) return;
                                  setPecaSelecionada(newValue.value);
                                }}
                                placeholder="Selecionar peça"
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
                            <input
                              type="number"
                              value={qtdPeca}
                              onChange={(e) => setQtdPeca(Number(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20"
                            />
                            <input
                              type="text"
                              readOnly
                              className="w-28 px-3 py-2 text-center text-sm border border-gray-300 rounded-md bg-white"
                              value={
                                pecaSelecionada
                                  ? `R$ ${(pecas[pecaSelecionada].preco * qtdPeca).toFixed(2)}`
                                  : ""
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Termo de Garantia */}
                  <div className={`${modoCompacto ? 'space-y-2 gap-2' : 'space-y-4 gap-4'}`}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Termo de Garantia</h3>
                    <div className="relative flex items-center">
                      <Select
                        options={[
                          { value: 'padrao', label: 'Termo Padrão (90 dias)' },
                          { value: 'personalizado', label: 'Termo Personalizado' },
                        ]}
                        placeholder="Selecionar termo"
                        className="w-full rounded-md"
                        onChange={(newValue, _actionMeta) => {
                          if (!newValue || Array.isArray(newValue)) return;
                          setTermoGarantia(newValue.value);
                        }}
                        isSearchable
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
                  </div>
                  <div className={`flex justify-between mt-4 ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
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
                          (!servicoSelecionado || !pecaSelecionada)
                        ) {
                          toast.error("Selecione serviço e peça!");
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${modoCompacto ? 'space-y-2 gap-2' : 'space-y-4 gap-4'} bg-white rounded-lg shadow-md p-4 border border-gray-200`}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Observações</h3>
                  {/* Relato */}
                  <div className="relative flex items-center">
                    <textarea
                      placeholder="Relato do cliente"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20 placeholder-gray-400"
                      rows={3}
                      value={relato}
                      onChange={(e) => setRelato(e.target.value)}
                    />
                  </div>
                  {/* Observação */}
                  <div className="relative flex items-center">
                    <textarea
                      placeholder="Observações internas"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md bg-white text-sm focus:ring focus:ring-blue-500/20 placeholder-gray-400"
                      rows={3}
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                    />
                  </div>
                  <div className={`flex justify-between mt-4 ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`${modoCompacto ? 'space-y-2 gap-2' : 'space-y-4 gap-4'} bg-white rounded-lg shadow-md p-4 border border-gray-200`}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Imagens</h3>
                  <div className={`grid grid-cols-1 md:grid-cols-2 ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
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
                  <div className="p-4 bg-gray-200 rounded-lg shadow-md mt-4">
                    <h3 className="text-lg font-semibold mb-2 text-center">Resumo</h3>
                    <p><strong>Cliente:</strong> {clienteSelecionado?.label}</p>
                    <p><strong>Aparelho:</strong> {categoria} - {marca} - {modelo}</p>
                    <p><strong>Status:</strong> {status}</p>
                  </div>
                  <div className={`flex flex-col md:flex-row justify-between mt-4 ${modoCompacto ? 'gap-2' : 'gap-4'}`}>
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
              <div className={`${modoCompacto ? 'space-y-1 gap-1' : 'space-y-2 gap-2'} text-gray-700 dark:text-gray-300`}>
                <p><strong>Nome:</strong> {clienteSelecionado?.nome}</p>
                <p><strong>Telefone:</strong> {clienteSelecionado?.telefone}</p>
                <p><strong>Celular:</strong> {clienteSelecionado?.celular}</p>
                <p><strong>Email:</strong> {clienteSelecionado?.email}</p>
                <p><strong>Documento:</strong> {clienteSelecionado?.documento}</p>
                <p><strong>CEP:</strong> {clienteSelecionado?.cep}</p>
                <p><strong>Origem:</strong> {clienteSelecionado?.origem}</p>
                <p><strong>Cadastrado por:</strong> {clienteSelecionado?.cadastrado_por}</p>
                <p><strong>Aparelho:</strong> {categoria} - {marca} - {modelo} ({cor})</p>
                <p><strong>Status:</strong> {status}</p>
                <p><strong>Técnico:</strong> {tecnico}</p>
                <p><strong>Atendente:</strong> {atendente}</p>
                <p><strong>Serviço:</strong> {servicoSelecionado ? servicoSelecionado : 'N/A'} (Qtd: {qtdServico})</p>
                <p><strong>Peça:</strong> {pecaSelecionada ? pecaSelecionada : 'N/A'} (Qtd: {qtdPeca})</p>
                <p><strong>Relato:</strong> {relato}</p>
                <p><strong>Observação:</strong> {observacao}</p>
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
    <form className={`grid grid-cols-1 md:grid-cols-2 ${modoCompacto ? 'gap-2' : 'gap-6'} text-center`} onSubmit={onSubmit}>
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
          onChange={(selected: { value: string; label: string } | null) => handleSelectChange('origem', selected)}
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
          onChange={(selected: { value: string; label: string } | null) => handleSelectChange('cadastradoPor', selected)}
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
            onClick={() => setIsLoading(true)}
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
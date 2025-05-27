'use client';

import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiUserPlus } from "react-icons/fi";
import Cleave from 'cleave.js/react';
import axios from 'axios';
import { cpf, cnpj } from 'cpf-cnpj-validator';
import Lottie from 'lottie-react';
import checkmarkAnimation from '@/assets/animations/checkmark.json';
import errorAnimation from '@/assets/animations/error.json';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  celular: string;
  email: string;
  documento: string;
  tipo: string;
  observacoes: string;
  responsavel: string;
  senha: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  origem: string;
  aniversario: string;
}

export default function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    celular: '',
    email: '',
    documento: '',
    tipo: 'pf',
    observacoes: '',
    responsavel: '',
    senha: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    origem: '',
    aniversario: '',
  });

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const isDocumentoValido = () => {
    if (!form.documento) return null;
    return form.tipo === 'pf'
      ? cpf.isValid(form.documento)
      : cnpj.isValid(form.documento);
  };

  useEffect(() => {
    if (cliente) {
      setForm(cliente);
    }
  }, [cliente]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'cep') {
      // Remove máscara para checar apenas números
      const valorCep = e.target.value.replace(/\D/g, '');
      if (valorCep.length === 8) {
        try {
          const response = await axios.get(`https://viacep.com.br/ws/${valorCep}/json/`);
          const data = response.data;
          if (!data.erro) {
            setForm(prev => ({
              ...prev,
              rua: data.logradouro,
              bairro: data.bairro,
              cidade: data.localidade,
              estado: data.uf
            }));
          }
        } catch (error) {
          // ignore error
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('user_id', userData?.user?.id)
      .single();

    if (empresaError || !empresaData?.id) {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      alert("Empresa ID não encontrado para este usuário.");
      setLoading(false);
      return;
    }

    const empresaId = empresaData.id;

    console.log("Empresa encontrada:", empresaId);

    if (!form.documento) {
      alert("O campo Documento é obrigatório.");
      setLoading(false);
      return;
    }

    if (form.tipo === 'pf' && !cpf.isValid(form.documento)) {
      alert("CPF inválido!");
      setLoading(false);
      return;
    }

    if (form.tipo === 'pj' && !cnpj.isValid(form.documento)) {
      alert("CNPJ inválido!");
      setLoading(false);
      return;
    }

    // Buscar o maior numero_cliente atual para a empresa e calcular o próximo
    const { data: maxResult, error: maxError } = await supabase
      .from('clientes')
      .select('numero_cliente')
      .eq('empresa_id', empresaId)
      .order('numero_cliente', { ascending: false })
      .limit(1);

    if (maxError) {
      console.error('Erro ao buscar numero_cliente:', maxError);
    }

    const proximoNumero = (maxResult?.[0]?.numero_cliente || 0) + 1;

    const clientePayload = {
      empresa_id: empresaId,
      nome: form.nome,
      telefone: form.telefone,
      celular: form.celular,
      email: form.email,
      documento: form.documento,
      tipo: form.tipo,
      observacoes: form.observacoes,
      responsavel: form.responsavel,
      senha: form.senha,
      cep: form.cep,
      rua: form.rua,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
      origem: form.origem,
      aniversario: form.aniversario,
      cpf: form.documento,
      endereco: `${form.rua}, ${form.numero}, ${form.bairro}, ${form.cidade} - ${form.estado}`,
      data_cadastro: new Date().toISOString(),
      numero_cliente: proximoNumero
    };

    console.log("Cliente payload:", clientePayload);

    if (cliente && cliente.id) {
      const { error } = await supabase
        .from('clientes')
        .update(clientePayload)
        .eq('id', cliente.id);

      if (error) {
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
        console.error('Erro ao atualizar cliente:', error);
        alert('Erro ao atualizar cliente: ' + error.message);
        setLoading(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('clientes')
        .insert(clientePayload)
        .select();

      if (error) {
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
        console.error('Erro ao inserir cliente:', error);
        alert('Erro ao cadastrar cliente: ' + error.message);
        setLoading(false);
        return;
      }

      console.log("Cliente cadastrado:", data);
    }

    setLoading(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      router.push('/dashboard/clientes');
    }, 1500);
  };

  return (
    <>
      {showSuccess && (
        <div className="flex justify-center my-6">
          <Lottie 
            animationData={checkmarkAnimation} 
            loop={false} 
            style={{ width: 120, height: 120 }}
          />
        </div>
      )}

      {showError && (
        <div className="flex justify-center my-6">
          <Lottie 
            animationData={errorAnimation} 
            loop={false} 
            style={{ width: 120, height: 120 }}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white rounded shadow space-y-8">
        <div className="flex items-center justify-between mb-6">
          <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <FiArrowLeft size={20} />
            Voltar
          </button>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <FiUserPlus size={24} />
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
        </div>

        <section>
          <h3 className="mb-4 text-base font-semibold text-gray-700">Informações Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Nome"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="relative">
              <Cleave
                options={{
                  delimiters: form.tipo === 'pf' ? ['.', '.', '-'] : ['.', '.', '/', '-'],
                  blocks: form.tipo === 'pf' ? [3, 3, 3, 2] : [2, 3, 3, 4, 2],
                  numericOnly: true
                }}
                value={form.documento}
                onChange={(e) => setForm({ ...form, documento: e.target.value })}
                placeholder="CPF/CNPJ"
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isDocumentoValido() === true && (
                <Lottie 
                  animationData={checkmarkAnimation} 
                  loop={false}
                  style={{ width: 32, height: 32 }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                />
              )}
              {isDocumentoValido() === false && (
                <Lottie 
                  animationData={errorAnimation} 
                  loop={false}
                  style={{ width: 32, height: 32 }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                />
              )}
            </div>
            <select
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pf">Pessoa Física</option>
              <option value="pj">Pessoa Jurídica</option>
            </select>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              placeholder="Telefone"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="celular"
              value={form.celular}
              onChange={handleChange}
              placeholder="Celular"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-base font-semibold text-gray-700">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Cleave
                options={{
                  delimiters: ['-'],
                  blocks: [5, 3],
                  numericOnly: true
                }}
                value={form.cep}
                onChange={handleChange}
                placeholder="CEP"
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              name="rua"
              value={form.rua}
              onChange={handleChange}
              placeholder="Rua"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="numero"
              value={form.numero}
              onChange={handleChange}
              placeholder="Número"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="complemento"
              value={form.complemento}
              onChange={handleChange}
              placeholder="Complemento"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="bairro"
              value={form.bairro}
              onChange={handleChange}
              placeholder="Bairro"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="cidade"
              value={form.cidade}
              onChange={handleChange}
              placeholder="Cidade"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="estado"
              value={form.estado}
              onChange={handleChange}
              placeholder="Estado"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-base font-semibold text-gray-700">Detalhes Extras</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input
              type="text"
              name="responsavel"
              value={form.responsavel}
              onChange={handleChange}
              placeholder="Responsável"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              name="senha"
              value={form.senha}
              onChange={handleChange}
              placeholder="Senha"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              name="aniversario"
              value={form.aniversario}
              onChange={handleChange}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="origem"
              value={form.origem}
              onChange={handleChange}
              placeholder="Origem"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              name="observacoes"
              value={form.observacoes}
              onChange={handleChange}
              placeholder="Observações"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
            />
          </div>
        </section>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            {loading ? (cliente ? "Atualizando..." : "Salvando...") : (cliente ? "Atualizar" : "Salvar")}
          </button>
        </div>
      </form>
    </>
  );
}
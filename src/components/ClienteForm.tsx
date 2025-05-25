'use client';

import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiUserPlus } from "react-icons/fi";

export default function ClienteForm({ cliente }: { cliente?: any }) {
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

  useEffect(() => {
    if (cliente) {
      setForm(cliente);
    }
  }, [cliente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      alert("Empresa ID não encontrado para este usuário.");
      setLoading(false);
      return;
    }

    const empresaId = empresaData.id;

    const clientePayload = {
      empresa_id: empresaId,
      ...form,
      cpf: form.documento,
      endereco: `${form.rua}, ${form.numero}, ${form.bairro}, ${form.cidade} - ${form.estado}`,
      data_cadastro: new Date().toISOString()
    };

    console.log("Cliente payload:", clientePayload);
    if (cliente && cliente.id) {
      await supabase.from('clientes').update(clientePayload).eq('id', cliente.id);
    } else {
      const { data, error } = await supabase.from('clientes').insert(clientePayload);
      console.log("Resultado insert:", { data, error });
    }

    setLoading(false);
    router.push('/dashboard/clientes');
  };

  return (
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
          <input
            type="text"
            name="documento"
            value={form.documento}
            onChange={handleChange}
            placeholder="CNPJ/CPF"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
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
          <input
            type="text"
            name="cep"
            value={form.cep}
            onChange={handleChange}
            placeholder="CEP"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
  );
}
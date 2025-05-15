

'use client';

import { useState } from 'react';
import { FiArrowLeft, FiUserPlus } from 'react-icons/fi';

export default function NovoClientePage() {
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
    cadastradoPor: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulário enviado:', form);
  };

  // Navegação simulada para "Voltar" (substitua por useRouter se necessário)
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 focus:outline-none"
          >
            <FiArrowLeft className="text-lg" />
            <span>Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <FiUserPlus className="text-2xl text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-800">Novo Cliente</h1>
          </div>
          <div className="w-24" /> {/* Espaço para alinhamento */}
        </div>

        {/* Card */}
        <div className="bg-white rounded-md shadow-md border border-gray-100 px-8 py-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {/* Informações Pessoais */}
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-4">Informações Pessoais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label htmlFor="nome" className="text-sm font-medium text-gray-600">Nome completo*</label>
                  <input
                    name="nome"
                    id="nome"
                    required
                    onChange={handleChange}
                    value={form.nome}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="documento" className="text-sm font-medium text-gray-600">CNPJ/CPF*</label>
                  <input
                    name="documento"
                    id="documento"
                    required
                    onChange={handleChange}
                    value={form.documento}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CNPJ/CPF"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="telefone" className="text-sm font-medium text-gray-600">Telefone*</label>
                  <input
                    name="telefone"
                    id="telefone"
                    required
                    onChange={handleChange}
                    value={form.telefone}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Telefone"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="celular" className="text-sm font-medium text-gray-600">Celular</label>
                  <input
                    name="celular"
                    id="celular"
                    onChange={handleChange}
                    value={form.celular}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Celular"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="email" className="text-sm font-medium text-gray-600">Email</label>
                  <input
                    name="email"
                    id="email"
                    type="email"
                    onChange={handleChange}
                    value={form.email}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="responsavel" className="text-sm font-medium text-gray-600">Responsável</label>
                  <input
                    name="responsavel"
                    id="responsavel"
                    onChange={handleChange}
                    value={form.responsavel}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Responsável"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="senha" className="text-sm font-medium text-gray-600">Senha</label>
                  <input
                    name="senha"
                    id="senha"
                    type="password"
                    onChange={handleChange}
                    value={form.senha}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Senha"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="tipo" className="text-sm font-medium text-gray-600">Tipo</label>
                  <select
                    name="tipo"
                    id="tipo"
                    onChange={handleChange}
                    value={form.tipo}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pf">Pessoa Física</option>
                    <option value="pj">Pessoa Jurídica</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="origem" className="text-sm font-medium text-gray-600">Origem Cliente*</label>
                  <select
                    name="origem"
                    id="origem"
                    onChange={handleChange}
                    value={form.origem}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    <option value="cliente">Cliente</option>
                    <option value="garantia">Garantia</option>
                    <option value="fabricante">Fabricante</option>
                    <option value="parceiro">Parceiro</option>
                    <option value="fornecedor">Fornecedor</option>
                    <option value="visita">Visita</option>
                    <option value="remoto">Remoto</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="aniversario" className="text-sm font-medium text-gray-600">Aniversário</label>
                  <input
                    name="aniversario"
                    id="aniversario"
                    type="date"
                    onChange={handleChange}
                    value={form.aniversario}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cadastradoPor" className="text-sm font-medium text-gray-600">Cadastrado por</label>
                  <input
                    name="cadastradoPor"
                    id="cadastradoPor"
                    onChange={handleChange}
                    value={form.cadastradoPor}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cadastrado por"
                  />
                </div>
              </div>
            </section>

            {/* Endereço */}
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-4">Endereço</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label htmlFor="cep" className="text-sm font-medium text-gray-600">CEP</label>
                  <input
                    name="cep"
                    id="cep"
                    onChange={handleChange}
                    value={form.cep}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CEP"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="rua" className="text-sm font-medium text-gray-600">Rua</label>
                  <input
                    name="rua"
                    id="rua"
                    onChange={handleChange}
                    value={form.rua}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Rua"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="numero" className="text-sm font-medium text-gray-600">Número</label>
                  <input
                    name="numero"
                    id="numero"
                    onChange={handleChange}
                    value={form.numero}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Número"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="complemento" className="text-sm font-medium text-gray-600">Complemento</label>
                  <input
                    name="complemento"
                    id="complemento"
                    onChange={handleChange}
                    value={form.complemento}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Complemento"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="bairro" className="text-sm font-medium text-gray-600">Bairro</label>
                  <input
                    name="bairro"
                    id="bairro"
                    onChange={handleChange}
                    value={form.bairro}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bairro"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cidade" className="text-sm font-medium text-gray-600">Cidade</label>
                  <input
                    name="cidade"
                    id="cidade"
                    onChange={handleChange}
                    value={form.cidade}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cidade"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="estado" className="text-sm font-medium text-gray-600">Estado</label>
                  <input
                    name="estado"
                    id="estado"
                    onChange={handleChange}
                    value={form.estado}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Estado"
                  />
                </div>
              </div>
            </section>

            {/* Detalhes Extras */}
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-4">Detalhes Extras</h2>
              <div>
                <label htmlFor="observacoes" className="text-sm font-medium text-gray-600 mb-1 block">Observações</label>
                <textarea
                  name="observacoes"
                  id="observacoes"
                  onChange={handleChange}
                  value={form.observacoes}
                  placeholder="Observações"
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm w-full h-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </section>

            {/* Ações */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                className="btn-outline"
                onClick={handleBack}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
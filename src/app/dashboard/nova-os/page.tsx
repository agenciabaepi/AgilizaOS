'use client';
import { useState } from 'react';
import Select from 'react-select';
import { FiSmartphone, FiCalendar, FiCheckCircle } from 'react-icons/fi';
import { FiUserPlus } from 'react-icons/fi';
import '@/styles/animations.css'; // precisa existir esse CSS

export default function NovaOSPage() {
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState("analise");
  const [pecaSelecionada, setPecaSelecionada] = useState("");
  const [servicoSelecionado, setServicoSelecionado] = useState("");

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
    <div className="flex justify-center px-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl p-8 border border-gray-100 space-y-8">
      <h1 className="text-3xl font-semibold text-blue-600 mb-6 tracking-tight">Nova Ordem de Serviço</h1>

      {/* Novo formulário elegante em seções */}
      <div>
        <form>
          <div className="space-y-8">
            {/* Seção: Cliente */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-blue-600">Informações do Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      options={[
                        { value: 'joao', label: 'João Silva' },
                        { value: 'maria', label: 'Maria Souza' },
                      ]}
                      placeholder="Selecionar cliente"
                      className="w-full text-sm"
                      onChange={(selected) => console.log(selected?.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="p-3 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                  >
                    <FiUserPlus />
                  </button>
                </div>
              </div>
            </div>

            {/* Seção: Aparelho */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-blue-600">Informações do Aparelho</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <FiSmartphone className="absolute top-3 left-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Modelo do aparelho"
                    className="w-full pl-10 border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="relative">
                  <FiCalendar className="absolute top-3 left-3 text-gray-400" />
                  <input
                    type="date"
                    className="w-full pl-10 border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Seção: Responsáveis */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-blue-600">Responsáveis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  options={[
                    { value: 'marcos', label: 'Marcos' },
                    { value: 'ana', label: 'Ana' },
                    { value: 'paulo', label: 'Paulo' },
                  ]}
                  placeholder="Selecionar técnico"
                  className="w-full text-sm"
                  onChange={(selected) => console.log(selected?.value)}
                />
                <Select
                  options={[
                    { value: 'camila', label: 'Camila' },
                    { value: 'joao', label: 'João' },
                  ]}
                  placeholder="Selecionar atendente"
                  className="w-full text-sm"
                  onChange={(selected) => console.log(selected?.value)}
                />
                <input
                  type="date"
                  className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Seção: Status + Serviços e Peças */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-blue-600">Status e Aplicações</h3>
              <div className="relative">
                <FiCheckCircle className="absolute top-3 left-3 text-gray-400" />
                <select
                  className="w-full pl-10 outline-none focus:ring-2 focus:ring-blue-500 text-sm border rounded-lg px-4 py-3"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="analise">Em análise</option>
                  <option value="orcamento">Orçamento enviado</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>

              {status === "aprovado" && (
                <div className="transition-all duration-500 ease-in-out animate-fadeIn">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                      <div className="flex gap-3">
                        <div className="w-full">
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
                            onChange={(selected) => setServicoSelecionado(selected?.value || "")}
                            placeholder="Selecionar serviço"
                            className="w-full text-sm"
                          />
                        </div>
                        <input
                          type="number"
                          value={qtdServico}
                          onChange={(e) => setQtdServico(Number(e.target.value))}
                          className="w-24 border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          readOnly
                          className="w-32 border rounded px-3 py-2 text-center bg-gray-50"
                          value={
                            servicoSelecionado && servicos[servicoSelecionado]
                              ? `R$ ${(servicos[servicoSelecionado].preco * qtdServico).toFixed(2)}`
                              : ""
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Peça</label>
                      <div className="flex gap-3">
                        <div className="w-full">
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
                            onChange={(selected) => setPecaSelecionada(selected?.value || "")}
                            placeholder="Selecionar peça"
                            className="w-full text-sm"
                          />
                        </div>
                        <input
                          type="number"
                          value={qtdPeca}
                          onChange={(e) => setQtdPeca(Number(e.target.value))}
                          className="w-24 border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          readOnly
                          className="w-32 border rounded px-3 py-2 text-center bg-gray-50"
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
            </div>

            {/* Seção: Termo de Garantia */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-blue-600">Termo de Garantia</h3>
              <Select
                options={[
                  { value: 'padrao', label: 'Termo Padrão (90 dias)' },
                  { value: 'personalizado', label: 'Termo Personalizado' },
                ]}
                placeholder="Selecionar termo"
                className="w-full text-sm"
                onChange={(selected) => console.log(selected?.value)}
                isSearchable
              />
            </div>

            {/* Seção: Observações */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-blue-600">Observações</h3>
              <textarea
                placeholder="Relato do cliente"
                className="w-full border rounded px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows={3}
              />
              <textarea
                placeholder="Observações internas"
                className="w-full border rounded px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                rows={3}
              />
            </div>

            {/* Seção: Imagens e Envio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagem de Entrada</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-sm text-gray-700 border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagem de Saída</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-sm text-gray-700 border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Salvar OS
              </button>
            </div>
          </div>
        </form>
      </div>
      {/* Modal para cadastrar novo cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Cadastrar Novo Cliente</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome completo"
                className="col-span-2 border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Telefone"
                className="border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Celular (opcional)"
                className="border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="E-mail (opcional)"
                className="col-span-2 border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="CNPJ/CPF (opcional)"
                className="border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="CEP (opcional)"
                className="border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Origem Cliente*</option>
                <option value="indicacao">Indicação</option>
                <option value="google">Google</option>
                <option value="instagram">Instagram</option>
              </select>
              <select className="border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Cadastrado por</option>
                <option value="computadores">Computadores Geral</option>
                <option value="celulares">Celulares Geral</option>
              </select>
              <div className="col-span-2 flex justify-between items-center mt-4">
                <button type="button" className="text-blue-600 text-sm underline">
                  Fazer cadastro completo
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
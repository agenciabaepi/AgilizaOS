'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { FiClipboard, FiSave, FiBox, FiTool, FiCamera, FiFileText, FiPlay, FiCheck, FiDollarSign, FiFlag } from 'react-icons/fi';
import MenuLayout from '@/components/MenuLayout';

export default function DetalheBancadaPage() {
  const params = useParams();
  const id = params?.id as string;
  const [laudo, setLaudo] = useState('');
  const [status, setStatus] = useState('Em análise');
  const [peca, setPeca] = useState('');
  const [servico, setServico] = useState('');
  const [precoPeca, setPrecoPeca] = useState('0.00');
  const [precoServico, setPrecoServico] = useState('0.00');


  const steps = [
    { label: 'Orçamento', icon: <FiFileText /> },
    { label: 'Aberto', icon: <FiPlay /> },
    { label: 'Andamento', icon: <FiTool /> },
    { label: 'Concluído', icon: <FiCheck /> },
    { label: 'Faturado', icon: <FiDollarSign /> },
    { label: 'Finalizado', icon: <FiFlag /> }
  ];

  return (
    <MenuLayout>
      <div className="px-10 py-8 max-w-7xl mx-auto">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center gap-2"
        >
          ← Voltar para Bancada
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <FiClipboard className="text-blue-600" />
          Ordem #{id}
        </h1>

        {/* Barra de progresso da OS */}
        <div className="mb-10">
          <div className="flex items-center justify-between gap-4">
            {steps.map((step, index, arr) => (
              <div key={step.label} className="flex-1 flex flex-col items-center relative">
                <div className={`z-10 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${index === 2 ? 'bg-blue-600 shadow-lg' : 'bg-gray-300'}`}>
                  {step.icon}
                </div>
                <span className={`mt-2 text-sm ${index === 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>{step.label}</span>
                {index < arr.length - 1 && (
                  <div className="absolute top-5 left-1/2 w-full h-1 bg-gray-200 z-0">
                    <div className={`h-1 ${index < 2 ? 'bg-blue-600' : 'bg-gray-300'} transition-all duration-300`} style={{ width: '100%' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <FiClipboard className="text-blue-600" />
            Detalhes da OS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 text-sm text-gray-700">
            <div>
              <p className="text-[13px] font-medium text-gray-500 mb-1">Status da OS</p>
              <p className="text-base text-gray-800">Aguardando técnico</p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500 mb-1">Modelo do Aparelho</p>
              <p className="text-base text-gray-800">iPhone 11 - Preto - 128GB - IMEI: 123456789012345</p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500 mb-1">Relato do cliente</p>
              <p className="text-base text-gray-800 leading-snug">
                Aparelho não liga mesmo após carregamento o dia todo
              </p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-500 mb-1">Acessórios</p>
              <p className="text-base text-gray-800">Carregador original e capinha</p>
            </div>
            <div className="lg:col-span-3">
              <p className="text-[13px] font-medium text-gray-500 mb-1">Checklist</p>
              <p className="text-base text-gray-800">Senha informada (1234), sem biometria, conta Google ativa</p>
            </div>
          </div>
        </section>

        <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Status Técnico */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiClipboard className="text-blue-600" />
                Status Técnico
              </h2>
              <select
                className="w-full border border-gray-300 px-4 py-2 rounded-lg text-sm focus:ring focus:ring-blue-100"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option>Em análise</option>
                <option>Aguardando peça</option>
                <option>Reparo concluído</option>
                <option>Sem conserto</option>
              </select>
            </div>
            {/* Peça utilizada */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiBox className="text-blue-600" />
                Peça utilizada
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg text-sm focus:ring focus:ring-blue-100"
                  placeholder="Buscar peça..."
                  value={peca}
                  onChange={(e) => {
                    setPeca(e.target.value);
                    if (e.target.value === 'Bateria iPhone 11') setPrecoPeca('150.00');
                    else if (e.target.value === 'Tela Galaxy A10') setPrecoPeca('200.00');
                    else if (e.target.value === 'Carregador USB-C') setPrecoPeca('90.00');
                    else setPrecoPeca('0.00');
                  }}
                  list="pecas"
                />
                <datalist id="pecas">
                  <option value="Bateria iPhone 11" />
                  <option value="Tela Galaxy A10" />
                  <option value="Carregador USB-C" />
                </datalist>
                <div className="flex items-center gap-3 col-span-full">
                  <span className="text-sm text-gray-600">Preço:</span>
                  <span className="text-base font-semibold text-blue-600">R$ {precoPeca}</span>
                  <span className="text-sm text-gray-400 ml-4">Alterar:</span>
                  <input
                    type="text"
                    className="border border-gray-300 px-2 py-1 rounded-md w-24 text-sm"
                    value={precoPeca}
                    onChange={(e) => setPrecoPeca(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Serviço realizado */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiTool className="text-blue-600" />
              Serviço realizado
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                className="w-full border border-gray-300 px-4 py-2 rounded-lg text-sm focus:ring focus:ring-blue-100"
                placeholder="Buscar serviço..."
                value={servico}
                onChange={(e) => setServico(e.target.value)}
                list="servicos"
              />
              <datalist id="servicos">
                <option value="Troca de bateria" />
                <option value="Troca de tela" />
                <option value="Atualização de sistema" />
              </datalist>
              <div className="flex items-center gap-3 col-span-full">
                <span className="text-sm text-gray-600">Preço:</span>
                <span className="text-base font-semibold text-blue-600">R$ {precoServico}</span>
                <span className="text-sm text-gray-400 ml-4">Alterar:</span>
                <input
                  type="text"
                  className="border border-gray-300 px-2 py-1 rounded-md w-24 text-sm"
                  value={precoServico}
                  onChange={(e) => setPrecoServico(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Imagens */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiCamera className="text-blue-600" />
              Imagens do aparelho
            </h2>
            <input
              type="file"
              multiple
              accept="image/*"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0 file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Laudo Técnico */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiClipboard className="text-blue-600" />
              Laudo Técnico
            </h2>
            <textarea
              className="w-full border border-gray-300 px-4 py-3 rounded-lg text-sm min-h-[200px] focus:ring focus:ring-blue-100"
              value={laudo}
              onChange={(e) => setLaudo(e.target.value)}
              placeholder="Descreva o diagnóstico técnico com todos os detalhes relevantes..."
            />
          </div>

          <div className="pt-2">
            <button className="w-fit inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
              <FiSave /> Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}
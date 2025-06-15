'use client';
import { useState } from 'react';
import logo from '@/assets/imagens/logobranco.png';
import Image from 'next/image';
import { FaUserFriends, FaBriefcase, FaRocket } from 'react-icons/fa';

export default function CadastroEmpresa() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    nomeEmpresa: '',
    cidade: '',
    plano: 'pro'
  });

  const progress = (step / 3) * 100;

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlanoSelect = (plano: string) => {
    setForm({ ...form, plano });
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/empresa/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(`Erro ao criar empresa: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(data);
      alert("Cadastro realizado com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao criar sua conta. Por favor, tente novamente.");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#cffb6d] to-white animate-backgroundBlur z-0" />
      <div className="relative z-10 w-full max-w-3xl space-y-6">
        <div className="flex justify-center mb-6">
          <Image src={logo} alt="" width={200} height={60} priority className="mx-auto" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-[#000] text-center">Crie sua conta no ConsertOS</h1>
        <p className="text-center text-green-700 font-medium text-sm mb-4">
          Experimente gratuitamente por 15 dias. Sem cartão de crédito!
        </p>
        <div className="w-full p-8 bg-white rounded-2xl shadow-lg">
          <div className="relative mb-6 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-[#000] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="min-h-[560px] h-[560px] overflow-hidden relative transition-all">
            {step === 1 && (
              <div
                key={`step3-${step}`}
                className="w-full gap-3 flex flex-col transition-opacity duration-200"
              >
                <h2 className="text-xl font-bold mb-4">Escolha seu plano</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Básico */}
                  <div
                    onClick={() => handlePlanoSelect('basico')}
                    className={`group cursor-pointer border-2 ${
                      form.plano === 'basico' ? 'border-green-600' : 'border-gray-300'
                    } bg-white p-0 shadow-md rounded-xl transition-all duration-300 ease-in-out`}
                  >
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white rounded-xl p-5 transition-all duration-300 ease-in-out">
                      <FaUserFriends className="text-4xl text-black mb-4 group-hover:text-green-600 transition-all duration-300 ease-in-out" />
                      <div className="text-center flex flex-col gap-3">
                        <p className="font-semibold text-lg">Básico</p>
                        <p className="text-green-600 font-bold text-sm">R$ 29/mês</p>
                        <p className="text-sm text-gray-500">Até 2 usuários</p>
                        <ul className="text-xs text-gray-400 mt-2 space-y-1 text-left">
                          <li>• Cadastro de OS</li>
                          <li>• Histórico do cliente</li>
                          <li>• Geração de PDF simples</li>
                        </ul>
                        {form.plano === 'basico' && (
                          <p className="text-xs font-bold text-green-600 mt-1">Selecionado</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pro */}
                  <div
                    onClick={() => handlePlanoSelect('pro')}
                    className={`group cursor-pointer border-2 ${
                      form.plano === 'pro' ? 'border-green-600' : 'border-gray-300'
                    } bg-white p-0 shadow-md rounded-xl transition-all duration-300 ease-in-out`}
                  >
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white rounded-xl p-5 transition-all duration-300 ease-in-out">
                      <FaBriefcase className="text-4xl text-black mb-4 group-hover:text-green-600 transition-all duration-300 ease-in-out" />
                      <div className="text-center flex flex-col gap-3">
                        <p className="font-semibold text-lg">Pro</p>
                        <p className="text-green-600 font-bold text-sm">R$ 59/mês</p>
                        <p className="text-sm text-gray-500">Até 5 usuários + financeiro</p>
                        <ul className="text-xs text-gray-400 mt-2 space-y-1 text-left">
                          <li>• Tudo do plano Básico</li>
                          <li>• Financeiro integrado</li>
                          <li>• Estoque de peças</li>
                        </ul>
                        {form.plano === 'pro' && (
                          <p className="text-xs font-bold text-green-600 mt-1">Selecionado</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Avançado */}
                  <div
                    onClick={() => handlePlanoSelect('avancado')}
                    className={`group cursor-pointer border-2 ${
                      form.plano === 'avancado' ? 'border-green-600' : 'border-gray-300'
                    } bg-white p-0 shadow-md rounded-xl transition-all duration-300 ease-in-out`}
                  >
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white rounded-xl p-5 transition-all duration-300 ease-in-out">
                      <FaRocket className="text-4xl text-black mb-4 group-hover:text-green-600 transition-all duration-300 ease-in-out" />
                      <div className="text-center flex flex-col gap-3">
                        <p className="font-semibold text-lg">Avançado</p>
                        <p className="text-green-600 font-bold text-sm">R$ 89/mês</p>
                        <p className="text-sm text-gray-500">Até 10 usuários + WhatsApp</p>
                        <ul className="text-xs text-gray-400 mt-2 space-y-1 text-left">
                          <li>• Tudo do plano Pro</li>
                          <li>• Relatórios de comissão</li>
                          <li>• Integração com WhatsApp</li>
                        </ul>
                        {form.plano === 'avancado' && (
                          <p className="text-xs font-bold text-green-600 mt-1">Selecionado</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-green-600 text-sm text-center">
                  🎁 15 dias grátis para começar. Sem cartão de crédito.
                </div>
                <div className="mt-2 text-gray-500 text-xs flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                  Você poderá mudar de plano a qualquer momento no painel.
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleNext}
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900 transition"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div
                key={`step1-${step}`}
                className="w-full gap-3 flex flex-col transition-opacity duration-200"
              >
                <h2 className="text-xl font-bold mb-4">Dados do responsável</h2>
                <input type="text" name="nome" placeholder="Nome completo" className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition" value={form.nome} onChange={handleChange} />
                <div className="text-sm text-gray-600">Digite seu nome completo.</div>
                <input type="email" name="email" placeholder="E-mail" className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition" value={form.email} onChange={handleChange} />
                <div className="text-sm text-gray-600">Informe um e-mail válido.</div>
                <input type="password" name="senha" placeholder="Senha" className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition" value={form.senha} onChange={handleChange} />
                <div className="text-sm text-gray-600">Crie uma senha segura.</div>
                <input type="password" name="confirmarSenha" placeholder="Confirmar senha" className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition" value={form.confirmarSenha || ''} onChange={handleChange} />
                <div className="text-sm text-gray-600">Repita sua senha para confirmar.</div>
                <div className="flex justify-between mt-6">
                  <button
                    onClick={handleBack}
                    className="bg-gray-200 text-black px-4 py-2 rounded hover:bg-gray-300 transition"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleNext}
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900 transition"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div
                key={`step2-${step}`}
                className="w-full gap-3 flex flex-col transition-opacity duration-200"
              >
                <h2 className="text-xl font-bold mb-4">Dados da empresa</h2>
                <input type="text" name="nomeEmpresa" placeholder="Nome da empresa" className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition" value={form.nomeEmpresa} onChange={handleChange} />
                <div className="text-sm text-gray-600">Nome oficial da sua empresa.</div>
                <input type="text" name="cidade" placeholder="Cidade" className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition" value={form.cidade} onChange={handleChange} />
                <div className="text-sm text-gray-600">Cidade onde sua empresa está localizada.</div>
                <div className="flex justify-between mt-6">
                  <button
                    onClick={handleBack}
                    className="bg-gray-200 text-black px-4 py-2 rounded hover:bg-gray-300 transition"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900 transition"
                  >
                    Finalizar Cadastro
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <footer className="text-xs text-gray-400 text-center mt-8">
          © 2025 ConsertOS. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  );
}
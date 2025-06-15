'use client';
import { useState } from 'react';
import logo from '@/assets/imagens/logobranco.png';
import Image from 'next/image';
import { FaTools, FaMicrochip, FaCloud, FaCogs } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function CadastroEmpresa() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
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
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-10 text-black/10 animate-pulse-slow">
          <FaTools size={100} />
        </div>
        <div className="absolute bottom-10 right-10 text-black/10 animate-pulse-slow">
          <FaMicrochip size={100} />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black/5 animate-pulse-slow">
          <FaCloud size={200} />
        </div>
        <div className="absolute bottom-20 left-1/3 text-black/10 animate-pulse-slow">
          <FaCogs size={80} />
        </div>
      </div>
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
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key={`step1-${step}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="max-w-2xl mx-auto gap-3 flex flex-col transition-opacity duration-300 animate-fade-in-up"
              >
                <h2 className="text-xl font-bold mb-4">Dados do responsável</h2>
                <input type="text" name="nome" placeholder="Nome completo" className="input" value={form.nome} onChange={handleChange} />
                <div className="text-sm text-gray-600">Digite seu nome completo.</div>
                <input type="email" name="email" placeholder="E-mail" className="input" value={form.email} onChange={handleChange} />
                <div className="text-sm text-gray-600">Informe um e-mail válido.</div>
                <input type="password" name="senha" placeholder="Senha" className="input" value={form.senha} onChange={handleChange} />
                <div className="text-sm text-gray-600">Crie uma senha segura.</div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleNext}
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900 transition"
                  >
                    Próximo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 2 && (
              <motion.div
                key={`step2-${step}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="max-w-2xl mx-auto gap-3 flex flex-col transition-opacity duration-300 animate-fade-in-up"
              >
                <h2 className="text-xl font-bold mb-4">Dados da empresa</h2>
                <input type="text" name="nomeEmpresa" placeholder="Nome da empresa" className="input" value={form.nomeEmpresa} onChange={handleChange} />
                <div className="text-sm text-gray-600">Nome oficial da sua empresa.</div>
                <input type="text" name="cidade" placeholder="Cidade" className="input" value={form.cidade} onChange={handleChange} />
                <div className="text-sm text-gray-600">Cidade onde sua empresa está localizada.</div>
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
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 3 && (
              <motion.div
                key={`step3-${step}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="max-w-2xl mx-auto gap-3 flex flex-col transition-opacity duration-300 animate-fade-in-up"
              >
                <h2 className="text-xl font-bold mb-4">Escolha seu plano</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    onClick={() => handlePlanoSelect('basico')}
                    className={`p-6 border rounded cursor-pointer flex flex-col items-center space-y-2 hover:shadow-lg transition active:scale-95 ${form.plano === 'basico' ? 'border-black' : 'border-gray-300'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h4l3 8 4-16 3 8h4" />
                    </svg>
                    <div>
                      <strong className="capitalize">Básico</strong>
                      {form.plano === 'basico' && (
                        <span className="text-xs font-semibold text-green-600">Selecionado</span>
                      )}
                    </div>
                    <p className="text-sm text-center">Até 2 usuários</p>
                  </div>
                  <div
                    onClick={() => handlePlanoSelect('pro')}
                    className={`p-6 border rounded cursor-pointer flex flex-col items-center space-y-2 hover:shadow-lg transition active:scale-95 ${form.plano === 'pro' ? 'border-black' : 'border-gray-300'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l1.414-1.414M7.05 7.05L5.636 5.636" />
                    </svg>
                    <div>
                      <strong className="capitalize">Pro</strong>
                      {form.plano === 'pro' && (
                        <span className="text-xs font-semibold text-green-600">Selecionado</span>
                      )}
                    </div>
                    <p className="text-sm text-center">Até 5 usuários + financeiro</p>
                  </div>
                  <div
                    onClick={() => handlePlanoSelect('avancado')}
                    className={`p-6 border rounded cursor-pointer flex flex-col items-center space-y-2 hover:shadow-lg transition active:scale-95 ${form.plano === 'avancado' ? 'border-black' : 'border-gray-300'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4h3v-4h2v4h3l-4 4z" />
                    </svg>
                    <div>
                      <strong className="capitalize">Avançado</strong>
                      {form.plano === 'avancado' && (
                        <span className="text-xs font-semibold text-green-600">Selecionado</span>
                      )}
                    </div>
                    <p className="text-sm text-center">Até 10 usuários + WhatsApp</p>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <footer className="text-xs text-gray-400 text-center mt-8">
          © 2025 ConsertOS. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  );
}
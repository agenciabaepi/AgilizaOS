'use client';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import logo from '@/assets/imagens/logobranco.png';
import Image from 'next/image';
import {
  FaUserFriends,
  FaBriefcase,
  FaRocket,
  FaUser,
  FaBoxOpen,
  FaTools,
  FaDollarSign,
  FaChartLine,
  FaFileInvoice,
  FaUserShield,
  FaProjectDiagram,
  FaMobileAlt,
  FaWhatsapp,
  FaEye,
  FaEyeSlash,
  FaBuilding,
  FaMapMarkerAlt,
  FaGlobe
} from 'react-icons/fa';
import { mask as masker } from 'remask';

export default function CadastroEmpresa() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    whatsapp: '',
    plano: 'pro',
    cpf: '',
    // Campos da empresa
    nomeEmpresa: '',
    cidade: '',
    endereco: '',
    website: '',
    cnpj: ''
  });
  const [emailValido, setEmailValido] = useState(true);
  const [senhasIguais, setSenhasIguais] = useState(true);
  const [emailError, setEmailError] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [cnpjError, setCnpjError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const progress = (step / 3) * 100; // Agora são 3 passos

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlanoSelect = (plano: string) => {
    setForm({ ...form, plano });
  };

  async function verificarEmail(email: string) {
    const res = await fetch('/api/verificar/email', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await res.json();
    return result.exists;
  }

  async function verificarCPF(cpf: string) {
    const res = await fetch('/api/verificar/cpf', {
      method: 'POST',
      body: JSON.stringify({ cpf }),
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await res.json();
    return result.exists;
  }

  async function verificarCNPJ(cnpj: string) {
    const res = await fetch('/api/verificar/cnpj', {
      method: 'POST',
      body: JSON.stringify({ cnpj }),
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await res.json();
    return result.exists;
  }

  React.useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValido(emailRegex.test(form.email));
    setSenhasIguais(form.senha === form.confirmarSenha);
  }, [form.email, form.senha, form.confirmarSenha]);

  // Verificação de email já existente
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (form.email && form.email.length > 5) {
        const exists = await verificarEmail(form.email);
        setEmailError(exists ? 'Este e-mail já está em uso.' : '');
      } else {
        setEmailError('');
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [form.email]);

  // Verificação de CPF já existente com debounce
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const raw = form.cpf.replace(/\D/g, '');
      if (raw.length === 11) {
        const exists = await verificarCPF(raw);
        setCpfError(exists ? 'Este CPF já está em uso.' : '');
      } else {
        setCpfError('');
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [form.cpf]);

  // Verificação de CNPJ já existente com debounce
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const raw = form.cnpj.replace(/\D/g, '');
      if (raw.length === 14) {
        const exists = await verificarCNPJ(raw);
        setCnpjError(exists ? 'Este CNPJ já está em uso.' : '');
      } else {
        setCnpjError('');
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [form.cnpj]);

  const validarFormulario = () => {
    if (
      !form.nome ||
      !form.email ||
      !form.senha ||
      !form.confirmarSenha ||
      !form.whatsapp ||
      !form.nomeEmpresa ||
      !form.cidade ||
      !form.endereco
    ) {
      alert("Preencha todos os campos obrigatórios.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      alert("Informe um e-mail válido.");
      return false;
    }
    if (form.senha.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return false;
    }
    if (form.senha !== form.confirmarSenha) {
      alert("As senhas não coincidem.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!validarFormulario()) return;
    
    // Remove máscaras antes de enviar
    const cpfLimpo = form.cpf.replace(/\D/g, '');
    const cnpjLimpo = form.cnpj.replace(/\D/g, '');
    
    // Prepara o corpo da requisição
    const payload = {
      nome: form.nome,
      email: form.email,
      senha: form.senha,
      nomeEmpresa: form.nomeEmpresa,
      whatsapp: form.whatsapp,
      plano: form.plano,
      cpf: cpfLimpo,
      cnpj: cnpjLimpo,
      cidade: form.cidade,
      endereco: form.endereco,
      website: form.website,
    };
    
    try {
      const res = await fetch('/api/empresa/criar', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      
      const text = await res.text();
      let result;

      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error('Resposta não é um JSON válido:', text);
        toast.error('Erro inesperado no servidor.');
        return;
      }
      
      if (!res.ok) {
        if (result.error?.toLowerCase().includes('e-mail já cadastrado')) {
          setEmailError('Este e-mail já está em uso.');
          toast.error('Este e-mail já está em uso.');
        } else if (result.error?.toLowerCase().includes('cpf já cadastrado')) {
          setCpfError('Este CPF já está em uso.');
          toast.error('Este CPF já está em uso.');
        } else if (result.error?.toLowerCase().includes('cnpj já cadastrado')) {
          setCnpjError('Este CNPJ já está em uso.');
          toast.error('Este CNPJ já está em uso.');
        } else {
          toast.error(`Erro ao cadastrar: ${result.error || 'Tente novamente.'}`);
        }
        return;
      }
      
      toast.success('Cadastro realizado com sucesso!');
      
      // Aguarda um pouco antes de redirecionar
      setTimeout(() => {
        router.push('/cadastro/sucesso');
      }, 3000);
      
    } catch (error: unknown) {
      console.error('Erro no try/catch:', error);
      toast.error('Erro ao cadastrar. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4">
      <div className="absolute top-0 left-0 w-full h-[400px] bg-black z-10 [clip-path:ellipse(140%_100%_at_50%_0%)]" />
      <div className="absolute top-[0px] left-0 w-full h-full bg-gradient-to-br from-[#cffb6d] to-white z-0" />
      <div className="relative z-20 w-full max-w-3xl space-y-6">
        <div className="flex justify-center mb-6">
          <Image src={logo} alt="" width={200} height={60} priority className="mx-auto" />
        </div>
        <p className="text-center text-green-700 font-medium text-sm mb-4">
          Experimente gratuitamente por 15 dias. Sem cartão de crédito!
        </p>
        <div className="w-full max-w-7xl mx-auto p-8 bg-white rounded-[32px] shadow-xl overflow-visible min-h-[760px]">
          <h1 className="text-4xl font-semibold tracking-tight text-[#000] text-center mb-4">Crie sua conta</h1>
          <div className="relative mb-6 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-[#000] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="h-auto min-h-[560px] overflow-visible relative transition-all">
            {step === 1 && (
              <div
                key={`step1-${step}`}
                className="w-full gap-3 flex flex-col transition-opacity duration-200"
              >
                <h2 className="text-xl font-bold mb-4">Escolha seu plano</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  {/* Básico */}
                  <div
                    onClick={() => handlePlanoSelect('basico')}
                    className={`group cursor-pointer z-20 border-2 ${
                      form.plano === 'basico' ? 'border-green-600' : 'border-gray-300'
                    } bg-green-50 p-4 shadow-md rounded-2xl transition-all duration-300 ease-in-out hover:scale-[1.02] ring-1 ring-transparent hover:ring-green-400 relative`}
                  >
                    <div className="flex flex-row items-center justify-center w-full max-w-[400px] rounded-2xl p-4 transition-all duration-300 ease-in-out">
                      <div className="flex flex-col items-center justify-center">
                        <FaUserFriends className="text-4xl text-green-600 mb-4 group-hover:text-green-700 transition-all duration-300 ease-in-out" />
                        <div className="flex flex-col items-center text-center gap-1">
                          <p className="font-bold text-xl text-black">Básico</p>
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Sistema completo para começar</span>
                          <p className="text-sm text-gray-500 mt-1">1 usuário, 1 técnico, sistema de OS completo</p>
                          <p className="text-green-600 font-extrabold text-lg mt-2">R$ 129,90/mês</p>
                          <p className="text-xs text-gray-400">Inclui:</p>
                          <ul className="text-xs text-gray-500 mt-3 space-y-1 text-left">
                            <li className="flex items-center gap-2">
                              <FaUser className="text-green-600" />
                              <span>Cadastro de clientes</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaBoxOpen className="text-green-600" />
                              <span>Cadastro de produtos e serviços</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaTools className="text-green-600" />
                              <span>Sistema de OS completo</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaChartLine className="text-green-600" />
                              <span>Relatórios simples de atendimento</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaUserShield className="text-green-600" />
                              <span>Segurança de dados na nuvem</span>
                            </li>
                          </ul>
                        </div>
                        {form.plano === 'basico' && (
                          <p className="text-xs font-bold text-green-600 mt-1">Selecionado</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pro */}
                  <div
                    onClick={() => handlePlanoSelect('pro')}
                    className={`group cursor-pointer z-20 border-2 ${
                      form.plano === 'pro' ? 'border-green-600' : 'border-gray-300'
                    } bg-green-50 p-4 shadow-md rounded-2xl transition-all duration-300 ease-in-out hover:scale-[1.02] ring-1 ring-transparent hover:ring-green-400 relative`}
                  >
                    <div className="absolute top-2 right-2 bg-black text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-wide">
                      Popular
                    </div>
                    <div className="flex flex-row items-center justify-center w-full max-w-[400px] rounded-2xl p-4 transition-all duration-300 ease-in-out">
                      <div className="flex flex-col items-center justify-center">
                        <FaBriefcase className="text-4xl text-green-600 mb-4 group-hover:text-green-700 transition-all duration-300 ease-in-out" />
                        <div className="flex flex-col items-center text-center gap-1">
                          <p className="font-bold text-xl text-black">Pro</p>
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Plano completo para equipes</span>
                          <p className="text-sm text-gray-500 mt-1">5 usuários, 5 técnicos e muito mais</p>
                          <p className="text-green-600 font-extrabold text-lg mt-2">R$ 189,90/mês</p>
                          <p className="text-xs text-gray-400">Inclui:</p>
                          <ul className="text-xs text-gray-500 mt-3 space-y-1 text-left">
                            <li className="flex items-center gap-2">
                              <FaDollarSign className="text-green-600" />
                              <span>Controle financeiro</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaChartLine className="text-green-600" />
                              <span>Comissão por técnico</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaFileInvoice className="text-green-600" />
                              <span>Emissão de nota fiscal</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaUserShield className="text-green-600" />
                              <span>Controle de permissões</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaBoxOpen className="text-green-600" />
                              <span>Controle de estoque detalhado</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaUserFriends className="text-green-600" />
                              <span>Gestão de equipe por permissões</span>
                            </li>
                          </ul>
                        </div>
                        {form.plano === 'pro' && (
                          <p className="text-xs font-bold text-green-600 mt-1">Selecionado</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Avançado */}
                  <div
                    onClick={() => handlePlanoSelect('avancado')}
                    className={`group cursor-pointer z-20 border-2 ${
                      form.plano === 'avancado' ? 'border-green-600' : 'border-gray-300'
                    } bg-green-50 p-4 shadow-md rounded-2xl transition-all duration-300 ease-in-out hover:scale-[1.02] ring-1 ring-transparent hover:ring-green-400 relative`}
                  >
                    <div className="flex flex-row items-center justify-center w-full max-w-[400px] rounded-2xl p-4 transition-all duration-300 ease-in-out">
                      <div className="flex flex-col items-center justify-center">
                        <FaRocket className="text-4xl text-green-600 mb-4 group-hover:text-green-700 transition-all duration-300 ease-in-out" />
                        <div className="flex flex-col items-center text-center gap-1">
                          <p className="font-bold text-xl text-black">Avançado</p>
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Experiência completa + automações</span>
                          <p className="text-sm text-gray-500 mt-1">10 usuários, 10 técnicos, app e automações</p>
                          <p className="text-green-600 font-extrabold text-lg mt-2">R$ 279,90/mês</p>
                          <p className="text-xs text-gray-400">Inclui:</p>
                          <ul className="text-xs text-gray-500 mt-3 space-y-1 text-left">
                            <li className="flex items-center gap-2">
                              <FaProjectDiagram className="text-green-600" />
                              <span>Kanban para OS</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaMobileAlt className="text-green-600" />
                              <span>App do técnico com notificações</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaWhatsapp className="text-green-600" />
                              <span>Integração WhatsApp</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaChartLine className="text-green-600" />
                              <span>Dashboard de performance</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <FaFileInvoice className="text-green-600" />
                              <span>Geração de relatórios personalizados</span>
                            </li>
                          </ul>
                        </div>
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
                    disabled={form.plano === ''}
                    className={`bg-black text-white px-4 py-2 rounded transition ${
                      form.plano === '' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-900'
                    }`}
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div
                key={`step2-${step}`}
                className="w-full gap-3 flex flex-col transition-opacity duration-200"
              >
                <h2 className="text-xl font-bold mb-4">Dados da Empresa</h2>
                
                <label className="text-sm text-gray-600">Nome da empresa</label>
                <input
                  type="text"
                  name="nomeEmpresa"
                  placeholder="Nome da sua empresa"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                  value={form.nomeEmpresa}
                  onChange={handleChange}
                />

                <label className="text-sm text-gray-600">CNPJ (opcional)</label>
                <input
                  type="text"
                  name="cnpj"
                  placeholder="00.000.000/0000-00"
                  className={`w-full px-4 py-3 rounded-md border ${cnpjError ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-black transition`}
                  value={form.cnpj}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setForm({ ...form, cnpj: masker(raw, ['00.000.000/0000-00']) });
                  }}
                />
                {cnpjError && <span className="text-red-500 text-xs">{cnpjError}</span>}

                <label className="text-sm text-gray-600">Cidade</label>
                <input
                  type="text"
                  name="cidade"
                  placeholder="Cidade"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                  value={form.cidade}
                  onChange={handleChange}
                />

                <label className="text-sm text-gray-600">Endereço</label>
                <input
                  type="text"
                  name="endereco"
                  placeholder="Endereço completo"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                  value={form.endereco}
                  onChange={handleChange}
                />

                <label className="text-sm text-gray-600">Website (opcional)</label>
                <input
                  type="text"
                  name="website"
                  placeholder="www.suaempresa.com.br"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                  value={form.website}
                  onChange={handleChange}
                />

                <div className="flex justify-between mt-6">
                  <button
                    onClick={handleBack}
                    className="bg-gray-200 text-black px-4 py-2 rounded hover:bg-gray-300 transition"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!form.nomeEmpresa || !form.cidade || !form.endereco}
                    className={`bg-black text-white px-4 py-2 rounded transition ${
                      !form.nomeEmpresa || !form.cidade || !form.endereco
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-900'
                    }`}
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div
                key={`step3-${step}`}
                className="w-full gap-3 flex flex-col transition-opacity duration-200"
              >
                <h2 className="text-xl font-bold mb-4">Dados do responsável</h2>
                <label className="text-sm text-gray-600">Digite seu nome completo.</label>
                <input
                  type="text"
                  name="nome"
                  placeholder="Nome completo"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                  value={form.nome}
                  onChange={handleChange}
                />
                <label className={`text-sm ${(emailError || !emailValido) ? 'text-red-500' : 'text-gray-600'}`}>
                  {emailError || (!emailValido ? 'E-mail inválido.' : 'Informe um e-mail válido.')}
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="E-mail"
                  className={`w-full px-4 py-3 rounded-md border ${(emailError || !emailValido) ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-black transition`}
                  value={form.email}
                  onChange={handleChange}
                />
                {/* Campo de senha com visibilidade */}
                <label className="text-sm text-gray-600">Crie uma senha segura.</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    name="senha"
                    placeholder="Senha"
                    className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition pr-10"
                    value={form.senha}
                    onChange={handleChange}
                  />
                  <div
                    className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                  >
                    {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
                  </div>
                </div>
                {/* Campo de confirmação de senha com visibilidade */}
                <label className={`text-sm ${senhasIguais ? 'text-gray-600' : 'text-red-500'}`}>
                  {senhasIguais ? 'Repita sua senha para confirmar.' : 'As senhas não coincidem.'}
                </label>
                <div className="relative">
                  <input
                    type={mostrarConfirmarSenha ? "text" : "password"}
                    name="confirmarSenha"
                    placeholder="Confirmar senha"
                    className={`w-full px-4 py-3 rounded-md border ${senhasIguais ? 'border-gray-300' : 'border-red-500'} focus:outline-none focus:ring-2 focus:ring-black transition pr-10`}
                    value={form.confirmarSenha || ''}
                    onChange={handleChange}
                  />
                  <div
                    className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                    onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                  >
                    {mostrarConfirmarSenha ? <FaEyeSlash /> : <FaEye />}
                  </div>
                </div>
                {/* Campo CPF */}
                <label className={`text-sm ${cpfError ? 'text-red-500' : 'text-gray-600'}`}>
                  {cpfError || 'Informe seu CPF (somente números).'}
                </label>
                <input
                  type="text"
                  name="cpf"
                  placeholder="000.000.000-00"
                  className={`w-full px-4 py-3 rounded-md border ${cpfError ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-black transition`}
                  value={form.cpf}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setForm({ ...form, cpf: masker(raw, ['999.999.999-99']) });
                  }}
                />

                <label className="text-sm text-gray-600">WhatsApp</label>
                <input
                  type="text"
                  name="whatsapp"
                  placeholder="(99) 99999-9999"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                  value={form.whatsapp}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setForm({ ...form, whatsapp: masker(raw, ['(99) 99999-9999']) });
                  }}
                />
                {/* Exibição de erro de submissão */}
                {submitError && (
                  <p className="text-red-500 text-sm mb-4">{submitError}</p>
                )}
                <div className="flex justify-between mt-6">
                  <button
                    onClick={handleBack}
                    className="bg-gray-200 text-black px-4 py-2 rounded hover:bg-gray-300 transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={
                      !form.nome ||
                      !form.email ||
                      !form.senha ||
                      !form.confirmarSenha ||
                      emailError !== '' ||
                      form.senha !== form.confirmarSenha ||
                      !form.whatsapp ||
                      !form.cpf ||
                      cpfError !== '' ||
                      cnpjError !== ''
                    }
                    className={`bg-black text-white px-4 py-2 rounded transition ${
                      !form.nome ||
                      !form.email ||
                      !form.senha ||
                      !form.confirmarSenha ||
                      emailError !== '' ||
                      form.senha !== form.confirmarSenha ||
                      !form.whatsapp ||
                      !form.cpf ||
                      cpfError !== '' ||
                      cnpjError !== ''
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-900'
                    }`}
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
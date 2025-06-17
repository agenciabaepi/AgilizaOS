'use client';
import { toast } from 'react-hot-toast';
import { useState, useEffect, useRef } from 'react';
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
  FaEyeSlash
} from 'react-icons/fa';
import { mask as masker } from 'remask';

export default function CadastroEmpresa() {
  const [tipoPessoa, setTipoPessoa] = useState<'fisica' | 'juridica'>('fisica');
  // Novos estados para existência de CPF/CNPJ
  const [cpfError, setCpfError] = useState("");
  const [isCpfDuplicado, setIsCpfDuplicado] = useState(false);
  // Novo controle para CNPJ do bloco solicitado
  const [cnpj, setCnpj] = useState('');
  const [cnpjError, setCnpjError] = useState('');
  const [cnpjVerificado, setCnpjVerificado] = useState(false);
  const timeoutRef = useRef<any>(null);
  // Mantém para CPF legado
  const [cnpjExistente, setCnpjExistente] = useState(false);
  // Toast control for legacy logic (mantido)
  const [cpfToastExibido, setCpfToastExibido] = useState(false);
  const [cnpjToastExibido, setCnpjToastExibido] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    nomeEmpresa: '',
    cidade: '',
    cnpj: '',
    cpf: '',
    endereco: '',
    whatsapp: '',
    website: '',
    plano: 'pro',
  });
  // Estado para erro de CNPJ/CPF
  const [erroCnpj, setErroCnpj] = useState('');

  const [emailValido, setEmailValido] = useState(true);
  const [senhasIguais, setSenhasIguais] = useState(true);
  const [emailError, setEmailError] = useState('');
  async function verificarEmail(email: string) {
    const res = await fetch('/api/verificar/email', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await res.json();
    setEmailError(result.exists ? 'Este e-mail já está em uso.' : '');
  }

  // Estado para existência de CPF/CNPJ (legado, pode ser removido se não usado)
  const [cpfCnpjExiste, setCpfCnpjExiste] = useState(false);
  const [cpfCnpjError, setCpfCnpjError] = useState('');
  // Novos estados separados para CPF e CNPJ já cadastrados (legado, pode ser removido se não usado)
  const [cpfCadastrado, setCpfCadastrado] = useState(false);
  const [cnpjCadastrado, setCnpjCadastrado] = useState(false);

  // Função utilitária para detectar CNPJ
  function isCNPJ(value: string) {
    const numeric = value.replace(/\D/g, "");
    return numeric.length > 11;
  }

  // Verificação de email já existente
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (form.email && form.email.length > 5) {
        await verificarEmail(form.email);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [form.email]);

  // Verificação em tempo real de CPF
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const raw = (form.cpf || '').replace(/\D/g, '');
      if (raw && raw.length === 11) {
        try {
          const response = await fetch("/api/verificar/cpf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cpf: raw }),
          });

          if (!response.ok) {
            throw new Error("Erro na verificação do CPF.");
          }

          const data = await response.json();
          if (data.exists) {
            setCpfError("Este CPF já está cadastrado.");
            setIsCpfDuplicado(true);
          } else {
            setCpfError("");
            setIsCpfDuplicado(false);
          }
        } catch (error) {
          console.error("Erro ao verificar CPF:", error);
          setCpfError("Erro ao verificar CPF.");
          setIsCpfDuplicado(true);
        }
      } else {
        setCpfError("");
        setIsCpfDuplicado(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [form.cpf]);

  // Verificação em tempo real de CNPJ
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const raw = (form.cnpj || '').replace(/\D/g, '');
      if (raw && raw.length === 14) {
        const res = await fetch("/api/verificar/cnpj", {
          method: "POST",
          body: JSON.stringify({ cnpj: raw }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.exists) {
          toast.error("CNPJ já cadastrado.");
          setCnpjExistente(true);
        } else {
          setCnpjExistente(false);
        }
      } else {
        setCnpjExistente(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [form.cnpj]);

  // Novo estado para erro de submissão
  const [submitError, setSubmitError] = useState('');

  // Estados para controle de visibilidade das senhas
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const progress = (step / 3) * 100;

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'cnpj') {
      const raw = e.target.value.replace(/\D/g, '');
      const mask = raw.length <= 11 ? '999.999.999-99' : '99.999.999/9999-99';
      setForm({ ...form, [e.target.name]: masker(raw, [mask]) });
      return;
    }
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlanoSelect = (plano: string) => {
    setForm({ ...form, plano });
  };

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValido(emailRegex.test(form.email));

    setSenhasIguais(form.senha === form.confirmarSenha);
  }, [form.email, form.senha, form.confirmarSenha]);

  const validarFormulario = () => {
    if (
      !form.nome ||
      !form.email ||
      !form.senha ||
      !form.confirmarSenha ||
      !form.nomeEmpresa ||
      !form.cidade ||
      (tipoPessoa === 'fisica' && !form.cpf)
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
    // Adiciona verificação de erro de CNPJ/CPF
    if (erroCnpj) {
      toast.error('Corrija os erros antes de continuar');
      return;
    }
    if (!validarFormulario()) return;
    try {
      const res = await fetch('/api/empresa/criar', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error === 'Email já cadastrado') {
          toast.error('Este e-mail já está em uso.');
        } else if (result.error === 'CPF já cadastrado') {
          toast.error('Este CPF já está em uso.');
        } else if (result.error === 'CNPJ já cadastrado') {
          toast.error('Este CNPJ já está em uso.');
        } else {
          toast.error('Erro ao cadastrar. Tente novamente.');
        }
        return;
      }

      toast.success('Cadastro realizado com sucesso!');
      router.push('/login');
    } catch (error: any) {
      toast.error('Erro ao cadastrar. Tente novamente.');
      console.error(error);
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
                key={`step3-${step}`}
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
                    disabled={form.plano === '' || !senhasIguais}
                    className={`bg-black text-white px-4 py-2 rounded transition ${
                      form.plano === '' || !senhasIguais ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-900'
                    }`}
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
                <label className="text-sm text-gray-600">Digite seu nome completo.</label>
                <input
                  type="text"
                  name="nome"
                  placeholder="Nome completo"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                  value={form.nome}
                  onChange={handleChange}
                />
                <label className={`text-sm ${emailValido ? 'text-gray-600' : 'text-red-500'}`}>
                  {emailValido ? 'Informe um e-mail válido.' : 'E-mail inválido.'}
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="E-mail"
                  className={`w-full px-4 py-3 rounded-md border ${emailValido ? 'border-gray-300' : 'border-red-500'} focus:outline-none focus:ring-2 focus:ring-black transition`}
                  value={form.email}
                  onChange={handleChange}
                  onBlur={() => verificarEmail(form.email)}
                />
                {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
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
                    onClick={handleNext}
                    disabled={
                      !form.nome ||
                      !form.email ||
                      !form.senha ||
                      !form.confirmarSenha ||
                      emailError !== '' ||
                      form.senha !== form.confirmarSenha
                    }
                    className={`bg-black text-white px-4 py-2 rounded transition ${
                      !form.nome ||
                      !form.email ||
                      !form.senha ||
                      !form.confirmarSenha ||
                      emailError !== '' ||
                      form.senha !== form.confirmarSenha
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
                key={`step2-${step}`}
                className="w-full gap-3 flex flex-col transition-opacity duration-200"
              >
                <h2 className="text-xl font-bold mb-4">Dados da empresa</h2>
                <label className="text-sm text-gray-600">Nome oficial da sua empresa.</label>
                <input
                  type="text"
                  name="nomeEmpresa"
                  placeholder="Nome da empresa"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                  value={form.nomeEmpresa}
                  onChange={handleChange}
                />
                <label className="text-sm text-gray-600">Cidade onde sua empresa está localizada.</label>
                <input
                  type="text"
                  name="cidade"
                  placeholder="Cidade"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                  value={form.cidade}
                  onChange={handleChange}
                />
                {/* Tipo de cadastro e CPF/CNPJ */}
                <label className="text-sm text-gray-600 mb-1">Tipo de cadastro:</label>
                <div className="flex gap-4 mb-4">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded ${
                      tipoPessoa === 'fisica' ? 'bg-black text-white' : 'bg-gray-200'
                    }`}
                    onClick={() => setTipoPessoa('fisica')}
                  >
                    Pessoa Física
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded ${
                      tipoPessoa === 'juridica' ? 'bg-black text-white' : 'bg-gray-200'
                    }`}
                    onClick={() => setTipoPessoa('juridica')}
                  >
                    Pessoa Jurídica
                  </button>
                </div>

                {tipoPessoa === 'fisica' && (
                  <>
                    <label className="text-sm text-gray-600">CPF</label>
                  <input
                    type="text"
                    name="cpf"
                    placeholder="CPF"
                    className={`w-full px-4 py-3 rounded-md border ${
                      isCpfDuplicado ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-black transition`}
                    value={form.cpf || ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setForm({ ...form, cpf: masker(raw, ['999.999.999-99']) });
                    }}
                  />
                  {cpfError && <p className="text-red-500 text-sm mt-1">{cpfError}</p>}
                  </>
                )}

                {tipoPessoa === 'juridica' && (
                  <div className="mb-4">
                    <label htmlFor="cnpj" className="text-sm text-gray-600">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      id="cnpj"
                      name="cnpj"
                      placeholder="CNPJ"
                      className={`w-full px-4 py-3 rounded-md border ${
                        cnpjError ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-black transition`}
                      value={cnpj}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        const masked = masker(raw, ['99.999.999/9999-99']);
                        setCnpj(masked);
                        setCnpjVerificado(false);
                        setCnpjError('');
                        clearTimeout(timeoutRef.current);
                        timeoutRef.current = setTimeout(async () => {
                          if (raw.length === 14) {
                            const response = await fetch('/api/verificar/cnpj', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ cnpj: raw }),
                            });
                            const data = await response.json();
                            if (data.existe) {
                              setCnpjError('Já existe uma empresa cadastrada com este CNPJ');
                              setCnpjVerificado(false);
                            } else {
                              setCnpjVerificado(true);
                              setCnpjError('');
                            }
                          }
                        }, 500);
                      }}
                    />
                    {cnpjError && (
                      <p className="mt-1 text-sm text-red-600">{cnpjError}</p>
                    )}
                  </div>
                )}

                <label className="text-sm text-gray-600">Endereço completo da empresa.</label>
                <input
                  type="text"
                  name="endereco"
                  placeholder="Endereço"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                  value={form.endereco}
                  onChange={handleChange}
                />
                <label className="text-sm text-gray-600">WhatsApp da empresa</label>
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
                <label className="text-sm text-gray-600">Site institucional ou link de rede social.</label>
                <input
                  type="text"
                  name="website"
                  placeholder="Website (opcional)"
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
                    type="submit"
                    onClick={handleSubmit}
                    disabled={
                      !form.nomeEmpresa ||
                      !form.cidade ||
                      !form.endereco ||
                      !form.whatsapp ||
                      (tipoPessoa === 'fisica' && (form.cpf.replace(/\D/g, '').length !== 11 || isCpfDuplicado)) ||
                      (tipoPessoa === 'juridica' && (!cnpj || cnpjError || !cnpjVerificado))
                    }
                    className={`px-6 py-3 rounded-md font-medium transition ${
                      !form.nomeEmpresa ||
                      !form.cidade ||
                      !form.endereco ||
                      !form.whatsapp ||
                      (tipoPessoa === 'fisica' && (form.cpf.replace(/\D/g, '').length !== 11 || isCpfDuplicado)) ||
                      (tipoPessoa === 'juridica' && (!cnpj || cnpjError || !cnpjVerificado))
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-gray-900'
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
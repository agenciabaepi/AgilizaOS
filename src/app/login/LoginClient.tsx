'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import logo from '@/assets/imagens/logopreto.png';
import { ToastProvider, useToast } from '@/components/Toast';
import { ConfirmProvider, useConfirm } from '@/components/ConfirmDialog';
import { FaEye, FaEyeSlash, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

function LoginClientInner() {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();

  // Imagens para o carrossel
  const carouselImages = [
    {
      src: '/assets/imagens/pageordens.png',
      alt: 'Consert Dashboard',
      title: 'Potencialize',
      subtitle: 'sua gestão de assistência técnica',
      description: 'Sistema completo para controle de ordens de serviço, clientes e equipe técnica com interface moderna e intuitiva.',
      isScreenshot: true
    },
    {
      src: '/assets/imagens/logobranco.png',
      alt: 'Consert Analytics',
      title: 'Analytics',
      subtitle: 'em tempo real',
      description: 'Acompanhe métricas importantes, relatórios detalhados e tome decisões baseadas em dados reais do seu negócio.',
      isScreenshot: false
    },
    {
      src: '/assets/imagens/logobranco.png',
      alt: 'Consert Mobile',
      title: 'Mobilidade',
      subtitle: 'total para sua equipe',
      description: 'Acesse o sistema de qualquer dispositivo, mantenha a produtividade e gerencie tudo de onde estiver.',
      isScreenshot: false
    }
  ];
  
  // Proteção client-side: redirecionar se já estiver logado
  useEffect(() => {
    // ✅ CORRIGIDO: Só redirecionar se realmente estiver logado e não estiver fazendo logout
    if (auth.user && auth.session && !auth.loading && !auth.isLoggingOut) {
      console.log('Usuário já logado, redirecionando para dashboard...');
      router.replace('/dashboard');
    }
  }, [auth.user, auth.session, auth.loading, auth.isLoggingOut, router]);

  // Auto-rotate do carrossel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);
  
  // Se estiver carregando ou já logado, mostrar loading
  if (auth.loading || (auth.user && auth.session && !auth.isLoggingOut)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#cffb6d] to-[#e0ffe3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
  console.log('Debug LoginClient - AuthContext:', {
    user: auth.user,
    session: auth.session,
    usuarioData: auth.usuarioData,
    empresaData: auth.empresaData,
    loading: auth.loading
  });

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Debug login - iniciando login com:', loginInput);
    setIsSubmitting(true);
    let emailToLogin = loginInput;
    
    // Verificar se é email ou usuário
    if (!loginInput.includes('@')) {
      const username = loginInput.trim().toLowerCase();
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('email')
        .eq('usuario', username)
        .single();
      if (error || !usuario?.email) {
        setIsSubmitting(false);
        addToast('error', 'Usuário não encontrado. Verifique o nome de usuário.');
        return;
      }
      emailToLogin = usuario.email;
    }
    
    // Tentar fazer login
    const {
      data: { session },
      error
    } = await supabase.auth.signInWithPassword({
      email: emailToLogin,
      password,
    });
    
    if (error) {
      setIsSubmitting(false);
      if (error.message.includes('Invalid login credentials')) {
        addToast('error', 'E-mail ou senha incorretos. Verifique suas credenciais.');
      } else if (error.message.includes('Email not confirmed')) {
        addToast('error', 'E-mail não confirmado. Verifique sua caixa de entrada.');
      } else {
        addToast('error', 'Erro ao fazer login. Tente novamente.');
      }
      return;
    }
    
    if (!session?.user) {
      setIsSubmitting(false);
      addToast('error', 'Erro ao autenticar usuário. Tente novamente.');
      return;
    }
    
    // Buscar dados do usuário
    const userId = session.user.id;
    const { data: perfil, error: perfilError } = await supabase
      .from('usuarios')
      .select('nivel')
      .eq('auth_user_id', userId)
      .single();
    
    if (perfil) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('auth_user_id', userId)
        .single();
      if (!usuario || !usuario.empresa_id) {
        router.replace('/criar-empresa');
        return;
      }
      console.log('Debug login - empresa_id:', usuario.empresa_id);
      
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('status, motivobloqueio')
        .eq('id', usuario.empresa_id)
        .single();
      
      if (empresaError) {
        console.error('Erro ao buscar empresa:', empresaError);
        addToast('error', 'Erro ao verificar status da empresa.');
        setIsSubmitting(false);
        return;
      }
      if (empresa?.status === 'bloqueado') {
        await confirm({
          title: 'Acesso bloqueado',
          message: empresa.motivobloqueio || 'Entre em contato com o suporte.',
          confirmText: 'OK',
        });
        return;
      }
      console.log('Debug login - Login bem-sucedido, redirecionando...');
      localStorage.setItem("user", JSON.stringify({
        id: userId,
        email: emailToLogin,
        nivel: perfil.nivel
      }));
      localStorage.setItem("empresa_id", usuario.empresa_id);
      console.log('Debug login - Dados salvos no localStorage, iniciando redirecionamento...');

      // Aguardar um momento para garantir que o estado seja atualizado
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirecionar diretamente para o dashboard apropriado usando router.push
      console.log('Debug login - Executando redirecionamento direto...');
      if (perfil.nivel === 'tecnico') {
        router.push('/dashboard-tecnico');
      } else if (perfil.nivel === 'admin' || perfil.nivel === 'atendente' || perfil.nivel === 'usuarioteste') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }

      // ✅ CORRIGIDO: Removido o redirecionamento duplo que causava o loop
      console.log('Debug login - Redirecionamento concluído');
    }
    
    // Verificar empresa
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', userId)
      .single();
    
    if (usuarioError || !usuario) {
      setIsSubmitting(false);
      addToast('error', 'Dados do usuário incompletos. Entre em contato com o suporte.');
      return;
    }
    
    if (!usuario.empresa_id) {
      setIsSubmitting(false);
      addToast('info', 'Redirecionando para criação de empresa...');
      router.replace('/criar-empresa');
      return;
    }
    
    console.log('Debug login - empresa_id:', usuario.empresa_id);
    
    // Verificar status da empresa
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('status, motivobloqueio')
      .eq('id', usuario.empresa_id)
      .single();
    
    if (empresaError) {
      console.error('Erro ao buscar empresa:', empresaError);
      setIsSubmitting(false);
      addToast('error', 'Erro ao verificar status da empresa. Tente novamente.');
      return;
    }
    
    if (empresa?.status === 'bloqueado') {
      setIsSubmitting(false);
      await confirm({
        title: 'Acesso bloqueado',
        message: empresa.motivobloqueio || 'Entre em contato com o suporte.',
        confirmText: 'OK',
      });
      return;
    }
    
    // Login bem-sucedido
    console.log('Debug login - Login bem-sucedido, redirecionando...');
    addToast('success', 'Login realizado com sucesso! Redirecionando...');
    
    // Salvar dados no localStorage
    localStorage.setItem("user", JSON.stringify({
      id: userId,
      email: emailToLogin,
      nivel: perfil.nivel
    }));
    localStorage.setItem("empresa_id", usuario.empresa_id);
    
          // Aguardar um pouco para mostrar a mensagem de sucesso
      setTimeout(() => {
        // Redirecionar baseado no nível do usuário
        if (perfil.nivel === 'tecnico') {
          window.location.href = '/dashboard-tecnico';
        } else if (perfil.nivel === 'atendente') {
          window.location.href = '/dashboard-atendente';
        } else if (perfil.nivel === 'admin') {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      }, 1500);
    
    setIsSubmitting(false);
  };

  const handlePasswordReset = async () => {
    if (!loginInput) {
      addToast('warning', 'Informe seu e-mail ou usuário para recuperar a senha.');
      return;
    }
    
    let emailToReset = loginInput;
    if (!loginInput.includes('@')) {
      const username = loginInput.trim().toLowerCase();
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('email')
        .eq('usuario', username)
        .single();
      if (error || !usuario?.email) {
        addToast('error', 'Usuário não encontrado. Verifique o nome de usuário.');
        return;
      }
      emailToReset = usuario.email;
    }
    
    setIsRecovering(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsRecovering(false);
    
    if (error) {
      if (error.message.includes('User not found')) {
        addToast('error', 'Usuário não encontrado. Verifique o e-mail informado.');
      } else if (error.message.includes('Email not confirmed')) {
        addToast('error', 'E-mail não confirmado. Verifique sua caixa de entrada.');
      } else {
        addToast('error', 'Erro ao enviar e-mail de recuperação. Tente novamente.');
      }
    } else {
      addToast('success', 'E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Carrossel de Cards */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black">
        {/* Cards Sobrepostos */}
        <div className="relative w-full h-full flex items-center justify-center p-8">
          {carouselImages.map((image, index) => {
            const isActive = index === currentImageIndex;
            const isPrev = index === (currentImageIndex - 1 + carouselImages.length) % carouselImages.length;
            const isNext = index === (currentImageIndex + 1) % carouselImages.length;
            
            let cardStyle = 'opacity-0 scale-75 translate-x-0 z-0';
            
            if (isActive) {
              cardStyle = 'opacity-100 scale-100 translate-x-0 z-30';
            } else if (isPrev) {
              cardStyle = 'opacity-40 scale-90 -translate-x-16 z-20';
            } else if (isNext) {
              cardStyle = 'opacity-40 scale-90 translate-x-16 z-20';
            }
            
            return (
              <div
                key={index}
                className={`absolute transition-all duration-700 ease-in-out transform ${cardStyle}`}
              >
                {/* Card Principal */}
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-16 shadow-2xl border border-gray-700/50 backdrop-blur-sm w-[480px] h-[650px] flex flex-col justify-center items-center text-center">
                  {/* Ícone Grande */}
                  <div className="text-8xl mb-8 opacity-90">
                    {index === 0 ? '📋' : index === 1 ? '📊' : '🚀'}
                  </div>
                  
                  {/* Título */}
                  <h1 className="text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
                    <span className="bg-gradient-to-r from-[#D1FE6E] to-[#B8E55A] bg-clip-text text-transparent">
                      {image.title}
                    </span>
                  </h1>
                  
                  {/* Subtítulo */}
                  <h2 className="text-2xl text-white/90 mb-8 font-light">
                    {image.subtitle}
                  </h2>
                  
                  {/* Descrição */}
                  <p className="text-white/70 leading-relaxed text-lg max-w-md">
                    {image.description}
                  </p>
                  
                  {/* Features List */}
                  <div className="mt-8 space-y-3">
                    {index === 0 && (
                      <>
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-3"></div>
                          <span>Controle total de status</span>
                        </div>
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-3"></div>
                          <span>Histórico completo</span>
                        </div>
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-3"></div>
                          <span>Notificações automáticas</span>
                        </div>
                      </>
                    )}
                    {index === 1 && (
                      <>
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-3"></div>
                          <span>Relatórios detalhados</span>
                        </div>
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-3"></div>
                          <span>Métricas de performance</span>
                        </div>
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-3"></div>
                          <span>Dashboard intuitivo</span>
                        </div>
                      </>
                    )}
                    {index === 2 && (
                      <>
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-3"></div>
                          <span>Acesso em qualquer lugar</span>
                        </div>
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-3"></div>
                          <span>Interface responsiva</span>
                        </div>
                        <div className="flex items-center text-white/60 text-sm">
                          <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-3"></div>
                          <span>Sincronização em tempo real</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Decoração */}
                  <div className="absolute top-8 right-8 w-4 h-4 bg-[#D1FE6E] rounded-full opacity-60"></div>
                  <div className="absolute bottom-8 left-8 w-3 h-3 bg-[#B8E55A] rounded-full opacity-40"></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controles do Carrossel */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex space-x-6 z-40">
          <button
            onClick={prevImage}
            className="w-14 h-14 rounded-full bg-gray-800/80 backdrop-blur-sm border border-gray-600 text-white hover:bg-gray-700/80 hover:border-[#D1FE6E]/50 transition-all duration-300 flex items-center justify-center"
          >
            <FaArrowLeft className="text-lg" />
          </button>
          
          <button
            onClick={nextImage}
            className="w-14 h-14 rounded-full bg-gray-800/80 backdrop-blur-sm border border-gray-600 text-white hover:bg-gray-700/80 hover:border-[#D1FE6E]/50 transition-all duration-300 flex items-center justify-center"
          >
            <FaArrowRight className="text-lg" />
          </button>
        </div>

        {/* Indicadores de página */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex space-x-4 z-40">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                index === currentImageIndex 
                  ? 'bg-[#D1FE6E] scale-125 shadow-lg' 
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Lado Direito - Formulário de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-12">
            <div className="relative group">
              <Image 
                src={logo} 
                alt="Consert Logo" 
                width={140} 
                height={140}
                className="transition-all duration-300 hover:scale-105"
              />
            </div>
          </div>

          {/* Login Form */}
          <div className="relative">
            <form
              onSubmit={handleLogin}
              className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-light text-gray-900 mb-3 tracking-tight">
                  Bem-vindo de volta
                </h1>
                <p className="text-gray-600 font-light">
                  Acesse sua conta para continuar
                </p>
              </div>
              
              <div className="space-y-5">
                {/* Email/Username Input */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail ou Usuário
                  </label>
                  <input
                    type="text"
                    placeholder="Digite seu e-mail ou usuário"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    onFocus={() => setFocusedField('login')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white transition-all duration-200 ${
                      focusedField === 'login' 
                        ? 'border-gray-900 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    required
                  />
                </div>
                
                {/* Password Input */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white transition-all duration-200 pr-12 ${
                      focusedField === 'password' 
                        ? 'border-gray-900 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors mt-8"
                  >
                    {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                  </button>
                </div>
                
                {/* Login Button */}
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                  disabled={isSubmitting}
                >
                    {isSubmitting ? 'Entrando...' : 'Entrar'}
                </button>
                
                {/* Forgot Password Button */}
                <button
                  type="button"
                  className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePasswordReset}
                  disabled={isRecovering}
                >
                  {isRecovering ? 'Enviando...' : 'Esqueci minha senha'}
                </button>
              </div>

              {/* Link para cadastro */}
              <div className="text-center mt-6">
                <p className="text-gray-600">
                  Não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/cadastro')}
                    className="text-gray-900 hover:text-gray-700 font-medium underline transition-colors"
                  >
                    Crie a sua agora
                  </button>
                </p>
              </div>
            </form>
          </div>

          {/* Footer Links */}
          <div className="text-center mt-8 space-x-6 text-sm">
            <a href="/privacidade" className="text-gray-500 hover:text-gray-700 transition-colors">
              Política de Privacidade
            </a>
            <a href="/termos" className="text-gray-500 hover:text-gray-700 transition-colors">
              Termos de Uso
            </a>
            <a href="/ajuda" className="text-gray-500 hover:text-gray-700 transition-colors">
              Ajuda
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return (
    <ConfirmProvider>
      <ToastProvider>
        <LoginClientInner />
      </ToastProvider>
    </ConfirmProvider>
  );
}
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import bglogin from '@/assets/imagens/bglogin.jpg';
import logo from '@/assets/imagens/logopreto.png';
import { ToastProvider, useToast } from '@/components/Toast';
import { ConfirmProvider, useConfirm } from '@/components/ConfirmDialog';
import { FaEye, FaEyeSlash, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { getDashboardPath } from '@/lib/dashboardRouting';

function LoginClientInner() {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Estados para verificação de código
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  
  // ✅ PROTEÇÃO ADICIONAL: Ref para controlar execução única
  const loginInProgress = useRef(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
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
  
  // ✅ ACESSO TOTALMENTE LIVRE: Sem redirecionamentos automáticos
  // Usuário pode acessar login mesmo estando logado

  // Auto-rotate do carrossel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);
  
  // Verificar se deve mostrar modo de verificação e erros
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const email = searchParams.get('email');
    const verificacao = searchParams.get('verificacao');
    const error = searchParams.get('error');
    
    // Verificar erro de empresa desativada (edge case: URL antiga) → redirecionar para página dedicada
    if (error === 'empresa_desativada') {
      window.location.href = '/empresa-desativada';
    }
    
    if (email && verificacao === 'pending') {
      setPendingEmail(email);
      setShowVerification(true);
    }
  }, []);
  
  // 🔒 CORREÇÃO DE HIDRATAÇÃO: Aguardar montagem no cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🔒 PROTEÇÃO EXTRA: Se já estiver logado, redirecionar para o destino (redirect param) ou dashboard correta por role
  const didRedirectLoggedIn = useRef(false);
  useEffect(() => {
    if (!auth.user || !auth.session || auth.loading) return;
    if (didRedirectLoggedIn.current) return;
    didRedirectLoggedIn.current = true;
    // Ler redirect da URL (fallback: window.location para garantir que pegamos o param)
    const redirectTo = searchParams.get('redirect') ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null);
    if (redirectTo && typeof redirectTo === 'string') {
      const path = decodeURIComponent(redirectTo).trim();
      const isInternalPath = path.startsWith('/') && !path.startsWith('//') && path.indexOf('://') === -1;
      if (isInternalPath && path !== '/login' && !path.startsWith('/login') && !path.startsWith('/cadastro')) {
        router.replace(path);
        return;
      }
    }
    const dashboardPath = getDashboardPath({ nivel: auth.usuarioData?.nivel });
    router.replace(dashboardPath);
  }, [auth.user, auth.session, auth.loading, auth.usuarioData?.nivel, searchParams, router]);

  // 🔒 PROTEÇÃO EXTRA: Se já estiver logado, mostrar loading
  if (auth.user && auth.session && !auth.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#cffb6d] to-[#e0ffe3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecionando...</p>
        </div>
      </div>
    );
  }
  
  const handleVerificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      addToast('error', 'Digite o código de 6 dígitos');
      return;
    }

    setVerifyingCode(true);

    try {
      const response = await fetch('/api/email/verificar-codigo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: pendingEmail,
          codigo: verificationCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        addToast('success', 'Email verificado com sucesso! Agora você pode fazer login.');
        // Limpar URL e voltar para modo de login
        window.history.replaceState({}, '', '/login');
        setShowVerification(false);
        setVerificationCode('');
        setPendingEmail('');
        // Limpar campos do formulário de login
        setLoginInput('');
        setPassword('');
      } else {
        addToast('error', data.error || 'Código inválido ou expirado');
      }
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      addToast('error', 'Erro ao verificar código');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleReenviarCodigo = async () => {
    setVerifyingCode(true);

    try {
      const response = await fetch('/api/email/reenviar-codigo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: pendingEmail })
      });

      const data = await response.json();

      if (response.ok) {
        addToast('success', 'Novo código enviado para seu email!');
      } else {
        addToast('error', data.error || 'Erro ao reenviar código');
      }
    } catch (error) {
      console.error('Erro ao reenviar código:', error);
      addToast('error', 'Erro ao reenviar código');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleTestarEmail = async () => {
    setVerifyingCode(true);

    try {
      const response = await fetch('/api/email/teste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: pendingEmail })
      });

      const data = await response.json();

      if (response.ok) {
        addToast('success', 'Teste de email realizado com sucesso!');
      } else {
        addToast('error', data.error || 'Erro no teste de email');
      }
    } catch (error) {
      console.error('Erro no teste de email:', error);
      addToast('error', 'Erro no teste de email');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 🔒 PROTEÇÃO ROBUSTA: Evitar múltiplas execuções simultâneas
    if (isSubmitting || loginInProgress.current) {
      console.warn('🚨 Login já está sendo processado, ignorando nova tentativa');
      return;
    }
    
    // ✅ PROTEÇÃO DUPLA: State + Ref para máxima segurança
    setIsSubmitting(true);
    loginInProgress.current = true;
    
    console.log('🔐 Iniciando processo de login para:', loginInput);
    
    try {
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
      loginInProgress.current = false;
        addToast('error', 'Usuário não encontrado. Verifique o nome de usuário.');
        return;
      }
      emailToLogin = usuario.email;
    }
    
    // 🔒 VERIFICAÇÃO CRÍTICA: Verificar se o email foi confirmado ANTES de tentar login
    const { data: usuarioVerificacao, error: verificacaoError } = await supabase
      .from('usuarios')
      .select('email_verificado, auth_user_id, nivel, empresa_id')
      .eq('email', emailToLogin)
      .single();
    
    if (verificacaoError) {
      setIsSubmitting(false);
      loginInProgress.current = false;
      addToast('error', 'Usuário não encontrado. Verifique suas credenciais.');
      return;
    }
    
    // Verificação de email desabilitada - permitir login sem verificação obrigatória
    // (Comentado para permitir que usuários existentes façam login normalmente)
    /*
    // Se o usuário é ADMIN (criador da empresa), verificar se o email foi confirmado
    if (usuarioVerificacao?.nivel === 'admin' && !usuarioVerificacao?.email_verificado) {
      setIsSubmitting(false);
      loginInProgress.current = false;
      setPendingEmail(emailToLogin);
      setShowVerification(true);
      addToast('warning', 'Email não verificado. Digite o código enviado para seu email.');
      return;
    }
    
    // Se o usuário NÃO é admin, verificar se há pelo menos um ADMIN da empresa verificado
    // OU se a empresa já está funcionando (tem usuários, ordens, etc - indicando que já foi verificada no passado)
    if (usuarioVerificacao?.nivel !== 'admin' && usuarioVerificacao?.empresa_id) {
      // Buscar TODOS os admins da empresa para verificar se pelo menos um foi verificado
      const { data: adminsEmpresa, error: adminError } = await supabase
        .from('usuarios')
        .select('email_verificado, nome, email')
        .eq('empresa_id', usuarioVerificacao.empresa_id)
        .eq('nivel', 'admin');
      
      console.log('🔍 Debug - Verificação de admins da empresa:', {
        empresa_id: usuarioVerificacao.empresa_id,
        adminsEncontrados: adminsEmpresa?.length || 0,
        adminsDetalhes: adminsEmpresa?.map(a => ({
          nome: a.nome,
          email: a.email,
          verificado: a.email_verificado
        })),
        adminError,
        temAdminVerificado: adminsEmpresa?.some(a => a.email_verificado) || false
      });
      
      if (adminError) {
        console.error('🔍 Debug - Erro ao buscar admins da empresa:', adminError);
        setIsSubmitting(false);
        loginInProgress.current = false;
        addToast('error', 'Erro ao verificar empresa. Tente novamente.');
        return;
      }
      
      // Verificar se há pelo menos um admin verificado
      const temAdminVerificado = adminsEmpresa && adminsEmpresa.length > 0 && 
        adminsEmpresa.some(admin => admin.email_verificado === true);
      
      // Se não tem admin verificado, verificar se a empresa já está ativa (tem ordens, usuários, etc)
      // Isso indica que a empresa já foi verificada no passado
      if (!temAdminVerificado) {
        // Verificar se a empresa já tem atividade (indica que já foi verificada antes)
        const { data: empresaAtiva, error: empresaError } = await supabase
          .from('empresas')
          .select('id')
          .eq('id', usuarioVerificacao.empresa_id)
          .single();
        
        // Verificar se a empresa tem ordens de serviço (indica atividade)
        const { count: ordensCount } = await supabase
          .from('ordens_servico')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', usuarioVerificacao.empresa_id);
        
        const empresaTemAtividade = ordensCount && ordensCount > 0;
        
        console.log('🔍 Debug - Verificação adicional de empresa:', {
          empresa_id: usuarioVerificacao.empresa_id,
          empresaEncontrada: !!empresaAtiva,
          temOrdens: empresaTemAtividade,
          permitirLoginPorAtividade: empresaTemAtividade
        });
        
        // Se a empresa não tem admin verificado E não tem atividade, bloquear login
        if (!empresaTemAtividade) {
          console.warn('⚠️ Nenhum admin da empresa verificado e empresa sem atividade:', {
            empresa_id: usuarioVerificacao.empresa_id,
            totalAdmins: adminsEmpresa?.length || 0,
            adminsNaoVerificados: adminsEmpresa?.filter(a => !a.email_verificado).map(a => ({
              nome: a.nome,
              email: a.email
            })) || []
          });
          setIsSubmitting(false);
          loginInProgress.current = false;
          addToast('error', 'Empresa não verificada. Entre em contato com o administrador.');
          return;
        }
        
        // Se tem atividade mas não tem admin verificado, apenas logar (empresa já estava funcionando)
        console.log('✅ Empresa já tem atividade, permitindo login mesmo sem admin verificado');
      }
    }
    */
    
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
      loginInProgress.current = false;
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
      loginInProgress.current = false;
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
    
    if (perfilError || !perfil) {
      setIsSubmitting(false);
      loginInProgress.current = false;
      addToast('error', 'Erro ao buscar perfil do usuário. Tente novamente.');
      return;
    }
    
    // Verificar empresa
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', userId)
      .single();
    
    if (usuarioError || !usuario) {
      setIsSubmitting(false);
      loginInProgress.current = false;
      addToast('error', 'Dados do usuário incompletos. Entre em contato com o suporte.');
      return;
    }
    
    if (!usuario.empresa_id) {
      setIsSubmitting(false);
      loginInProgress.current = false;
      addToast('info', 'Redirecionando para criação de empresa...');
      router.replace('/criar-empresa');
      return;
    }
    
    // Verificar status da empresa
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('status, motivobloqueio, ativo')
      .eq('id', usuario.empresa_id)
      .single();
    
    if (empresaError) {
      console.error('Erro ao buscar empresa:', empresaError);
      setIsSubmitting(false);
      loginInProgress.current = false;
      addToast('error', 'Erro ao verificar status da empresa. Tente novamente.');
      return;
    }
    
    // ⚠️ BLOQUEAR ACESSO: Verificar se empresa está ativa
    if (empresa?.ativo === false) {
      setIsSubmitting(false);
      loginInProgress.current = false;
      await confirm({
        title: 'Acesso bloqueado',
        message: 'Sua empresa foi desativada. Entre em contato com o suporte para mais informações.',
        confirmText: 'OK',
      });
      router.replace('/empresa-desativada');
      return;
    }
    
    if (empresa?.status === 'bloqueado') {
      setIsSubmitting(false);
      loginInProgress.current = false;
      await confirm({
        title: 'Acesso bloqueado',
        message: empresa.motivobloqueio || 'Entre em contato com o suporte.',
        confirmText: 'OK',
      });
      return;
    }
    
    // Login bem-sucedido
    addToast('success', 'Login realizado com sucesso! Redirecionando...');
    
    // 🔒 LIMPEZA COMPLETA: Limpar dados antigos antes de salvar novos
    try {
      // Limpar dados de sessão anteriores
      localStorage.removeItem('user');
      localStorage.removeItem('empresa_id');
      localStorage.removeItem('session');
      
      // Limpar sessionStorage
      sessionStorage.clear();
      
      // Limpar cookies do Supabase
      const cookies = document.cookie.split(";");
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        if (name.includes('supabase') || name.includes('sb-') || name.includes('auth')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
        }
      });
      
      // Aguardar um pouco para limpeza ser processada
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.warn('Erro na limpeza de dados:', error);
    }
    
    // Salvar dados novos no localStorage
    localStorage.setItem("user", JSON.stringify({
      id: userId,
      email: emailToLogin,
      nivel: perfil.nivel
    }));
    localStorage.setItem("empresa_id", usuario.empresa_id);
    
    // Aguardar um pouco para mostrar a mensagem de sucesso
    setTimeout(async () => {
      // Redirecionar para dashboard correta baseada no role
      const { getDashboardPath } = await import('@/lib/dashboardRouting');
      const dashboardPath = getDashboardPath({ nivel: perfil.nivel });
      router.push(dashboardPath);
    }, 1500);
    
    // Resetar o estado de loading após o redirecionamento
    setIsSubmitting(false);
      loginInProgress.current = false;
      
    } catch (error) {
      console.error('🚨 Erro inesperado durante login:', error);
      setIsSubmitting(false);
      loginInProgress.current = false;
      addToast('error', 'Erro inesperado. Tente novamente.');
    }
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

  // Ocultar cards do carrossel temporariamente
  const showCards = false;

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Carrossel de Cards */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-center bg-cover"
        style={{ backgroundImage: `url(${(bglogin as any).src || bglogin})` }}
      >
        {/* Overlay sutil para contraste */}
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        {/* Cards Sobrepostos */}
        {showCards && (
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
        )}

        {/* Controles do Carrossel */}
        {showCards && (
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
        )}

        {/* Indicadores de página */}
        {showCards && (
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
        )}
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
                width={240} 
                height={240}
                className="transition-all duration-300 hover:scale-105"
              />
            </div>
          </div>

          {/* Login Form */}
          <div className="relative">
            {showVerification ? (
              // Formulário de verificação de código
              <form
                onSubmit={handleVerificarCodigo}
                className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100"
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-light text-gray-900 mb-3 tracking-tight">
                    Verificar Email
                  </h1>
                  <p className="text-gray-600 font-light">
                    Como administrador, seu email precisa ser verificado.
                  </p>
                  <p className="text-gray-600 font-light">
                    Digite o código enviado para:
                  </p>
                  <p className="text-blue-600 font-medium mt-1">
                    {pendingEmail}
                  </p>
                </div>
                
                <div className="space-y-5">
                  {/* Código de Verificação Input */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de Verificação
                    </label>
                    <input
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onFocus={() => setFocusedField('code')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white transition-all duration-200 text-center text-lg font-mono ${
                        focusedField === 'code' 
                          ? 'border-gray-900 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      maxLength={6}
                      required
                    />
                  </div>
                  
                  {/* Verificar Button */}
                  <button
                    type="submit"
                    className="w-full bg-gray-900 text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    disabled={verifyingCode}
                  >
                    {verifyingCode ? 'Verificando...' : 'Verificar Código'}
                  </button>
                  
                  {/* Reenviar Código Button */}
                  <button
                    type="button"
                    className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleReenviarCodigo}
                    disabled={verifyingCode}
                  >
                    {verifyingCode ? 'Enviando...' : 'Reenviar código'}
                  </button>
                  
                  {/* Testar Email Button */}
                  <button
                    type="button"
                    className="w-full bg-blue-100 text-blue-700 font-medium py-2 rounded-lg hover:bg-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    onClick={handleTestarEmail}
                    disabled={verifyingCode}
                  >
                    {verifyingCode ? 'Testando...' : 'Testar configuração de email'}
                  </button>
                  
                  {/* Voltar para Login */}
                  <button
                    type="button"
                    className="w-full text-blue-600 font-medium py-2 hover:text-blue-700 transition-colors"
                    onClick={() => {
                      setShowVerification(false);
                      setVerificationCode('');
                      setPendingEmail('');
                      window.history.replaceState({}, '', '/login');
                    }}
                  >
                    ← Voltar para o login
                  </button>
                </div>

                {/* Informações */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-yellow-600 text-xs font-bold">!</span>
                    </div>
                    <div className="text-sm">
                      <p className="text-yellow-800 font-medium">Código válido por 24 horas</p>
                      <p className="text-yellow-700 mt-1">Verifique sua caixa de spam se não encontrar o email.</p>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              // Formulário de login normal
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
                    className="w-full bg-gray-900 text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    disabled={isSubmitting}
                    onClick={(e) => {
                      // Prevenir múltiplos cliques e validar campos
                      if (isSubmitting || !loginInput.trim() || !password.trim()) {
                        e.preventDefault();
                        if (!loginInput.trim() || !password.trim()) {
                          addToast('warning', 'Por favor, preencha todos os campos');
                        }
                        return;
                      }
                    }}
                  >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Entrando...
                        </div>
                      ) : (
                        'Entrar'
                      )}
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
            )}
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
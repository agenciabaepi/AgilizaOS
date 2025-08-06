'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import logo from '@/assets/imagens/logopreto.png';
import bgImage from '@/assets/imagens/background-login.png';
import { ToastProvider, useToast } from '@/components/Toast';
import { ConfirmProvider, useConfirm } from '@/components/ConfirmDialog';



function LoginClientInner() {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
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
    if (!loginInput.includes('@')) {
      const username = loginInput.trim().toLowerCase();
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('email')
        .eq('usuario', username)
        .single();
      if (error || !usuario?.email) {
        setIsSubmitting(false);
        addToast('error', 'Usuário não encontrado.');
        return;
      }
      emailToLogin = usuario.email;
    }
    const {
      data: { session },
      error
    } = await supabase.auth.signInWithPassword({
      email: emailToLogin,
      password,
    });
    await supabase.auth.getSession();
    setIsSubmitting(false);
    if (error || !session?.user) {
      addToast('error', 'Erro ao fazer login.');
      return;
    }
    const userId = session.user.id;
    const { data: perfil } = await supabase
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
      
      // Forçar reload da página para garantir que o AuthContext seja atualizado
      console.log('Debug login - Executando window.location.href...');
      window.location.href = '/';
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
        addToast('error', 'Usuário não encontrado.');
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
      addToast('error', error.message);
    } else {
      addToast('success', 'E-mail de recuperação enviado!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#cffb6d] to-[#e0ffe3] relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgImage.src}
          alt="Background Login"
          className="w-full h-full object-cover opacity-40"
          style={{ mixBlendMode: 'overlay' }}
        />
      </div>
      
      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-30"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-transparent opacity-20"></div>

      {/* Login Container */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image 
              src={logo} 
              alt="Consert Logo" 
              width={180} 
              height={180}
              className="transition-all duration-500 ease-out hover:scale-110 hover:brightness-110"
            />
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/30 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}
          >
            <h1 className="text-3xl font-light text-gray-900 mb-2 text-center tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-gray-600 text-center mb-8 font-light">
              Acesse sua conta para continuar
            </p>
            
            <div className="space-y-6">
              <div>
                <input
                  type="text"
                  placeholder="E-mail ou Usuário"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full px-6 py-4 bg-white/80 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D1FE6E] focus:border-[#D1FE6E] transition-all duration-300 backdrop-blur-sm"
                  required
                />
              </div>
              
              <div>
                <input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-white/80 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D1FE6E] focus:border-[#D1FE6E] transition-all duration-300 backdrop-blur-sm"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#D1FE6E] to-[#B8E55A] text-black font-medium py-4 rounded-2xl hover:from-[#B8E55A] hover:to-[#A5D44A] transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
                style={{
                  boxShadow: '0 4px 20px rgba(209, 254, 110, 0.3)'
                }}
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
              
              <button
                type="button"
                className="w-full bg-gray-100 border border-gray-200 text-gray-700 font-medium py-4 rounded-2xl hover:bg-gray-200 hover:border-gray-300 transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePasswordReset}
                disabled={isRecovering}
              >
                {isRecovering ? 'Enviando...' : 'Esqueci minha senha'}
              </button>
            </div>
          </form>
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
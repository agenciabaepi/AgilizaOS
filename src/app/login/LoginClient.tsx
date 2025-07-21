'use client';
import { useState } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import logo from '@/assets/imagens/logopreto.png';

const supabase = createPagesBrowserClient();

export default function LoginClient() {
  const [loginInput, setLoginInput] = useState('lucas@hotmail.com');
  const [password, setPassword] = useState('123123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const router = useRouter();

  const auth = useAuth();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    let emailToLogin = loginInput;
    // Se não for email, buscar pelo username
    if (!loginInput.includes('@')) {
      const username = loginInput.trim().toLowerCase();
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('email')
        .eq('usuario', username)
        .single();
      if (error || !usuario?.email) {
        setIsSubmitting(false);
        alert('Usuário não encontrado.');
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
      alert('Erro ao fazer login.');
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
      const { data: empresa } = await supabase
        .from('empresas')
        .select('status, motivoBloqueio')
        .eq('id', usuario.empresa_id)
        .single();
      if (empresa?.status === 'bloqueado') {
        alert(`Acesso bloqueado: ${empresa.motivoBloqueio || 'entre em contato com o suporte.'}`);
        return;
      }
      localStorage.setItem("user", JSON.stringify({
        id: userId,
        email: emailToLogin,
        nivel: perfil.nivel
      }));
      localStorage.setItem("empresa_id", usuario.empresa_id);
      setTimeout(() => {
        router.replace('/dashboard');
      }, 500);
    }
  };

  const handlePasswordReset = async () => {
    if (!loginInput) {
      alert('Informe seu e-mail ou usuário para recuperar a senha.');
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
        alert('Usuário não encontrado.');
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
      alert(error.message);
    } else {
      alert('E-mail de recuperação enviado!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#cffb6d] to-[#e0ffe3]">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200"
      >
        <div className="flex justify-center mb-6">
          <Image src={logo} alt="Logo AgilizaOS" width={200} height={200} />
        </div>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Acesse sua conta para continuar
        </p>

        <input
          type="text"
          placeholder="E-mail ou Usuário"
          value={loginInput}
          onChange={(e) => setLoginInput(e.target.value)}
          className="mb-4 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <button
          type="submit"
          className="w-full bg-[#000000] text-white font-semibold py-3 rounded-lg hover:opacity-90 transition flex justify-center items-center mb-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>

        <button
          type="button"
          className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-gray-100 transition"
          onClick={handlePasswordReset}
          disabled={isRecovering}
        >
          {isRecovering ? 'Enviando...' : 'Esqueci minha senha'}
        </button>
      </form>
    </div>
  );
} 
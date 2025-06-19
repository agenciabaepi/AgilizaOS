'use client';
import { useState, useEffect } from 'react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import logo from '@/assets/imagens/logopreto.png';
import DebugSession from '@/components/DebugSession';

const supabase = createPagesBrowserClient();

export default function LoginPage() {
  const [email, setEmail] = useState('lucas@hotmail.com');
  const [password, setPassword] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const router = useRouter();

  const auth = useAuth();
  const { user, loading } = auth || {};

  /*
  useEffect(() => {
    async function checkSessionAndRedirect() {
      let currentUser = user;
      if (!currentUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        currentUser = sessionData.session?.user || null;
      }
      if (typeof window !== 'undefined' && !loading && currentUser) {
        const userData = localStorage.getItem('user');
        try {
          const { nivel } = userData ? JSON.parse(userData) : {};
          if (nivel === 'tecnico') {
            router.replace('/dashboard/tecnico');
          } else {
            router.replace('/dashboard/admin');
          }
        } catch (e) {
          console.error('Erro ao ler user do localStorage:', e);
          localStorage.removeItem('user');
        }
      }
    }
    checkSessionAndRedirect();
  }, [user, loading]);
  */

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const {
      data: { session },
      error
    } = await supabase.auth.signInWithPassword({
      email,
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
      localStorage.setItem("user", JSON.stringify({
        id: userId,
        email,
        nivel: perfil.nivel
      }));

      router.replace('/dashboard');
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      alert('Informe seu e-mail para recuperar a senha.');
      return;
    }
    setIsRecovering(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
      <DebugSession />
    </div>
  );
}
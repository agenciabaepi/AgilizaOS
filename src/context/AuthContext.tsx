"use client";

// AuthContext revisado para centralizar a lógica de sessão

// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          setUser(session.user);
          localStorage.setItem("user", JSON.stringify(session.user));
        }
      } catch (error) {
        console.error('Erro ao obter sessão:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedUser = session?.user ?? null;
      setUser(loggedUser);
      if (loggedUser) {
        localStorage.setItem("user", JSON.stringify(loggedUser));
      } else {
        localStorage.removeItem("user");
      }
      setSession(session);
      setTimeout(() => setLoading(false), 0);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Erro no login:', error.message);
      throw new Error(error.message);
    }
    // O estado será atualizado automaticamente pelo onAuthStateChange
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('Erro no cadastro:', error.message);
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao sair:', error.message);
      throw new Error(error.message);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      console.error('Erro ao enviar email de recuperação:', error.message);
      throw new Error(error.message);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
"use client";

// AuthContext revisado para centralizar a lógica de sessão

// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Session, User } from '@supabase/supabase-js';

interface UsuarioData {
  empresa_id: string;
  nome: string;
  email: string;
}
interface EmpresaData {
  id: string;
  nome: string;
  plano: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  usuarioData: UsuarioData | null;
  empresaData: EmpresaData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createPagesBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [usuarioData, setUsuarioData] = useState<UsuarioData | null>(null);
  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (error) {
      }

      if (session) {
        setSession(session);
        setUser(session.user);

        const { data: profileData, error: profileError } = await supabase
          .from('usuarios')
          .select('empresa_id, nome, email')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();


        if (profileError || !profileData) {
          setUsuarioData(null);
          setEmpresaData(null);
          localStorage.removeItem("user");
          setLoading(false);
          return;
        }

        setUsuarioData(profileData);
        localStorage.setItem("user", JSON.stringify({ ...session.user, ...profileData }));

        if (!profileData.empresa_id) {
          setEmpresaData(null);
          setLoading(false);
          return;
        }


        const metadataEmpresaId = session.user.user_metadata?.empresa_id;
        if (!metadataEmpresaId || metadataEmpresaId !== profileData.empresa_id) {
          await supabase.auth.updateUser({
            data: { empresa_id: profileData.empresa_id },
          });

          // Atualiza localmente a sessão sem forçar novo getSession()
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  user: {
                    ...prev.user,
                    user_metadata: {
                      ...prev.user.user_metadata,
                      empresa_id: profileData.empresa_id,
                    },
                  },
                }
              : prev
          );
        }

        const { data: empresaInfo, error: empresaError } = await supabase
          .from("empresas")
          .select("id, nome, plano")
          .eq("id", profileData.empresa_id)
          .single();


        if (empresaError || !empresaInfo) {
          setEmpresaData(null);
        } else {
          setEmpresaData(empresaInfo);
        }


      } else {
      }

      setLoading(false);
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
      checkSession(); // Recarrega usuário e empresa
    });

    return () => {
      listener.subscription.unsubscribe();
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: 'Novo usuário',
          empresa_id: null,
        },
      },
    });

    if (error || !data.user) {
      console.error('Erro no cadastro:', error?.message);
      throw new Error(error?.message || 'Erro desconhecido ao cadastrar.');
    }

    // Criação bem-sucedida no Supabase Auth, agora salvar na tabela 'usuarios'
    const { error: insertError } = await supabase.from('usuarios').insert([
      {
        auth_user_id: data.user.id,
        email: email,
        nome: 'Novo usuário',
        empresa_id: null, // será vinculada depois
      },
    ]);

    if (insertError) {
      console.error('Erro ao inserir na tabela usuarios:', insertError.message);
      throw new Error(insertError.message);
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
    <AuthContext.Provider value={{ user, session, usuarioData, empresaData, loading, signIn, signUp, signOut, resetPassword }}>
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
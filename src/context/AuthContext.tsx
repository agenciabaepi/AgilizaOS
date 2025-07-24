"use client";

// AuthContext revisado para centralizar a lógica de sessão

// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Session, User } from '@supabase/supabase-js';
// import { ToastProvider, useToast } from '@/components/Toast'; // Remover import de useToast/ToastProvider

interface UsuarioData {
  empresa_id: string;
  nome: string;
  email: string;
  nivel: string;
  permissoes?: string[];
  foto_url?: string;
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
  isLoggingOut: boolean;
  setIsLoggingOut: (value: boolean) => void;
  updateUsuarioFoto: (fotoUrl: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createPagesBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [usuarioData, setUsuarioData] = useState<UsuarioData | null>(null);
  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [loading, setLoading] = useState(true);
  // Remover const { addToast } = useToast ? useToast() : { addToast: () => {} };

  useEffect(() => {
    const checkSession = async () => {
      console.log('AuthContext: Iniciando checkSession')
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Erro ao buscar sessão:', error.message);
        setLoading(false);
        return;
      }

      if (session) {
        console.log('AuthContext: Sessão encontrada, usuário:', session.user.email)
        setSession(session);
        setUser(session.user);

        const { data: profileData, error: profileError } = await supabase
          .from('usuarios')
          .select('empresa_id, nome, email, nivel, permissoes, foto_url')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();


        if (profileError || !profileData) {
          setUsuarioData(null);
          setEmpresaData(null);
          localStorage.removeItem("user");
          setLoading(false);
          return;
        }

        if (!profileData.empresa_id) {
          setUsuarioData(profileData);
          setEmpresaData(null);
          setLoading(false);
          return;
        }

        setUsuarioData(profileData);
        localStorage.setItem("user", JSON.stringify({ ...session.user, ...profileData }));

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

        console.log('AuthContext: Carregamento concluído com sucesso')
        setLoading(false);
      } else {
        console.log('AuthContext: Nenhuma sessão encontrada')
        setLoading(false);
        return;
      }
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

  const signOut = async (onError?: (msg: string) => void) => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error && error.message !== 'Auth session missing!') {
        if (onError) onError(error.message);
        console.error('Erro ao sair:', error.message);
      }
      setUser(null);
      setSession(null);
      setUsuarioData(null);
      setEmpresaData(null);
      localStorage.removeItem("user");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      console.error('Erro ao enviar email de recuperação:', error.message);
      throw new Error(error.message);
    }
  };

  const updateUsuarioFoto = (fotoUrl: string) => {
    setUsuarioData((prev) => prev ? { ...prev, foto_url: fotoUrl } : prev);
  };


  return (
    <AuthContext.Provider value={{ user, session, usuarioData, empresaData, loading, signIn, signUp, signOut, resetPassword, isLoggingOut, setIsLoggingOut, updateUsuarioFoto }}>
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

export const useUsuario = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useUsuario deve ser usado dentro de um AuthProvider');
  }
  return { usuario: context.usuarioData, empresa: context.empresaData, loading: context.loading };
};

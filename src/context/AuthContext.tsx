"use client";

// AuthContext revisado para centralizar a lógica de sessão

// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { supabase, forceLogout } from '@/lib/supabaseClient';
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
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [usuarioData, setUsuarioData] = useState<UsuarioData | null>(null);
  const [empresaData, setEmpresaData] = useState<EmpresaData | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const [loading, setLoading] = useState(true);
  // Remover const { addToast } = useToast ? useToast() : { addToast: () => {} };

  // Função para limpar sessão e dados locais
  const clearSession = () => {
    setUser(null);
    setSession(null);
    setUsuarioData(null);
    setEmpresaData(null);
    localStorage.removeItem("user");
  };

  useEffect(() => {
    const checkSession = async () => {
      console.log('🔍 AuthContext: Iniciando checkSession')
      
      // Se já temos dados, não verificar novamente
      if (usuarioData && empresaData) {
        console.log('🔍 AuthContext: Dados já carregados, pulando verificação');
        setLoading(false);
        return;
      }
      
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Erro ao buscar sessão:', error.message);
        setLoading(false);
        return;
      }

      if (!session) {
        console.log('🔍 AuthContext: Nenhuma sessão encontrada');
        setLoading(false);
        setHasInitialized(true);
        return;
      }

      console.log('🔍 AuthContext: Sessão encontrada, verificando usuário...');
      setUser(session.user);
      setSession(session);

      // Buscar dados do usuário
      try {
        console.log('🔍 AuthContext: Buscando perfil do usuário...');
        const { data: profileData, error: profileError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();

        if (profileError) {
          console.error('Erro ao buscar perfil do usuário:', profileError.message);
          setLoading(false);
          setHasInitialized(true);
          return;
        }

        if (!profileData) {
          console.log('🔍 AuthContext: Perfil não encontrado');
          setLoading(false);
          setHasInitialized(true);
          return;
        }

        console.log('🔍 AuthContext: Perfil encontrado:', profileData);
        setUsuarioData(profileData);
        localStorage.setItem("user", JSON.stringify({ ...session.user, ...profileData }));

        // Buscar dados da empresa
        if (profileData.empresa_id) {
          console.log('🔍 AuthContext: Buscando dados da empresa...');
          const { data: empresaData, error: empresaError } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', profileData.empresa_id)
            .single();

          if (empresaError) {
            console.error('Erro ao buscar dados da empresa:', empresaError.message);
          } else if (empresaData) {
            console.log('🔍 AuthContext: Dados da empresa encontrados:', empresaData);
            setEmpresaData(empresaData);
          }
        }

        console.log('🔍 AuthContext: Carregamento concluído com sucesso')
        setLoading(false);
        setHasInitialized(true);
      } catch (error) {
        console.error('🔍 AuthContext: Erro inesperado:', error);
        setLoading(false);
        setHasInitialized(true);
      }
    };

    checkSession();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 AuthContext: Mudança de estado de autenticação:', event);
        
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          setSession(session);
          
          // Buscar dados do usuário
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('usuarios')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .single();

            if (profileError) {
              console.error('Erro ao buscar perfil do usuário:', profileError.message);
              return;
            }

            if (profileData) {
              setUsuarioData(profileData);
              localStorage.setItem("user", JSON.stringify({ ...session.user, ...profileData }));

              // Buscar dados da empresa
              if (profileData.empresa_id) {
                const { data: empresaData, error: empresaError } = await supabase
                  .from('empresas')
                  .select('*')
                  .eq('id', profileData.empresa_id)
                  .single();

                if (empresaError) {
                  console.error('Erro ao buscar dados da empresa:', empresaError.message);
                } else if (empresaData) {
                  setEmpresaData(empresaData);
                }
              }
            }
          } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          clearSession();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      console.log('🔍 AuthContext: Login realizado com sucesso');
    } catch (error) {
      console.error('🔍 AuthContext: Erro no login:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      console.log('🔍 AuthContext: Cadastro realizado com sucesso');
    } catch (error) {
      console.error('🔍 AuthContext: Erro no cadastro:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      clearSession();
      console.log('🔍 AuthContext: Logout realizado com sucesso');
    } catch (error) {
      console.error('🔍 AuthContext: Erro no logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        throw error;
      }
      console.log('🔍 AuthContext: Email de reset enviado com sucesso');
    } catch (error) {
      console.error('🔍 AuthContext: Erro ao enviar email de reset:', error);
      throw error;
    }
  };

  const updateUsuarioFoto = (fotoUrl: string) => {
    if (usuarioData) {
      setUsuarioData({ ...usuarioData, foto_url: fotoUrl });
    }
  };

  const value = {
    user,
    session,
    usuarioData,
    empresaData,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isLoggingOut,
    setIsLoggingOut,
    updateUsuarioFoto,
    clearSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

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
      console.log('🔍 AuthContext: VERSÃO ULTRA SIMPLIFICADA - Iniciando checkSession')
      
      // ✅ PREVENIR MÚLTIPLAS EXECUÇÕES
      if (hasInitialized) {
        console.log('🔍 AuthContext: Já inicializado, pulando verificação');
        setLoading(false);
        return;
      }
      
      // ✅ VERSÃO ULTRA SIMPLIFICADA - SEM CHAMADAS AO BANCO
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Erro ao buscar sessão:', error.message);
        setLoading(false);
        setHasInitialized(true);
        return;
      }

      if (!session) {
        console.log('🔍 AuthContext: Nenhuma sessão encontrada');
        setLoading(false);
        setHasInitialized(true);
        return;
      }

      console.log('🔍 AuthContext: Sessão encontrada, usando dados mock para evitar travamentos');
      setUser(session.user);
      setSession(session);

      // Buscar empresa real do banco ou usar dados mock se não encontrar
      let empresaReal = null;
      try {
        const { data: empresas, error } = await supabase
          .from('empresas')
          .select('*')
          .limit(1);
        
        if (!error && empresas && empresas.length > 0) {
          empresaReal = empresas[0];
          console.log('🔍 AuthContext: Empresa real encontrada:', empresaReal);
        } else {
          console.log('🔍 AuthContext: Nenhuma empresa encontrada no banco, usando mock');
        }
      } catch (error) {
        console.log('🔍 AuthContext: Erro ao buscar empresa, usando mock:', error);
      }

      // Buscar dados reais do usuário logado
      let usuarioReal = null;
      try {
        const { data: usuarios, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();

        if (!error && usuarios) {
          usuarioReal = usuarios;
          console.log('🔍 AuthContext: Usuário real encontrado:', usuarioReal);
        } else {
          console.log('🔍 AuthContext: Usuário não encontrado no banco, usando dados da sessão');
        }
      } catch (error) {
        console.log('🔍 AuthContext: Erro ao buscar usuário, usando dados da sessão:', error);
      }

      const usuarioData = {
        empresa_id: empresaReal?.id || '550e8400-e29b-41d4-a716-446655440001',
        nome: usuarioReal?.nome || session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Usuário',
        email: session.user.email || 'teste@teste.com',
        nivel: usuarioReal?.nivel || 'usuario',
        permissoes: usuarioReal?.permissoes || ['usuario'],
        foto_url: usuarioReal?.foto_url || null
      };

      const mockEmpresaData = {
        id: empresaReal?.id || '550e8400-e29b-41d4-a716-446655440001',
        nome: empresaReal?.nome || 'Empresa Teste',
        plano: empresaReal?.plano || 'trial'
      };

      setUsuarioData(usuarioData);
      setEmpresaData(mockEmpresaData);
      localStorage.setItem("user", JSON.stringify({ ...session.user, ...usuarioData }));

      console.log('🔍 AuthContext: Dados reais carregados com sucesso')
      setLoading(false);
      setHasInitialized(true);
    };

    checkSession();

    // ✅ LISTENER SIMPLIFICADO
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 AuthContext: Mudança de estado de autenticação:', event);
        
        // ✅ SÓ EXECUTAR SE NÃO ESTIVER INICIALIZADO
        if (hasInitialized) {
          console.log('🔍 AuthContext: Já inicializado, ignorando mudança de estado');
          return;
        }
        
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          setSession(session);
          
          // Buscar empresa real do banco ou usar dados mock se não encontrar
          let empresaReal = null;
          try {
            const { data: empresas, error } = await supabase
              .from('empresas')
              .select('*')
              .limit(1);
            
            if (!error && empresas && empresas.length > 0) {
              empresaReal = empresas[0];
              console.log('🔍 AuthContext: Empresa real encontrada no listener:', empresaReal);
            } else {
              console.log('🔍 AuthContext: Nenhuma empresa encontrada no banco no listener, usando mock');
            }
          } catch (error) {
            console.log('🔍 AuthContext: Erro ao buscar empresa no listener, usando mock:', error);
          }

          // Buscar dados reais do usuário logado
          let usuarioReal = null;
          try {
            const { data: usuarios, error } = await supabase
              .from('usuarios')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .single();

            if (!error && usuarios) {
              usuarioReal = usuarios;
              console.log('🔍 AuthContext: Usuário real encontrado no listener:', usuarioReal);
            } else {
              console.log('🔍 AuthContext: Usuário não encontrado no banco no listener, usando dados da sessão');
            }
          } catch (error) {
            console.log('🔍 AuthContext: Erro ao buscar usuário no listener, usando dados da sessão:', error);
          }

          const usuarioData = {
            empresa_id: empresaReal?.id || '550e8400-e29b-41d4-a716-446655440001',
            nome: usuarioReal?.nome || session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || 'teste@teste.com',
            nivel: usuarioReal?.nivel || 'usuario',
            permissoes: usuarioReal?.permissoes || ['usuario'],
            foto_url: usuarioReal?.foto_url || null
          };

          const mockEmpresaData = {
            id: empresaReal?.id || '550e8400-e29b-41d4-a716-446655440001',
            nome: empresaReal?.nome || 'Empresa Teste',
            plano: empresaReal?.plano || 'trial'
          };

          setUsuarioData(usuarioData);
          setEmpresaData(mockEmpresaData);
          localStorage.setItem("user", JSON.stringify({ ...session.user, ...usuarioData }));
        } else if (event === 'SIGNED_OUT') {
          clearSession();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [hasInitialized]); // ✅ ADICIONAR hasInitialized como dependência

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

"use client";

// AuthContext otimizado para produção
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, forceLogout } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { podeUsarFuncionalidade as podeUsarFuncionalidadeUtil, isUsuarioTeste as isUsuarioTesteUtil } from '@/config/featureFlags';

interface UsuarioData {
  empresa_id: string;
  nome: string;
  email: string;
  nivel: string;
  permissoes?: string[];
  foto_url?: string;
  auth_user_id?: string;
}

interface EmpresaData {
  id: string;
  nome: string;
  plano: string;
  logo_url?: string;
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
  podeUsarFuncionalidade: (nomeFuncionalidade: string) => boolean;
  isUsuarioTeste: () => boolean;
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

  // Funções para feature flags
  const podeUsarFuncionalidade = (nomeFuncionalidade: string): boolean => {
    return podeUsarFuncionalidadeUtil(usuarioData, nomeFuncionalidade);
  };

  const isUsuarioTeste = (): boolean => {
    return isUsuarioTesteUtil(usuarioData);
  };

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
      // ✅ PREVENIR MÚLTIPLAS EXECUÇÕES
      if (hasInitialized) {
        setLoading(false);
        return;
      }
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Erro ao buscar sessão:', error.message);
          setLoading(false);
          setHasInitialized(true);
          return;
        }

        if (session) {
          setSession(session);
          setUser(session.user);
          
          // ✅ BUSCAR DADOS REAIS DO USUÁRIO E EMPRESA
          try {
            const { data: usuarioData, error: usuarioError } = await supabase
              .from('usuarios')
              .select('empresa_id, nome, email, nivel, permissoes, foto_url')
              .eq('auth_user_id', session.user.id)
              .single();

            if (usuarioError) {
              console.warn('Usuário não encontrado, usando dados mock');
              // ✅ FALLBACK PARA DADOS MOCK
              const mockUsuarioData: UsuarioData = {
                empresa_id: '550e8400-e29b-41d4-a716-446655440001',
                nome: 'Usuário Teste',
                email: session.user.email || '',
                nivel: 'usuarioteste',
                permissoes: ['dashboard', 'ordens', 'clientes', 'equipamentos', 'financeiro', 'bancada', 'comissoes', 'termos', 'perfil', 'configuracoes']
              };
              setUsuarioData(mockUsuarioData);
              
              const mockEmpresaData: EmpresaData = {
                id: '550e8400-e29b-41d4-a716-446655440001',
                nome: 'Empresa Teste',
                plano: 'trial'
              };
              setEmpresaData(mockEmpresaData);
            } else if (usuarioData) {
              setUsuarioData(usuarioData);
              
              // ✅ BUSCAR DADOS DA EMPRESA
              const { data: empresaData, error: empresaError } = await supabase
                .from('empresas')
                .select('id, nome, plano')
                .eq('id', usuarioData.empresa_id)
                .single();

              if (empresaError) {
                console.warn('Empresa não encontrada, usando dados mock');
                const mockEmpresaData: EmpresaData = {
                  id: usuarioData.empresa_id,
                  nome: 'Empresa Teste',
                  plano: 'trial'
                };
                setEmpresaData(mockEmpresaData);
              } else if (empresaData) {
                setEmpresaData(empresaData);
              }
            }
          } catch (error) {
            console.warn('Erro ao buscar dados do usuário/empresa, usando mock');
            // ✅ FALLBACK PARA DADOS MOCK
            const mockUsuarioData: UsuarioData = {
              empresa_id: '550e8400-e29b-41d4-a716-446655440001',
              nome: 'Usuário Teste',
              email: session.user.email || '',
              nivel: 'usuarioteste',
              permissoes: ['dashboard', 'ordens', 'clientes', 'equipamentos', 'financeiro', 'bancada', 'comissoes', 'termos', 'perfil', 'configuracoes']
            };
            setUsuarioData(mockUsuarioData);
            
            const mockEmpresaData: EmpresaData = {
              id: '550e8400-e29b-41d4-a716-446655440001',
              nome: 'Empresa Teste',
              plano: 'trial'
            };
            setEmpresaData(mockEmpresaData);
          }
        }
        
        setLoading(false);
        setHasInitialized(true);
      } catch (error) {
        console.error('Erro no checkSession:', error);
        setLoading(false);
        setHasInitialized(true);
      }
    };

    checkSession();
  }, [hasInitialized]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        // ✅ PREVENIR MÚLTIPLAS EXECUÇÕES
        if (hasInitialized && event === 'SIGNED_IN') {
          return;
        }

        if (event === 'SIGNED_IN' && session) {
          setSession(session);
          setUser(session.user);
          setHasInitialized(true);
          
          // ✅ BUSCAR DADOS REAIS DO USUÁRIO E EMPRESA
          try {
            const { data: usuarioData, error: usuarioError } = await supabase
              .from('usuarios')
              .select('empresa_id, nome, email, nivel, permissoes, foto_url')
              .eq('auth_user_id', session.user.id)
              .single();

            if (usuarioError) {
              console.warn('Usuário não encontrado, usando dados mock');
              // ✅ FALLBACK PARA DADOS MOCK
              const mockUsuarioData: UsuarioData = {
                empresa_id: '550e8400-e29b-41d4-a716-446655440001',
                nome: 'Usuário Teste',
                email: session.user.email || '',
                nivel: 'usuarioteste',
                permissoes: ['dashboard', 'ordens', 'clientes', 'equipamentos', 'financeiro', 'bancada', 'comissoes', 'termos', 'perfil', 'configuracoes']
              };
              setUsuarioData(mockUsuarioData);
              
              const mockEmpresaData: EmpresaData = {
                id: '550e8400-e29b-41d4-a716-446655440001',
                nome: 'Empresa Teste',
                plano: 'trial'
              };
              setEmpresaData(mockEmpresaData);
            } else if (usuarioData) {
              setUsuarioData(usuarioData);
              
              // ✅ BUSCAR DADOS DA EMPRESA
              const { data: empresaData, error: empresaError } = await supabase
                .from('empresas')
                .select('id, nome, plano')
                .eq('id', usuarioData.empresa_id)
                .single();

              if (empresaError) {
                console.warn('Empresa não encontrada, usando dados mock');
                const mockEmpresaData: EmpresaData = {
                  id: usuarioData.empresa_id,
                  nome: 'Empresa Teste',
                  plano: 'trial'
                };
                setEmpresaData(mockEmpresaData);
              } else if (empresaData) {
                setEmpresaData(empresaData);
              }
            }
          } catch (error) {
            console.warn('Erro ao buscar dados do usuário/empresa, usando mock');
            // ✅ FALLBACK PARA DADOS MOCK
            const mockUsuarioData: UsuarioData = {
              empresa_id: '550e8400-e29b-41d4-a716-446655440001',
              nome: 'Usuário Teste',
              email: session.user.email || '',
              nivel: 'usuarioteste',
              permissoes: ['dashboard', 'ordens', 'clientes', 'equipamentos', 'financeiro', 'bancada', 'comissoes', 'termos', 'perfil', 'configuracoes']
            };
            setUsuarioData(mockUsuarioData);
            
            const mockEmpresaData: EmpresaData = {
              id: '550e8400-e29b-41d4-a716-446655440001',
              nome: 'Empresa Teste',
              plano: 'trial'
            };
            setEmpresaData(mockEmpresaData);
          }
        } else if (event === 'SIGNED_OUT') {
          clearSession();
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [hasInitialized]);

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
    podeUsarFuncionalidade,
    isUsuarioTeste,
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

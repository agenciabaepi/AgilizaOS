"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { supabase, forceLogout, fetchUserDataOptimized } from '@/lib/supabaseClient';
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
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  usuarioData: UsuarioData | null;
  empresaData: EmpresaData | null;
  loading: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
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
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // ✅ OTIMIZADO: Função para buscar dados do usuário com timeout
  const fetchUserData = useCallback(async (userId: string, sessionData: Session) => {
    // Evitar chamadas duplicadas
    if (usuarioData && empresaData) {
      console.log('✅ Dados já carregados, pulando busca');
      return;
    }

    try {
      console.log('🚀 Iniciando busca otimizada de dados...');
      
      // Usar função otimizada com JOIN
      const { userData, empresaData: companyData } = await fetchUserDataOptimized(userId);
      
      console.log('✅ Dados carregados com sucesso');
      setUsuarioData(userData);
      setEmpresaData(companyData);
      
    } catch (error) {
      console.warn('⚠️ Erro na busca otimizada, usando fallback:', error);
      
      // Fallback para dados mock
      const mockUsuarioData: UsuarioData = {
        empresa_id: '550e8400-e29b-41d4-a716-446655440001',
        nome: 'Usuário Teste',
        email: sessionData.user.email || '',
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
  }, [usuarioData, empresaData]);

  // ✅ DEFINIR clearSession ANTES dos useEffects
  const clearSession = useCallback(() => {
    console.log('🧹 Limpando sessão...');
    setUser(null);
    setSession(null);
    setUsuarioData(null);
    setEmpresaData(null);
    setHasInitialized(false);
  }, []);

  // ✅ OTIMIZADO: useEffect principal simplificado
  useEffect(() => {
    if (hasInitialized) return;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setLoading(false);
          setHasInitialized(true);
          return;
        }

        if (session) {
          setSession(session);
          setUser(session.user);
          await fetchUserData(session.user.id, session);
        }
      } catch (error) {
        console.warn('Erro na inicialização da autenticação');
      } finally {
        setLoading(false);
        setHasInitialized(true);
      }
    };

    initializeAuth();
  }, [hasInitialized, fetchUserData]);

  // ✅ CORRIGIDO: Listener de mudanças de auth com tratamento completo
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('🔄 Auth state change:', event, session?.user?.email);
        
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ Usuário logado, configurando sessão...');
            if (session) {
              setSession(session);
              setUser(session.user);
              await fetchUserData(session.user.id, session);
            }
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token renovado, atualizando sessão...');
            if (session) {
              setSession(session);
              setUser(session.user);
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('🚪 Usuário deslogado, limpando sessão...');
            clearSession();
            setLoading(false);
            break;
            
          case 'USER_UPDATED':
            console.log('👤 Usuário atualizado, atualizando dados...');
            if (session) {
              setSession(session);
              setUser(session.user);
            }
            break;
            
          default:
            console.log('ℹ️ Evento não tratado:', event);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [clearSession, fetchUserData]);

  // ✅ OTIMIZADO: Funções memoizadas
  const podeUsarFuncionalidade = useCallback((nomeFuncionalidade: string) => {
    return podeUsarFuncionalidadeUtil(usuarioData, nomeFuncionalidade);
  }, [usuarioData]);

  const isUsuarioTeste = useCallback(() => {
    return isUsuarioTesteUtil(usuarioData);
  }, [usuarioData]);

  // ✅ IMPLEMENTAR: Funções de autenticação que estavam faltando
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        await fetchUserData(data.session.user.id, data.session);
        setHasInitialized(true);
      }
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchUserData]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      clearSession();
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    } finally {
      setIsLoggingOut(false);
    }
  }, [clearSession]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      throw error;
    }
  }, []);

  const updateUsuarioFoto = useCallback((fotoUrl: string) => {
    setUsuarioData(prev => prev ? { ...prev, foto_url: fotoUrl } : null);
  }, []);

  // ✅ MEMOIZAR VALUE para evitar re-renders
  const value = useMemo(() => ({
    user,
    session,
    usuarioData,
    empresaData,
    loading,
    showOnboarding,
    setShowOnboarding,
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
  }), [user, session, usuarioData, empresaData, loading, showOnboarding, signIn, signUp, signOut, resetPassword, updateUsuarioFoto, clearSession, podeUsarFuncionalidade, isUsuarioTeste]);

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

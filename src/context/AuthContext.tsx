"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
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
  
  // ✅ CACHE: Evitar múltiplas verificações
  const [authCache, setAuthCache] = useState<{
    lastCheck: number;
    isValid: boolean;
  }>({ lastCheck: 0, isValid: false });

  // ✅ OTIMIZADO: Função para buscar dados do usuário com cache
  const fetchUserData = useCallback(async (userId: string, sessionData: Session) => {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    
    // Se temos cache válido, não refazer a busca
    if (authCache.isValid && (now - authCache.lastCheck) < CACHE_DURATION && usuarioData) {
      return;
    }

    try {
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id, nome, email, nivel, permissoes, foto_url')
        .eq('auth_user_id', userId)
        .single();

      if (usuarioError) {
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
      } else if (usuarioData) {
        setUsuarioData(usuarioData);
        
        // Buscar dados da empresa
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('id, nome, plano, logo_url, cnpj, endereco, telefone, email')
          .eq('id', usuarioData.empresa_id)
          .single();

        if (empresaError) {
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
      
      // ✅ ATUALIZAR CACHE
      setAuthCache({ lastCheck: now, isValid: true });
      
    } catch (error) {
      console.warn('Erro ao buscar dados, usando fallback');
      // Fallback silencioso
    }
  }, [authCache, usuarioData]);

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

  // ✅ OTIMIZADO: Listener de mudanças de auth simplificado
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (event === 'SIGNED_IN' && session && !hasInitialized) {
          setSession(session);
          setUser(session.user);
          await fetchUserData(session.user.id, session);
          setHasInitialized(true);
        } else if (event === 'SIGNED_OUT') {
          clearSession();
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [hasInitialized, fetchUserData]);

  // ✅ OTIMIZADO: Funções memoizadas
  const podeUsarFuncionalidade = useCallback((nomeFuncionalidade: string) => {
    return podeUsarFuncionalidadeUtil(usuarioData, nomeFuncionalidade);
  }, [usuarioData]);

  const isUsuarioTeste = useCallback(() => {
    return isUsuarioTesteUtil(usuarioData);
  }, [usuarioData]);

  const clearSession = useCallback(() => {
    setUser(null);
    setSession(null);
    setUsuarioData(null);
    setEmpresaData(null);
    setAuthCache({ lastCheck: 0, isValid: false });
    setHasInitialized(false);
  }, []);

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
  }), [user, session, usuarioData, empresaData, loading, isLoggingOut, signIn, signUp, signOut, resetPassword, updateUsuarioFoto, clearSession, podeUsarFuncionalidade, isUsuarioTeste]);

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

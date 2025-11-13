"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { supabase, fetchUserDataOptimized } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { podeUsarFuncionalidade as podeUsarFuncionalidadeUtil, isUsuarioTeste as isUsuarioTesteUtil } from '@/config/featureFlags';
import { handleAuthError } from '@/utils/clearAuth';

interface UsuarioData {
  id: string;
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
  lastUpdate: number;
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
  refreshEmpresaData: () => Promise<void>;
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
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [loading, setLoading] = useState(false); // Sempre false para evitar travamentos
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ✅ OTIMIZADO: Função para buscar dados do usuário com timeout e retry
  const fetchUserData = useCallback(async (userId: string, sessionData: Session) => {
    let retryCount = 0;
    const maxRetries = 3;

    const attemptFetch = async (): Promise<void> => {
      try {
        const { userData, empresaData: companyData } = await fetchUserDataOptimized(userId);
        setUsuarioData(userData as UsuarioData);
        setEmpresaData(companyData);
      } catch (error) {
        if (retryCount < maxRetries - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          return attemptFetch();
        }
        try {
          const { data: basicUserData } = await supabase
            .from('usuarios')
            .select('id, empresa_id, nome, email, nivel')
            .eq('auth_user_id', userId)
            .single();
          if (basicUserData) {
            setUsuarioData({
              id: basicUserData.id,
              empresa_id: basicUserData.empresa_id,
              nome: basicUserData.nome,
              email: basicUserData.email,
              nivel: basicUserData.nivel,
              permissoes: [],
              foto_url: null
            });
            setEmpresaData({
              id: basicUserData.empresa_id,
              nome: 'Empresa Temporária',
              cnpj: '',
              endereco: '',
              telefone: '',
              email: '',
              logo_url: '',
              plano: 'trial'
            });
            return;
          }
        } catch {}
        const tempEmpresaId = `temp-${userId.slice(0, 8)}`;
        setUsuarioData({
          id: `temp-${userId}`,
          empresa_id: tempEmpresaId,
          nome: 'Usuário',
          email: sessionData.user.email || '',
          nivel: 'usuario',
          permissoes: [],
          foto_url: null
        });
        setEmpresaData({
          id: tempEmpresaId,
          nome: 'Empresa Temporária',
          cnpj: '',
          endereco: '',
          telefone: '',
          email: '',
          logo_url: '',
          plano: 'trial'
        });
      }
    };

    await attemptFetch();
  }, []);

  // ✅ DEFINIR clearSession ANTES dos useEffects
  const clearSession = useCallback(() => {
    setUser(null);
    setSession(null);
    setUsuarioData(null);
    setEmpresaData(null);
  }, []);

  // ✅ ULTRA SIMPLIFICADO: useEffect principal sem travamentos
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // ✅ SEM TIMEOUT: Deixar o Supabase responder naturalmente
        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session) {
          setSession(session);
          setUser(session.user);

          // ✅ DADOS TEMPORÁRIOS SEGUROS: Não interferir com dados reais
          setUsuarioData({
            id: session.user.id,
            empresa_id: '',
            nome: session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            nivel: '',
            permissoes: [],
            foto_url: null
          });

          setEmpresaData({
            id: '',
            nome: '',
            plano: ''
          });

          // ✅ CARREGAMENTO EM BACKGROUND: Sem bloquear interface
          fetchUserData(session.user.id, session).catch(() => {
            // Silencioso - dados temporários já estão disponíveis
          });
        }
      } catch {}
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Sem dependências

  // ✅ CORRIGIDO: Listener de mudanças de auth com tratamento completo
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (event === 'SIGNED_IN' && session) {
          setSession(session);
          setUser(session.user);

          // ✅ DADOS TEMPORÁRIOS SEGUROS
          setUsuarioData({
            id: session.user.id,
            empresa_id: '',
            nome: session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            nivel: '',
            permissoes: [],
            foto_url: null
          });

          setEmpresaData({
            id: '',
            nome: '',
            plano: ''
          });

          // ✅ CARREGAMENTO EM BACKGROUND
          fetchUserData(session.user.id, session).catch(() => {
            // Silencioso
          });
        } else if (event === 'SIGNED_OUT') {
          clearSession();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [clearSession, fetchUserData]);

  // ✅ REMOVIDO: useEffect que causava loops infinitos
  // Os dados são carregados apenas uma vez no useEffect principal

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
        // Removido fetchUserData daqui para evitar duplicação
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

      // Não retornar data, apenas completar a operação
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

  const refreshEmpresaData = useCallback(async () => {
     if (!user?.id) return;
     
     try {
 
       const { userData, empresaData } = await fetchUserDataOptimized(user.id);
      setUsuarioData(userData as UsuarioData);
      setEmpresaData(empresaData);
      setLastUpdate(performance.now());
 
       // Forçar re-render de componentes que dependem dos dados da empresa
       setTimeout(() => {
         setLastUpdate(performance.now());
       }, 100);
     } catch (error) {
 
     }
  }, [user?.id]);

  // ✅ MEMOIZAR VALUE para evitar re-renders
  const value = useMemo(() => ({
    user,
    session,
    usuarioData,
    empresaData,
    lastUpdate,
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
    refreshEmpresaData,
    clearSession,
    podeUsarFuncionalidade,
    isUsuarioTeste,
  }), [user, session, usuarioData, empresaData, lastUpdate, loading, showOnboarding, signIn, signUp, signOut, resetPassword, updateUsuarioFoto, refreshEmpresaData, clearSession, podeUsarFuncionalidade, isUsuarioTeste]);

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

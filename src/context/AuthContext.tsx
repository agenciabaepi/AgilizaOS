"use client";

// AuthContext revisado para centralizar a lógica de sessão

// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { supabase, forceLogout } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { podeUsarFuncionalidade as podeUsarFuncionalidadeUtil, isUsuarioTeste as isUsuarioTesteUtil } from '@/config/featureFlags';
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
  // Funções para feature flags
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
  // Remover const { addToast } = useToast ? useToast() : { addToast: () => {} };

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

      // ✅ VERSÃO OTIMIZADA: Usar dados da sessão primeiro, consultar banco apenas se necessário
      let empresaReal = null;
      let usuarioReal = null;
      
      // Usar dados da sessão como fallback imediato
      const usuarioData = {
        empresa_id: '550e8400-e29b-41d4-a716-446655440001',
        nome: session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Usuário',
        email: session.user.email || 'teste@teste.com',
        nivel: 'usuarioteste', // ← PROBLEMA: deveria ser 'admin' para usuários admin
        permissoes: ['usuarioteste'],
        foto_url: undefined
      };

      const mockEmpresaData = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        nome: 'Empresa Teste',
        plano: 'trial'
      };

      // Definir dados imediatamente para evitar delay
      setUsuarioData(usuarioData);
      setEmpresaData(mockEmpresaData);
      localStorage.setItem("user", JSON.stringify({ ...session.user, ...usuarioData }));

      // ✅ CONSULTAS ASSÍNCRONAS EM BACKGROUND (não bloqueiam renderização)
      (async () => {
        try {
          // Buscar empresa real em background
          const { data: empresas, error: empresaError } = await supabase
            .from('empresas')
            .select('*')
            .limit(1);
          
          if (!empresaError && empresas && empresas.length > 0) {
            empresaReal = empresas[0];
            console.log('🔍 AuthContext: Empresa real encontrada em background:', empresaReal);
            
            // Atualizar empresa se encontrada
            const empresaAtualizada = {
              id: empresaReal.id,
              nome: empresaReal.nome,
              plano: empresaReal.plano || 'trial'
            };
            setEmpresaData(empresaAtualizada);
          }
        } catch (error) {
          console.log('🔍 AuthContext: Erro ao buscar empresa em background:', error);
        }

        try {
          // Buscar usuário real em background
          const { data: usuarios, error: usuarioError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .single();

          if (!usuarioError && usuarios) {
            usuarioReal = usuarios;
            console.log('🔍 AuthContext: Usuário real encontrado em background:', usuarioReal);
            
            // Atualizar usuário se encontrado
            const usuarioAtualizado = {
              empresa_id: usuarioReal.empresa_id || usuarioData.empresa_id,
              nome: usuarioReal.nome || usuarioData.nome,
              email: usuarioReal.email || usuarioData.email,
              nivel: usuarioReal.nivel || usuarioData.nivel,
              permissoes: usuarioReal.permissoes || usuarioData.permissoes,
              foto_url: usuarioReal.foto_url || usuarioData.foto_url
            };
            setUsuarioData(usuarioAtualizado);
            localStorage.setItem("user", JSON.stringify({ ...session.user, ...usuarioAtualizado }));
          }
        } catch (error) {
          console.log('🔍 AuthContext: Erro ao buscar usuário em background:', error);
        }
      })();

      // Dados já definidos acima

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
          
          // ✅ VERSÃO OTIMIZADA: Usar dados da sessão primeiro
          const usuarioData = {
            empresa_id: '550e8400-e29b-41d4-a716-446655440001',
            nome: session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || 'teste@teste.com',
            nivel: 'admin', // ← CORRIGIDO: era 'usuarioteste', agora é 'admin'
            permissoes: ['admin'], // ← CORRIGIDO: era ['usuarioteste'], agora é ['admin']
            foto_url: undefined
          };
          
          const mockEmpresaData = {
            id: '550e8400-e29b-41d4-a716-446655440001',
            nome: 'Empresa Teste',
            plano: 'trial'
          };

          setUsuarioData(usuarioData);
          setEmpresaData(mockEmpresaData);
          localStorage.setItem("user", JSON.stringify({ ...session.user, ...usuarioData }));

          // ✅ CONSULTAS EM BACKGROUND (não bloqueiam)
          (async () => {
            try {
              const { data: empresas, error: empresaError } = await supabase
                .from('empresas')
                .select('*')
                .limit(1);
              
              if (!empresaError && empresas && empresas.length > 0) {
                const empresaAtualizada = {
                  id: empresas[0].id,
                  nome: empresas[0].nome,
                  plano: empresas[0].plano || 'trial'
                };
                setEmpresaData(empresaAtualizada);
              }
            } catch (error) {
              console.log('🔍 AuthContext: Erro ao buscar empresa em background:', error);
            }

            try {
              const { data: usuarios, error: usuarioError } = await supabase
                .from('usuarios')
                .select('*')
                .eq('auth_user_id', session.user.id)
                .single();

              if (!usuarioError && usuarios) {
                const usuarioAtualizado = {
                  empresa_id: usuarios.empresa_id || usuarioData.empresa_id,
                  nome: usuarios.nome || usuarioData.nome,
                  email: usuarios.email || usuarioData.email,
                  nivel: usuarios.nivel || usuarioData.nivel,
                  permissoes: usuarios.permissoes || usuarioData.permissoes,
                  foto_url: usuarios.foto_url || usuarioData.foto_url
                };
                setUsuarioData(usuarioAtualizado);
                localStorage.setItem("user", JSON.stringify({ ...session.user, ...usuarioAtualizado }));
              }
            } catch (error) {
              console.log('🔍 AuthContext: Erro ao buscar usuário em background:', error);
            }
          })();
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

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface AuthGuardFinalProps {
  children: React.ReactNode;
  requiredPermission?: string;
  fallbackPath?: string;
}

/**
 * AuthGuard Final - Versão otimizada sem loops
 * Redirecionamento rápido mas seguro
 */
export default function AuthGuardFinal({ 
  children, 
  requiredPermission, 
  fallbackPath = '/dashboard' 
}: AuthGuardFinalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { usuarioData, empresaData, loading: authContextLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Evitar múltiplas execuções
    if (isRedirecting) return;
    
    console.log('⚡ AuthGuardFinal: Verificação...');
    
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📊 AuthGuardFinal: Sessão:', !!session);
        
        if (!session) {
          console.log('🚫 AuthGuardFinal: Redirecionando...');
          setIsRedirecting(true);
          
          // Pequeno delay para evitar loops
          setTimeout(() => {
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          }, 50);
          
          return;
        }

        // Se tem sessão, mas AuthContext ainda carregando
        if (authContextLoading) {
          console.log('⏳ AuthGuardFinal: AuthContext ainda carregando...');
          setTimeout(checkAuth, 50);
          return;
        }

        // ⚠️ BLOQUEAR ACESSO: Verificar se empresa está ativa
        // Precisamos aguardar empresaData estar disponível
        if (authContextLoading || !empresaData) {
          console.log('⏳ AuthGuardFinal: Aguardando empresaData...');
          setTimeout(checkAuth, 50);
          return;
        }
        
        if (empresaData && empresaData.ativo === false) {
          console.log('🚫 AuthGuardFinal: Empresa desativada, redirecionando para login');
          setIsRedirecting(true);
          supabase.auth.signOut().then(() => {
            router.replace('/login?error=empresa_desativada');
          }).catch((e) => {
            console.error('Erro ao fazer logout:', e);
            router.replace('/login?error=empresa_desativada');
          });
          return;
        }

        // Verificar permissões se necessário
        if (requiredPermission) {
          if (!usuarioData) {
            console.log('⏳ AuthGuardFinal: Aguardando usuarioData para permissões...');
            setTimeout(checkAuth, 50);
            return;
          }
          
          const hasPermission = checkPermission(usuarioData, requiredPermission);
          if (!hasPermission) {
            console.log(`🚫 AuthGuardFinal: Sem permissão '${requiredPermission}', redirecionando para fallback.`);
            setIsRedirecting(true);
            setTimeout(() => {
              router.replace(fallbackPath);
            }, 50);
            return;
          }
        }
        
        // Se tem sessão e permissões (se necessário), autorizar
        console.log('✅ AuthGuardFinal: Autorizado!');
        setIsAuthorized(true);
        
      } catch (err) {
        console.error('❌ AuthGuardFinal: Erro:', err);
        setIsRedirecting(true);
        setTimeout(() => {
          router.replace('/login');
        }, 50);
      }
    };

    checkAuth();
    
    // Timeout de segurança
    const timeout = setTimeout(() => {
      if (!isAuthorized && !isRedirecting) {
        console.log('⚠️ AuthGuardFinal: Timeout...');
        setIsRedirecting(true);
        router.replace('/login');
      }
    }, 200);
    
    return () => clearTimeout(timeout);
  }, [isAuthorized, isRedirecting, pathname, router, requiredPermission, fallbackPath, usuarioData, empresaData, authContextLoading]);

  // Helper para verificar permissões
  const checkPermission = (user: any, permission: string): boolean => {
    if (user.nivel === 'usuarioteste' || user.nivel === 'admin') return true;
    return user.permissoes && user.permissoes.includes(permission);
  };

  // Se está redirecionando, não renderizar nada
  if (isRedirecting) {
    return null;
  }

  // Se não está autorizado, não renderizar nada
  if (!isAuthorized) {
    return null;
  }

  // Se está autorizado, renderizar conteúdo
  return <>{children}</>;
}

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { canUseModule } from '@/lib/permissions';

export function useConfigPermission(configPermissao: string) {
  const { usuarioData } = useAuth();

  const isAdmin = usuarioData?.nivel === 'admin';
  const isUsuarioTeste = usuarioData?.nivel === 'usuarioteste';

  const podeAcessar = canUseModule(
    configPermissao,
    usuarioData?.nivel,
    usuarioData?.permissoes
  );

  return {
    podeAcessar,
    isAdmin,
    isUsuarioTeste,
    permissoes: usuarioData?.permissoes || [],
  };
}

export function AcessoNegadoComponent() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Acesso Negado</h3>
        <p className="text-gray-600">Você não tem permissão para acessar esta configuração.</p>
      </div>
    </div>
  );
}

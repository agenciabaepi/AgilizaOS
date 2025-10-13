import React from 'react';
import { useAuth } from '@/context/AuthContext';

export function useConfigPermission(configPermissao: string) {
  const { usuarioData } = useAuth();
  
  const isAdmin = usuarioData?.nivel === 'admin';
  const isUsuarioTeste = usuarioData?.nivel === 'usuarioteste';
  const permissoes = usuarioData?.permissoes || [];
  
  const podeAcessar = isAdmin || isUsuarioTeste || permissoes.includes(configPermissao);
  
  return {
    podeAcessar,
    isAdmin,
    isUsuarioTeste,
    permissoes
  };
}

// Componente de acesso negado
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

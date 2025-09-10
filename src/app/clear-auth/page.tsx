'use client';

import { useEffect } from 'react';
import { clearAllAuthData } from '@/utils/clearAuth';

export default function ClearAuthPage() {
  useEffect(() => {
    // Limpar todos os dados de autenticação
    clearAllAuthData();
    
    // Redirecionar para login após 2 segundos
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Limpando Dados de Autenticação</h1>
        <p className="text-gray-600 mb-6">
          Detectamos um problema com sua sessão. Estamos limpando todos os dados de autenticação...
        </p>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Redirecionando para login...</p>
        </div>
      </div>
    </div>
  );
}

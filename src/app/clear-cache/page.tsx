'use client';

import { useState } from 'react';
import { clearSupabaseCache, forceRefreshUserData } from '@/lib/supabaseClient';
import { Button } from '@/components/Button';

export default function ClearCachePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleClearCache = async () => {
    setLoading(true);
    setMessage('Limpando cache...');
    
    try {
      await clearSupabaseCache();
      setMessage('✅ Cache limpo com sucesso! Redirecionando...');
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      setMessage('❌ Erro ao limpar cache: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setLoading(true);
    setMessage('Refrescando dados do usuário...');
    
    try {
      const success = await forceRefreshUserData();
      if (success) {
        setMessage('✅ Dados refrescados! Recarregando página...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage('⚠️ Não foi possível refrescar. Tente limpar cache.');
      }
    } catch (error) {
      setMessage('❌ Erro ao refrescar dados: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Limpar Cache do Sistema
        </h1>
        
        <p className="text-gray-600 mb-6 text-center">
          Esta página limpa completamente o cache do Supabase e dados locais para resolver problemas de lentidão.
        </p>
        
        <div className="space-y-3">
          <Button
            onClick={handleRefreshData}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Refrescando...' : '🔄 Refrescar Dados do Usuário'}
          </Button>
          
          <Button
            onClick={handleClearCache}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Limpando...' : '🗑️ Limpar Cache e Ir para Login'}
          </Button>
        </div>
        
        {message && (
          <div className={`mt-4 p-3 rounded-md text-center ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 
            message.includes('❌') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

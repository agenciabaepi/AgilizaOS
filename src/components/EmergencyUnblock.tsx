'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

export default function EmergencyUnblock() {
  const [showEmergencyButton, setShowEmergencyButton] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  useEffect(() => {
    // Mostrar botão de emergência após 20 segundos
    const emergencyTimer = setTimeout(() => {
      setShowEmergencyButton(true);
    }, 20000);

    return () => clearTimeout(emergencyTimer);
  }, []);

  const handleEmergencyUnblock = async () => {
    if (isUnblocking) return;
    
    setIsUnblocking(true);
    console.log('🚨 DESBLOQUEIO DE EMERGÊNCIA ACIONADO');
    
    try {
      // 1. Remover TODOS os overlays e elementos de loading
      const allOverlays = document.querySelectorAll(`
        [id*="loading"], [id*="overlay"], [id*="spinner"], 
        .loading-overlay, .spinner, .loading, 
        [class*="loading"], [class*="spinner"], [class*="overlay"]
      `);
      allOverlays.forEach(el => el.remove());
      
      // 2. Restaurar interatividade TOTAL
      document.body.style.cssText = '';
      document.documentElement.style.cssText = '';
      
      // 3. Limpar classes problemáticas
      document.body.className = document.body.className
        .split(' ')
        .filter(cls => !cls.includes('loading') && !cls.includes('blocked'))
        .join(' ');
      
      // 4. Forçar re-render da página
      const rootElement = document.getElementById('__next') || document.body;
      rootElement.style.display = 'none';
      setTimeout(() => {
        rootElement.style.display = '';
      }, 100);
      
      // 5. Tentar refresh múltiplo
      setTimeout(() => {
        try {
          router.refresh();
        } catch (e) {
          // Fallback: recarregar página inteira
          window.location.reload();
        }
      }, 500);
      
      addToast('Sistema desbloqueado! Recarregando...', 'success');
      
    } catch (error) {
      console.error('Erro no desbloqueio de emergência:', error);
      // Último recurso: recarregar página
      window.location.reload();
    }
    
    setTimeout(() => setIsUnblocking(false), 3000);
  };

  if (!showEmergencyButton) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-[99999] animate-pulse"
      style={{ zIndex: 99999 }}
    >
      <button
        onClick={handleEmergencyUnblock}
        disabled={isUnblocking}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg shadow-lg font-medium text-sm border-2 border-white"
        style={{ 
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 99999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        {isUnblocking ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Desbloqueando...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            🚨 Desbloquear Sistema
          </span>
        )}
      </button>
    </div>
  );
}

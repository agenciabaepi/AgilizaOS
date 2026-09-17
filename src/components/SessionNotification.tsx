import React, { useState, useEffect } from 'react';
import { useSessionControl } from '@/hooks/useSessionControl';
import { useToast } from '@/hooks/useToast';

interface SessionNotificationProps {
  showDetails?: boolean;
}

export function SessionNotification({ showDetails = false }: SessionNotificationProps) {
  const { currentSession, logoutOtherSessions, isPrimarySession, sessionsEnabled } = useSessionControl();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  // Mostrar notificação quando há sessão ativa
  useEffect(() => {
    if (sessionsEnabled && currentSession && isPrimarySession && !showModal) {
      addToast('Sessão única ativa - Sistema de segurança habilitado', 'success');
    }
  }, [sessionsEnabled, currentSession, isPrimarySession, showModal, addToast]);

  // Notificar sobre nova sessão
  useEffect(() => {
    if (sessionsEnabled && currentSession && isPrimarySession) {
      // Sistema de sessão única - não há múltiplas sessões
    }
  }, [sessionsEnabled, currentSession, isPrimarySession, addToast]);

  // Se sessões não estão habilitadas, não mostrar nada
  if (!sessionsEnabled) return null;

  const handleLogoutOthers = async () => {
    setIsTerminating(true);
    try {
      await logoutOtherSessions();
      addToast('Outras sessões foram encerradas', 'success');
      setShowModal(false);
    } catch (error) {
      addToast('Erro ao encerrar outras sessões', 'error');
    } finally {
      setIsTerminating(false);
    }
  };

  const formatDeviceName = (device: string) => {
    const deviceNames: { [key: string]: string } = {
      'Android': '📱 Android',
      'iOS': '📱 iPhone/iPad',
      'Windows': '💻 Windows',
      'Mac': '💻 Mac',
      'Linux': '💻 Linux',
      'Desktop': '💻 Desktop'
    };
    return deviceNames[device] || device;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes} min atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days} dias atrás`;
  };

  // Sistema de sessão única - apenas mostrar status quando necessário
  if (!currentSession) return null;

  return (
    <>
      {/* Notificação de sessão única ativa */}
      {currentSession && isPrimarySession && showDetails && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Sessão Segura Ativa
                </h3>
                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                  Sistema de sessão única habilitado
                </p>
                <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                  <p>Dispositivo: {formatDeviceName(currentSession.device)}</p>
                  <p>Ativo: {formatTime(currentSession.lastActivity)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="ml-2 text-green-400 hover:text-green-600"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

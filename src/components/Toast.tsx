import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { playNotificationSound, createAudioActivationButton } from '@/utils/audioPlayer';
import { useAuth } from '@/context/AuthContext';
export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  type: ToastType;
  content: string;
}

interface ToastContextProps {
  addToast: (type: ToastType, content: string) => void;
  showModal: (opts: { title: string; message?: string; messageNode?: ReactNode; confirmLabel?: string; onConfirm?: () => void; onClose?: () => void; type?: 'warning' | 'error' | 'info' | 'success' }) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

let toastCount = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modal, setModal] = useState<{ title: string; message?: string; messageNode?: ReactNode; confirmLabel?: string; onConfirm?: () => void; onClose?: () => void; type?: 'warning' | 'error' | 'info' | 'success' } | null>(null);
  const { usuarioData } = useAuth();

  // Reproduzir som quando modal de orçamento for exibida - APENAS para atendentes
  useEffect(() => {
    const isAtendente = usuarioData?.nivel === 'atendente';
    
    if (modal && modal.title.toLowerCase().includes('orçamento') && isAtendente) {
      console.log('🔔 Toast: Modal de orçamento detectada, tentando reproduzir som...');
      console.log('📋 Toast: Título da modal:', modal.title);
      
      // Tentar reproduzir som múltiplas vezes para garantir que funcione
      const tryPlaySound = async () => {
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          attempts++;
          console.log(`🔔 Toast: Tentativa ${attempts}/${maxAttempts}`);
          
          try {
            const success = await playNotificationSound();
            if (success) {
              console.log(`✅ Toast: Som reproduzido com sucesso na tentativa ${attempts}!`);
              return;
            } else if (attempts === maxAttempts) {
              // Na última tentativa, criar botão de ativação
              console.warn('⚠️ Toast: Todas as tentativas falharam - criando botão de ativação');
              createAudioActivationButton();
            }
          } catch (error) {
            console.warn(`⚠️ Toast: Tentativa ${attempts} falhou:`, error);
            if (attempts === maxAttempts) {
              // Na última tentativa, criar botão de ativação
              createAudioActivationButton();
            }
          }
          
          // Pequena pausa entre tentativas
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        console.warn('⚠️ Toast: Todas as tentativas falharam');
      };
      
      tryPlaySound();
    } else if (modal && modal.title.toLowerCase().includes('orçamento') && !isAtendente) {
      console.log('🔔 Toast: Som não reproduzido - usuário não é atendente');
    }
  }, [modal, usuarioData]);

  const addToast = useCallback((type: ToastType, content: string) => {
    const id = ++toastCount;
    setToasts(prev => [...prev, { id, type, content }]);
    
    // Calcular tempo baseado no tipo e comprimento da mensagem
    let duration = 5000; // Base de 5 segundos
    
    // Warnings e errors ficam mais tempo (são mensagens mais importantes)
    if (type === 'warning') {
      duration = 10000; // 10 segundos para warnings
    } else if (type === 'error') {
      duration = 8000; // 8 segundos para errors
    }
    
    // Adicionar tempo extra para mensagens longas (aproximadamente 100ms por caractere adicional após 50)
    const baseLength = 50;
    if (content.length > baseLength) {
      const extraChars = content.length - baseLength;
      duration += Math.min(extraChars * 100, 5000); // Máximo de 5 segundos extras
    }
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const showModal = useCallback((opts: { title: string; message?: string; messageNode?: ReactNode; confirmLabel?: string; onConfirm?: () => void; onClose?: () => void; type?: 'warning' | 'error' | 'info' | 'success' }) => {
    setModal({ title: opts.title, message: opts.message, messageNode: opts.messageNode, confirmLabel: opts.confirmLabel, onConfirm: opts.onConfirm, onClose: opts.onClose, type: opts.type || 'info' });
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, showModal }}>
      {children}
      <div className="fixed top-4 right-4 flex flex-col space-y-2 z-50">
        {toasts.map(({ id, type, content }) => (
          <div
            key={id}
            className={`flex items-center max-w-xs w-full p-4 rounded-lg shadow-lg transition-all ${
              type === 'success' ? 'bg-green-100 text-green-800' :
              type === 'error' ? 'bg-red-100 text-red-800' :
              type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}
          >
            <span className="flex-1 text-sm">{content}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== id))}>
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className={`relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border-2 ${
            modal.type === 'warning' ? 'border-yellow-400' :
            modal.type === 'error' ? 'border-red-400' :
            modal.type === 'success' ? 'border-green-400' :
            'border-gray-200'
          }`}>
            <button
              aria-label="Fechar"
              className="absolute right-3 top-3 p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              onClick={() => {
                const oc = modal.onClose;
                setModal(null);
                if (oc) oc();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd"/></svg>
            </button>
            
            {/* Ícone de alerta para warnings */}
            {modal.type === 'warning' && (
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
            
            <div className={`text-lg font-semibold mb-2 text-center ${
              modal.type === 'warning' ? 'text-yellow-800' :
              modal.type === 'error' ? 'text-red-800' :
              modal.type === 'success' ? 'text-green-800' :
              'text-gray-800'
            }`}>
              {modal.title}
            </div>
            <div className="text-sm text-gray-700 mb-6 whitespace-pre-wrap text-center leading-relaxed">
              {modal.messageNode ? modal.messageNode : modal.message}
            </div>
            <div className="flex justify-center">
              <button
                className={`px-6 py-2 rounded-md text-white hover:opacity-90 transition-opacity ${
                  modal.type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' :
                  modal.type === 'error' ? 'bg-red-500 hover:bg-red-600' :
                  modal.type === 'success' ? 'bg-green-500 hover:bg-green-600' :
                  'bg-black hover:bg-gray-900'
                }`}
                onClick={() => {
                  const cb = modal.onConfirm;
                  setModal(null);
                  if (cb) cb();
                }}
              >
                {modal.confirmLabel || 'Ok'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextProps => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
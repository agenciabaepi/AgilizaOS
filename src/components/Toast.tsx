import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { XIcon } from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  type: ToastType;
  content: string;
}

interface ToastContextProps {
  addToast: (type: ToastType, content: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

let toastCount = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, content: string) => {
    const id = ++toastCount;
    setToasts(prev => [...prev, { id, type, content }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-50">
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
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
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
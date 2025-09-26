'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function LogoutScreen() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Iniciando logout...');
  const [forceRedirect, setForceRedirect] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;
    let statusInterval: NodeJS.Timeout;

    // Função para forçar redirecionamento
    const forceRedirectToLogin = () => {
      console.log('🚨 Forçando redirecionamento para login...');
      setForceRedirect(true);
      // Múltiplas tentativas de redirecionamento
      setTimeout(() => window.location.replace('/login'), 100);
      setTimeout(() => window.location.href = '/login', 500);
      setTimeout(() => window.location.assign('/login'), 1000);
    };

    // Simular progresso para dar feedback visual
    interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 8; // Mais rápido
      });
    }, 80);

    // Timeout de segurança mais agressivo - 5 segundos
    timeout = setTimeout(() => {
      console.log('⏰ Timeout atingido - forçando redirecionamento');
      forceRedirectToLogin();
    }, 5000);

    // Timeout de emergência - 8 segundos
    const emergencyTimeout = setTimeout(() => {
      console.log('🚨 Timeout de emergência - limpando tudo e redirecionando');
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      window.location.replace('/login');
    }, 8000);

    // Atualizar status baseado no progresso
    statusInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 25) {
          setStatus('Limpando dados locais...');
        } else if (prev < 50) {
          setStatus('Encerrando sessão...');
        } else if (prev < 75) {
          setStatus('Redirecionando...');
        } else {
          setStatus('Concluído!');
        }
        return prev;
      });
    }, 150);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      clearTimeout(emergencyTimeout);
      clearInterval(statusInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center animate-fade-in">
      <div className="text-center">
        {/* Logo da empresa */}
        <div className="mb-8">
          <Image 
            src="/assets/imagens/logopreto.png" 
            alt="Consert Logo" 
            width={200}
            height={96}
            className="h-24 w-auto object-contain mx-auto"
            priority
          />
        </div>
        
        {/* Spinner animado */}
        <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 border-t-green-600 mx-auto mb-8"></div>
        
        {/* Texto principal */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {forceRedirect ? 'Redirecionando...' : 'Saindo...'}
        </h1>
        <p className="text-lg text-gray-600 mb-2">{status}</p>
        <p className="text-sm text-gray-500">
          {forceRedirect ? 'Forçando redirecionamento...' : 'Aguarde, estamos processando...'}
        </p>
        
        {/* Barra de progresso */}
        <div className="w-64 bg-gray-200 rounded-full h-2 mt-8 mx-auto overflow-hidden">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Informação de segurança */}
        <p className="text-xs text-gray-400 mt-4">
          {forceRedirect 
            ? 'Redirecionamento forçado ativado' 
            : 'Se demorar mais de 5 segundos, você será redirecionado automaticamente'
          }
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function LogoutScreen() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Iniciando logout...');

  useEffect(() => {
    // Simular progresso para dar feedback visual
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    // Timeout de segurança - se demorar mais de 10 segundos, forçar redirecionamento
    const timeout = setTimeout(() => {
      window.location.href = '/login';
    }, 10000);

    // Atualizar status baseado no progresso
    const statusInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 30) {
          setStatus('Limpando dados locais...');
        } else if (prev < 60) {
          setStatus('Encerrando sessão...');
        } else if (prev < 90) {
          setStatus('Redirecionando...');
        } else {
          setStatus('Concluído!');
        }
        return prev;
      });
    }, 200);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Saindo...</h1>
        <p className="text-lg text-gray-600 mb-2">{status}</p>
        <p className="text-sm text-gray-500">Aguarde, estamos processando...</p>
        
        {/* Barra de progresso */}
        <div className="w-64 bg-gray-200 rounded-full h-2 mt-8 mx-auto overflow-hidden">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Informação de segurança */}
        <p className="text-xs text-gray-400 mt-4">
          Se demorar mais de 10 segundos, você será redirecionado automaticamente
        </p>
      </div>
    </div>
  );
}

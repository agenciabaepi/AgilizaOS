'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TesteImprimirPage() {
  const { id } = useParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Impressão</h1>
      <p>OS ID: {id}</p>
      <p>Esta é uma página de teste para verificar se o roteamento está funcionando.</p>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Checklist Teste</h2>
        <p>• Alto-falante</p>
        <p>• Microfone</p>
        <p>• Câmera frontal</p>
        <p>• Câmera traseira</p>
        <p>• Conectores</p>
        <p>• WiFi</p>
        <p>• Bluetooth</p>
        <p>• Toque na tela</p>
      </div>
    </div>
  );
}


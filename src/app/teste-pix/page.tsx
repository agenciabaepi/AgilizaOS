'use client';

import { useState } from 'react';
import PixPayment from '@/components/PixPayment';

export default function TestePix() {
  const [valor, setValor] = useState(10.00);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Teste PIX - Mercado Pago
          </h1>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor para teste:
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0.01"
              step="0.01"
            />
          </div>
        </div>

        <PixPayment
          valor={valor}
          descricao={`Teste PIX - R$ ${valor.toFixed(2)}`}
          onSuccess={(paymentId) => {
            console.log('Pagamento criado:', paymentId);
            alert('Pagamento criado com sucesso!');
          }}
          onError={(error) => {
            console.error('Erro no pagamento:', error);
            alert(`Erro: ${error}`);
          }}
        />
      </div>
    </div>
  );
} 
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PixQRCodeProps {
  valor: number;
  descricao?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PixQRCode({ valor, descricao, onSuccess, onError }: PixQRCodeProps) {
  const [loading, setLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{
    qr_code?: string;
    qr_code_base64?: string;
    preference_id?: string;
    pagamento_id?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gerarPIX = async () => {
    setLoading(true);
    setError(null);
    setQrCodeData(null);

    try {
      const response = await fetch('/api/pagamentos/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valor: valor,
          descricao: descricao || `Pagamento - R$ ${valor.toFixed(2)}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar PIX');
      }

      if (data.success) {
        setQrCodeData({
          qr_code: data.qr_code,
          qr_code_base64: data.qr_code_base64,
          preference_id: data.preference_id,
          pagamento_id: data.pagamento_id,
        });
        onSuccess?.();
      } else {
        throw new Error('Erro ao gerar PIX');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copiarQRCode = () => {
    if (qrCodeData?.qr_code) {
      navigator.clipboard.writeText(qrCodeData.qr_code);
      // Você pode adicionar um toast aqui
    }
  };

  if (qrCodeData) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg max-w-md mx-auto">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Pagamento via PIX
          </h3>
          <p className="text-gray-600">
            Valor: R$ {valor.toFixed(2).replace('.', ',')}
          </p>
        </div>

        {qrCodeData.qr_code_base64 ? (
          <div className="text-center mb-4">
            <div className="bg-gray-100 p-4 rounded-lg inline-block">
              <Image
                src={`data:image/png;base64,${qrCodeData.qr_code_base64}`}
                alt="QR Code PIX"
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Escaneie o QR Code com seu app bancário
            </p>
          </div>
        ) : (
          <div className="text-center mb-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">QR Code não disponível</p>
              <p className="text-xs text-gray-500">
                Use o link direto do Mercado Pago
              </p>
            </div>
          </div>
        )}

        {qrCodeData.qr_code && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código PIX (copie e cole no seu app bancário):
            </label>
            <div className="flex">
              <input
                type="text"
                value={qrCodeData.qr_code}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm"
              />
              <button
                onClick={copiarQRCode}
                className="px-4 py-2 bg-gray-600 text-white rounded-r-md hover:bg-gray-700 text-sm"
              >
                Copiar
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setQrCodeData(null)}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Voltar
          </button>
          <button
            onClick={() => window.open(qrCodeData.sandbox_init_point || qrCodeData.init_point, '_blank')}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Abrir no Mercado Pago
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-800">
            💡 <strong>Dica:</strong> Após fazer o pagamento, aguarde alguns segundos para a confirmação automática.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg max-w-md mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Pagamento via PIX
        </h3>
        <p className="text-gray-600">
          Valor: R$ {valor.toFixed(2).replace('.', ',')}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={gerarPIX}
          disabled={loading}
          className="w-full px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Gerando PIX...' : 'Gerar PIX'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Pagamento processado com segurança pelo Mercado Pago
        </p>
      </div>
    </div>
  );
} 
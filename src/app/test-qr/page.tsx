'use client';

import QRCodeTest from '@/components/QRCodeTest';

export default function TestQRPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Teste de QR Code</h1>
        <QRCodeTest />
        
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Como testar:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Digite um número de OS (ex: 1234)</li>
            <li>Verifique se o QR Code aparece</li>
            <li>Escaneie o QR Code com seu celular</li>
            <li>Clique em "Testar Link" para ver a página de status</li>
            <li>Verifique se a URL está correta</li>
          </ol>
        </div>
        
        <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="font-semibold text-blue-900 mb-2">URLs de Teste:</h4>
          <div className="space-y-1 text-sm text-blue-800">
            <p><strong>Desenvolvimento:</strong> http://localhost:3000/os/1234/status</p>
            <p><strong>Produção:</strong> https://gestaoconsert.com.br/os/1234/status</p>
          </div>
        </div>
      </div>
    </div>
  );
}

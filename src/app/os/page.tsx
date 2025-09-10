'use client';

import Link from 'next/link';
import { FiSearch, FiQrCode, FiSmartphone, FiClock } from 'react-icons/fi';

export default function OSPublicPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Acompanhe sua OS</h1>
            <p className="text-xl text-gray-600 mb-8">
              Acompanhe o status do seu aparelho em tempo real
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* Opções de Acesso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          
          {/* Buscar por Número */}
          <Link 
            href="/os/buscar"
            className="bg-white rounded-xl shadow-sm border p-8 hover:shadow-md transition-shadow group"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                <FiSearch className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Buscar por Número</h3>
              <p className="text-gray-600 mb-6">
                Digite o número da OS que está no seu recibo para acompanhar o status
              </p>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">Exemplo: OS #1234</p>
              </div>
            </div>
          </Link>

          {/* QR Code */}
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiQrCode className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Escaneie o QR Code</h3>
              <p className="text-gray-600 mb-6">
                Use a câmera do seu celular para escanear o QR Code do seu recibo
              </p>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-800 font-medium">Acesso instantâneo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Funcionalidades */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            O que você pode acompanhar
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiClock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Status em Tempo Real</h3>
              <p className="text-sm text-gray-600">
                Veja o status atual do seu aparelho e todas as etapas do processo
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiSmartphone className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Detalhes do Serviço</h3>
              <p className="text-sm text-gray-600">
                Acesse informações completas sobre o serviço e condições do equipamento
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiQrCode className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Sem Login</h3>
              <p className="text-sm text-gray-600">
                Acesso direto e seguro sem necessidade de cadastro ou login
              </p>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="font-semibold text-blue-900 mb-4">Como funciona:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-900 mb-2">📱 Para Clientes:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Receba seu recibo com QR Code</li>
                <li>2. Escaneie o QR Code ou digite o número da OS</li>
                <li>3. Acompanhe o status em tempo real</li>
                <li>4. Veja fotos e detalhes do serviço</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">🏪 Para a Assistência:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. QR Code é gerado automaticamente</li>
                <li>2. Aparece em todos os recibos impressos</li>
                <li>3. Cliente acompanha sem ligar</li>
                <li>4. Reduz atendimento telefônico</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

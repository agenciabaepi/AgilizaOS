'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiSmartphone, FiUser, FiCalendar } from 'react-icons/fi';

export default function BuscarOSPage() {
  const [numeroOS, setNumeroOS] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!numeroOS.trim()) return;
    
    setLoading(true);
    
    // Redirecionar para a página de status
    router.push(`/os/${numeroOS.trim()}/status`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Acompanhar OS</h1>
            <p className="text-gray-600">
              Digite o número da sua OS para acompanhar o status do seu aparelho
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        
        {/* Formulário de Busca */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label htmlFor="numeroOS" className="block text-sm font-medium text-gray-700 mb-2">
                Número da OS
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="numeroOS"
                  value={numeroOS}
                  onChange={(e) => setNumeroOS(e.target.value)}
                  placeholder="Digite o número da OS (ex: 1234)"
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  required
                />
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !numeroOS.trim()}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Buscando...' : 'Acompanhar OS'}
            </button>
          </form>
        </div>

        {/* Informações */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiSmartphone className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Acompanhe seu Aparelho</h3>
            <p className="text-sm text-gray-600">
              Veja em tempo real o status do reparo do seu equipamento
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCalendar className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Timeline Completa</h3>
            <p className="text-sm text-gray-600">
              Acompanhe todas as etapas do processo de reparo
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUser className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Sem Login</h3>
            <p className="text-sm text-gray-600">
              Acesso direto com apenas o número da OS
            </p>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mt-8">
          <h3 className="font-semibold text-blue-900 mb-3">Como usar:</h3>
          <ol className="text-sm text-blue-800 space-y-2">
            <li>1. Digite o número da OS que está no seu recibo</li>
            <li>2. Clique em "Acompanhar OS"</li>
            <li>3. Veja o status atual e todas as etapas</li>
            <li>4. Acesse fotos e detalhes do serviço</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { FiX, FiPlay, FiUser, FiSmartphone, FiFileText, FiDollarSign, FiCalendar } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface VisualizarOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordem: any;
  onIniciar: (ordemId: string) => void;
}

export default function VisualizarOSModal({
  isOpen,
  onClose,
  ordem,
  onIniciar
}: VisualizarOSModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isOpen || !ordem) return null;

  const handleIniciar = async () => {
    setLoading(true);
    try {
      await onIniciar(ordem.id);
      onClose();
      router.push(`/bancada/${ordem.id}`);
    } catch (error) {
      console.error('Erro ao iniciar OS:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return date ? new Date(date).toLocaleDateString('pt-BR') : '';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            OS #{ordem.numero_os || ordem.id}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiUser className="w-4 h-4" />
                <span className="font-medium">Cliente</span>
              </div>
              <p className="text-gray-900">{ordem.cliente?.nome || 'Não informado'}</p>
              <p className="text-sm text-gray-500">{ordem.cliente?.telefone || 'Telefone não informado'}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiCalendar className="w-4 h-4" />
                <span className="font-medium">Data de Entrada</span>
              </div>
              <p className="text-gray-900">{formatDate(ordem.data_entrada)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiSmartphone className="w-4 h-4" />
              <span className="font-medium">Aparelho</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">
                {ordem.aparelho?.modelo || 'Modelo não informado'}
              </p>
              <p className="text-sm text-gray-600">
                {ordem.aparelho?.marca} - {ordem.aparelho?.categoria}
              </p>
            </div>
          </div>

          {ordem.relato && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiFileText className="w-4 h-4" />
                <span className="font-medium">Relato do Cliente</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 text-sm">{ordem.relato}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiDollarSign className="w-4 h-4" />
                <span className="font-medium">Valor Peça</span>
              </div>
              <p className="text-gray-900 font-medium">{formatCurrency(ordem.valor_peca || 0)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiDollarSign className="w-4 h-4" />
                <span className="font-medium">Valor Serviço</span>
              </div>
              <p className="text-gray-900 font-medium">{formatCurrency(ordem.valor_servico || 0)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiDollarSign className="w-4 h-4" />
                <span className="font-medium">Total</span>
              </div>
              <p className="text-gray-900 font-medium">
                {formatCurrency((ordem.valor_peca || 0) + (ordem.valor_servico || 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleIniciar}
            disabled={loading || ordem.status !== 'ABERTA'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiPlay className="w-4 h-4" />
            {loading ? 'Iniciando...' : 'Iniciar OS'}
          </button>
        </div>
      </div>
    </div>
  );
} 
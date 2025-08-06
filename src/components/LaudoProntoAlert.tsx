'use client';

import { useState, useEffect } from 'react';
import { FiFileText, FiBell, FiEye, FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface OSLaudoPronto {
  id: string;
  numero_os: string;
  cliente: string;
  tecnico: string;
  status_tecnico: string;
  created_at: string;
}

export default function LaudoProntoAlert() {
  const [laudosProntos, setLaudosProntos] = useState<OSLaudoPronto[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const router = useRouter();
  const { empresaData } = useAuth();

  useEffect(() => {
    if (!empresaData?.id) return;

    const fetchLaudosProntos = async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          created_at,
          status_tecnico,
          clientes:cliente_id(nome),
          tecnico:usuarios!tecnico_id(nome)
        `)
        .eq('empresa_id', empresaData.id)
        .in('status_tecnico', ['ORÇAMENTO ENVIADO', 'AGUARDANDO APROVAÇÃO'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Filtrar apenas OSs com status "ORÇAMENTO ENVIADO"
        const laudos = data
          .filter(os => os.status_tecnico === 'ORÇAMENTO ENVIADO')
          .map(os => ({
            id: os.id,
            numero_os: os.numero_os,
            cliente: os.clientes?.nome || 'Cliente não identificado',
            tecnico: os.tecnico?.nome || 'Técnico não identificado',
            status_tecnico: os.status_tecnico,
            created_at: os.created_at
          }));
        setLaudosProntos(laudos);
        setIsVisible(laudos.length > 0);
        setIsBlinking(laudos.length > 0);
      }
    };

    fetchLaudosProntos();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchLaudosProntos, 30000);
    return () => clearInterval(interval);
  }, [empresaData?.id]);

  useEffect(() => {
    if (isBlinking) {
      const blinkInterval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, 1000);
      return () => clearInterval(blinkInterval);
    }
  }, [isBlinking]);

  if (!isVisible || laudosProntos.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-xs">
      <div className={`
        bg-white border border-gray-200 rounded-lg shadow-lg
        transform transition-all duration-300 hover:shadow-xl
        ${isBlinking ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
      `}>
        {/* Header sutil */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`
              p-1.5 bg-blue-50 rounded-full
              ${isBlinking ? 'animate-pulse' : ''}
            `}>
              <FiFileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Orçamentos Enviados
              </h3>
              <p className="text-xs text-gray-500">
                {laudosProntos.length} OS{laudosProntos.length > 1 ? 's' : ''} aguardando aprovação
              </p>
            </div>
          </div>
          <div className={`
            p-1 bg-red-50 rounded-full
            ${isBlinking ? 'animate-ping' : ''}
          `}>
            <FiBell className="w-3 h-3 text-red-500" />
          </div>
        </div>

        {/* Lista compacta */}
        <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
          {laudosProntos.slice(0, 3).map((os) => (
            <div 
              key={os.id}
              className="bg-gray-50 rounded-md p-2 hover:bg-gray-100 transition-all cursor-pointer group"
              onClick={() => router.push(`/ordens/${os.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-900 truncate">
                      OS #{os.numero_os}
                    </span>
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      Enviado
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">
                    {os.cliente}
                  </p>
                </div>
                <FiArrowRight className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              </div>
            </div>
          ))}
          
          {laudosProntos.length > 3 && (
            <div className="text-center py-1">
              <span className="text-xs text-gray-500">
                +{laudosProntos.length - 3} mais...
              </span>
            </div>
          )}
        </div>

        {/* Botão discreto */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => router.push('/ordens')}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1"
          >
            <FiEye className="w-3 h-3" />
            Ver Todas
          </button>
        </div>
      </div>
    </div>
  );
} 
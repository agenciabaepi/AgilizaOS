'use client';

import React from 'react';
import { StatusHistoricoItem } from '@/hooks/useStatusHistorico';
import { FiUser, FiClock, FiMessageSquare, FiChevronRight } from 'react-icons/fi';

interface StatusHistoricoTimelineProps {
  historico: StatusHistoricoItem[];
  loading?: boolean;
  compact?: boolean;
}

export default function StatusHistoricoTimeline({ 
  historico, 
  loading = false, 
  compact = false 
}: StatusHistoricoTimelineProps) {
  
  const formatarTempo = (tempo?: string) => {
    if (!tempo) return null;
    
    // Converter intervalo PostgreSQL para formato legível
    const match = tempo.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      const horas = parseInt(match[1]);
      const minutos = parseInt(match[2]);
      
      if (horas > 24) {
        const dias = Math.floor(horas / 24);
        const horasRestantes = horas % 24;
        return `${dias}d ${horasRestantes}h ${minutos}m`;
      } else if (horas > 0) {
        return `${horas}h ${minutos}m`;
      } else {
        return `${minutos}m`;
      }
    }
    
    return tempo;
  };

  const getStatusColor = (status: string) => {
    const statusUpper = status.toUpperCase();
    
    if (statusUpper.includes('APROVADO') || statusUpper.includes('ENTREGUE')) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (statusUpper.includes('RECUS') || statusUpper.includes('CANCEL')) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (statusUpper.includes('AGUARDANDO')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else if (statusUpper.includes('ANDAMENTO') || statusUpper.includes('REPARO')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!historico || historico.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FiClock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Nenhum histórico de status encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {historico.map((item, index) => (
        <div 
          key={item.id} 
          className={`relative ${index !== historico.length - 1 ? 'pb-4' : ''}`}
        >
          {/* Linha conectora */}
          {index !== historico.length - 1 && (
            <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
          )}
          
          <div className="flex items-start space-x-4">
            {/* Indicador de status */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm">
                <div className={`w-3 h-3 rounded-full ${
                  getStatusColor(item.status_novo).includes('green') ? 'bg-green-500' :
                  getStatusColor(item.status_novo).includes('red') ? 'bg-red-500' :
                  getStatusColor(item.status_novo).includes('yellow') ? 'bg-yellow-500' :
                  getStatusColor(item.status_novo).includes('blue') ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}></div>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {item.status_anterior && (
                      <>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status_anterior)}`}>
                          {item.status_anterior}
                        </span>
                        <FiChevronRight className="w-4 h-4 text-gray-400" />
                      </>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status_novo)}`}>
                      {item.status_novo}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatarData(item.created_at)}
                  </div>
                </div>

                {/* Status técnico (se diferente) */}
                {item.status_tecnico_novo && item.status_tecnico_novo !== item.status_novo && (
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs text-gray-500">Status Técnico:</span>
                    {item.status_tecnico_anterior && (
                      <>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                          {item.status_tecnico_anterior}
                        </span>
                        <FiChevronRight className="w-3 h-3 text-gray-400" />
                      </>
                    )}
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {item.status_tecnico_novo}
                    </span>
                  </div>
                )}

                {/* Informações adicionais */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    {item.usuario_nome && (
                      <div className="flex items-center space-x-1">
                        <FiUser className="w-3 h-3" />
                        <span>{item.usuario_nome}</span>
                      </div>
                    )}
                    {item.tempo_no_status_anterior && (
                      <div className="flex items-center space-x-1">
                        <FiClock className="w-3 h-3" />
                        <span>Tempo anterior: {formatarTempo(item.tempo_no_status_anterior)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Motivo e observações */}
                {(item.motivo || item.observacoes) && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    {item.motivo && (
                      <div className="mb-1">
                        <span className="text-xs font-medium text-gray-700">Motivo:</span>
                        <span className="text-xs text-gray-600 ml-1">{item.motivo}</span>
                      </div>
                    )}
                    {item.observacoes && (
                      <div className="flex items-start space-x-1">
                        <FiMessageSquare className="w-3 h-3 text-gray-400 mt-0.5" />
                        <span className="text-xs text-gray-600">{item.observacoes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiCheck, FiClock, FiPackage, FiTool, FiCheckCircle } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface StatusQuickChangeProps {
  ordemId: string;
  currentStatus: string;
  currentStatusTecnico: string;
  onStatusChange: (newStatus: string, newStatusTecnico: string) => void;
  userRole: 'tecnico' | 'admin' | 'atendente';
}

interface Status {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  tipo: string;
}

export default function StatusQuickChange({
  ordemId,
  currentStatus,
  currentStatusTecnico,
  onStatusChange,
  userRole
}: StatusQuickChangeProps) {
  const [statusOS, setStatusOS] = useState<Status[]>([]);
  const [statusTecnico, setStatusTecnico] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { empresaData } = useAuth();

  useEffect(() => {
    const fetchStatus = async () => {
      if (!empresaData?.id) return;

      try {
        // Buscar status fixos
        const { data: statusFixosOS } = await supabase
          .from('status_fixo')
          .select('*')
          .eq('tipo', 'os');

        const { data: statusFixosTec } = await supabase
          .from('status_fixo')
          .select('*')
          .eq('tipo', 'tecnico');

        // Buscar status personalizados da empresa
        const { data: statusEmpresaOS } = await supabase
          .from('status')
          .select('*')
          .eq('tipo', 'os')
          .eq('empresa_id', empresaData.id);

        const { data: statusEmpresaTec } = await supabase
          .from('status')
          .select('*')
          .eq('tipo', 'tecnico')
          .eq('empresa_id', empresaData.id);

        // Combinar status fixos e personalizados
        const todosStatusOS = [...(statusFixosOS || []), ...(statusEmpresaOS || [])];
        const todosStatusTec = [...(statusFixosTec || []), ...(statusEmpresaTec || [])];

        setStatusOS(todosStatusOS);
        setStatusTecnico(todosStatusTec);
      } catch (error) {
        console.error('Erro ao buscar status:', error);
      }
    };

    fetchStatus();
  }, [empresaData?.id]);

  const handleStatusChange = async (newStatus: string, newStatusTecnico: string) => {
    setLoading(true);
    try {
      const updateData: any = {};
      
      if (newStatus !== currentStatus) {
        updateData.status = newStatus;
      }
      
      if (newStatusTecnico !== currentStatusTecnico) {
        updateData.status_tecnico = newStatusTecnico;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('ordens_servico')
          .update(updateData)
          .eq('id', ordemId);

        if (error) {
          console.error('Erro ao atualizar status:', error);
          alert('Erro ao atualizar status: ' + error.message);
        } else {
          onStatusChange(newStatus, newStatusTecnico);
          setShowDropdown(false);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusObj = statusOS.find(s => s.nome === status) || statusTecnico.find(s => s.nome === status);
    return statusObj?.cor || '#6b7280';
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'aberta':
      case 'aguardando início':
        return <FiClock className="w-4 h-4" />;
      case 'em análise':
      case 'em analise':
        return <FiTool className="w-4 h-4" />;
      case 'aguardando peça':
      case 'aguardando peca':
        return <FiPackage className="w-4 h-4" />;
      case 'concluído':
      case 'concluido':
      case 'finalizado':
        return <FiCheckCircle className="w-4 h-4" />;
      default:
        return <FiCheck className="w-4 h-4" />;
    }
  };

  const getQuickActions = () => {
    const actions = [];
    
    // Ações rápidas baseadas no status atual
    if (currentStatus === 'ABERTA') {
      actions.push({ label: 'Iniciar Análise', status: 'EM_ANALISE', statusTecnico: 'EM ANÁLISE' });
    }
    
    if (currentStatus === 'EM_ANALISE') {
      actions.push({ label: 'Aguardando Peça', status: 'AGUARDANDO_PECA', statusTecnico: 'AGUARDANDO PEÇA' });
      actions.push({ label: 'Finalizar', status: 'CONCLUIDO', statusTecnico: 'CONCLUÍDO' });
    }
    
    if (currentStatus === 'AGUARDANDO_PECA') {
      actions.push({ label: 'Continuar Análise', status: 'EM_ANALISE', statusTecnico: 'EM ANÁLISE' });
      actions.push({ label: 'Finalizar', status: 'CONCLUIDO', statusTecnico: 'CONCLUÍDO' });
    }

    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <div className="relative">
      {/* Botão principal */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
      >
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getStatusColor(currentStatus) }}
        />
        {currentStatus}
        <FiChevronDown className="w-3 h-3" />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Ações Rápidas</h4>
            
            {/* Ações rápidas */}
            {quickActions.length > 0 && (
              <div className="mb-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleStatusChange(action.status, action.statusTecnico)}
                    disabled={loading}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    {getStatusIcon(action.status)}
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t pt-2">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Status da OS</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {statusOS.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => handleStatusChange(status.nome, currentStatusTecnico)}
                    disabled={loading}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: status.cor }}
                    />
                    {status.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Status do Técnico (apenas para técnicos e admins) */}
            {(userRole === 'tecnico' || userRole === 'admin') && (
              <div className="border-t pt-2 mt-2">
                <h4 className="text-xs font-medium text-gray-700 mb-2">Status do Técnico</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {statusTecnico.map((status) => (
                    <button
                      key={status.id}
                      onClick={() => handleStatusChange(currentStatus, status.nome)}
                      disabled={loading}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.cor }}
                      />
                      {status.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
} 
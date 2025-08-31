'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { 
  FiCheckCircle, 
  FiCircle, 
  FiBuilding, 
  FiUsers, 
  FiTool, 
  FiArrowRight,
  FiX
} from 'react-icons/fi';

interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'completed' | 'warning';
  action?: () => void;
  required: boolean;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { usuarioData, empresaData } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [onboardingItems, setOnboardingItems] = useState<OnboardingItem[]>([]);
  const [showTecnicoModal, setShowTecnicoModal] = useState(false);

  // Verificar status dos itens de onboarding
  useEffect(() => {
    if (isOpen) {
      checkOnboardingStatus();
    }
  }, [isOpen, usuarioData, empresaData]);

  const checkOnboardingStatus = async () => {
    setLoading(true);
    
    try {
      const items: OnboardingItem[] = [];

      // 1. Dados da empresa
      const empresaStatus = empresaData?.nome && empresaData?.cnpj ? 'completed' : 'pending';
      items.push({
        id: 'empresa',
        title: 'Dados da Empresa',
        description: 'Configure nome, CNPJ e informações básicas',
        icon: <FiBuilding className="w-5 h-5" />,
        status: empresaStatus,
        action: () => window.open('/configuracoes/empresa', '_blank'),
        required: true
      });

      // 2. Cadastro de técnicos
      const { data: tecnicos } = await supabase
        .from('usuarios')
        .select('id')
        .eq('nivel', 'tecnico')
        .eq('empresa_id', usuarioData?.empresa_id);

      const tecnicosStatus = tecnicos && tecnicos.length > 0 ? 'completed' : 'warning';
      items.push({
        id: 'tecnicos',
        title: 'Cadastro de Técnicos',
        description: tecnicos && tecnicos.length > 0 
          ? `${tecnicos.length} técnico(s) cadastrado(s)`
          : 'Cadastre pelo menos 1 técnico para criar OS',
        icon: <FiUsers className="w-5 h-5" />,
        status: tecnicosStatus,
        action: () => setShowTecnicoModal(true),
        required: true
      });

      // 3. Serviços básicos
      const { data: servicos } = await supabase
        .from('servicos')
        .select('id')
        .eq('empresa_id', usuarioData?.empresa_id)
        .limit(1);

      const servicosStatus = servicos && servicos.length > 0 ? 'completed' : 'pending';
      items.push({
        id: 'servicos',
        title: 'Serviços Básicos',
        description: 'Configure serviços padrão da empresa',
        icon: <FiTool className="w-5 h-5" />,
        status: servicosStatus,
        action: () => window.open('/configuracoes/servicos', '_blank'),
        required: false
      });

      setOnboardingItems(items);
    } catch (error) {
      console.error('Erro ao verificar status do onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    addToast('info', 'Onboarding pulado. Você pode completar as configurações depois.');
    onClose();
  };

  const handleComplete = () => {
    addToast('success', 'Onboarding concluído com sucesso!');
    onComplete();
    onClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <FiCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <FiCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const completedItems = onboardingItems.filter(item => item.status === 'completed').length;
  const totalItems = onboardingItems.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bem-vindo ao Sistema!</h2>
            <p className="text-gray-600 mt-1">Complete as configurações iniciais para começar</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progresso: {completedItems}/{totalItems} itens
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist Items */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-gray-500 mt-2">Verificando configurações...</p>
            </div>
          ) : (
            onboardingItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${getStatusColor(item.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(item.status)}
                    <div className="flex items-center space-x-3">
                      {item.icon}
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm opacity-80">{item.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {item.action && (
                    <Button
                      onClick={item.action}
                      size="sm"
                      className={`${
                        item.status === 'completed' 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {item.status === 'completed' ? 'Ver' : 'Configurar'}
                      <FiArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
                
                {item.required && item.status !== 'completed' && (
                  <div className="mt-2 text-xs text-red-600 font-medium">
                    ⚠️ Este item é obrigatório para criar Ordens de Serviço
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={handleSkip}
            variant="outline"
            className="text-gray-600 hover:text-gray-800"
          >
            Pular por agora
          </Button>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleComplete}
              disabled={completedItems === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Concluir Onboarding
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro de Técnico */}
      {showTecnicoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Cadastrar Técnico
              </h3>
              <p className="text-gray-600 mb-6">
                Para criar Ordens de Serviço, você precisa cadastrar pelo menos um técnico.
              </p>
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowTecnicoModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    setShowTecnicoModal(false);
                    window.open('/configuracoes/usuarios', '_blank');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Cadastrar Técnico
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

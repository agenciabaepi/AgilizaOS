'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FiClock, FiCheckCircle, FiAlertCircle, FiCamera, FiFileText, FiSmartphone, FiUser, FiCalendar } from 'react-icons/fi';

interface OSData {
  id: string;
  numero_os: number;
  cliente_id: string;
  categoria: string;
  marca: string;
  modelo: string;
  status: string;
  status_tecnico: string;
  created_at: string;
  data_entrega: string | null;
  valor_faturado: number;
  servico: string;
  observacao: string;
  relato: string;
  condicoes_equipamento: string;
  imagens: string[] | null;
  clientes?: {
    nome: string;
    telefone: string;
    email: string;
  };
}

const statusConfig = {
  'AGUARDANDO': { 
    label: 'Aguardando Análise', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: FiClock,
    description: 'Seu aparelho foi recebido e está aguardando análise técnica.'
  },
  'EM_ANALISE': { 
    label: 'Em Análise', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: FiAlertCircle,
    description: 'Nossa equipe está analisando o problema do seu aparelho.'
  },
  'AGUARDANDO_APROVACAO': { 
    label: 'Aguardando Aprovação', 
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: FiClock,
    description: 'Orçamento pronto! Aguardando sua aprovação para prosseguir.'
  },
  'EM_EXECUCAO': { 
    label: 'Em Execução', 
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: FiAlertCircle,
    description: 'Reparo em andamento. Seu aparelho está sendo consertado.'
  },
  'AGUARDANDO_RETIRADA': { 
    label: 'Pronto para Retirada', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: FiCheckCircle,
    description: 'Seu aparelho está pronto! Pode retirar na loja.'
  },
  'ENTREGUE': { 
    label: 'Entregue', 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: FiCheckCircle,
    description: 'Aparelho entregue com sucesso!'
  }
};

export default function OSStatusPage() {
  const params = useParams();
  const numeroOS = params.numero as string;
  const [osData, setOsData] = useState<OSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOSData();
  }, [numeroOS]);

  const fetchOSData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          clientes!left(nome, telefone, email)
        `)
        .eq('numero_os', numeroOS)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('OS não encontrada');
        } else {
          setError('Erro ao carregar dados da OS');
        }
        return;
      }

      setOsData(data);
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: FiClock,
      description: 'Status atualizado'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando informações da OS...</p>
        </div>
      </div>
    );
  }

  if (error || !osData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">OS Não Encontrada</h1>
          <p className="text-gray-600 mb-6">
            {error || 'Não foi possível encontrar a OS solicitada. Verifique o número e tente novamente.'}
          </p>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-500">
              OS #{numeroOS}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(osData.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">OS #{osData.numero_os}</h1>
              <p className="text-gray-600 mt-1">
                {osData.clientes?.nome || 'Cliente'} • {osData.categoria} {osData.marca} {osData.modelo}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full border-2 ${statusInfo.color} flex items-center gap-2`}>
              <StatusIcon className="w-5 h-5" />
              <span className="font-semibold">{statusInfo.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Status Principal */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Atual */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-full ${statusInfo.color}`}>
                  <StatusIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Status Atual</h2>
                  <p className="text-gray-600">{statusInfo.description}</p>
                </div>
              </div>
              
              {osData.data_entrega && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-800">
                    <FiCalendar className="w-5 h-5" />
                    <span className="font-medium">Previsão de Entrega:</span>
                    <span>{formatDate(osData.data_entrega)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline de Status */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FiClock className="w-5 h-5" />
                Acompanhamento
              </h3>
              
              <div className="space-y-4">
                {Object.entries(statusConfig).map(([key, config], index) => {
                  const isActive = key === osData.status;
                  const isCompleted = Object.keys(statusConfig).indexOf(osData.status) > Object.keys(statusConfig).indexOf(key);
                  const Icon = config.icon;
                  
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-blue-600 text-white' : 
                        isCompleted ? 'bg-green-600 text-white' : 
                        'bg-gray-200 text-gray-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          isActive ? 'text-blue-600' : 
                          isCompleted ? 'text-green-600' : 
                          'text-gray-500'
                        }`}>
                          {config.label}
                        </p>
                        <p className="text-sm text-gray-600">{config.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detalhes do Serviço */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiFileText className="w-5 h-5" />
                Detalhes do Serviço
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Problema Relatado</label>
                  <p className="text-gray-900 mt-1">{osData.relato || 'Não informado'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Serviço Solicitado</label>
                  <p className="text-gray-900 mt-1">{osData.servico || 'Não informado'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Condições do Equipamento</label>
                  <p className="text-gray-900 mt-1">{osData.condicoes_equipamento || 'Não informado'}</p>
                </div>
                
                {osData.observacao && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Observações</label>
                    <p className="text-gray-900 mt-1">{osData.observacao}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Informações do Cliente */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiUser className="w-5 h-5" />
                Cliente
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-gray-900">{osData.clientes?.nome || 'Não informado'}</p>
                </div>
                
                {osData.clientes?.telefone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefone</label>
                    <p className="text-gray-900">{osData.clientes.telefone}</p>
                  </div>
                )}
                
                {osData.clientes?.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">E-mail</label>
                    <p className="text-gray-900">{osData.clientes.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Informações da OS */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiSmartphone className="w-5 h-5" />
                Equipamento
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Categoria</label>
                  <p className="text-gray-900">{osData.categoria}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Marca</label>
                  <p className="text-gray-900">{osData.marca}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Modelo</label>
                  <p className="text-gray-900">{osData.modelo}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Entrada</label>
                  <p className="text-gray-900">{formatDate(osData.created_at)}</p>
                </div>
                
                {osData.valor_faturado > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Valor</label>
                    <p className="text-gray-900 font-semibold">
                      R$ {osData.valor_faturado.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Galeria de Imagens */}
            {osData.imagens && osData.imagens.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiCamera className="w-5 h-5" />
                  Imagens
                </h3>
                
                <div className="grid grid-cols-2 gap-2">
                  {osData.imagens.map((imagem, index) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={imagem} 
                        alt={`Imagem ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

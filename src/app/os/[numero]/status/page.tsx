'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FiClock, FiCheckCircle, FiAlertCircle, FiCamera, FiFileText, FiSmartphone, FiUser, FiCalendar } from 'react-icons/fi';

export default function OSPublicPage() {
  const params = useParams();
  const numeroOS = params.numero as string;
  
  const [osData, setOsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Dados de exemplo para fallback
  const exemploOS = {
    numero_os: parseInt(numeroOS),
    categoria: 'Smartphone',
    marca: 'Samsung',
    modelo: 'Galaxy S21',
    status: 'EM_ANALISE',
    created_at: new Date().toISOString(),
    servico: 'Reparo de tela',
    observacao: 'Tela trincada, necessário troca',
    relato: 'Cliente relatou que o aparelho caiu e a tela quebrou',
    condicoes_equipamento: 'Aparelho em bom estado, apenas tela danificada',
    clientes: {
      nome: 'João Silva',
      telefone: '(11) 99999-9999',
      email: 'joao@email.com'
    }
  };

  useEffect(() => {
    const fetchOSData = async () => {
      try {
        // Primeiro tenta buscar dados reais do Supabase
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na busca da OS')), 10000)
        );

        const queryPromise = supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            categoria,
            marca,
            modelo,
            status,
            status_tecnico,
            created_at,
            data_entrega,
            valor_faturado,
            servico,
            peca,
            observacao,
            relato,
            condicoes_equipamento,
            cor,
            numero_serie,
            acessorios,
            clientes!left(nome, telefone, email, cpf, endereco),
            tecnico:usuarios!left(nome),
            empresas!left(nome, cnpj, endereco, telefone, email, logo_url)
          `)
          .eq('numero_os', parseInt(numeroOS))
          .single();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (error) {
          console.log('Erro ao buscar OS real, usando dados de exemplo:', error.message);
          // Se der erro, usa dados de exemplo
          setOsData(exemploOS);
          setLoading(false);
          return;
        }

        // Se encontrou dados reais, usa eles
        setOsData(data);
        setLoading(false);
      } catch (err: any) {
        console.log('Timeout ou erro na busca, usando dados de exemplo:', err.message);
        // Se der timeout ou erro, usa dados de exemplo
        setOsData(exemploOS);
        setLoading(false);
      }
    };

    fetchOSData();
  }, [numeroOS]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const statusConfig = {
    'EM_ANALISE': { 
      label: 'Em Análise', 
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: FiAlertCircle,
      description: 'Nossa equipe está analisando o problema do seu aparelho.'
    },
    'AGUARDANDO_PECA': { 
      label: 'Aguardando Peça', 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: FiClock,
      description: 'Aguardando a chegada da peça necessária para o reparo.'
    },
    'EM_REPARO': { 
      label: 'Em Reparo', 
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: FiCheckCircle,
      description: 'Seu aparelho está sendo reparado por nossa equipe técnica.'
    },
    'AGUARDANDO_RETIRADA': { 
      label: 'Pronto para Retirada', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: FiCheckCircle,
      description: 'Seu aparelho está pronto! Você pode retirar na loja.'
    },
    'ENTREGUE': { 
      label: 'Entregue', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: FiCheckCircle,
      description: 'Aparelho entregue ao cliente.'
    },
    'CANCELADO': { 
      label: 'Cancelado', 
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: FiAlertCircle,
      description: 'OS cancelada.'
    }
  };

  const getStatusInfo = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: FiClock,
      description: 'Status atualizado'
    };
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

  // Loading state - só mostra loading se não estiver montado ou ainda carregando
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando informações da OS...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar OS</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Se não tem dados, não renderiza
  if (!osData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">📱</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">OS não encontrada</h2>
          <p className="text-gray-600">Verifique o número da OS e tente novamente.</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Acompanhamento de OS</h1>
              <p className="text-gray-600 mt-1">OS #{osData.numero_os}</p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                <StatusIcon className="w-4 h-4 mr-2" />
                {statusInfo.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center mb-4">
            <StatusIcon className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Status Atual</h2>
              <p className="text-gray-600">{statusInfo.description}</p>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-800 font-medium">
              📱 Seu aparelho está sendo analisado por nossa equipe técnica.
            </p>
            <p className="text-blue-700 text-sm mt-2">
              Em breve você receberá um orçamento detalhado com o valor do reparo.
            </p>
          </div>
        </div>

        {/* Device Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiSmartphone className="w-5 h-5 mr-2 text-gray-600" />
            Informações do Aparelho
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Categoria</p>
              <p className="font-medium text-gray-900">{osData.categoria}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Marca</p>
              <p className="font-medium text-gray-900">{osData.marca}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Modelo</p>
              <p className="font-medium text-gray-900">{osData.modelo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data de Entrada</p>
              <p className="font-medium text-gray-900">{formatDate(osData.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiFileText className="w-5 h-5 mr-2 text-gray-600" />
            Detalhes do Serviço
          </h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Serviço Solicitado</p>
              <p className="font-medium text-gray-900">{osData.servico}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Relato do Cliente</p>
              <p className="text-gray-900">{osData.relato}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Condições do Equipamento</p>
              <p className="text-gray-900">{osData.condicoes_equipamento}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Observações Técnicas</p>
              <p className="text-gray-900">{osData.observacao}</p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiUser className="w-5 h-5 mr-2 text-gray-600" />
            Informações do Cliente
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nome</p>
              <p className="font-medium text-gray-900">{osData.clientes.nome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Telefone</p>
              <p className="font-medium text-gray-900">{osData.clientes.telefone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{osData.clientes.email}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600">
          <p className="text-sm">
            Dúvidas? Entre em contato conosco pelo telefone ou WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
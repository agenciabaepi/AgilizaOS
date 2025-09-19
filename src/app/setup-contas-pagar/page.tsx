'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { FiDatabase, FiCheck, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

export default function SetupContasPagarPage() {
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const executarSetup = async () => {
    try {
      setLoading(true);
      setResultado(null);
      
      const response = await fetch('/api/contas-pagar/setup-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro no setup');
      }
      
      setResultado(data);
      addToast('success', 'Banco de dados configurado com sucesso!');
      
    } catch (error: any) {
      console.error('Erro no setup:', error);
      addToast('error', error.message || 'Erro ao configurar banco de dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiDatabase className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configuração do Sistema de Contas a Pagar
          </h1>
          <p className="text-gray-600">
            Configure o banco de dados e crie as tabelas necessárias para o sistema de contas a pagar
          </p>
        </div>

        {/* Informações */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">O que será criado:</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• Tabela de categorias de contas (fixas, variáveis, peças)</li>
                <li>• Tabela de contas a pagar com todos os campos necessários</li>
                <li>• Índices para melhor performance</li>
                <li>• Políticas de segurança (RLS) por empresa</li>
                <li>• Categorias padrão pré-configuradas</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Botão de Setup */}
        <div className="text-center mb-8">
          <Button
            onClick={executarSetup}
            disabled={loading}
            size="lg"
            className="px-8 py-4"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Configurando...
              </>
            ) : (
              <>
                <FiDatabase className="w-5 h-5 mr-3" />
                Executar Configuração
              </>
            )}
          </Button>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <FiCheck className="w-6 h-6 text-green-600 mt-1" />
              <div>
                <h3 className="font-semibold text-green-900 mb-2">Configuração Concluída!</h3>
                <div className="text-green-800 space-y-1">
                  <p>✅ Tabelas criadas: {resultado.details?.tabelas_criadas?.join(', ')}</p>
                  <p>✅ Índices criados: {resultado.details?.indices_criados}</p>
                  <p>✅ RLS configurado: {resultado.details?.rls_configurado ? 'Sim' : 'Não'}</p>
                  <p>✅ Categorias padrão: {resultado.details?.categorias_padrao}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Próximos Passos */}
        {resultado && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Próximos Passos:</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">1</span>
                </div>
                <span className="text-gray-700">Acesse a página de Contas a Pagar para começar a usar o sistema</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">2</span>
                </div>
                <span className="text-gray-700">Configure categorias personalizadas se necessário</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">3</span>
                </div>
                <span className="text-gray-700">Comece a cadastrar suas contas a pagar</span>
              </div>
            </div>
            
            <div className="mt-6">
              <Button
                onClick={() => router.push('/financeiro/contas-a-pagar')}
                size="lg"
                className="w-full"
              >
                <FiArrowRight className="w-5 h-5 mr-3" />
                Ir para Contas a Pagar
              </Button>
            </div>
          </div>
        )}

        {/* Informações da Empresa */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-8">
          <h4 className="font-semibold text-gray-900 mb-2">Informações da Empresa:</h4>
          <div className="text-sm text-gray-600">
            <p><strong>ID:</strong> {empresaData?.id}</p>
            <p><strong>Nome:</strong> {empresaData?.nome}</p>
            <p><strong>Plano:</strong> {empresaData?.plano}</p>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}

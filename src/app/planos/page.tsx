"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/Toast';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { FiCheck, FiStar, FiZap, FiUsers, FiBox, FiTruck, FiFileText } from 'react-icons/fi';

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  periodo: string;
  limite_usuarios: number;
  limite_produtos: number;
  limite_clientes: number;
  limite_fornecedores: number;
  recursos_disponiveis: Record<string, any>;
  ativo: boolean;
}

export default function PlanosPage() {
  const { user, usuarioData } = useAuth();
  const { assinatura, diasRestantesTrial } = useSubscription();
  const { addToast } = useToast();
  
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlano, setSelectedPlano] = useState<string | null>(null);

  // Carregar planos
  const carregarPlanos = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('ativo', true)
        .order('preco');

      if (error) {
        console.error('Erro ao carregar planos:', error);
        addToast('error', 'Erro ao carregar planos');
        return;
      }

      setPlanos(data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      addToast('error', 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  // Criar assinatura trial
  const criarAssinaturaTrial = async () => {
    if (!usuarioData?.empresa_id) {
      addToast('error', 'Empresa não encontrada');
      return;
    }

    try {
      console.log('Iniciando criação de trial para empresa:', usuarioData.empresa_id);

      const response = await fetch('/api/empresa/criar-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: usuarioData.empresa_id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro detalhado ao criar trial:', data);
        addToast('error', `Erro ao criar assinatura trial: ${data.error || 'Erro desconhecido'}`);
        return;
      }

      console.log('Trial criado com sucesso:', data);
      addToast('success', 'Assinatura trial criada com sucesso!');
      window.location.reload();
    } catch (error) {
      console.error('Erro ao criar assinatura trial:', error);
      addToast('error', 'Erro ao criar assinatura trial');
    }
  };

  // Fazer upgrade de plano
  const fazerUpgrade = async (planoId: string) => {
    if (!usuarioData?.empresa_id) {
      addToast('error', 'Empresa não encontrada');
      return;
    }

    try {
      // Buscar plano selecionado
      const plano = planos.find(p => p.id === planoId);
      if (!plano) {
        addToast('error', 'Plano não encontrado');
        return;
      }

      console.log('Iniciando upgrade para plano:', plano.nome);

      const response = await fetch('/api/empresa/upgrade-plano', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: usuarioData.empresa_id,
          plano_id: planoId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro detalhado ao fazer upgrade:', data);
        addToast('error', `Erro ao fazer upgrade: ${data.error || 'Erro desconhecido'}`);
        return;
      }

      console.log('Upgrade realizado com sucesso:', data);
      addToast('success', 'Upgrade realizado com sucesso!');
      window.location.reload();
    } catch (error) {
      console.error('Erro ao fazer upgrade:', error);
      addToast('error', 'Erro ao fazer upgrade');
    }
  };

  useEffect(() => {
    carregarPlanos();
  }, []);

  const getIconePlano = (nome: string) => {
    switch (nome.toLowerCase()) {
      case 'trial':
        return <FiStar className="w-8 h-8" />;
      case 'básico':
        return <FiZap className="w-8 h-8" />;
      case 'pro':
        return <FiUsers className="w-8 h-8" />;
      case 'avançado':
        return <FiStar className="w-8 h-8" />;
      default:
        return <FiStar className="w-8 h-8" />;
    }
  };

  const getCorPlano = (nome: string) => {
    switch (nome.toLowerCase()) {
      case 'trial':
        return 'bg-gray-100 text-gray-800';
      case 'básico':
        return 'bg-blue-100 text-blue-800';
      case 'profissional':
        return 'bg-purple-100 text-purple-800';
      case 'empresarial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <MenuLayout>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Escolha seu Plano</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Encontre o plano perfeito para sua empresa. Todos os planos incluem suporte e atualizações.
          </p>
        </div>

        {/* Status atual */}
        {assinatura && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">
                  Plano Atual: {assinatura.plano?.nome}
                </h3>
                <p className="text-blue-700 text-sm">
                  Status: {assinatura.status === 'trial' ? 'Trial' : 'Ativo'}
                  {assinatura.status === 'trial' && (
                    <span className="ml-2">
                      • {diasRestantesTrial()} dias restantes
                    </span>
                  )}
                </p>
              </div>
              {assinatura.status === 'trial' && (
                <Button onClick={criarAssinaturaTrial}>
                  Renovar Trial
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Grid de planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {planos.map((plano) => (
            <div
              key={plano.id}
              className={`bg-white rounded-lg shadow-lg border-2 ${
                selectedPlano === plano.id ? 'border-blue-500' : 'border-gray-200'
              } hover:shadow-xl transition-shadow`}
            >
              {/* Header */}
              <div className={`p-6 ${getCorPlano(plano.nome)} rounded-t-lg`}>
                <div className="flex items-center justify-between mb-2">
                  {getIconePlano(plano.nome)}
                  <span className="text-2xl font-bold">
                    R$ {plano.preco.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <h3 className="text-xl font-bold">{plano.nome}</h3>
                <p className="text-sm opacity-80">{plano.descricao}</p>
              </div>

              {/* Limites */}
              <div className="p-6">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Usuários</span>
                    <span className="font-semibold">{plano.limite_usuarios}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Produtos</span>
                    <span className="font-semibold">{plano.limite_produtos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Clientes</span>
                    <span className="font-semibold">{plano.limite_clientes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fornecedores</span>
                    <span className="font-semibold">{plano.limite_fornecedores}</span>
                  </div>
                </div>

                {/* Recursos */}
                <div className="space-y-2 mb-6">
                  {plano.recursos_disponiveis.relatorios && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Relatórios Avançados
                    </div>
                  )}
                  {plano.recursos_disponiveis.api && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      API de Integração
                    </div>
                  )}
                  {plano.recursos_disponiveis.suporte && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Suporte Prioritário
                    </div>
                  )}
                  {plano.recursos_disponiveis.financeiro && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Controle Financeiro
                    </div>
                  )}
                  {plano.recursos_disponiveis.comissao && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Comissão por Técnico
                    </div>
                  )}
                  {plano.recursos_disponiveis.nfe && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Emissão de NFe
                    </div>
                  )}
                  {plano.recursos_disponiveis.estoque && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Controle de Estoque
                    </div>
                  )}
                  {plano.recursos_disponiveis.permissoes && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Controle de Permissões
                    </div>
                  )}
                  {plano.recursos_disponiveis.kanban && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Kanban para OS
                    </div>
                  )}
                  {plano.recursos_disponiveis.app && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      App do Técnico
                    </div>
                  )}
                  {plano.recursos_disponiveis.whatsapp && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Integração WhatsApp
                    </div>
                  )}
                  {plano.recursos_disponiveis.dashboard && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Dashboard de Performance
                    </div>
                  )}
                  {plano.recursos_disponiveis.relatorios_personalizados && (
                    <div className="flex items-center text-sm">
                      <FiCheck className="w-4 h-4 text-green-500 mr-2" />
                      Relatórios Personalizados
                    </div>
                  )}
                </div>

                {/* Botão */}
                <Button
                  className="w-full"
                  variant={selectedPlano === plano.id ? 'default' : 'outline'}
                  onClick={() => {
                    if (plano.nome === 'Trial') {
                      criarAssinaturaTrial();
                    } else {
                      setSelectedPlano(plano.id);
                      fazerUpgrade(plano.id);
                    }
                  }}
                >
                  {plano.nome === 'Trial' ? 'Iniciar Trial' : 'Escolher Plano'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Informações adicionais */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold mb-4">Dúvidas?</h3>
          <p className="text-gray-600 mb-4">
            Entre em contato conosco para mais informações sobre os planos.
          </p>
          <Button variant="outline">
            Falar com Vendas
          </Button>
        </div>
      </div>
    </MenuLayout>
  );
} 
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/Toast';
import ProtectedArea from '@/components/ProtectedArea';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { Badge } from '@/components/Badge';

export default function ListaOrdensPageSimple() {
  const router = useRouter();
  const { empresaData } = useAuth();
  const empresaId = empresaData?.id;
  const { addToast } = useToast();

  // Estados básicos - sem complexidade
  const [ordens, setOrdens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ✅ FUNÇÃO SIMPLES: Carregar dados sem timeout ou retry complexo
  const carregarOrdens = useCallback(async () => {
    if (!empresaId?.trim()) return;

    setLoading(true);
    try {
      console.log('🔄 Carregando ordens...');
      
      // Query simples e direta - SEM timeout artificial
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          clientes(nome, telefone, email),
          usuarios:tecnico_id(nome)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(100); // Limite razoável

      if (error) {
        console.error('Erro ao carregar ordens:', error);
        addToast('error', 'Erro ao carregar ordens. Tente novamente.');
        return;
      }

      if (data) {
        console.log('✅ Ordens carregadas:', data.length);
        setOrdens(data || []);
      }

    } catch (error) {
      console.error('Erro inesperado:', error);
      addToast('error', 'Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [empresaId, addToast]);

  // ✅ CARREGAR DADOS: Simples e direto
  useEffect(() => {
    if (empresaId) {
      carregarOrdens();
    }
  }, [empresaId, carregarOrdens]);

  // ✅ FILTROS SIMPLES: Sem complexidade desnecessária
  const ordensFiltradas = useMemo(() => {
    return ordens.filter(ordem => {
      const matchSearch = !searchTerm || 
        ordem.id?.toString().includes(searchTerm) ||
        ordem.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ordem.aparelho?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = !statusFilter || ordem.status === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [ordens, searchTerm, statusFilter]);

  // ✅ LOADING SIMPLES
  if (!empresaData?.id) {
    return (
      <ProtectedArea area="ordens">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando empresa...</p>
          </div>
        </div>
      </ProtectedArea>
    );
  }

  return (
    <ProtectedArea area="ordens">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
            <p className="text-gray-600">Gerencie todas as ordens de serviço da sua empresa</p>
          </div>
          <Button onClick={() => router.push('/nova-os')}>
            + Nova OS
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar por OS, cliente, aparelho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os Status</option>
              <option value="aguardando">Aguardando</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="finalizada">Finalizada</option>
              <option value="entregue">Entregue</option>
            </Select>
            <Button 
              variant="outline" 
              onClick={carregarOrdens}
              disabled={loading}
            >
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Lista de Ordens */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando ordens...</p>
            </div>
          </div>
        ) : ordensFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <p className="text-gray-500 text-lg">Nenhuma ordem encontrada</p>
            <p className="text-gray-400 mt-2">Tente ajustar os filtros ou criar uma nova OS</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      OS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aparelho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entrada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ordensFiltradas.map((ordem) => (
                    <tr key={ordem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{ordem.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ordem.clientes?.nome || 'Cliente não informado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ordem.aparelho || ordem.marca || ordem.modelo || 'Não informado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={
                          ordem.status === 'finalizada' ? 'bg-green-100 text-green-800' :
                          ordem.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' :
                          ordem.status === 'entregue' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {ordem.status || 'Aguardando'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ordem.created_at ? new Date(ordem.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/ordens/${ordem.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500">
          Total: {ordensFiltradas.length} ordens encontradas
        </div>
      </div>
    </ProtectedArea>
  );
}

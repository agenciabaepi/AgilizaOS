'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiRefreshCw, FiPlus, FiSearch, FiFilter } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function ListaOrdensPageSimple() {
  const router = useRouter();
  const { empresaData } = useAuth();
  const empresaId = empresaData?.id;
  
  const [ordens, setOrdens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrdens = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          status,
          created_at,
          clientes!cliente_id(nome, telefone)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdens(data || []);
    } catch (error) {
      console.error('Erro ao buscar ordens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdens();
  }, [empresaId]);

  const filteredOrdens = ordens.filter(ordem => 
    ordem.numero_os?.toString().includes(searchTerm) ||
    ordem.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    
      <MenuLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Ordens de Serviço</h1>
            <div className="flex gap-3">
              <Button
                onClick={fetchOrdens}
                disabled={loading}
                variant="outline"
                size="lg"
              >
                <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Atualizando...' : 'Atualizar'}
              </Button>
              <Button
                onClick={() => router.push("/nova-os")}
                size="lg"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Nova OS
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Buscar por número da OS ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Lista de Ordens */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Ordens ({filteredOrdens.length})
              </h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Carregando...</p>
                </div>
              ) : filteredOrdens.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma ordem encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrdens.map((ordem) => (
                    <div
                      key={ordem.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">
                          OS #{ordem.numero_os}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {ordem.clientes?.nome || 'Cliente não informado'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ordem.status === 'CONCLUIDO' ? 'bg-green-100 text-green-800' :
                          ordem.status === 'EM_ANALISE' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {ordem.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(ordem.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </MenuLayout>
    
  );
}
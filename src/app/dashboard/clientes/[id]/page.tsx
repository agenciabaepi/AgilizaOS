

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FiArrowLeft, FiEdit2 } from 'react-icons/fi';

export default function VisualizarClientePage() {
  const params = useParams();
  const router = useRouter();
  const [cliente, setCliente] = useState<any>(null);

  useEffect(() => {
    const fetchCliente = async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Erro ao buscar cliente:', error);
      } else {
        setCliente(data);
      }
    };

    fetchCliente();
  }, [params.id]);

  if (!cliente) return <p>Carregando...</p>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 focus:outline-none"
          >
            <FiArrowLeft className="text-lg" />
            <span>Voltar</span>
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Visualizar Cliente</h1>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/clientes/${cliente.id}/editar`)}
            className="flex items-center gap-2 text-sm font-medium text-yellow-600 hover:text-yellow-800 focus:outline-none"
          >
            <FiEdit2 className="text-lg" />
            <span>Editar</span>
          </button>
        </div>

        <div className="bg-white rounded-md shadow-md border border-gray-100 px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><strong>Nome:</strong> {cliente.nome}</div>
            <div><strong>Documento:</strong> {cliente.documento}</div>
            <div><strong>Telefone:</strong> {cliente.telefone}</div>
            <div><strong>Celular:</strong> {cliente.celular}</div>
            <div><strong>Email:</strong> {cliente.email}</div>
            <div><strong>Responsável:</strong> {cliente.responsavel}</div>
            <div><strong>Tipo:</strong> {cliente.tipo}</div>
            <div><strong>Origem:</strong> {cliente.origem}</div>
            <div><strong>Aniversário:</strong> {cliente.aniversario}</div>
            <div><strong>CEP:</strong> {cliente.cep}</div>
            <div><strong>Endereço:</strong> {cliente.endereco}</div>
            <div><strong>Observações:</strong> {cliente.observacoes}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
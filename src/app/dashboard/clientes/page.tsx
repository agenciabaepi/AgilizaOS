'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye, FiMessageSquare } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Cliente } from '@/types/cliente';

export default function ClientesPage() {
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const router = useRouter();

  useEffect(() => {
    const fetchClientes = async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Erro ao buscar clientes:', error);
      } else {
        setClientes(data || []);
      }
    };
    fetchClientes();
  }, []);

  const excluirCliente = async (id: string) => {
    const confirmacao = confirm('Tem certeza que deseja excluir este cliente?');
    if (!confirmacao) return;

    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir cliente: ' + error.message);
    } else {
      alert('Cliente excluído com sucesso!');
      setClientes(clientes.filter(cliente => cliente.id !== id));
    }
  };

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca) ||
    c.celular.includes(busca) ||
    c.email.toLowerCase().includes(busca.toLowerCase()) ||
    c.documento.includes(busca)
  );

  return (
    <div className="px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Clientes</h1>
        <Link
          href="/dashboard/clientes/novo"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
        >
          <FiPlus className="w-6 h-6" />
          Novo Cliente
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full border border-gray-300 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <table className="w-full text-sm rounded-md overflow-hidden border border-gray-200">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-4 sticky left-0 bg-gray-100 z-10">#</th>
            <th className="px-4">Nome</th>
            <th className="px-4">Telefone</th>
            <th className="px-4">Celular</th>
            <th className="px-4">Email</th>
            <th className="px-4">Documento</th>
            <th className="px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {clientesFiltrados.map((c, idx) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-transform transform hover:scale-[1.005] border-b border-gray-100">
              <td className="px-3 py-2 font-medium text-gray-600">{c.numero_cliente}</td>
              <td className="px-4 py-3 font-medium">{c.nome}</td>
              <td className="px-4 py-3">{c.telefone}</td>
              <td className="px-4 py-3">{c.celular}</td>
              <td className="px-4 py-3">{c.email}</td>
              <td className="px-4 py-3">{c.documento}</td>
              <td className="px-3 py-2 flex justify-end gap-3">
                <Link href={`/dashboard/clientes/${c.id}`} className="text-blue-600">
                  <FiEye className="w-5 h-5 hover:text-gray-700" />
                </Link>
                <Link href={`/dashboard/clientes/${c.id}/editar`} className="text-yellow-600">
                  <FiEdit2 className="w-5 h-5 hover:text-gray-700" />
                </Link>
                <button
                  className="text-red-600 hover:scale-110 transform transition"
                  onClick={() => excluirCliente(c.id)}
                >
                  <FiTrash2 className="w-5 h-5 hover:text-gray-700" />
                </button>
                <button className="text-green-600 hover:scale-110 transform transition">
                  <FiMessageSquare className="w-5 h-5 hover:text-gray-700" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
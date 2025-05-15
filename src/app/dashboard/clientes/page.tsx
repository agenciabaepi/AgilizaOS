'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye, FiMessageSquare } from 'react-icons/fi';

const clientesFake = [
  {
    id: '1',
    nome: 'Lucas Oliveira',
    telefone: '(12) 99999-1234',
    celular: '(12) 98111-2222',
    email: 'lucas@email.com',
    documento: '123.456.789-00',
  },
  {
    id: '2',
    nome: 'Maria Souza',
    telefone: '(11) 98888-5678',
    celular: '(11) 97777-3333',
    email: 'maria@email.com',
    documento: '987.654.321-00',
  },
];

export default function ClientesPage() {
  const [busca, setBusca] = useState('');

  const clientes = clientesFake.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca) ||
    c.celular.includes(busca) ||
    c.email.toLowerCase().includes(busca.toLowerCase()) ||
    c.documento.includes(busca)
  );

  return (
    <div className="px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <Link href="/dashboard/clientes/novo" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <FiPlus />
          Novo Cliente
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      <table className="w-full text-sm text-left border-separate border-spacing-y-2">
        <thead className="text-gray-500">
          <tr>
            <th className="px-4">#</th>
            <th className="px-4">Nome</th>
            <th className="px-4">Telefone</th>
            <th className="px-4">Celular</th>
            <th className="px-4">Email</th>
            <th className="px-4">Documento</th>
            <th className="px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c, idx) => (
            <tr key={c.id} className="bg-white rounded-xl shadow-sm">
              <td className="px-4 py-3">{idx + 1}</td>
              <td className="px-4 py-3 font-medium">{c.nome}</td>
              <td className="px-4 py-3">{c.telefone}</td>
              <td className="px-4 py-3">{c.celular}</td>
              <td className="px-4 py-3">{c.email}</td>
              <td className="px-4 py-3">{c.documento}</td>
              <td className="px-4 py-3 text-right flex justify-end gap-3">
                <button className="text-blue-600"><FiEye /></button>
                <button className="text-yellow-600"><FiEdit2 /></button>
                <button className="text-red-600"><FiTrash2 /></button>
                <button className="text-green-600"><FiMessageSquare /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
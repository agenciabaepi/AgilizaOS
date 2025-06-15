// NOVO SISTEMA DE PRODUTOS E SERVIÇOS
'use client';
import MenuLayout from '@/components/MenuLayout';
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowDownTrayIcon, TagIcon, CubeIcon } from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Tipo = 'produto' | 'servico';

interface ProdutoServico {
  id: string;
  nome: string;
  descricao: string;
  tipo: Tipo;
  preco: number;
  custo: number | null;
  estoque_atual: number | null;
  unidade: string;
}

export default function ProdutosServicosPage() {
  const [lista, setLista] = useState<ProdutoServico[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<Tipo>('produto');
  const [preco, setPreco] = useState('');
  const [custo, setCusto] = useState('');
  const [estoque, setEstoque] = useState('');
  const [unidade, setUnidade] = useState('un');

  useEffect(() => {
    buscar();
  }, []);

  const buscar = async () => {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    const { data: usuario, error: errorUsuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', userId)
      .single();

    if (!usuario || !usuario.empresa_id) {
      console.warn('Empresa não encontrada para o usuário');
      return;
    }

    const empresa_id = usuario.empresa_id;

    const { data, error } = await supabase
      .from('produtos_servicos')
      .select('*')
      .eq('empresa_id', empresa_id)
      .order('nome', { ascending: true });

    if (!error && data) setLista(data);
  };

  const salvar = async () => {
    if (!nome || !preco) return;
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    const { data: usuario, error: errorUsuario } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', userId)
      .single();

    if (!usuario || !usuario.empresa_id) {
      alert('ID da empresa não encontrado no banco.');
      return;
    }

    const empresa_id = usuario.empresa_id;
    const payload = {
      nome,
      descricao,
      tipo,
      preco: parseFloat(preco),
      custo: custo ? parseFloat(custo) : null,
      estoque_atual: tipo === 'produto' ? parseInt(estoque || '0') : null,
      unidade,
      empresa_id,
    };
    const { error } = await supabase.from('produtos_servicos').insert(payload);
    if (!error) {
      setNome('');
      setDescricao('');
      setPreco('');
      setCusto('');
      setEstoque('');
      setUnidade('un');
      console.log('Item salvo com empresa_id:', empresa_id);
      buscar();
    }
  };

  return (
    <MenuLayout>
      <div className="py-10 px-6 bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Cadastro de Produtos e Serviços</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <section className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center mb-4 space-x-2">
              <CubeIcon className="h-6 w-6 text-indigo-500" />
              <h2 className="text-lg font-semibold">Novo Item</h2>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as Tipo)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="produto">Produto</option>
                <option value="servico">Serviço</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="Preço (R$)"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.01"
                value={custo}
                onChange={(e) => setCusto(e.target.value)}
                placeholder="Custo (R$)"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              {tipo === 'produto' && (
                <>
                  <input
                    type="number"
                    value={estoque}
                    onChange={(e) => setEstoque(e.target.value)}
                    placeholder="Estoque Atual"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    placeholder="Unidade (ex: un, kg, m)"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </>
              )}
              <button
                onClick={salvar}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
              >
                <ArrowDownTrayIcon className="h-5 w-5" /> Salvar
              </button>
            </div>
          </section>

          <section className="col-span-1 md:col-span-2 bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center mb-4 space-x-2">
              <TagIcon className="h-6 w-6 text-indigo-500" />
              <h2 className="text-lg font-semibold">Produtos e Serviços Cadastrados</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-4 py-2 font-medium text-gray-700">Nome</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Tipo</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Preço</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Custo</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Estoque</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-2">{item.nome}</td>
                      <td className="px-4 py-2 capitalize">{item.tipo}</td>
                      <td className="px-4 py-2">R$ {item.preco.toFixed(2)}</td>
                      <td className="px-4 py-2">{item.custo !== null ? `R$ ${item.custo.toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-2">{item.tipo === 'produto' ? item.estoque_atual : '-'}</td>
                      <td className="px-4 py-2">{item.tipo === 'produto' ? item.unidade : '-'}</td>
                    </tr>
                  ))}
                  {lista.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-gray-400 italic">
                        Nenhum item cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </MenuLayout>
  );
}
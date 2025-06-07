'use client';
import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CubeIcon, TagIcon, DevicePhoneMobileIcon, ArrowDownTrayIcon, PencilIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Modelo {
  id?: number;
  nome: string;
}

interface Marca {
  id?: number;
  nome: string;
  modelos: Modelo[];
}

interface Categoria {
  id?: number;
  nome: string;
  marcas: Marca[];
}

export default function EquipamentosPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionadaParaMarca, setCategoriaSelecionadaParaMarca] = useState('');
  const [categoriaSelecionadaParaModelo, setCategoriaSelecionadaParaModelo] = useState('');
  const [marcaSelecionadaParaModelo, setMarcaSelecionadaParaModelo] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novaMarca, setNovaMarca] = useState('');
  const [novoModelo, setNovoModelo] = useState('');
  const [categoriaSelecionadaParaExibicao, setCategoriaSelecionadaParaExibicao] = useState('');

  // Estados para edição inline
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<number | null>(null);
  const [editandoMarcaId, setEditandoMarcaId] = useState<number | null>(null);
  const [editandoModeloId, setEditandoModeloId] = useState<number | null>(null);

  // Estados para valores editados
  const [nomeEditadoCategoria, setNomeEditadoCategoria] = useState('');
  const [nomeEditadoMarca, setNomeEditadoMarca] = useState('');
  const [nomeEditadoModelo, setNomeEditadoModelo] = useState('');

  // Estado para expandir/ocultar modelos da marca
  const [marcaExpandidaId, setMarcaExpandidaId] = useState<number | null>(null);

  const [filtroPesquisa, setFiltroPesquisa] = useState('');
  const categoriasFiltradas = useMemo(() => {
    if (!filtroPesquisa.trim()) return categorias;
    const filtro = filtroPesquisa.trim().toLowerCase();
    return categorias
      .map((cat) => {
        const marcasFiltradas = cat.marcas.filter((marca) =>
          marca.nome.toLowerCase().includes(filtro)
        );
        const categoriaMatch = cat.nome.toLowerCase().includes(filtro);
        if (categoriaMatch) {
          return cat;
        }
        if (marcasFiltradas.length > 0) {
          return { ...cat, marcas: marcasFiltradas };
        }
        return null;
      })
      .filter(Boolean) as Categoria[];
  }, [categorias, filtroPesquisa]);

  // Contadores de categorias, marcas e modelos
  const totalCategorias = categorias.length;
  const totalMarcas = categorias.reduce((acc, cat) => acc + cat.marcas.length, 0);
  const totalModelos = categorias.reduce(
    (acc, cat) => acc + cat.marcas.reduce((mAcc, marca) => mAcc + marca.modelos.length, 0),
    0
  );

  useEffect(() => {
    buscarCategorias();
  }, []);

  const buscarCategorias = async () => {
    const user = await supabase.auth.getUser();
    const usuarioId = user.data.user?.id;
    const { data: categoriasData } = await supabase
      .from('categorias')
      .select('id, nome, marcas(id, nome, modelos(id, nome))')
      .eq('usuario_id', usuarioId);
    setCategorias(categoriasData || []);
    if (categoriasData && categoriasData.length > 0) {
      setCategoriaSelecionadaParaExibicao(categoriasData[0].id.toString());
    }
  };

  const salvarCategoria = async () => {
    if (!novaCategoria.trim()) return;
    const user = await supabase.auth.getUser();
    const usuarioId = user.data.user?.id;
    await supabase.from('categorias').insert({ nome: novaCategoria.trim(), usuario_id: usuarioId });
    setNovaCategoria('');
    buscarCategorias();
  };

  const salvarMarca = async () => {
    if (!categoriaSelecionadaParaMarca || !novaMarca.trim()) return;
    const user = await supabase.auth.getUser();
    const usuarioId = user.data.user?.id;
    await supabase.from('marcas').insert({ nome: novaMarca.trim(), categoria_id: categoriaSelecionadaParaMarca, usuario_id: usuarioId });
    setNovaMarca('');
    buscarCategorias();
  };

  const salvarModelo = async () => {
    if (!categoriaSelecionadaParaModelo || !marcaSelecionadaParaModelo || !novoModelo.trim()) return;
    const user = await supabase.auth.getUser();
    const usuarioId = user.data.user?.id;
    await supabase.from('modelos').insert({ nome: novoModelo.trim(), marca_id: marcaSelecionadaParaModelo, usuario_id: usuarioId });
    setNovoModelo('');
    buscarCategorias();
  };

  // Funções para salvar edição inline
  const salvarEdicaoCategoria = async (id: number) => {
    console.log('salvarEdicaoCategoria chamada para id:', id, 'novo nome:', nomeEditadoCategoria);
    if (!nomeEditadoCategoria.trim()) return;
    const user = await supabase.auth.getUser();
    await supabase.from('categorias').update({ nome: nomeEditadoCategoria.trim() }).eq('id', id).eq('usuario_id', user.data.user?.id);
    setEditandoCategoriaId(null);
    setNomeEditadoCategoria('');
    buscarCategorias();
  };

  const salvarEdicaoMarca = async (id: number) => {
    console.log('salvarEdicaoMarca chamada para id:', id, 'novo nome:', nomeEditadoMarca);
    if (!nomeEditadoMarca.trim()) return;
    const user = await supabase.auth.getUser();
    await supabase.from('marcas').update({ nome: nomeEditadoMarca.trim() }).eq('id', id).eq('usuario_id', user.data.user?.id);
    setEditandoMarcaId(null);
    setNomeEditadoMarca('');
    buscarCategorias();
  };

  const salvarEdicaoModelo = async (id: number) => {
    console.log('salvarEdicaoModelo chamada para id:', id, 'novo nome:', nomeEditadoModelo);
    if (!nomeEditadoModelo.trim()) return;
    const user = await supabase.auth.getUser();
    await supabase.from('modelos').update({ nome: nomeEditadoModelo.trim() }).eq('id', id).eq('usuario_id', user.data.user?.id);
    setEditandoModeloId(null);
    setNomeEditadoModelo('');
    buscarCategorias();
  };

  // Funções para exclusão com validação
  const excluirCategoria = async (categoria: Categoria) => {
    console.log('excluirCategoria chamada para:', categoria);
    if (categoria.marcas.length > 0) {
      alert("Não é possível excluir: há itens vinculados.");
      return;
    }
    if (confirm("Tem certeza que deseja excluir?")) {
      const user = await supabase.auth.getUser();
      await supabase.from('categorias').delete().eq('id', categoria.id).eq('usuario_id', user.data.user?.id);
      buscarCategorias();
    }
  };

  const excluirMarca = async (marca: Marca, categoriaId?: number) => {
    console.log('excluirMarca chamada para:', marca, 'categoriaId:', categoriaId);
    if (marca.modelos.length > 0) {
      alert("Não é possível excluir: há itens vinculados.");
      return;
    }
    if (confirm("Tem certeza que deseja excluir?")) {
      const user = await supabase.auth.getUser();
      await supabase.from('marcas').delete().eq('id', marca.id).eq('usuario_id', user.data.user?.id);
      buscarCategorias();
    }
  };

  const excluirModelo = async (modelo: Modelo) => {
    console.log('excluirModelo chamada para:', modelo);
    if (confirm("Tem certeza que deseja excluir?")) {
      const user = await supabase.auth.getUser();
      await supabase.from('modelos').delete().eq('id', modelo.id).eq('usuario_id', user.data.user?.id);
      buscarCategorias();
    }
  };

  return (
    <div className="py-10 px-6 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 shadow rounded-lg p-4">
          <h3 className="text-sm text-gray-500 mb-1">Categorias</h3>
          <p className="text-xl font-semibold text-indigo-600">{totalCategorias}</p>
        </div>
        <div className="bg-white border border-gray-200 shadow rounded-lg p-4">
          <h3 className="text-sm text-gray-500 mb-1">Marcas</h3>
          <p className="text-xl font-semibold text-indigo-600">{totalMarcas}</p>
        </div>
        <div className="bg-white border border-gray-200 shadow rounded-lg p-4">
          <h3 className="text-sm text-gray-500 mb-1">Modelos</h3>
          <p className="text-xl font-semibold text-indigo-600">{totalModelos}</p>
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-6">Cadastro de Equipamentos</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cadastro Categoria */}
        <section className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center mb-4 space-x-2">
            <CubeIcon className="h-6 w-6 text-indigo-500" />
            <h2 className="text-lg font-semibold">Nova Categoria</h2>
          </div>
          <fieldset className="border border-gray-300 rounded px-3 py-2 mb-4">
            <legend className="text-sm font-medium px-2">Categoria</legend>
            <input
              type="text"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              placeholder="Nome da categoria"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </fieldset>
          <button
            onClick={salvarCategoria}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition"
          >
            <ArrowDownTrayIcon className="h-5 w-5" /> Salvar
          </button>
        </section>

        {/* Cadastro Marca */}
        <section className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center mb-4 space-x-2">
            <TagIcon className="h-6 w-6 text-indigo-500" />
            <h2 className="text-lg font-semibold">Nova Marca</h2>
          </div>
          <fieldset className="border border-gray-300 rounded px-3 py-2 mb-3">
            <legend className="text-sm font-medium px-2">Categoria</legend>
            <select
              value={categoriaSelecionadaParaMarca}
              onChange={(e) => setCategoriaSelecionadaParaMarca(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="" disabled>Selecione a categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset className="border border-gray-300 rounded px-3 py-2 mb-4">
            <legend className="text-sm font-medium px-2">Marca</legend>
            <input
              type="text"
              value={novaMarca}
              onChange={(e) => setNovaMarca(e.target.value)}
              placeholder="Nome da marca"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </fieldset>
          <button
            onClick={salvarMarca}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition"
          >
            <ArrowDownTrayIcon className="h-5 w-5" /> Salvar
          </button>
        </section>

        {/* Cadastro Modelo */}
        <section className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center mb-4 space-x-2">
            <DevicePhoneMobileIcon className="h-6 w-6 text-indigo-500" />
            <h2 className="text-lg font-semibold">Novo Modelo</h2>
          </div>
          <fieldset className="border border-gray-300 rounded px-3 py-2 mb-3">
            <legend className="text-sm font-medium px-2">Categoria</legend>
            <select
              value={categoriaSelecionadaParaModelo}
              onChange={(e) => {
                setCategoriaSelecionadaParaModelo(e.target.value);
                setMarcaSelecionadaParaModelo('');
              }}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="" disabled>Selecione a categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset className="border border-gray-300 rounded px-3 py-2 mb-3">
            <legend className="text-sm font-medium px-2">Marca</legend>
            <select
              value={marcaSelecionadaParaModelo}
              onChange={(e) => setMarcaSelecionadaParaModelo(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              disabled={!categoriaSelecionadaParaModelo}
            >
              <option value="" disabled>Selecione a marca</option>
              {categorias
                .find((cat) => cat.id?.toString() === categoriaSelecionadaParaModelo)
                ?.marcas.length ? (
                <optgroup label="Marcas">
                  {categorias
                    .find((cat) => cat.id?.toString() === categoriaSelecionadaParaModelo)
                    ?.marcas.map((marca) => (
                      <option key={marca.id} value={marca.id?.toString()}>
                        {marca.nome}
                      </option>
                    ))}
                </optgroup>
              ) : null}
            </select>
          </fieldset>
          <fieldset className="border border-gray-300 rounded px-3 py-2 mb-4">
            <legend className="text-sm font-medium px-2">Modelo</legend>
            <input
              type="text"
              value={novoModelo}
              onChange={(e) => setNovoModelo(e.target.value)}
              placeholder="Nome do modelo"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </fieldset>
          <button
            onClick={salvarModelo}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition"
          >
            <ArrowDownTrayIcon className="h-5 w-5" /> Salvar
          </button>
        </section>
      </div>

      {/* Pesquisa e listagem em acordeon */}
      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">Equipamentos Cadastrados</h2>
        {/* Barra de pesquisa */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Pesquisar categoria ou marca..."
            className="w-full max-w-md border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            onChange={(e) => setFiltroPesquisa(e.target.value)}
            value={filtroPesquisa}
          />
        </div>
        <div className="flex flex-col gap-4">
          {categoriasFiltradas.map((cat) => (
            <details key={cat.id} className="bg-white shadow-sm rounded-xl border border-gray-200">
              <summary className="cursor-pointer select-none px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {editandoCategoriaId === cat.id ? (
                    <input
                      type="text"
                      value={nomeEditadoCategoria}
                      onChange={(e) => setNomeEditadoCategoria(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-base font-bold w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      autoFocus
                    />
                  ) : (
                    <span className="text-lg font-bold text-gray-800">{cat.nome}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {editandoCategoriaId === cat.id ? (
                    <button
                      className="p-1"
                      onClick={() => salvarEdicaoCategoria(cat.id)}
                      title="Salvar edição"
                    >
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    </button>
                  ) : (
                    <button
                      className="p-1"
                      onClick={() => {
                        setEditandoCategoriaId(cat.id ?? null);
                        setNomeEditadoCategoria(cat.nome);
                      }}
                      title="Editar categoria"
                    >
                      <PencilIcon className="h-4 w-4 text-indigo-500" />
                    </button>
                  )}
                  <button
                    className="p-1"
                    onClick={() => excluirCategoria(cat)}
                    title="Excluir categoria"
                  >
                    <TrashIcon className="h-4 w-4 text-red-500 hover:text-red-700" />
                  </button>
                </div>
              </summary>
              <div className="px-5 pb-5">
                <table className="min-w-full border border-gray-200 rounded overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700">Marca</th>
                      <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700">Modelos</th>
                      <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.marcas.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-gray-400 italic text-sm px-3 py-2">Nenhuma marca cadastrada.</td>
                      </tr>
                    )}
                    {cat.marcas.map((marca) => {
                      const keyBase = `marca-${marca.id}`;
                      return (
                        <React.Fragment key={`marca-${marca.id}`}>
                          <tr className="border-t border-gray-100">
                            <td className="px-3 py-2 align-middle">
                              {editandoMarcaId === marca.id ? (
                                <input
                                  type="text"
                                  value={nomeEditadoMarca}
                                  onChange={(e) => setNomeEditadoMarca(e.target.value)}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm font-semibold w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                  autoFocus
                                />
                              ) : (
                                <span className="text-base font-semibold text-gray-700">{marca.nome}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 align-middle">{marca.modelos.length}</td>
                            <td className="px-3 py-2 align-middle flex items-center gap-2">
                              <button
                                className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-medium hover:bg-indigo-200"
                                onClick={() =>
                                  setMarcaExpandidaId((prev) => (prev === marca.id ? null : marca.id ?? null))
                                }
                              >
                                {marcaExpandidaId === marca.id ? 'Ocultar Modelos' : 'Ver Modelos'}
                              </button>
                              {editandoMarcaId === marca.id ? (
                                <button
                                  className="p-1"
                                  onClick={() => salvarEdicaoMarca(marca.id)}
                                  title="Salvar edição"
                                >
                                  <CheckIcon className="h-4 w-4 text-green-600" />
                                </button>
                              ) : (
                                <button
                                  className="p-1"
                                  onClick={() => {
                                    setEditandoMarcaId(marca.id ?? null);
                                    setNomeEditadoMarca(marca.nome);
                                  }}
                                  title="Editar marca"
                                >
                                  <PencilIcon className="h-4 w-4 text-indigo-500" />
                                </button>
                              )}
                              <button
                                className="p-1"
                                onClick={() => excluirMarca(marca, cat.id)}
                                title="Excluir marca"
                              >
                                <TrashIcon className="h-4 w-4 text-red-500 hover:text-red-700" />
                              </button>
                            </td>
                          </tr>
                          {marcaExpandidaId === marca.id && (
                            <tr className="bg-gray-50" key={`modelos-${marca.id}`}>
                              <td colSpan={3} className="px-4 py-2">
                                <ul className="list-disc pl-5 text-sm text-gray-700">
                                  {marca.modelos.map((modelo) => (
                                    <li key={`modelo-${modelo.id}`}>{modelo.nome}</li>
                                  ))}
                                  {marca.modelos.length === 0 && (
                                    <li className="italic text-gray-400">Nenhum modelo cadastrado.</li>
                                  )}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
// NOVO SISTEMA DE PRODUTOS E SERVIÇOS
// NOVO SISTEMA DE PRODUTOS E SERVIÇOS
'use client';
import Select from 'react-select';
import MenuLayout from '@/components/MenuLayout';
import React, { useEffect, useState } from 'react';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import {
  Chart as ChartJS,
  ArcElement as ArcElement2,
  Tooltip as Tooltip2,
  Legend as Legend2,
  DoughnutController,
} from 'chart.js';

ChartJS.register(ArcElement2, Tooltip2, Legend2, DoughnutController);
import { useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { ArrowDownTrayIcon, TagIcon, CubeIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';

const supabase = createBrowserSupabaseClient();

type Tipo = 'produto' | 'servico';

interface ProdutoServico {
  id: string;
  codigo?: string;
  nome: string;
  descricao: string;
  tipo: Tipo;
  preco: number;
  custo: number | null;
  estoque_atual: number | null;
  unidade: string;
  estoque_minimo?: number | null;
  fornecedor?: string;
  codigo_barras?: string;
  ativo: boolean;
}

export default function ProdutosServicosPage() {
  const { session, usuarioData } = useAuth();
  const empresaId = usuarioData?.empresa_id;
  const [logErro, setLogErro] = useState('');
  const [lista, setLista] = useState<ProdutoServico[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<Tipo>('produto');
  const [preco, setPreco] = useState('');
  const [custo, setCusto] = useState('');
  const [estoque, setEstoque] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');
  const [unidade, setUnidade] = useState('un');
  const [controleEstoque, setControleEstoque] = useState(false);
  const [fornecedor, setFornecedor] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [abaSelecionada, setAbaSelecionada] = useState<'produto' | 'servico'>('produto');
  const [mensagemAviso, setMensagemAviso] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);
  // Novo estado para modal de fornecedor
  const [mostrarModalFornecedor, setMostrarModalFornecedor] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState('');
  // Estado para lista de fornecedores
  const [listaFornecedores, setListaFornecedores] = useState<{ id: string; nome: string }[]>([]);
  const [buscandoFornecedor, setBuscandoFornecedor] = useState(false);
  const [ativo, setAtivo] = useState(true);

  Chart.register(ArcElement, Tooltip, Legend);

  // Função buscar movida para fora do useEffect para reuso
  const buscar = async () => {
    setCarregando(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || sessionError) {
        setCarregando(false);
        return;
      }

      const {
        data: { user },
        error: erroUser,
      } = await supabase.auth.getUser();

      if (erroUser || !user) {
        setCarregando(false);
        return;
      }

      const { data: usuarioData, error: erroUsuario } = await supabase
        .from("usuarios")
        .select("empresa_id")
        .eq("auth_user_id", user.id)
        .single();

      if (erroUsuario || !usuarioData) {
        setCarregando(false);
        return;
      }

      const empresaId = usuarioData.empresa_id;

      const { data: fornecedoresData } = await supabase
        .from("fornecedores")
        .select("*");

      setListaFornecedores(fornecedoresData || []);

      const { data: produtosServicosData } = await supabase
        .from("produtos_servicos")
        .select("*")
        .eq("empresa_id", empresaId);

      setLista(produtosServicosData || []);

    } catch (erro) {
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscar();
  }, []);

  const graficoRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { Chart, registerables } = require('chart.js');
      Chart.register(...registerables);

      const produtosAtivos = lista.filter(p => p.tipo === 'produto' && p.ativo).length;
      const produtosInativos = lista.filter(p => p.tipo === 'produto' && !p.ativo).length;
      const servicosAtivos = lista.filter(p => p.tipo === 'servico' && p.ativo).length;
      const servicosInativos = lista.filter(p => p.tipo === 'servico' && !p.ativo).length;

      const canvasProdutos = document.getElementById('graficoProdutos') as HTMLCanvasElement;
      if (canvasProdutos) {
        const ctx = canvasProdutos.getContext('2d');
        if (ctx) {
          if (Chart.getChart(ctx)) {
            Chart.getChart(ctx)?.destroy();
          }
          new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ['Ativos', 'Inativos'],
              datasets: [{
                data: [produtosAtivos, produtosInativos],
                backgroundColor: ['#cffb6d', '#000000']
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { position: 'bottom' } }
            }
          });
        }
      }

      const canvasServicos = document.getElementById('graficoServicos') as HTMLCanvasElement;
      if (canvasServicos) {
        const ctx = canvasServicos.getContext('2d');
        if (ctx) {
          if (Chart.getChart(ctx)) {
            Chart.getChart(ctx)?.destroy();
          }
          new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ['Ativos', 'Inativos'],
              datasets: [{
                data: [servicosAtivos, servicosInativos],
                backgroundColor: ['#cffb6d', '#000000']
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { position: 'bottom' } }
            }
          });
        }
      }
    }
  }, [lista]);

  // useEffect para buscar fornecedores removido, pois a busca foi incorporada à nova função buscar

  // A função buscar anterior foi removida, pois a busca agora é feita no useEffect acima

  const salvar = async () => {
    if (!nome || !preco) return;

    if (!empresaId) {
      setMensagemAviso('ID da empresa não encontrado.');
      return;
    }

    // Buscar o maior código já existente
    const { data: ultimos, error: erroUltimos } = await supabase
      .from('produtos_servicos')
      .select('codigo')
      // Não filtrar por empresa_id manualmente, RLS já faz isso
      .order('codigo', { ascending: false })
      .limit(1);

    let novoCodigo = '1';
    if (!erroUltimos && ultimos && ultimos.length > 0 && ultimos[0].codigo) {
      const ultimoNumero = parseInt(ultimos[0].codigo);
      if (!isNaN(ultimoNumero)) {
        novoCodigo = (ultimoNumero + 1).toString();
      }
    }

    const novoRegistro = {
      codigo: novoCodigo,
      nome,
      descricao,
      preco: parseFloat(preco),
      custo: tipo === 'produto' ? parseFloat(custo || '0') : null,
      estoque_atual: tipo === 'produto' ? parseInt(estoque || '0') : null,
      estoque_minimo: tipo === 'produto' ? parseInt(estoqueMinimo || '0') : null,
      unidade,
      empresa_id: empresaId,
      fornecedor: tipo === 'produto' ? fornecedor || null : null,
      codigo_barras: tipo === 'produto' ? codigoBarras || null : null,
    };
    // Extrai os campos corretamente, incluindo ativo
    const { descricao: _descricao, preco: _preco, custo: _custo, tipo: _tipo, unidade: _unidade, ativo: _ativo } = { ...novoRegistro, tipo, ativo };
    // Salva com tipo e ativo garantidos
    await supabase.from('produtos_servicos').insert([{ ...novoRegistro, tipo, ativo }]);
    setNome('');
    setDescricao('');
    setPreco('');
    setCusto('');
    setEstoque('');
    setEstoqueMinimo('');
    setUnidade('un');
    setFornecedor('');
    setCodigoBarras('');
    setAtivo(true);
    buscar();
    setMensagemSucesso('Item cadastrado com sucesso!');
    setTimeout(() => setMensagemSucesso(''), 3000);
  };

  const excluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    await supabase.from('produtos_servicos').delete().eq('id', id);
    buscar();
    setMensagemSucesso('Item excluído com sucesso!');
    setTimeout(() => setMensagemSucesso(''), 3000);
  };

  const iniciarEdicao = (item: ProdutoServico) => {
    setEditandoId(item.id);
    setNome(item.nome);
    setDescricao(item.descricao);
    setTipo(item.tipo);
    setPreco(item.preco.toString());
    setCusto(item.custo?.toString() ?? '');
    setEstoque(item.estoque_atual?.toString() || '');
    setEstoqueMinimo(item.estoque_minimo?.toString() || '');
    setUnidade(item.unidade);
    setAtivo(item.ativo ?? true);
  };

  const atualizar = async () => {
    if (!editandoId || !empresaId) return;

    const payload = {
      nome,
      descricao,
      tipo,
      preco: parseFloat(preco),
      custo: tipo === 'produto' ? parseFloat(custo || '0') : null,
      estoque_atual: tipo === 'produto' ? parseInt(estoque || '0') : null,
      estoque_minimo: tipo === 'produto' ? parseInt(estoqueMinimo || '0') : null,
      unidade,
      fornecedor: tipo === 'produto' ? fornecedor || null : null,
      codigo_barras: tipo === 'produto' ? codigoBarras || null : null,
      ativo,
    };
    const { error } = await supabase
      .from('produtos_servicos')
      .update(payload)
      .eq('id', editandoId);
    
    if (!error) {
      setEditandoId(null);
      setNome('');
      setDescricao('');
      setPreco('');
      setCusto('');
      setEstoque('');
      setEstoqueMinimo('');
      setUnidade('un');
      setFornecedor('');
      setCodigoBarras('');
      setAtivo(true);
      buscar();
      setMensagemSucesso('Item atualizado com sucesso!');
      setTimeout(() => setMensagemSucesso(''), 3000);
    }
  };

  return (
    <MenuLayout>
      {/* Mensagem de erro de log, se houver */}
      {logErro && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6 font-mono text-xs whitespace-pre-wrap">
          {logErro}
        </div>
      )}
      <div className="py-10 px-6 bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Cadastro de Produtos e Serviços</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm text-gray-500">Produtos Cadastrados</h3>
            <p className="text-2xl font-bold text-gray-800">{lista.filter(item => item.tipo === 'produto').length}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm text-gray-500">Serviços Cadastrados</h3>
            <p className="text-2xl font-bold text-gray-800">{lista.filter(item => item.tipo === 'servico').length}</p>
          </div>
        </div>

        {mensagemAviso && (
          <div className="mb-4 p-3 text-sm text-black bg-[#cffb6d] rounded">
            {mensagemAviso}
          </div>
        )}
        {mensagemSucesso && (
          <div className="mb-4 p-3 text-sm text-green-800 bg-green-100 rounded border border-green-300">
            {mensagemSucesso}
          </div>
        )}

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
              <div className="flex items-center justify-between">
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Produto Ativo
                </label>
                <button
                  type="button"
                  onClick={() => setAtivo(!ativo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    ativo ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ativo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {tipo === 'produto' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={controleEstoque}
                    onChange={(e) => setControleEstoque(e.target.checked)}
                    id="controleEstoque"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="controleEstoque" className="text-sm text-gray-700">Gerenciar Estoque</label>
                </div>
              )}
              <input
                type="number"
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="Preço (R$)"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
              {tipo === 'produto' && (
                <input
                  type="number"
                  step="0.01"
                  value={custo}
                  onChange={(e) => setCusto(e.target.value)}
                  placeholder="Custo (R$)"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              )}
              {tipo === 'produto' && controleEstoque && (
                <>
                  <input
                    type="number"
                    value={estoque}
                    onChange={(e) => setEstoque(e.target.value)}
                    placeholder="Estoque Atual"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(e.target.value)}
                    placeholder="Estoque Mínimo"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="un">Unidade (un)</option>
                    <option value="kg">Quilo (kg)</option>
                    <option value="g">Grama (g)</option>
                    <option value="m">Metro (m)</option>
                    <option value="cm">Centímetro (cm)</option>
                    <option value="l">Litro (l)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="par">Par</option>
                    <option value="cx">Caixa</option>
                    <option value="pct">Pacote</option>
                    <option value="rolo">Rolo</option>
                  </select>
                  <div className="relative">
                    <Select
                      options={(listaFornecedores || []).map(f => ({ value: f.id, label: f.nome }))}
                      onChange={(opcaoSelecionada) => setFornecedor(opcaoSelecionada?.value || '')}
                      value={
                        (listaFornecedores || [])
                          .map(f => ({ value: f.id, label: f.nome }))
                          .find(op => op.value === fornecedor) || null
                      }
                      placeholder="Pesquisar fornecedor..."
                      className="text-sm"
                      isSearchable
                      isLoading={buscandoFornecedor}
                      loadingMessage={() => "Carregando fornecedores..."}
                      noOptionsMessage={() =>
                        (listaFornecedores || []).length === 0
                          ? "Nenhum fornecedor encontrado"
                          : "Digite para pesquisar"
                      }
                      onInputChange={(inputValue) => {
                        setBuscandoFornecedor(true);
                        setTimeout(() => setBuscandoFornecedor(false), 500);
                        return inputValue;
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarModalFornecedor(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#cffb6d] hover:brightness-95 text-black rounded-full p-1 shadow transition"
                      title="Adicionar Fornecedor"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    placeholder="Código de Barras"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </>
              )}
              <button
                onClick={editandoId ? atualizar : salvar}
                disabled={!empresaId}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded transition font-semibold ${
                  empresaId
                    ? 'bg-[#cffb6d] text-black hover:opacity-90'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                {editandoId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Gráfico de Produtos */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-sm font-semibold mb-2">Distribuição de Produtos</h2>
              <canvas id="graficoProdutos" width="200" height="200"></canvas>
            </div>

            {/* Gráfico de Serviços */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-sm font-semibold mb-2">Distribuição de Serviços</h2>
              <canvas id="graficoServicos" width="200" height="200"></canvas>
            </div>
          </div>

          <section className="col-span-1 md:col-span-2 bg-white p-5 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center mb-4 space-x-2">
              <TagIcon className="h-6 w-6 text-indigo-500" />
              <h2 className="text-lg font-semibold">Produtos e Serviços Cadastrados</h2>
            </div>

            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
              <div className="flex space-x-2">
                <button
                  className={`px-4 py-2 rounded font-medium transition ${
                    abaSelecionada === 'produto'
                      ? 'bg-[#cffb6d] text-black'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setAbaSelecionada('produto')}
                >
                  Produtos
                </button>
                <button
                  className={`px-4 py-2 rounded font-medium transition ${
                    abaSelecionada === 'servico'
                      ? 'bg-[#cffb6d] text-black'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setAbaSelecionada('servico')}
                >
                  Serviços
                </button>
              </div>
              <div className="relative w-full md:w-72">
                <input
                  type="text"
                  placeholder="Pesquisar item..."
                  className="w-full border border-gray-300 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#cffb6d]"
                  onChange={(e) => {
                    const termo = e.target.value.toLowerCase();
                    if (termo.trim() === '') {
                      buscar(); // Recarrega todos os itens se o campo estiver vazio
                    } else {
                      setLista((anterior) =>
                        anterior.filter((item) =>
                          item.nome.toLowerCase().includes(termo) ||
                          item.descricao.toLowerCase().includes(termo)
                        )
                      );
                    }
                  }}
                />
                <svg
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2a7.5 7.5 0 010 15z" />
                </svg>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-4 py-2 font-medium text-gray-700">Código</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Nome</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Tipo</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Status</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Preço</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Custo</th>
                    {abaSelecionada === 'produto' && (
                      <>
                        <th className="px-4 py-2 font-medium text-gray-700">Estoque</th>
                        <th className="px-4 py-2 font-medium text-gray-700">Est. Mín.</th>
                        <th className="px-4 py-2 font-medium text-gray-700">Unidade</th>
                      </>
                    )}
                    <th className="px-4 py-2 font-medium text-gray-700">Fornecedor</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Código Barras</th>
                    <th className="px-4 py-2 font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista
                    .filter(item => item.tipo === abaSelecionada)
                    .map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-2 text-xs text-gray-700">{item.codigo}</td>
                        <td className="px-4 py-2">
                          <div className="font-semibold">{item.nome}</div>
                          {item.descricao && <div className="text-xs text-gray-500">{item.descricao}</div>}
                        </td>
                        <td className="px-4 py-2 capitalize">{item.tipo}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            item.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {item.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-2">R$ {item.preco.toFixed(2)}</td>
                        <td className="px-4 py-2">R$ {item.custo?.toFixed(2) ?? '-'}</td>
                        {abaSelecionada === 'produto' && (
                          <>
                            <td className="px-4 py-2">
                              {item.tipo === 'produto' ? (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`
                                      font-semibold
                                      ${
                                        item.estoque_atual !== null && item.estoque_minimo !== null
                                          ? item.estoque_atual < item.estoque_minimo
                                            ? 'text-red-600'
                                            : item.estoque_atual <= item.estoque_minimo * 1.2
                                              ? 'text-yellow-600'
                                              : 'text-green-600'
                                          : ''
                                      }
                                    `}
                                  >
                                    {item.estoque_atual}
                                  </span>
                                  {item.estoque_atual !== null && item.estoque_minimo !== null && (
                                    <>
                                      {item.estoque_atual < item.estoque_minimo && (
                                        <span className="text-xs text-red-800 bg-red-100 px-2 py-0.5 rounded-full">Estoque baixo</span>
                                      )}
                                      {item.estoque_atual >= item.estoque_minimo && item.estoque_atual <= item.estoque_minimo * 1.2 && (
                                        <span className="text-xs text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-full">Estoque próximo</span>
                                      )}
                                      {item.estoque_atual > item.estoque_minimo * 1.2 && (
                                        <span className="text-xs text-green-800 bg-green-100 px-2 py-0.5 rounded-full">Estoque OK</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-2">{item.tipo === 'produto' ? item.estoque_minimo : '-'}</td>
                            <td className="px-4 py-2">{item.tipo === 'produto' ? item.unidade : '-'}</td>
                          </>
                        )}
                        <td className="px-4 py-2">
                          {item.tipo === 'produto'
                            ? listaFornecedores.find((f) => f.id === item.fornecedor)?.nome || '-'
                            : '-'}
                        </td>
                        <td className="px-4 py-2">{item.tipo === 'produto' ? item.codigo_barras ?? '-' : '-'}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => iniciarEdicao(item)}
                              className="group p-1 rounded hover:bg-[#cffb6d]/20 transition"
                              title="Editar"
                            >
                              <PencilSquareIcon className="h-4 w-4 text-black group-hover:text-[#cffb6d]" />
                            </button>
                            <button
                              onClick={() => excluir(item.id)}
                              className="group p-1 rounded hover:bg-red-100 transition"
                              title="Excluir"
                            >
                              <TrashIcon className="h-4 w-4 text-black group-hover:text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {lista.filter(item => item.tipo === abaSelecionada).length === 0 && (
                  <tr>
                    <td colSpan={abaSelecionada === 'produto' ? 12 : 8} className="px-4 py-4 text-center text-gray-400 italic">
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
      {/* Modal para novo fornecedor */}
      {mostrarModalFornecedor && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Adicionar Fornecedor</h3>
              <button onClick={() => setMostrarModalFornecedor(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Nome/Razão Social"
                value={novoFornecedor}
                onChange={(e) => setNovoFornecedor(e.target.value)}
              />
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Celular (opcional)"
              />
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Telefone"
              />
              <input
                type="email"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="E-mail (opcional)"
              />
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="CNPJ/CPF (opcional)"
              />
              <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="CEP (opcional)"
              />
              {/* Removido campo "Origem Cliente*" */}
              {/* Removido campo "Cadastrado por" */}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMostrarModalFornecedor(false)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!novoFornecedor || !empresaId) {
                    setMensagemAviso('Preencha o nome do fornecedor e verifique o ID da empresa.');
                    return;
                  }


                  const { error } = await supabase.from('fornecedores').insert({
                    nome: novoFornecedor,
                    empresa_id: empresaId,
                    telefone: (document.querySelector('input[placeholder="Telefone"]') as HTMLInputElement)?.value || null,
                    celular: (document.querySelector('input[placeholder="Celular (opcional)"]') as HTMLInputElement)?.value || null,
                    email: (document.querySelector('input[placeholder="E-mail (opcional)"]') as HTMLInputElement)?.value || null,
                    cnpj_cpf: (document.querySelector('input[placeholder="CNPJ/CPF (opcional)"]') as HTMLInputElement)?.value || null,
                    cep: (document.querySelector('input[placeholder="CEP (opcional)"]') as HTMLInputElement)?.value || null,
                  });

                  if (error) {
                    setMensagemAviso('Erro ao cadastrar fornecedor: ' + (error.message || 'Erro desconhecido'));
                  } else {
                    setFornecedor(novoFornecedor);
                    setNovoFornecedor('');
                    setMostrarModalFornecedor(false);
                    setMensagemSucesso('Fornecedor cadastrado com sucesso!');
                    setTimeout(() => setMensagemSucesso(''), 3000);
                  }
                }}
                className="px-4 py-2 text-sm bg-[#cffb6d] text-black rounded-md hover:brightness-95 flex items-center gap-2 font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-4 4a4 4 0 110-8 4 4 0 010 8zm0 0v1a4 4 0 01-4 4H6a4 4 0 01-4-4v-1a4 4 0 014-4h4a4 4 0 014 4z" />
                </svg>
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </MenuLayout>
  );
}
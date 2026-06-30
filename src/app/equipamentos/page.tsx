'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast, ToastProvider } from '@/components/Toast';
import { DataTable, Column } from '@/components/DataTable';
import DashboardCard from '@/components/ui/DashboardCard';
import { useAuth } from '@/context/AuthContext';
import { bearerAuthHeadersForApi } from '@/lib/api/clientAuthHeaders';
import { useConfirm } from '@/components/ConfirmDialog';
import { supabase } from '@/lib/supabaseClient';
import { TagIcon } from '@heroicons/react/24/outline';

type Tipo = 'produto' | 'servico';

interface ProdutoServico {
  id: string;
  codigo?: string;
  nome: string;
  tipo: Tipo;
  preco: number;
  custo: number | null;
  estoque_atual: number | null;
  unidade: string;
  estoque_min?: number | null;
  fornecedor?: string;
  codigo_barras?: string;
  categoria?: string;
  marca?: string;
  ativo: boolean;
  grupo_id?: string | null;
  categoria_id?: string | null;
  subcategoria_id?: string | null;
  fornecedor_id?: string | null;
  situacao?: string;
  ncm?: string;
  cfop?: string;
  cst?: string;
  cest?: string;
  largura_cm?: number;
  altura_cm?: number;
  profundidade_cm?: number;
  peso_g?: number;
  obs?: string;
  imagens_url?: string[];
  grupos_produtos?: {
    nome: string;
  } | null;
}

export default function ProdutosServicosPage() {
  const { session, usuarioData } = useAuth();
  const empresaId = usuarioData?.empresa_id;
  const [logErro, setLogErro] = useState('');
  const [lista, setLista] = useState<ProdutoServico[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
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
  const [carregando, setCarregando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mostrarModalFornecedor, setMostrarModalFornecedor] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState('');
  const [ativo, setAtivo] = useState(true);

  const { addToast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const buscar = useCallback(async () => {
    if (!empresaId) return;

    setCarregando(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const headers = await bearerAuthHeadersForApi(session);
      const res = await fetch(
        `/api/produtos-servicos/listar?empresaId=${encodeURIComponent(empresaId)}`,
        {
          cache: 'no-store',
          signal: controller.signal,
          credentials: 'include',
          headers,
        }
      );
      const dados = await res.json();

      if (!res.ok) {
        const msg = typeof dados?.error === 'string' ? dados.error : 'Erro ao carregar dados';
        addToast('error', msg);
        setLista([]);
        return;
      }

      setLista(Array.isArray(dados) ? dados : []);
    } catch {
      addToast('error', 'Erro ao carregar dados');
      setLista([]);
    } finally {
      clearTimeout(timeoutId);
      setCarregando(false);
    }
  }, [empresaId, session]);

  useEffect(() => {
    if (session && empresaId) {
      buscar();
    }
  }, [session, empresaId, buscar]);

  useEffect(() => {
    setPage(1);
  }, [abaSelecionada, searchTerm]);

  const salvar = async () => {
    if (!nome || !preco) return;

    if (!empresaId) {
      setMensagemAviso('ID da empresa não encontrado.');
      return;
    }

    // Buscar o maior código já existente (por empresa)
    const { data: ultimos, error: erroUltimos } = await supabase
      .from('produtos_servicos')
      .select('codigo')
      .eq('empresa_id', empresaId)
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
      preco: parseFloat(preco),
      custo: tipo === 'produto' ? parseFloat(custo || '0') : null,
      estoque_atual: tipo === 'produto' ? parseInt(estoque || '0') : null,
      estoque_min: tipo === 'produto' ? parseInt(estoqueMinimo || '0') : null,
      unidade,
      empresa_id: empresaId,
      fornecedor: tipo === 'produto' ? fornecedor || null : null,
      codigo_barras: tipo === 'produto' ? codigoBarras || null : null,
    };
    // Extrai os campos corretamente, incluindo ativo
    const { preco: _preco, custo: _custo, tipo: _tipo, unidade: _unidade, ativo: _ativo } = { ...novoRegistro, tipo, ativo };
    // Salva com tipo e ativo garantidos
    await supabase.from('produtos_servicos').insert([{ ...novoRegistro, tipo, ativo }]);
    setNome('');
    setPreco('');
    setCusto('');
    setEstoque('');
    setEstoqueMinimo('');
    setUnidade('un');
    setFornecedor('');
    setCodigoBarras('');
    setAtivo(true);
    buscar();
    addToast('success', 'Item cadastrado com sucesso!');
  };

  const excluir = async (id: string) => {
    const ok = await confirm({ message: 'Tem certeza que deseja excluir este item?' });
    if (!ok) return;

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`/api/produtos-servicos/excluir?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        addToast('error', data?.error || 'Erro ao excluir item');
        return;
      }

      buscar();
      addToast('success', 'Item excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir item:', err);
      addToast('error', 'Erro inesperado ao excluir item');
    }
  };

  const iniciarEdicao = (item: ProdutoServico) => {
    setEditandoId(item.id);
    setNome(item.nome);
    setTipo(item.tipo);
    setPreco(item.preco.toString());
    setCusto(item.custo?.toString() ?? '');
    setEstoque(item.estoque_atual?.toString() || '');
    setEstoqueMinimo(item.estoque_min?.toString() || '');
    setUnidade(item.unidade);
    setAtivo(item.ativo ?? true);
  };

  const atualizar = async () => {
    if (!editandoId || !empresaId) return;

    const payload = {
      nome,
      tipo,
      preco: parseFloat(preco),
      custo: tipo === 'produto' ? parseFloat(custo || '0') : null,
      estoque_atual: tipo === 'produto' ? parseInt(estoque || '0') : null,
      estoque_min: tipo === 'produto' ? parseInt(estoqueMinimo || '0') : null,
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
      setPreco('');
      setCusto('');
      setEstoque('');
      setEstoqueMinimo('');
      setUnidade('un');
      setFornecedor('');
      setCodigoBarras('');
      setAtivo(true);
      buscar();
      addToast('success', 'Item atualizado com sucesso!');
    }
  };

  // Filtro e paginação
  const produtos = useMemo(() => lista.filter((item) => item.tipo === 'produto'), [lista]);
  const servicos = useMemo(() => lista.filter((item) => item.tipo === 'servico'), [lista]);

  const filtered = useMemo(() => {
    const byTab = lista.filter((item) => item.tipo === abaSelecionada);
    const term = searchTerm.trim().toLowerCase();
    if (!term) return byTab;

    return byTab.filter(
      (prod) =>
        (prod.nome ?? '').toLowerCase().includes(term) ||
        (prod.codigo ?? '').toLowerCase().includes(term) ||
        (prod.categoria ?? '').toLowerCase().includes(term) ||
        (prod.codigo_barras ?? '').toLowerCase().includes(term) ||
        (prod.marca ?? '').toLowerCase().includes(term)
    );
  }, [lista, abaSelecionada, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  // DataTable columns definition
  const columns: Column<ProdutoServico>[] = [
    { key: 'codigo', header: 'Código', width: 'w-12 sm:w-16', cellClassName: 'whitespace-nowrap' },
    ...(abaSelecionada === 'produto'
      ? [{
          key: 'imagens_url',
          header: 'Imagem',
          headerClassName: 'hidden sm:table-cell',
          cellClassName: 'hidden sm:table-cell',
          render: (row: ProdutoServico) =>
            row.imagens_url?.[0]
              ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded overflow-hidden shrink-0">
                  <img
                    src={row.imagens_url[0] || '/assets/imagens/imagem-produto.jpg'}
                    alt={row.nome}
                    width={40}
                    height={40}
                    loading="lazy"
                    className="object-cover w-full h-full"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/assets/imagens/imagem-produto.jpg'; }}
                  />
                </div>
              )
              : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded overflow-hidden shrink-0">
                  <img
                    src={'/assets/imagens/imagem-produto.jpg'}
                    alt={row.nome}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                </div>
              )
        }]
      : []),
    {
      key: 'nome',
      header: 'Nome',
      cellClassName: 'min-w-[140px] max-w-[220px] lg:max-w-none',
      render: row => (
        <div>
          <div className="font-semibold break-words leading-snug">{row.nome}</div>
          <div className="lg:hidden mt-1 space-y-0.5 text-xs text-gray-500">
            <div>R$ {row.preco.toFixed(2)}</div>
            {abaSelecionada === 'produto' && row.estoque_atual != null && (
              <div>Estoque: {row.estoque_atual}</div>
            )}
            {row.grupos_produtos?.nome && (
              <div className="truncate">{row.grupos_produtos.nome}</div>
            )}
          </div>
          {row.obs && <div className="text-xs text-gray-500 mt-1 hidden md:block line-clamp-2">{row.obs}</div>}
        </div>
      )
    },
    {
      key: 'tipo',
      header: 'Tipo',
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden lg:table-cell capitalize whitespace-nowrap',
      render: row => <span className="capitalize">{row.tipo}</span>
    },
    {
      key: 'grupos_produtos',
      header: 'Grupo',
      headerClassName: 'hidden xl:table-cell',
      cellClassName: 'hidden xl:table-cell max-w-[140px]',
      render: row => (
        <span className="text-sm text-gray-600 break-words">
          {row.grupos_produtos?.nome || '-'}
        </span>
      )
    },
    {
      key: 'situacao',
      header: 'Status',
      headerClassName: 'hidden md:table-cell',
      cellClassName: 'hidden md:table-cell whitespace-nowrap',
      render: row => (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          row.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'
        }`}>{row.ativo ? 'Ativo' : 'Inativo'}</span>
      )
    },
    {
      key: 'preco',
      header: 'Preço',
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden lg:table-cell whitespace-nowrap',
      render: row => `R$ ${row.preco.toFixed(2)}`
    },
    ...(abaSelecionada === 'produto'
      ? [
          {
            key: 'estoque_atual',
            header: 'Estoque',
            headerClassName: 'hidden lg:table-cell',
            cellClassName: 'hidden lg:table-cell',
            render: (row: ProdutoServico) => {
              const estoqueMin = row.estoque_min ?? null;
              return (
              <span>
                {row.tipo === 'produto' ? (
                  <div className="flex flex-col xl:flex-row xl:items-center gap-1 xl:gap-2">
                    <span
                      className={
                        "font-semibold whitespace-nowrap " +
                        (
                          row.estoque_atual !== null && estoqueMin !== null
                            ? row.estoque_atual < estoqueMin
                              ? 'text-red-600'
                              : row.estoque_atual <= estoqueMin * 1.2
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            : ''
                        )
                      }
                    >
                      {row.estoque_atual}
                    </span>
                    {row.estoque_atual !== null && estoqueMin !== null && (
                      <>
                        {row.estoque_atual < estoqueMin && (
                          <span className="text-xs text-red-800 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">Baixo</span>
                        )}
                        {row.estoque_atual >= estoqueMin && row.estoque_atual <= estoqueMin * 1.2 && (
                          <span className="text-xs text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-full whitespace-nowrap">Próximo</span>
                        )}
                        {row.estoque_atual > estoqueMin * 1.2 && (
                          <span className="text-xs text-green-800 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">OK</span>
                        )}
                      </>
                    )}
                  </div>
                ) : '-'}
              </span>
            );
            }
          },
          { key: 'unidade', header: 'Unidade', headerClassName: 'hidden xl:table-cell', cellClassName: 'hidden xl:table-cell whitespace-nowrap' },
          { key: 'fornecedor', header: 'Fornecedor', headerClassName: 'hidden 2xl:table-cell', cellClassName: 'hidden 2xl:table-cell max-w-[120px] truncate' },
          { key: 'codigo_barras', header: 'Cód. Barras', headerClassName: 'hidden 2xl:table-cell', cellClassName: 'hidden 2xl:table-cell whitespace-nowrap font-mono text-xs' },
        ]
      : []),
  ];

  // Dados reais para os cards
  const totalProdutos = produtos.length;
  const totalServicos = servicos.length;
  const produtosEmEstoque = produtos.reduce((acc, p) => acc + (p.estoque_atual || 0), 0);
  const produtosAbaixoMinimo = produtos.filter((p) => {
    const min = p.estoque_min ?? null;
    return p.estoque_atual !== null && min !== null && p.estoque_atual < min;
  }).length;
  const valorTotalEstoque = produtos.reduce((acc, p) => acc + ((p.estoque_atual || 0) * (p.custo || 0)), 0);

  return (
    
      <ToastProvider>
        <MenuLayout>
          <div className="pt-20 px-4 sm:px-6 w-full min-w-0 max-w-full overflow-x-hidden">
            {/* Cards resumo de produtos e serviços - dados reais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <DashboardCard
                title="Total de Produtos"
                value={totalProdutos}
                description={'+5 este mês'}
                descriptionColorClass="text-green-500"
                svgPolyline={{ color: '#84cc16', points: '0,20 10,15 20,17 30,10 40,12 50,8 60,10 70,6' }}
              />
              <DashboardCard
                title="Total de Serviços"
                value={totalServicos}
                description={'+2 este mês'}
                descriptionColorClass="text-indigo-500"
                svgPolyline={{ color: '#6366f1', points: '0,18 10,16 20,14 30,10 40,11 50,9 60,10 70,6' }}
              />
              <DashboardCard
                title="Em Estoque"
                value={produtosEmEstoque}
                description={'+2 esta semana'}
                descriptionColorClass="text-blue-500"
                svgPolyline={{ color: '#60a5fa', points: '0,20 10,16 20,14 30,10 40,11 50,8 60,6 70,4' }}
              />
              <DashboardCard
                title="Abaixo do Mínimo"
                value={produtosAbaixoMinimo}
                description={'Produtos abaixo do mínimo'}
                descriptionColorClass="text-red-500"
                svgPolyline={{ color: '#f87171', points: '0,12 10,14 20,16 30,18 40,20 50,17 60,15 70,16' }}
              />
            </div>
            {/* Mensagem de erro de log, se houver */}
            {logErro && (
              <div className="bg-red-100 text-red-700 p-4 rounded mb-6 font-mono text-xs whitespace-pre-wrap">
                {logErro}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {/* 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <h2 className="text-sm font-semibold mb-2">Distribuição de Produtos</h2>
                  <canvas id="graficoProdutos" width="200" height="200"></canvas>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <h2 className="text-sm font-semibold mb-2">Distribuição de Serviços</h2>
                  <canvas id="graficoServicos" width="200" height="200"></canvas>
                </div>
              </div>
              */}

              <section className="col-span-1 md:col-span-2 bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-200 min-w-0">
                <div className="flex items-center mb-4 space-x-2">
                  <TagIcon className="h-6 w-6 text-indigo-500 shrink-0" />
                  <h2 className="text-base sm:text-lg font-semibold">Produtos e Serviços Cadastrados</h2>
                </div>

                <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
                  <div className="inline-flex w-full sm:w-auto space-x-1 sm:space-x-2 bg-gray-100 rounded-full p-1">
                    <button
                      className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
                        abaSelecionada === 'produto'
                          ? 'bg-black text-white shadow'
                          : 'text-gray-600 hover:text-black'
                      }`}
                      onClick={() => setAbaSelecionada('produto')}
                    >
                      Produtos
                    </button>
                    <button
                      className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
                        abaSelecionada === 'servico'
                          ? 'bg-black text-white shadow'
                          : 'text-gray-600 hover:text-black'
                      }`}
                      onClick={() => setAbaSelecionada('servico')}
                    >
                      Serviços
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 w-full lg:flex-1 lg:flex-row lg:items-center lg:justify-end">
                    <Link href="/equipamentos/novo" className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto">+ Novo Produto</Button>
                    </Link>

                    <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="Pesquisar item..."
                      value={searchTerm}
                      className="w-full border border-gray-300 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#cffb6d]"
                      onChange={(e) => setSearchTerm(e.target.value)}
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
                </div>

                <p className="text-xs text-gray-400 mb-2 lg:hidden">Deslize horizontalmente para ver mais colunas →</p>

                <div className="min-w-0">
                {carregando ? (
                  <div className="py-10 text-center text-sm text-gray-500">Carregando produtos...</div>
                ) : (
                <DataTable
  columns={columns}
  data={paginated}
  rowKey="id"
  onEdit={row => router.push(`/equipamentos/novo?produtoId=${row.id}`)}
  onDelete={row => excluir(row.id)}
/>
                )}
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
                  <Button variant="secondary" onClick={() => setMostrarModalFornecedor(false)}>
                    Cancelar
                  </Button>
                  <Button
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
                        addToast('success', 'Fornecedor cadastrado com sucesso!');
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-4 4a4 4 0 110-8 4 4 0 010 8zm0 0v1a4 4 0 01-4 4H6a4 4 0 01-4-4v-1a4 4 0 014-4h4a4 4 0 014 4z" />
                    </svg>
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </MenuLayout>
      </ToastProvider>
    
  );
}
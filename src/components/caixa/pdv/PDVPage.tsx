'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCaixa } from '@/hooks/useCaixa';
import { useToast } from '@/components/Toast';
import { AbrirCaixaModal } from '@/components/caixa/AbrirCaixaModal';
import { CupomVenda } from '@/components/CupomVenda';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabaseClient';
import { PainelProdutos } from './PainelProdutos';
import { PainelFinalizacao } from './PainelFinalizacao';
import {
  ClientePDV,
  FORMAS_PAGAMENTO,
  ItemCarrinho,
  PagamentoAplicado,
  ProdutoPDV,
} from './types';
import { calcularTotalItem, formatCPF, formatCurrency, gerarId } from './utils';
import { useBuscaProdutosPDV, useDebounce } from './useBuscaProdutosPDV';
import { produtoCombinaExato } from './produtoSearch';

export function PDVPage() {
  const router = useRouter();
  const { usuarioData, empresaData, session } = useAuth();
  const { turnoAtual, loading: loadingCaixa, abrirCaixa, registrarVenda, buscarUltimoValorFechamento } = useCaixa();
  const { addToast } = useToast();

  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false);
  const [valorTrocoSugerido, setValorTrocoSugerido] = useState(0);

  // Entrada de produto
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoPDV | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [indiceDestaque, setIndiceDestaque] = useState(0);
  const buscaDebounced = useDebounce(buscaProduto, 280);

  const { resultados: produtosSugeridos, buscando: buscandoProdutos, erro: erroBuscaProdutos, buscarProdutos, buscarExato, setResultados } =
    useBuscaProdutosPDV({
      empresaId: usuarioData?.empresa_id,
      accessToken: session?.access_token,
    });

  // Carrinho
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [descontoVenda, setDescontoVenda] = useState(0);
  const [acrescimoVenda, setAcrescimoVenda] = useState(0);

  // Cliente
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<ClientePDV | null>(null);
  const [clientesSugeridos, setClientesSugeridos] = useState<ClientePDV[]>([]);
  const [showClientes, setShowClientes] = useState(false);
  const [cpf, setCpf] = useState('');
  const [observacao, setObservacao] = useState('');

  // Pagamentos
  const [pagamentos, setPagamentos] = useState<PagamentoAplicado[]>([]);
  const [metodoSelecionado, setMetodoSelecionado] = useState('dinheiro');
  const [valorPagamentoInput, setValorPagamentoInput] = useState('');
  const [tipoAjuste, setTipoAjuste] = useState<'desconto' | 'acrescimo'>('desconto');
  const [valorAjuste, setValorAjuste] = useState('');

  // Finalização
  const [finalizando, setFinalizando] = useState(false);
  const [modalCupom, setModalCupom] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState<any>(null);

  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const inputClienteRef = useRef<HTMLInputElement>(null);
  const buscaContainerRef = useRef<HTMLDivElement>(null);

  // Busca de produtos com debounce
  useEffect(() => {
    if (!usuarioData?.empresa_id) return;
    const termo = buscaDebounced.trim();
    if (termo.length < 1) {
      setResultados([]);
      return;
    }
    buscarProdutos(termo);
    setIndiceDestaque(0);
  }, [buscaDebounced, usuarioData?.empresa_id, buscarProdutos, setResultados]);

  useEffect(() => {
    if (produtosSugeridos[indiceDestaque]) {
      setProdutoSelecionado(produtosSugeridos[indiceDestaque]);
    }
  }, [indiceDestaque, produtosSugeridos]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buscaContainerRef.current && !buscaContainerRef.current.contains(e.target as Node)) {
        setShowSugestoes(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Verificar caixa aberto
  useEffect(() => {
    if (!loadingCaixa && !turnoAtual) {
      buscarUltimoValorFechamento().then(setValorTrocoSugerido);
      setModalAbrirCaixa(true);
    }
  }, [loadingCaixa, turnoAtual, buscarUltimoValorFechamento]);

  // Totais
  const subtotal = useMemo(
    () => itens.reduce((s, i) => s + i.preco * i.qty, 0),
    [itens]
  );
  const totalDescontosItens = useMemo(
    () => itens.reduce((s, i) => s + i.desconto, 0),
    [itens]
  );
  const totalAcrescimosItens = useMemo(
    () => itens.reduce((s, i) => s + i.acrescimo, 0),
    [itens]
  );
  const totalItens = useMemo(() => itens.reduce((s, i) => s + i.qty, 0), [itens]);
  const totalGeral = useMemo(
    () => subtotal - totalDescontosItens + totalAcrescimosItens - descontoVenda + acrescimoVenda,
    [subtotal, totalDescontosItens, totalAcrescimosItens, descontoVenda, acrescimoVenda]
  );
  const totalRecebido = useMemo(
    () => pagamentos.reduce((s, p) => s + p.valor, 0),
    [pagamentos]
  );
  const restante = Math.max(0, totalGeral - totalRecebido);
  const troco = Math.max(0, totalRecebido - totalGeral);

  const valorUnitario = produtoSelecionado?.preco ?? 0;
  const valorLinha = valorUnitario * quantidade;

  const enderecoCliente = useMemo(() => {
    if (!clienteSelecionado) return '';
    const parts = [
      clienteSelecionado.rua,
      clienteSelecionado.numero,
      clienteSelecionado.bairro,
      clienteSelecionado.cidade,
      clienteSelecionado.estado,
    ].filter(Boolean);
    return parts.join(', ');
  }, [clienteSelecionado]);

  // Buscar clientes
  const buscarClientes = useCallback(
    async (termo: string) => {
      if (!usuarioData?.empresa_id || termo.length < 2) {
        setClientesSugeridos([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/clientes?empresaId=${encodeURIComponent(usuarioData.empresa_id)}&search=${encodeURIComponent(termo)}`
        );
        const data = await res.json();
        setClientesSugeridos(data.clientes || []);
      } catch {
        setClientesSugeridos([]);
      }
    },
    [usuarioData?.empresa_id]
  );

  const handleBuscaProdutoChange = (v: string) => {
    setBuscaProduto(v);
    setShowSugestoes(true);
    setIndiceDestaque(0);
    if (!v.trim()) {
      setProdutoSelecionado(null);
      setResultados([]);
      return;
    }

    const matchLocal = produtosSugeridos.find((p) => produtoCombinaExato(p, v));
    setProdutoSelecionado(matchLocal ?? null);
  };

  const handleSelecionarProduto = (p: ProdutoPDV) => {
    setProdutoSelecionado(p);
    setBuscaProduto(p.nome);
    setShowSugestoes(false);
    setQuantidade(1);
  };

  const adicionarProdutoAoCarrinho = (produto: ProdutoPDV) => {
    setItens((prev) => {
      const existente = prev.find((i) => i.id === produto.id);
      if (existente) {
        return prev.map((i) =>
          i.id === produto.id ? { ...i, qty: i.qty + quantidade } : i
        );
      }
      return [...prev, { ...produto, qty: quantidade, desconto: 0, acrescimo: 0 }];
    });

    setBuscaProduto('');
    setProdutoSelecionado(null);
    setQuantidade(1);
    setShowSugestoes(false);
    setResultados([]);
    setIndiceDestaque(0);
    inputBuscaRef.current?.focus();
    addToast('success', `${produto.nome} adicionado`);
  };

  const handleInserir = async () => {
    let produto = produtoSelecionado;

    if (!produto && buscaProduto.trim()) {
      produto =
        produtosSugeridos[indiceDestaque] ??
        produtosSugeridos.find((p) => produtoCombinaExato(p, buscaProduto)) ??
        produtosSugeridos[0] ??
        null;
    }

    if (!produto && buscaProduto.trim()) {
      produto = await buscarExato(buscaProduto);
    }

    if (!produto) {
      addToast('error', buscaProduto.trim() ? 'Produto não encontrado' : 'Informe um produto para adicionar');
      return;
    }

    adicionarProdutoAoCarrinho(produto);
  };

  const handleBuscaProdutoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSugestoes && e.key !== 'Enter') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowSugestoes(true);
      setIndiceDestaque((i) => Math.min(i + 1, Math.max(produtosSugeridos.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceDestaque((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void handleInserir();
    } else if (e.key === 'Escape') {
      setShowSugestoes(false);
    }
  };

  const handleRemoverItem = (id: string) => {
    setItens((prev) => prev.filter((i) => i.id !== id));
  };

  const handleEditarItem = (id: string, campo: 'desconto' | 'acrescimo', valor: number) => {
    setItens((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [campo]: valor } : i))
    );
  };

  const handleBuscaClienteChange = (v: string) => {
    setBuscaCliente(v);
    setShowClientes(true);
    buscarClientes(v);
    if (!v.trim()) setClienteSelecionado(null);
  };

  const handleSelecionarCliente = (c: ClientePDV) => {
    setClienteSelecionado(c);
    setBuscaCliente(c.nome);
    setCpf(c.documento ? formatCPF(c.documento) : '');
    setShowClientes(false);
  };

  const handleLimparCliente = () => {
    setClienteSelecionado(null);
    setBuscaCliente('');
    setCpf('');
  };

  const handleInserirAjuste = () => {
    const valor = parseFloat(valorAjuste.replace(',', '.')) || 0;
    if (valor <= 0) return;
    if (tipoAjuste === 'desconto') {
      setDescontoVenda((d) => d + valor);
    } else {
      setAcrescimoVenda((a) => a + valor);
    }
    setValorAjuste('');
  };

  const labelMetodo = (id: string) =>
    FORMAS_PAGAMENTO.find((f) => f.id === id)?.label ?? id;

  const handleAdicionarPagamento = (metodo: string) => {
    const valor =
      parseFloat(valorPagamentoInput.replace(',', '.')) ||
      (restante > 0 ? restante : totalGeral);
    if (valor <= 0) {
      addToast('error', 'Informe um valor de pagamento');
      return;
    }
    setPagamentos((prev) => [
      ...prev,
      { id: gerarId(), metodo: labelMetodo(metodo), valor },
    ]);
    setValorPagamentoInput('');
  };

  const handleRemoverPagamento = (id: string) => {
    setPagamentos((prev) => prev.filter((p) => p.id !== id));
  };

  const limparVenda = () => {
    setItens([]);
    setPagamentos([]);
    setDescontoVenda(0);
    setAcrescimoVenda(0);
    setClienteSelecionado(null);
    setBuscaCliente('');
    setCpf('');
    setObservacao('');
    setValorPagamentoInput('');
  };

  const handleCancelarVenda = () => {
    if (itens.length === 0) return;
    if (window.confirm('Deseja cancelar a venda atual?')) {
      limparVenda();
      addToast('info', 'Venda cancelada');
    }
  };

  const handleFinalizarVenda = async () => {
    if (itens.length === 0) {
      addToast('error', 'Adicione produtos à venda');
      return;
    }
    if (!turnoAtual) {
      addToast('error', 'Abra o caixa antes de vender');
      setModalAbrirCaixa(true);
      return;
    }
    if (totalRecebido < totalGeral) {
      addToast('error', 'Valor recebido insuficiente');
      return;
    }

    setFinalizando(true);
    try {
      const { data: ultimaVenda } = await supabase
        .from('vendas')
        .select('numero_venda')
        .eq('empresa_id', usuarioData!.empresa_id)
        .order('numero_venda', { ascending: false })
        .limit(1)
        .maybeSingle();

      const proximoNumero = (ultimaVenda?.numero_venda || 0) + 1;
      const formaPagamentoStr = pagamentos
        .map((p) => `${p.metodo} ${formatCurrency(p.valor)}`)
        .join(' · ');

      const payload = {
        numero_venda: proximoNumero,
        data_venda: new Date().toISOString(),
        empresa_id: usuarioData!.empresa_id,
        cliente_id: clienteSelecionado?.id || null,
        turno_id: turnoAtual.id,
        total: totalGeral,
        forma_pagamento: formaPagamentoStr,
        status: 'finalizada',
        desconto: descontoVenda + totalDescontosItens,
        acrescimo: acrescimoVenda + totalAcrescimosItens,
        tipo_pedido: 'PDV',
        observacoes: observacao || null,
        produtos: itens.map((i) => ({
          id: i.id,
          produto_id: i.id,
          nome: i.nome,
          quantidade: i.qty,
          preco_unitario: i.preco,
          preco: i.preco,
          qtd: i.qty,
          desconto: i.desconto,
          acrescimo: i.acrescimo,
          subtotal: calcularTotalItem(i),
        })),
      };

      const { data, error } = await supabase
        .from('vendas')
        .insert(payload)
        .select()
        .single();

      if (error) {
        addToast('error', 'Erro ao finalizar venda: ' + error.message);
        return;
      }

      await registrarVenda(data.id, totalGeral);

      const dadosCupom = {
        numero_venda: data.numero_venda,
        cliente: clienteSelecionado
          ? {
              nome: clienteSelecionado.nome,
              telefone: clienteSelecionado.telefone,
              celular: clienteSelecionado.celular,
              numero_cliente: clienteSelecionado.numero_cliente,
            }
          : undefined,
        produtos: payload.produtos,
        total: totalGeral,
        desconto: descontoVenda + totalDescontosItens,
        acrescimo: acrescimoVenda + totalAcrescimosItens,
        forma_pagamento: formaPagamentoStr,
        tipo_pedido: 'PDV',
        data_venda: data.data_venda,
      };

      setVendaFinalizada(dadosCupom);
      setModalCupom(true);
      limparVenda();
      addToast('success', 'Venda finalizada com sucesso!');
    } catch (err) {
      console.error(err);
      addToast('error', 'Erro inesperado ao finalizar venda');
    } finally {
      setFinalizando(false);
    }
  };

  const handleTelaCheia = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      addToast('info', 'Não foi possível alternar tela cheia');
    }
  };

  const handleSair = () => {
    router.push('/dashboard');
  };

  const handleAbrirCaixa = async (valor: number, obs?: string) => {
    await abrirCaixa(valor, obs);
    setModalAbrirCaixa(false);
    addToast('success', 'Caixa aberto com sucesso!');
  };

  // Atalhos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSair();
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        handleCancelarVenda();
      }
      if (e.key === 'F11') {
        e.preventDefault();
        handleTelaCheia();
      }
      if (e.altKey) {
        const mapa: Record<string, string> = {
          '1': 'dinheiro',
          '2': 'pix',
          '3': 'credito',
          '4': 'debito',
        };
        if (mapa[e.key]) {
          e.preventDefault();
          setMetodoSelecionado(mapa[e.key]);
        }
        if (e.key === '5') {
          e.preventDefault();
          handleAdicionarPagamento(metodoSelecionado);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (loadingCaixa) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-[3px] border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 font-medium">Carregando PDV...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-3 md:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 h-[calc(100vh-1.5rem)]">
        <PainelProdutos
          buscaContainerRef={buscaContainerRef}
          buscaProduto={buscaProduto}
          onBuscaProdutoChange={handleBuscaProdutoChange}
          onBuscaProdutoKeyDown={handleBuscaProdutoKeyDown}
          produtosSugeridos={produtosSugeridos}
          showSugestoes={showSugestoes}
          buscandoProdutos={buscandoProdutos}
          erroBuscaProdutos={erroBuscaProdutos}
          indiceDestaque={indiceDestaque}
          onSelecionarProduto={handleSelecionarProduto}
          quantidade={quantidade}
          onQuantidadeChange={setQuantidade}
          valorUnitario={valorUnitario}
          valorLinha={valorLinha}
          onInserir={handleInserir}
          itens={itens}
          onRemoverItem={handleRemoverItem}
          onEditarItem={handleEditarItem}
          totalItens={totalItens}
          subtotal={subtotal}
          totalDescontos={totalDescontosItens + descontoVenda}
          totalAcrescimos={totalAcrescimosItens + acrescimoVenda}
          totalGeral={totalGeral}
          inputBuscaRef={inputBuscaRef}
        />
        <PainelFinalizacao
          empresaNome={empresaData?.nome}
          usuarioNome={usuarioData?.nome}
          buscaCliente={buscaCliente}
          onBuscaClienteChange={handleBuscaClienteChange}
          clientesSugeridos={clientesSugeridos}
          showClientes={showClientes}
          onSelecionarCliente={handleSelecionarCliente}
          clienteSelecionado={clienteSelecionado}
          onLimparCliente={handleLimparCliente}
          cpf={cpf}
          onCpfChange={setCpf}
          endereco={enderecoCliente}
          observacao={observacao}
          onObservacaoChange={setObservacao}
          valorAPagar={totalGeral}
          tipoAjuste={tipoAjuste}
          onTipoAjusteChange={setTipoAjuste}
          valorAjuste={valorAjuste}
          onValorAjusteChange={setValorAjuste}
          onInserirAjuste={handleInserirAjuste}
          descontoVenda={descontoVenda}
          acrescimoVenda={acrescimoVenda}
          pagamentos={pagamentos}
          onAdicionarPagamento={handleAdicionarPagamento}
          onRemoverPagamento={handleRemoverPagamento}
          valorPagamentoInput={valorPagamentoInput}
          onValorPagamentoInputChange={setValorPagamentoInput}
          metodoSelecionado={metodoSelecionado}
          onMetodoSelecionadoChange={setMetodoSelecionado}
          totalRecebido={totalRecebido}
          restante={restante}
          troco={troco}
          onCancelarVenda={handleCancelarVenda}
          onFinalizarVenda={handleFinalizarVenda}
          onSair={handleSair}
          onTelaCheia={handleTelaCheia}
          onBuscarProduto={() => {
            inputBuscaRef.current?.focus();
            if (buscaProduto.trim()) setShowSugestoes(true);
          }}
          finalizando={finalizando}
          inputClienteRef={inputClienteRef}
        />
      </div>

      <AbrirCaixaModal
        isOpen={modalAbrirCaixa}
        onClose={() => setModalAbrirCaixa(false)}
        onConfirm={handleAbrirCaixa}
        valorTrocoSugerido={valorTrocoSugerido}
        obrigatorio={!turnoAtual}
      />

      {vendaFinalizada && modalCupom && (
        <Dialog onClose={() => setModalCupom(false)}>
          <div className="p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4 text-center">Cupom da Venda</h2>
            <div className="cupom-impressao">
              <CupomVenda
                numeroVenda={vendaFinalizada.numero_venda}
                cliente={vendaFinalizada.cliente}
                produtos={vendaFinalizada.produtos}
                subtotal={
                  Number(vendaFinalizada.total ?? 0) -
                  Number(vendaFinalizada.acrescimo ?? 0) +
                  Number(vendaFinalizada.desconto ?? 0)
                }
                desconto={Number(vendaFinalizada.desconto ?? 0)}
                acrescimo={Number(vendaFinalizada.acrescimo ?? 0)}
                total={Number(vendaFinalizada.total ?? 0)}
                formaPagamento={vendaFinalizada.forma_pagamento}
                tipoPedido={vendaFinalizada.tipo_pedido || 'PDV'}
                data={new Date(vendaFinalizada.data_venda).toLocaleString('pt-BR')}
                nomeEmpresa={empresaData?.nome || 'Consert'}
              />
            </div>
            <div className="flex gap-2 mt-4 no-print">
              <Button className="flex-1" variant="secondary" onClick={() => setModalCupom(false)}>
                Fechar
              </Button>
              <Button className="flex-1" onClick={() => window.print()}>
                Imprimir
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

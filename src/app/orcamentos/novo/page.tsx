'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MenuLayout from '@/components/MenuLayout';
import ProdutoServicoSearch from '@/components/ProdutoServicoSearch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabaseClient';
import { buildOrcamentoPdfBlob } from '@/lib/pdfOrcamento';
import { FiArrowLeft, FiDownload, FiPlus, FiPrinter, FiSave, FiTrash2 } from 'react-icons/fi';

const FORMAS_PAGAMENTO = [
  { value: '', label: 'A combinar' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'transferencia', label: 'Transferência' },
] as const;

function novoId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ln-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseMoney(input: string): number {
  const s = String(input ?? '').trim();
  if (!s) return 0;
  const normalized = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0);
}

function isUuid(v: string | undefined): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type LinhaOrc = {
  id: string;
  produtoId?: string;
  descricao: string;
  qtd: number;
  valorUnit: number;
  tipo?: 'produto' | 'servico';
};

type DiscountMode = 'none' | 'percent' | 'fixed';

export default function NovoOrcamentoPage() {
  const router = useRouter();
  const { empresaData, usuarioData } = useAuth();
  const { addToast } = useToast();

  const [numero, setNumero] = useState<number>(10389);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteDocumento, setClienteDocumento] = useState('');
  const [clienteEndereco, setClienteEndereco] = useState('');
  const [validadeDias, setValidadeDias] = useState(7);
  const [linhas, setLinhas] = useState<LinhaOrc[]>([]);
  const [discountMode, setDiscountMode] = useState<DiscountMode>('none');
  const [descontoPercent, setDescontoPercent] = useState('');
  const [descontoFixed, setDescontoFixed] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [salvandoBanco, setSalvandoBanco] = useState(false);
  const [modalRapido, setModalRapido] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const [novoItem, setNovoItem] = useState({ nome: '', tipo: 'produto' as 'produto' | 'servico', preco: '' });

  const [dataEmissao, setDataEmissao] = useState(() => new Date());

  useEffect(() => {
    if (!empresaData?.id) return;
    const k = `orcamento_seq_${empresaData.id}`;
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(k) : null;
    const n = raw ? parseInt(raw, 10) : 10389;
    setNumero(Number.isFinite(n) && n > 0 ? n : 10389);
  }, [empresaData?.id]);

  const persistirProximoNumero = useCallback(
    (next: number) => {
      if (!empresaData?.id) return;
      window.localStorage.setItem(`orcamento_seq_${empresaData.id}`, String(next));
    },
    [empresaData?.id]
  );

  const subtotal = useMemo(
    () => linhas.reduce((acc, l) => acc + l.qtd * l.valorUnit, 0),
    [linhas]
  );

  const valorDesconto = useMemo(() => {
    if (discountMode === 'none') return 0;
    if (discountMode === 'percent') {
      const p = parseMoney(descontoPercent.replace('%', ''));
      return Math.min(subtotal, Math.max(0, (subtotal * p) / 100));
    }
    return Math.min(subtotal, Math.max(0, parseMoney(descontoFixed)));
  }, [discountMode, descontoPercent, descontoFixed, subtotal]);

  const total = Math.max(0, subtotal - valorDesconto);

  const validadeAte = useMemo(() => {
    const d = new Date(dataEmissao);
    d.setDate(d.getDate() + Math.max(0, validadeDias));
    return d;
  }, [dataEmissao, validadeDias]);

  const labelForma = FORMAS_PAGAMENTO.find((f) => f.value === formaPagamento)?.label ?? 'A combinar';

  const onSelectProduto = (item: {
    id: string;
    nome: string;
    preco: number;
    tipo: 'produto' | 'servico';
  }) => {
    setLinhas((prev) => [
      ...prev,
      {
        id: novoId(),
        produtoId: item.id,
        descricao: item.nome,
        qtd: 1,
        valorUnit: Number(item.preco) || 0,
        tipo: item.tipo,
      },
    ]);
  };

  const atualizarLinha = (id: string, patch: Partial<LinhaOrc>) => {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removerLinha = (id: string) => {
    setLinhas((prev) => prev.filter((l) => l.id !== id));
  };

  const novoOrcamento = () => {
    const next = numero + 1;
    setNumero(next);
    persistirProximoNumero(next);
    setDataEmissao(new Date());
    setLinhas([]);
    setClienteNome('');
    setClienteTelefone('');
    setClienteEmail('');
    setClienteDocumento('');
    setClienteEndereco('');
    setObservacoes('');
    setFormaPagamento('');
    setDiscountMode('none');
    setDescontoPercent('');
    setDescontoFixed('');
    addToast('Novo orçamento iniciado.', 'success');
  };

  const handleImprimir = () => {
    window.print();
  };

  const handlePdf = async () => {
    if (!empresaData) {
      addToast('Dados da empresa não carregados.', 'error');
      return;
    }
    if (linhas.length === 0) {
      addToast('Inclua ao menos um item no orçamento.', 'error');
      return;
    }
    setGerandoPdf(true);
    try {
      const blob = await buildOrcamentoPdfBlob({
        empresa: {
          nome: empresaData.nome,
          cnpj: empresaData.cnpj,
          endereco: empresaData.endereco,
          telefone: empresaData.telefone,
          email: empresaData.email,
          logoUrl: empresaData.logo_url,
        },
        numero,
        dataEmissao,
        validadeDias,
        clienteNome,
        clienteTelefone,
        clienteEmail,
        clienteDocumento,
        clienteEndereco,
        linhas: linhas.map((l) => ({
          descricao: l.descricao,
          qtd: l.qtd,
          valorUnit: l.valorUnit,
          tipo: l.tipo,
        })),
        valorDesconto,
        observacoes,
        formaPagamentoLabel: labelForma,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Orcamento-${numero}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('PDF gerado com sucesso.', 'success');
    } catch (e) {
      console.error(e);
      addToast('Erro ao gerar PDF.', 'error');
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleSalvarSistema = async () => {
    if (!empresaData?.id || !usuarioData?.id) {
      addToast('Sessão ou empresa não disponível.', 'error');
      return;
    }
    if (linhas.length === 0) {
      addToast('Inclua ao menos um item no orçamento.', 'error');
      return;
    }
    setSalvandoBanco(true);
    try {
      const dataVal = new Date(dataEmissao);
      dataVal.setDate(dataVal.getDate() + Math.max(0, validadeDias));
      const pct =
        discountMode === 'percent' ? parseMoney(String(descontoPercent).replace('%', '')) : 0;

      const { data: head, error: e1 } = await supabase
        .from('orcamentos_emitidos')
        .insert({
          empresa_id: empresaData.id,
          usuario_id: usuarioData.id,
          numero,
          data_emissao: dataEmissao.toISOString(),
          validade_dias: validadeDias,
          data_validade: dataVal.toISOString(),
          cliente_nome: clienteNome.trim() || null,
          cliente_telefone: clienteTelefone.trim() || null,
          cliente_email: clienteEmail.trim() || null,
          cliente_documento: clienteDocumento.trim() || null,
          cliente_endereco: clienteEndereco.trim() || null,
          desconto_modo: discountMode,
          desconto_percentual: pct,
          valor_desconto: valorDesconto,
          subtotal,
          total,
          forma_pagamento: formaPagamento || null,
          observacoes: observacoes.trim() || null,
          status: 'salvo',
        })
        .select('id')
        .single();

      if (e1 || !head?.id) {
        const msg = (e1 as { message?: string; code?: string })?.message || 'Erro ao salvar orçamento';
        if ((e1 as { code?: string })?.code === '23505') {
          addToast('Já existe um orçamento com este número. Clique em «Novo orçamento» ou altere o número.', 'error');
        } else if (
          msg.includes('orcamentos_emitidos') ||
          (e1 as { code?: string })?.code === '42P01'
        ) {
          addToast(
            'Tabela não encontrada. Execute o script database/create_orcamentos_emitidos.sql no Supabase.',
            'error'
          );
        } else {
          addToast(msg, 'error');
        }
        return;
      }

      const oid = head.id as string;
      const itemRows = linhas.map((l, i) => ({
        orcamento_id: oid,
        produto_servico_id: isUuid(l.produtoId) ? l.produtoId : null,
        descricao: l.descricao,
        tipo: l.tipo ?? null,
        quantidade: l.qtd,
        valor_unitario: l.valorUnit,
        ordem: i,
      }));

      const { error: e2 } = await supabase.from('orcamentos_emitidos_itens').insert(itemRows);

      if (e2) {
        await supabase.from('orcamentos_emitidos').delete().eq('id', oid);
        addToast(e2.message || 'Erro ao salvar itens do orçamento.', 'error');
        return;
      }

      persistirProximoNumero(numero + 1);
      addToast('Orçamento salvo no sistema.', 'success');
      router.push(`/orcamentos/${oid}`);
    } catch (err) {
      console.error(err);
      addToast('Erro inesperado ao salvar.', 'error');
    } finally {
      setSalvandoBanco(false);
    }
  };

  const cadastrarRapido = async () => {
    if (!empresaData?.id) {
      addToast('Empresa não identificada.', 'error');
      return;
    }
    const preco = parseMoney(novoItem.preco);
    if (!novoItem.nome.trim() || preco <= 0) {
      addToast('Preencha nome e preço válidos.', 'error');
      return;
    }
    setCadastrando(true);
    try {
      const res = await fetch('/api/produtos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresaData.id,
          nome: novoItem.nome.trim(),
          tipo: novoItem.tipo,
          preco,
          unidade: 'un',
          ativo: true,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        const msg = result.error?.message || result.error || 'Erro ao cadastrar';
        addToast(String(msg), 'error');
        return;
      }
      const novo = result.data;
      if (novo) {
        onSelectProduto({
          id: novo.id,
          nome: novo.nome,
          preco: Number(novo.preco) || preco,
          tipo: novo.tipo,
        });
        setNovoItem({ nome: '', tipo: novoItem.tipo, preco: '' });
        setModalRapido(false);
        addToast(`${novo.tipo === 'produto' ? 'Produto' : 'Serviço'} cadastrado e adicionado ao orçamento.`, 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Erro inesperado ao cadastrar.', 'error');
    } finally {
      setCadastrando(false);
    }
  };

  if (!usuarioData) {
    return (
      <MenuLayout>
        <div className="p-8 text-center text-gray-600">Carregando…</div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="orcamento-page-root p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto print:p-0 print:max-w-none print:mx-0 print:w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 no-print">
          <div className="flex flex-col gap-2 min-w-0">
            <Link
              href="/orcamentos"
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 w-fit"
            >
              <FiArrowLeft className="w-4 h-4" />
              Voltar à lista
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Novo orçamento</h1>
              <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
                Preencha os dados, salve no sistema, imprima ou exporte PDF.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={novoOrcamento}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 text-sm font-medium text-gray-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              <FiPlus className="w-4 h-4" />
              Limpar e novo número
            </button>
            <button
              type="button"
              onClick={handleSalvarSistema}
              disabled={salvandoBanco}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              {salvandoBanco ? 'Salvando…' : 'Salvar no sistema'}
            </button>
            <button
              type="button"
              onClick={handleImprimir}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90"
            >
              <FiPrinter className="w-4 h-4" />
              Imprimir
            </button>
            <button
              type="button"
              disabled={gerandoPdf}
              onClick={handlePdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <FiDownload className="w-4 h-4" />
              {gerandoPdf ? 'Gerando…' : 'Salvar PDF'}
            </button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-start">
          <div className="w-full xl:w-[380px] shrink-0 space-y-4 no-print">
            <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
                Dados do cliente
              </h2>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1 mb-3">
                Preencha aqui para quem é este orçamento (aparecem no documento impresso e no PDF).
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Nome ou razão social</label>
                  <input
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                    placeholder="Ex.: João Silva ou Empresa XYZ Ltda"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">CPF ou CNPJ</label>
                  <input
                    value={clienteDocumento}
                    onChange={(e) => setClienteDocumento(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Endereço</label>
                  <textarea
                    value={clienteEndereco}
                    onChange={(e) => setClienteEndereco(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-sm resize-y"
                    placeholder="Rua, número, bairro, cidade…"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">Itens</h2>
              <ProdutoServicoSearch
                empresaId={empresaData?.id}
                onSelect={onSelectProduto}
                placeholder="Buscar produto ou serviço cadastrado…"
              />
              <button
                type="button"
                onClick={() => setModalRapido(true)}
                className="mt-3 w-full text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Cadastrar produto/serviço na hora
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">Desconto</h2>
              <div className="flex flex-wrap gap-3 text-sm mb-3">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="disc"
                    checked={discountMode === 'none'}
                    onChange={() => setDiscountMode('none')}
                  />
                  Sem desconto
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="disc"
                    checked={discountMode === 'percent'}
                    onChange={() => setDiscountMode('percent')}
                  />
                  %
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="disc"
                    checked={discountMode === 'fixed'}
                    onChange={() => setDiscountMode('fixed')}
                  />
                  R$
                </label>
              </div>
              {discountMode === 'percent' && (
                <input
                  value={descontoPercent}
                  onChange={(e) => setDescontoPercent(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 px-3 py-2 text-sm"
                  placeholder="Ex.: 10"
                />
              )}
              {discountMode === 'fixed' && (
                <input
                  value={descontoFixed}
                  onChange={(e) => setDescontoFixed(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 px-3 py-2 text-sm"
                  placeholder="Ex.: 50,00"
                />
              )}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <label className="block text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-2">Validade (dias)</label>
              <input
                type="number"
                min={0}
                value={validadeDias}
                onChange={(e) => setValidadeDias(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 px-3 py-2 text-sm"
              />
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <label className="block text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-2">Forma de pagamento</label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
              >
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f.value || 'comb'} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-4 shadow-sm">
              <label className="block text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-2">Observações</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-sm resize-y"
                placeholder="Condições, garantia, prazo de execução…"
              />
            </div>

            <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-600 dark:text-zinc-400">Subtotal</span>
                <span className="font-medium">{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600 dark:text-zinc-400">Desconto</span>
                <span className="font-medium">{formatBRL(valorDesconto)}</span>
              </div>
              <div className="flex justify-between pt-2 mt-2 border-t border-blue-200 dark:border-blue-900">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">{formatBRL(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 w-full">
            <div
              id="orcamento-doc"
              className="orcamento-print-doc w-full max-w-full bg-white text-black rounded-none border-0 shadow-none mx-0"
            >
              <div className="orcamento-print-inner px-6 py-5 sm:px-8 print:px-0 print:py-0">
                <div className="orcamento-doc-header grid items-start gap-4 border-b border-black pb-3 mb-4 [grid-template-columns:110px_minmax(0,1fr)_minmax(11rem,13rem)]">
                  <div className="flex h-16 w-[110px] items-center justify-start">
                    {empresaData?.logo_url ? (
                      <img
                        src={empresaData.logo_url}
                        alt=""
                        className="h-16 w-[110px] object-contain shadow-none"
                        style={{ filter: 'none' }}
                      />
                    ) : (
                      <div className="flex h-16 items-center text-xs text-gray-400">Sem logo</div>
                    )}
                  </div>
                  <div className="min-w-0 text-left text-[11px] leading-snug text-black sm:text-sm">
                    <div className="text-[15px] font-bold leading-tight text-black">{empresaData?.nome ?? 'Empresa'}</div>
                    {empresaData?.cnpj && <div className="mt-0.5">CNPJ: {empresaData.cnpj}</div>}
                    {empresaData?.endereco && <div className="mt-0.5 break-words">{empresaData.endereco}</div>}
                    <div className="mt-0.5 break-words">
                      {[empresaData?.telefone, empresaData?.email].filter(Boolean).join(' - ')}
                    </div>
                  </div>
                  <div className="min-w-0 text-right text-[10px] leading-tight text-black sm:text-[11px]">
                    <div className="orcamento-doc-title font-bold text-black">ORÇAMENTO</div>
                    <div className="orcamento-doc-meta mt-1 font-semibold">Nº {numero}</div>
                    <div className="orcamento-doc-meta mt-1.5 text-zinc-800">
                      Emissão: {dataEmissao.toLocaleDateString('pt-BR')}
                    </div>
                    <div className="orcamento-doc-meta mt-0.5 text-zinc-800">
                      Validade: {validadeAte.toLocaleDateString('pt-BR')} ({validadeDias} dias)
                    </div>
                  </div>
                </div>

                <div className="orcamento-cliente-os mb-5 text-[11px] leading-relaxed text-black sm:text-sm">
                  <div className="mb-1 font-bold text-black">Dados do cliente</div>
                  <p className="mb-1">
                    <span className="font-semibold">Nome:</span> {clienteNome || '—'}{' '}
                    <span className="font-semibold">Telefone:</span> {clienteTelefone || '—'}
                  </p>
                  <p className="mb-1 break-words">
                    <span className="font-semibold">E-mail:</span> {clienteEmail || '—'}
                  </p>
                  <p className="mb-0">
                    <span className="font-semibold">CPF/CNPJ:</span> {clienteDocumento || '—'}{' '}
                    <span className="font-semibold">Endereço:</span>{' '}
                    <span className="whitespace-pre-wrap">{clienteEndereco || '—'}</span>
                  </p>
                </div>

                <table className="orcamento-items w-full text-xs sm:text-sm border-collapse border border-[#bbb]">
                  <thead>
                    <tr className="bg-[#eee]">
                      <th className="col-num border border-[#bbb] px-2 py-2">#</th>
                      <th className="col-desc border border-[#bbb] px-2 py-2 text-left">Descrição</th>
                      <th className="col-tipo border border-[#bbb] px-2 py-2 text-left">Tipo</th>
                      <th className="col-qtd border border-[#bbb] px-2 py-2">Qtd</th>
                      <th className="col-unit border border-[#bbb] px-2 py-2 text-right">Unit.</th>
                      <th className="col-total border border-[#bbb] px-2 py-2 text-right">Total</th>
                      <th className="no-print w-10 border border-[#bbb] px-1 py-2" aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.length === 0 ? (
                      <tr className="no-print">
                        <td colSpan={7} className="border border-[#bbb] px-2 py-6 text-center text-gray-500">
                          Use o painel ao lado para buscar produtos/serviços.
                        </td>
                      </tr>
                    ) : (
                      linhas.map((l, i) => (
                        <tr key={l.id}>
                          <td className="col-num border border-[#bbb] px-2 py-1.5 text-center align-middle">
                            {i + 1}
                          </td>
                          <td className="col-desc border border-[#bbb] px-2 py-1.5 align-top">
                            <span className="hidden print:inline">{l.descricao}</span>
                            <input
                              className="print:hidden w-full border border-zinc-300 rounded px-2 py-1 text-sm"
                              value={l.descricao}
                              onChange={(e) => atualizarLinha(l.id, { descricao: e.target.value })}
                            />
                          </td>
                          <td className="col-tipo border border-[#bbb] px-2 py-1.5 align-middle text-xs sm:text-sm">
                            {l.tipo === 'servico' ? 'Serviço' : l.tipo === 'produto' ? 'Produto' : '—'}
                          </td>
                          <td className="col-qtd border border-[#bbb] px-2 py-1.5 text-center align-middle">
                            <span className="hidden print:inline">{l.qtd}</span>
                            <input
                              type="number"
                              min={1}
                              className="print:hidden w-full min-w-0 border border-zinc-300 rounded px-1 py-1 text-sm text-center"
                              value={l.qtd}
                              onChange={(e) =>
                                atualizarLinha(l.id, { qtd: Math.max(1, parseInt(e.target.value, 10) || 1) })
                              }
                            />
                          </td>
                          <td className="col-unit border border-[#bbb] px-2 py-1.5 text-right align-middle tabular-nums">
                            <span className="hidden print:inline">{formatBRL(l.valorUnit)}</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              className="print:hidden w-full min-w-0 border border-zinc-300 rounded px-1 py-1 text-sm text-right"
                              value={l.valorUnit}
                              onChange={(e) =>
                                atualizarLinha(l.id, {
                                  valorUnit: Math.max(0, parseFloat(e.target.value) || 0),
                                })
                              }
                            />
                          </td>
                          <td className="col-total border border-[#bbb] px-2 py-1.5 text-right align-middle font-medium tabular-nums">
                            {formatBRL(l.qtd * l.valorUnit)}
                          </td>
                          <td className="no-print border border-[#bbb] px-1 py-1 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => removerLinha(l.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Remover"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <table className="orcamento-totais mt-3 w-full text-sm border border-zinc-200 rounded-lg overflow-hidden sm:max-w-xs sm:ml-auto print:border-0 print:rounded-none print:ml-auto">
                  <tbody>
                    <tr className="bg-zinc-50/80 print:bg-transparent">
                      <td className="px-3 py-1.5">Subtotal</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatBRL(subtotal)}</td>
                    </tr>
                    <tr className="bg-zinc-50/80 print:bg-transparent">
                      <td className="px-3 py-1.5">Desconto</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatBRL(valorDesconto)}</td>
                    </tr>
                    <tr className="orc-total-row bg-zinc-100 print:bg-transparent">
                      <td className="px-3 py-2 font-semibold">Total</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{formatBRL(total)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="orcamento-pagamento-block mt-6 text-sm">
                  <div className="font-semibold text-zinc-900 mb-1">Forma de pagamento</div>
                  <div className="text-zinc-800">{labelForma}</div>
                </div>

                {observacoes.trim() && (
                  <div className="orcamento-pagamento-block mt-4 text-sm">
                    <div className="font-semibold text-zinc-900 mb-1">Observações</div>
                    <div className="text-zinc-800 whitespace-pre-wrap leading-relaxed">{observacoes}</div>
                  </div>
                )}

                <div className="orcamento-rodape-legal mt-8 pt-3 border-t border-zinc-200 text-center text-[10px] text-zinc-500 print:mt-5">
                  Documento sem valor fiscal. Valores e prazo sujeitos à confirmação.
                </div>
              </div>
            </div>
          </div>
        </div>

        {modalRapido && (
          <div className="fixed inset-0 z-50 no-print flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-zinc-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Cadastro rápido</h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1 mb-4">
                O item será salvo no catálogo e adicionado a este orçamento.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome</label>
                  <input
                    value={novoItem.nome}
                    onChange={(e) => setNovoItem((p) => ({ ...p, nome: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 px-3 py-2 text-sm dark:bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                  <select
                    value={novoItem.tipo}
                    onChange={(e) =>
                      setNovoItem((p) => ({ ...p, tipo: e.target.value as 'produto' | 'servico' }))
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 px-3 py-2 text-sm dark:bg-zinc-950"
                  >
                    <option value="produto">Produto</option>
                    <option value="servico">Serviço</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Preço (R$)</label>
                  <input
                    value={novoItem.preco}
                    onChange={(e) => setNovoItem((p) => ({ ...p, preco: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 px-3 py-2 text-sm dark:bg-zinc-950"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setModalRapido(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={cadastrando}
                  onClick={cadastrarRapido}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-50"
                >
                  {cadastrando ? 'Salvando…' : 'Salvar e adicionar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MenuLayout>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import MenuLayout from '@/components/MenuLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabaseClient';
import { buildOrcamentoPdfBlob } from '@/lib/pdfOrcamento';
import { FiArrowLeft, FiDownload, FiPrinter } from 'react-icons/fi';

const FORMAS_MAP: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão de débito',
  cartao_credito: 'Cartão de crédito',
  transferencia: 'Transferência',
};

function formatBRL(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(n) ? n : 0
  );
}

type OrcamentoDb = {
  id: string;
  numero: number;
  data_emissao: string;
  validade_dias: number;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  cliente_email: string | null;
  cliente_documento: string | null;
  cliente_endereco: string | null;
  valor_desconto: number;
  subtotal: number;
  total: number;
  forma_pagamento: string | null;
  observacoes: string | null;
  status: string;
};

type ItemDb = {
  id: string;
  descricao: string;
  tipo: string | null;
  quantidade: number;
  valor_unitario: number;
  ordem: number;
};

export default function OrcamentoDetalhePage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params?.id[0] : '';
  const { empresaData, usuarioData } = useAuth();
  const { addToast } = useToast();

  const [orc, setOrc] = useState<OrcamentoDb | null>(null);
  const [itens, setItens] = useState<ItemDb[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: head, error: e1 } = await supabase
        .from('orcamentos_emitidos')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (cancel) return;

      if (e1 || !head) {
        setOrc(null);
        setItens([]);
        setLoading(false);
        return;
      }

      const { data: lines, error: e2 } = await supabase
        .from('orcamentos_emitidos_itens')
        .select('id, descricao, tipo, quantidade, valor_unitario, ordem')
        .eq('orcamento_id', id)
        .order('ordem', { ascending: true });

      if (cancel) return;

      setOrc(head as OrcamentoDb);
      setItens((lines as ItemDb[]) ?? []);
      setLoading(false);
      if (e2) {
        console.warn('Itens do orçamento:', e2.message);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id]);

  const labelForma = useMemo(() => {
    const fp = orc?.forma_pagamento?.trim() || '';
    if (!fp) return 'A combinar';
    return FORMAS_MAP[fp] || fp;
  }, [orc?.forma_pagamento]);

  const dataEmissaoDate = useMemo(() => {
    if (!orc?.data_emissao) return new Date();
    const d = new Date(orc.data_emissao);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [orc?.data_emissao]);

  const validadeAte = useMemo(() => {
    const d = new Date(dataEmissaoDate);
    d.setDate(d.getDate() + Math.max(0, orc?.validade_dias ?? 0));
    return d;
  }, [dataEmissaoDate, orc?.validade_dias]);

  const handlePdf = async () => {
    if (!empresaData || !orc) {
      addToast('Dados incompletos para gerar PDF.', 'error');
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
        numero: orc.numero,
        dataEmissao: dataEmissaoDate,
        validadeDias: orc.validade_dias,
        clienteNome: orc.cliente_nome || undefined,
        clienteTelefone: orc.cliente_telefone || undefined,
        clienteEmail: orc.cliente_email || undefined,
        clienteDocumento: orc.cliente_documento || undefined,
        clienteEndereco: orc.cliente_endereco || undefined,
        linhas: itens.map((i) => ({
          descricao: i.descricao,
          qtd: Number(i.quantidade),
          valorUnit: Number(i.valor_unitario),
          tipo: i.tipo || undefined,
        })),
        valorDesconto: Number(orc.valor_desconto) || 0,
        observacoes: orc.observacoes || '',
        formaPagamentoLabel: labelForma,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Orcamento-${orc.numero}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('PDF gerado.', 'success');
    } catch (e) {
      console.error(e);
      addToast('Erro ao gerar PDF.', 'error');
    } finally {
      setGerandoPdf(false);
    }
  };

  if (!usuarioData) {
    return (
      <MenuLayout>
        <div className="p-8 text-center text-gray-600">Carregando…</div>
      </MenuLayout>
    );
  }

  if (!loading && !orc) {
    return (
      <MenuLayout>
        <div className="p-8 max-w-lg mx-auto text-center">
          <p className="text-gray-700 dark:text-zinc-300">Orçamento não encontrado ou sem permissão.</p>
          <Link href="/orcamentos" className="inline-block mt-4 text-blue-600 hover:underline">
            Voltar à lista
          </Link>
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="orcamento-page-root p-4 sm:p-6 lg:p-8 max-w-[900px] mx-auto print:p-0 print:max-w-none print:mx-0 print:w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 no-print">
          <Link
            href="/orcamentos"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 w-fit"
          >
            <FiArrowLeft className="w-4 h-4" />
            Lista de orçamentos
          </Link>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium"
            >
              <FiPrinter className="w-4 h-4" />
              Imprimir
            </button>
            <button
              type="button"
              disabled={gerandoPdf || !orc}
              onClick={handlePdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
            >
              <FiDownload className="w-4 h-4" />
              {gerandoPdf ? 'Gerando…' : 'Salvar PDF'}
            </button>
          </div>
        </div>

        {loading || !orc ? (
          <div className="text-center py-16 text-gray-500">Carregando…</div>
        ) : (
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
                    <span className="text-xs text-gray-400">Sem logo</span>
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
                  <div className="orcamento-doc-meta mt-1 font-semibold">Nº {orc.numero}</div>
                  <div className="orcamento-doc-meta mt-1.5 text-zinc-800">
                    Emissão: {dataEmissaoDate.toLocaleDateString('pt-BR')}
                  </div>
                  <div className="orcamento-doc-meta mt-0.5 text-zinc-800">
                    Validade: {validadeAte.toLocaleDateString('pt-BR')} ({orc.validade_dias} dias)
                  </div>
                  <div className="no-print mt-1 text-xs text-zinc-500">Status: {orc.status}</div>
                </div>
              </div>

              <div className="orcamento-cliente-os mb-5 text-[11px] leading-relaxed text-black sm:text-sm">
                <div className="mb-1 font-bold text-black">Dados do cliente</div>
                <p className="mb-1">
                  <span className="font-semibold">Nome:</span> {orc.cliente_nome || '—'}{' '}
                  <span className="font-semibold">Telefone:</span> {orc.cliente_telefone || '—'}
                </p>
                <p className="mb-1 break-words">
                  <span className="font-semibold">E-mail:</span> {orc.cliente_email || '—'}
                </p>
                <p className="mb-0">
                  <span className="font-semibold">CPF/CNPJ:</span> {orc.cliente_documento || '—'}{' '}
                  <span className="font-semibold">Endereço:</span>{' '}
                  <span className="whitespace-pre-wrap">{orc.cliente_endereco || '—'}</span>
                </p>
              </div>

              <table className="orcamento-items w-full text-sm border-collapse border border-[#bbb]">
                <thead>
                  <tr className="bg-[#eee]">
                    <th className="col-num border border-[#bbb] px-2 py-2">#</th>
                    <th className="col-desc border border-[#bbb] px-2 py-2 text-left">Descrição</th>
                    <th className="col-tipo border border-[#bbb] px-2 py-2 text-left">Tipo</th>
                    <th className="col-qtd border border-[#bbb] px-2 py-2">Qtd</th>
                    <th className="col-unit border border-[#bbb] px-2 py-2 text-right">Unit.</th>
                    <th className="col-total border border-[#bbb] px-2 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="col-num border border-[#bbb] px-2 py-1.5 text-center align-middle">
                        {idx + 1}
                      </td>
                      <td className="col-desc border border-[#bbb] px-2 py-1.5 align-top">{it.descricao}</td>
                      <td className="col-tipo border border-[#bbb] px-2 py-1.5 align-middle text-xs sm:text-sm">
                        {it.tipo === 'servico' ? 'Serviço' : it.tipo === 'produto' ? 'Produto' : '—'}
                      </td>
                      <td className="col-qtd border border-[#bbb] px-2 py-1.5 text-center align-middle">
                        {it.quantidade}
                      </td>
                      <td className="col-unit border border-[#bbb] px-2 py-1.5 text-right align-middle tabular-nums">
                        {formatBRL(Number(it.valor_unitario))}
                      </td>
                      <td className="col-total border border-[#bbb] px-2 py-1.5 text-right align-middle font-medium tabular-nums">
                        {formatBRL(Number(it.quantidade) * Number(it.valor_unitario))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="orcamento-totais mt-3 w-full text-sm border border-zinc-200 rounded-lg overflow-hidden sm:max-w-xs sm:ml-auto print:border-0 print:rounded-none print:ml-auto">
                <tbody>
                  <tr className="bg-zinc-50/80 print:bg-transparent">
                    <td className="px-3 py-1.5">Subtotal</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatBRL(Number(orc.subtotal))}</td>
                  </tr>
                  <tr className="bg-zinc-50/80 print:bg-transparent">
                    <td className="px-3 py-1.5">Desconto</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatBRL(Number(orc.valor_desconto))}</td>
                  </tr>
                  <tr className="orc-total-row bg-zinc-100 print:bg-transparent">
                    <td className="px-3 py-2 font-semibold">Total</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{formatBRL(Number(orc.total))}</td>
                  </tr>
                </tbody>
              </table>

              <div className="orcamento-pagamento-block mt-6 text-sm">
                <div className="font-semibold text-zinc-900 mb-1">Forma de pagamento</div>
                <div className="text-zinc-800">{labelForma}</div>
              </div>

              {orc.observacoes?.trim() && (
                <div className="orcamento-pagamento-block mt-4 text-sm">
                  <div className="font-semibold text-zinc-900 mb-1">Observações</div>
                  <div className="text-zinc-800 whitespace-pre-wrap leading-relaxed">{orc.observacoes}</div>
                </div>
              )}

              <div className="orcamento-rodape-legal mt-8 pt-3 border-t border-zinc-200 text-center text-[10px] text-zinc-500 print:mt-5">
                Documento sem valor fiscal. Valores e prazo sujeitos à confirmação.
              </div>
            </div>
          </div>
        )}
      </div>
    </MenuLayout>
  );
}

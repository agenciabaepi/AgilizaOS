'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import MenuLayout from '@/components/MenuLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { FiExternalLink, FiPlus, FiRefreshCw } from 'react-icons/fi';

function formatBRL(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(n) ? n : 0
  );
}

function formatData(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

type OrcamentoEmitidoRow = {
  id: string;
  numero: number;
  data_emissao: string;
  cliente_nome: string | null;
  total: number;
  status: string;
  created_at: string;
};

export default function OrcamentosListaPage() {
  const { empresaData, usuarioData } = useAuth();
  const [lista, setLista] = useState<OrcamentoEmitidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroTabela, setErroTabela] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!empresaData?.id) {
      setLista([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErroTabela(null);
    const { data, error } = await supabase
      .from('orcamentos_emitidos')
      .select('id, numero, data_emissao, cliente_nome, total, status, created_at')
      .eq('empresa_id', empresaData.id)
      .order('created_at', { ascending: false });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('does not exist') || msg.includes('schema cache') || (error as { code?: string }).code === '42P01') {
        setErroTabela(
          'As tabelas ainda não existem no banco. Execute o arquivo database/create_orcamentos_emitidos.sql no Supabase.'
        );
      } else {
        setErroTabela(msg);
      }
      setLista([]);
    } else {
      setLista((data as OrcamentoEmitidoRow[]) ?? []);
    }
    setLoading(false);
  }, [empresaData?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!usuarioData) {
    return (
      <MenuLayout>
        <div className="p-8 text-center text-gray-600">Carregando…</div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Orçamentos</h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
              Orçamentos salvos no sistema. Use «Novo» para montar outro.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => carregar()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 text-sm font-medium text-gray-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <Link
              href="/orcamentos/novo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              <FiPlus className="w-4 h-4" />
              Novo orçamento
            </Link>
          </div>
        </div>

        {erroTabela && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            {erroTabela}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-800/80 text-left text-gray-700 dark:text-zinc-300">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Nº</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Total</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Emissão</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-zinc-400">
                      Carregando…
                    </td>
                  </tr>
                ) : lista.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-zinc-400">
                      {erroTabela
                        ? 'Não foi possível carregar a lista.'
                        : 'Nenhum orçamento salvo ainda. Clique em «Novo orçamento» e use «Salvar no sistema» na tela de edição.'}
                    </td>
                  </tr>
                ) : (
                  lista.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 dark:border-zinc-700 hover:bg-gray-50/80 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-zinc-100">{row.numero}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-zinc-200 max-w-[220px] truncate" title={row.cliente_nome || ''}>
                        {row.cliente_nome?.trim() || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatBRL(Number(row.total))}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-zinc-400">
                        {formatData(row.data_emissao)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/orcamentos/${row.id}`}
                          className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Abrir
                          <FiExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MenuLayout>
  );
}

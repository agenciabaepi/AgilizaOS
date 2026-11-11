'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiFileText,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiSlash,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi';
import AuthGuard from '@/components/AuthGuard';
import MenuLayout from '@/components/MenuLayout';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import DashboardCard from '@/components/ui/DashboardCard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabaseClient';
import { fiscalFetch, parseFiscalJson, msgFiscalErro } from '@/lib/api/fiscalFetch';
import {
  abrirDanfeNfcePdf,
  abrirDanfeNfePdf,
  abrirDanfsePdf,
} from '@/lib/fiscal/abrirDanfse';

export type TipoNotaFiscal = 'nfse' | 'nfce' | 'nfe';

type StatusFiltro = 'todas' | 'autorizada' | 'cancelada';

interface NotaBase {
  id: string;
  chave_acesso: string;
  status: string;
  venda_id: string | null;
  ordem_servico_id: string | null;
  created_at: string;
  numero?: number | string | null;
  numero_nfse?: string | null;
  serie?: string | null;
  valor_total?: number | null;
  valor_servico?: number | null;
  tomador_nome?: string | null;
  tomador_documento?: string | null;
  dh_emi?: string | null;
  dh_proc?: string | null;
}

interface VendaOpcao {
  id: string;
  numero_venda: number;
  data_venda: string;
  total: number;
  cliente_nome?: string | null;
}

const META: Record<
  TipoNotaFiscal,
  {
    titulo: string;
    subtitulo: string;
    listPath: string;
    cancelPath: (id: string) => string;
    emitirVendaPath: string;
    numeroLabel: (n: NotaBase) => string;
    valor: (n: NotaBase) => number;
    dataRef: (n: NotaBase) => string;
  }
> = {
  nfse: {
    titulo: 'NFS-e',
    subtitulo: 'Notas fiscais de serviço eletrônicas',
    listPath: '/api/fiscal/nfse',
    cancelPath: (id) => `/api/fiscal/nfse/${id}/cancelar`,
    emitirVendaPath: '/api/fiscal/nfse/emitir-venda',
    numeroLabel: (n) => (n.numero_nfse ? String(n.numero_nfse) : '—'),
    valor: (n) => Number(n.valor_servico ?? 0),
    dataRef: (n) => n.dh_proc || n.created_at,
  },
  nfce: {
    titulo: 'NFC-e',
    subtitulo: 'Cupons fiscais eletrônicos (modelo 65)',
    listPath: '/api/fiscal/nfce',
    cancelPath: (id) => `/api/fiscal/nfce/${id}/cancelar`,
    emitirVendaPath: '/api/fiscal/nfce/emitir-venda',
    numeroLabel: (n) =>
      n.numero != null ? `${n.numero}${n.serie ? `/${n.serie}` : ''}` : '—',
    valor: (n) => Number(n.valor_total ?? 0),
    dataRef: (n) => n.dh_emi || n.created_at,
  },
  nfe: {
    titulo: 'NF-e',
    subtitulo: 'Notas fiscais eletrônicas (modelo 55)',
    listPath: '/api/fiscal/nfe',
    cancelPath: (id) => `/api/fiscal/nfe/${id}/cancelar`,
    emitirVendaPath: '/api/fiscal/nfe/emitir-venda',
    numeroLabel: (n) =>
      n.numero != null ? `${n.numero}${n.serie ? `/${n.serie}` : ''}` : '—',
    valor: (n) => Number(n.valor_total ?? 0),
    dataRef: (n) => n.dh_emi || n.created_at,
  },
};

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'autorizada') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-medium">
        <FiCheckCircle size={12} /> Autorizada
      </span>
    );
  }
  if (s === 'cancelada') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2.5 py-0.5 text-xs font-medium">
        <FiXCircle size={12} /> Cancelada
      </span>
    );
  }
  if (s === 'substituida') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 text-xs font-medium">
        Substituída
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 px-2.5 py-0.5 text-xs font-medium">
      {status || '—'}
    </span>
  );
}

export default function NotasFiscaisPage({ tipo }: { tipo: TipoNotaFiscal }) {
  const meta = META[tipo];
  const { empresaData } = useAuth();
  const { addToast } = useToast();

  const [notas, setNotas] = useState<NotaBase[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('todas');
  const [acaoId, setAcaoId] = useState<string | null>(null);

  const [modalManual, setModalManual] = useState(false);
  const [emitindo, setEmitindo] = useState(false);

  // NFS-e manual (tomador + valor)
  const [tomadorNome, setTomadorNome] = useState('');
  const [tomadorDoc, setTomadorDoc] = useState('');
  const [valorServico, setValorServico] = useState('');
  const [descricao, setDescricao] = useState('');

  // NFC-e / NF-e: escolher venda
  const [vendas, setVendas] = useState<VendaOpcao[]>([]);
  const [vendaId, setVendaId] = useState('');
  const [carregandoVendas, setCarregandoVendas] = useState(false);

  // Cancelamento
  const [cancelarAlvo, setCancelarAlvo] = useState<NotaBase | null>(null);
  const [cancelarJustificativa, setCancelarJustificativa] = useState('');
  const [cancelando, setCancelando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fiscalFetch(`${meta.listPath}?limit=100`);
      const json = await parseFiscalJson(res);
      if (!res.ok) {
        addToast('error', msgFiscalErro(json, 'Não foi possível carregar as notas.'));
        setNotas([]);
        return;
      }
      const list = Array.isArray(json.data) ? (json.data as NotaBase[]) : [];
      setNotas(list);
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Erro ao carregar notas');
      setNotas([]);
    } finally {
      setCarregando(false);
    }
  }, [meta.listPath, addToast]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const carregarVendasDisponiveis = useCallback(async () => {
    if (!empresaData?.id || tipo === 'nfse') return;
    setCarregandoVendas(true);
    try {
      const [{ data: vendasData }, { data: notasExistentes }] = await Promise.all([
        supabase
          .from('vendas')
          .select('id, numero_venda, data_venda, total, cliente_id, cliente:cliente_id(nome)')
          .eq('empresa_id', empresaData.id)
          .order('data_venda', { ascending: false })
          .limit(80),
        supabase
          .from(tipo === 'nfce' ? 'fiscal_nfce' : 'fiscal_nfe')
          .select('venda_id')
          .eq('empresa_id', empresaData.id)
          .eq('status', 'autorizada')
          .not('venda_id', 'is', null),
      ]);

      const ocupadas = new Set(
        (notasExistentes || []).map((n: { venda_id: string }) => n.venda_id).filter(Boolean)
      );

      const opcoes: VendaOpcao[] = (vendasData || [])
        .filter((v: { id: string }) => !ocupadas.has(v.id))
        .map((v: any) => ({
          id: v.id,
          numero_venda: v.numero_venda,
          data_venda: v.data_venda,
          total: Number(v.total || 0),
          cliente_nome: v.cliente?.nome ?? null,
        }));

      setVendas(opcoes);
      setVendaId(opcoes[0]?.id || '');
    } catch {
      setVendas([]);
      setVendaId('');
    } finally {
      setCarregandoVendas(false);
    }
  }, [empresaData?.id, tipo]);

  const abrirManual = () => {
    setTomadorNome('');
    setTomadorDoc('');
    setValorServico('');
    setDescricao('');
    setVendaId('');
    setModalManual(true);
    if (tipo !== 'nfse') void carregarVendasDisponiveis();
  };

  const notasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return notas.filter((n) => {
      const st = (n.status || '').toLowerCase();
      if (statusFiltro === 'autorizada' && st !== 'autorizada') return false;
      if (statusFiltro === 'cancelada' && st !== 'cancelada' && st !== 'substituida') return false;
      if (!q) return true;
      const num = meta.numeroLabel(n).toLowerCase();
      const chave = (n.chave_acesso || '').toLowerCase();
      const tomador = `${n.tomador_nome || ''} ${n.tomador_documento || ''}`.toLowerCase();
      return num.includes(q) || chave.includes(q) || tomador.includes(q);
    });
  }, [notas, busca, statusFiltro, meta]);

  const stats = useMemo(() => {
    const autorizadas = notas.filter((n) => n.status === 'autorizada');
    const canceladas = notas.filter(
      (n) => n.status === 'cancelada' || n.status === 'substituida'
    );
    const totalAut = autorizadas.reduce((acc, n) => acc + meta.valor(n), 0);
    return {
      total: notas.length,
      autorizadas: autorizadas.length,
      canceladas: canceladas.length,
      valorAutorizadas: totalAut,
    };
  }, [notas, meta]);

  const imprimir = async (nota: NotaBase) => {
    setAcaoId(nota.id);
    try {
      const r =
        tipo === 'nfse'
          ? await abrirDanfsePdf(nota.id, { autoPrint: true, formato: 'a4' })
          : tipo === 'nfce'
            ? await abrirDanfeNfcePdf(nota.id, { autoPrint: true })
            : await abrirDanfeNfePdf(nota.id, { autoPrint: true });
      if (!r.ok) addToast('error', r.error);
    } finally {
      setAcaoId(null);
    }
  };

  const confirmarCancelar = async () => {
    if (!cancelarAlvo) return;
    const xJust = cancelarJustificativa.replace(/\s+/g, ' ').trim();
    if (xJust.length < 15) {
      addToast('error', 'A justificativa deve ter no mínimo 15 caracteres.');
      return;
    }
    setCancelando(true);
    try {
      const res = await fiscalFetch(meta.cancelPath(cancelarAlvo.id), {
        method: 'POST',
        body: JSON.stringify({ xJust, xMotivo: xJust, justificativa: xJust }),
      });
      const json = await parseFiscalJson(res);
      if (!res.ok || json.ok === false) {
        addToast('error', msgFiscalErro(json, 'Não foi possível cancelar a nota.'));
        return;
      }
      addToast('success', `${meta.titulo} cancelada com sucesso.`);
      setCancelarAlvo(null);
      setCancelarJustificativa('');
      await carregar();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Erro ao cancelar');
    } finally {
      setCancelando(false);
    }
  };

  const emitirManual = async () => {
    setEmitindo(true);
    try {
      if (tipo === 'nfse') {
        const valor = Number(String(valorServico).replace(',', '.'));
        if (!tomadorNome.trim() || !tomadorDoc.trim()) {
          addToast('error', 'Informe nome e CPF/CNPJ do tomador.');
          return;
        }
        if (!valor || valor <= 0) {
          addToast('error', 'Informe um valor de serviço válido.');
          return;
        }
        const res = await fiscalFetch('/api/fiscal/nfse/emitir', {
          method: 'POST',
          body: JSON.stringify({
            valorServico: valor,
            descricao: descricao.trim() || undefined,
            tomador: {
              documento: tomadorDoc.replace(/\D/g, ''),
              nome: tomadorNome.trim(),
            },
          }),
        });
        const json = await parseFiscalJson(res);
        if (!res.ok || json.ok === false) {
          addToast('error', msgFiscalErro(json, 'Falha ao emitir NFS-e.'));
          return;
        }
        addToast('success', 'NFS-e autorizada.');
        if (json.nfseId) {
          await abrirDanfsePdf(String(json.nfseId), { autoPrint: true, formato: 'a4' });
        }
      } else {
        if (!vendaId) {
          addToast('error', 'Selecione uma venda para emitir a nota.');
          return;
        }
        const res = await fiscalFetch(meta.emitirVendaPath, {
          method: 'POST',
          body: JSON.stringify({ vendaId }),
        });
        const json = await parseFiscalJson(res);
        if (!res.ok || json.ok === false) {
          addToast('error', msgFiscalErro(json, `Falha ao emitir ${meta.titulo}.`));
          return;
        }
        addToast('success', `${meta.titulo} autorizada.`);
        const id =
          tipo === 'nfce'
            ? String(json.nfceId || '')
            : String(json.nfeId || '');
        if (id) {
          if (tipo === 'nfce') await abrirDanfeNfcePdf(id, { autoPrint: true });
          else await abrirDanfeNfePdf(id, { autoPrint: true });
        }
      }
      setModalManual(false);
      await carregar();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Erro ao emitir');
    } finally {
      setEmitindo(false);
    }
  };

  return (
    <AuthGuard>
      <MenuLayout>
        <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiFileText className="opacity-80" />
                {meta.titulo}
              </h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
                {meta.subtitulo}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void carregar()}
                disabled={carregando}
                className="inline-flex items-center gap-2"
              >
                <FiRefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
                Atualizar
              </Button>
              <Button
                type="button"
                onClick={abrirManual}
                className="inline-flex items-center gap-2"
              >
                <FiPlus size={16} />
                Nova {meta.titulo}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <DashboardCard title="Total" value={stats.total} icon={<FiFileText />} />
            <DashboardCard
              title="Autorizadas"
              value={stats.autorizadas}
              icon={<FiCheckCircle />}
              colorClass="text-emerald-600 dark:text-emerald-400"
            />
            <DashboardCard
              title="Canceladas"
              value={stats.canceladas}
              icon={<FiXCircle />}
              colorClass="text-red-600 dark:text-red-400"
            />
            <DashboardCard
              title="Valor autorizadas"
              value={formatMoney(stats.valorAutorizadas)}
              icon={<FiFileText />}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por número, chave ou tomador…"
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-gray-200 dark:border-zinc-700 p-1 bg-white dark:bg-zinc-900">
              {(
                [
                  ['todas', 'Todas'],
                  ['autorizada', 'Emitidas'],
                  ['cancelada', 'Canceladas'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFiltro(key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    statusFiltro === key
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-left text-gray-500 dark:text-zinc-400">
                    <th className="px-4 py-3 font-medium">Número</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    {tipo === 'nfse' && (
                      <th className="px-4 py-3 font-medium">Tomador</th>
                    )}
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Vínculo</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr>
                      <td
                        colSpan={tipo === 'nfse' ? 7 : 6}
                        className="px-4 py-10 text-center text-gray-400"
                      >
                        Carregando…
                      </td>
                    </tr>
                  ) : notasFiltradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tipo === 'nfse' ? 7 : 6}
                        className="px-4 py-10 text-center text-gray-400"
                      >
                        Nenhuma nota encontrada.
                      </td>
                    </tr>
                  ) : (
                    notasFiltradas.map((n) => (
                      <tr
                        key={n.id}
                        className="border-b border-gray-50 dark:border-zinc-800/80 hover:bg-gray-50/80 dark:hover:bg-zinc-800/40"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {meta.numeroLabel(n)}
                          </div>
                          <div
                            className="text-[11px] text-gray-400 font-mono truncate max-w-[180px]"
                            title={n.chave_acesso}
                          >
                            {n.chave_acesso}
                          </div>
                        </td>
                        <td className="px-4 py-3">{statusBadge(n.status)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatMoney(meta.valor(n))}
                        </td>
                        {tipo === 'nfse' && (
                          <td className="px-4 py-3">
                            <div className="text-gray-900 dark:text-zinc-100">
                              {n.tomador_nome || '—'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {n.tomador_documento || ''}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-zinc-300">
                          {formatDate(meta.dataRef(n))}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-zinc-300">
                          {n.venda_id ? (
                            <Link
                              href="/financeiro/vendas"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Venda
                            </Link>
                          ) : n.ordem_servico_id ? (
                            <Link
                              href={`/ordens/${n.ordem_servico_id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              O.S.
                            </Link>
                          ) : (
                            <span className="text-gray-400">Manual</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              title="Imprimir"
                              disabled={acaoId === n.id}
                              onClick={() => void imprimir(n)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                            >
                              <FiPrinter size={16} />
                            </button>
                            {n.status === 'autorizada' && (
                              <button
                                type="button"
                                title="Cancelar"
                                onClick={() => {
                                  setCancelarAlvo(n);
                                  setCancelarJustificativa('');
                                }}
                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <FiSlash size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {modalManual && (
          <Dialog onClose={() => !emitindo && setModalManual(false)} className="w-full max-w-md p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 pr-8">
              Nova {meta.titulo}
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
              {tipo === 'nfse'
                ? 'Emissão manual com dados do tomador (SEFIN Nacional).'
                : `Selecione uma venda sem ${meta.titulo} autorizada para emitir.`}
            </p>

            {tipo === 'nfse' ? (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="text-gray-600 dark:text-zinc-400 mb-1 block">
                    Nome do tomador
                  </span>
                  <input
                    value={tomadorNome}
                    onChange={(e) => setTomadorNome(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600 dark:text-zinc-400 mb-1 block">CPF/CNPJ</span>
                  <input
                    value={tomadorDoc}
                    onChange={(e) => setTomadorDoc(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600 dark:text-zinc-400 mb-1 block">Valor (R$)</span>
                  <input
                    value={valorServico}
                    onChange={(e) => setValorServico(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                    placeholder="0,00"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600 dark:text-zinc-400 mb-1 block">
                    Descrição (opcional)
                  </span>
                  <input
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {carregandoVendas ? (
                  <p className="text-sm text-gray-400">Carregando vendas…</p>
                ) : vendas.length === 0 ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                    Não há vendas disponíveis sem {meta.titulo} autorizada. Emita a partir de{' '}
                    <Link href="/financeiro/vendas" className="underline font-medium">
                      Vendas
                    </Link>
                    .
                  </p>
                ) : (
                  <label className="block text-sm">
                    <span className="text-gray-600 dark:text-zinc-400 mb-1 block">Venda</span>
                    <select
                      value={vendaId}
                      onChange={(e) => setVendaId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                    >
                      {vendas.map((v) => (
                        <option key={v.id} value={v.id}>
                          #{v.numero_venda} · {formatMoney(v.total)}
                          {v.cliente_nome ? ` · ${v.cliente_nome}` : ''} ·{' '}
                          {formatDate(v.data_venda)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <Button
                type="button"
                variant="secondary"
                disabled={emitindo}
                onClick={() => setModalManual(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={
                  emitindo || (tipo !== 'nfse' && (carregandoVendas || !vendaId || vendas.length === 0))
                }
                onClick={() => void emitirManual()}
              >
                {emitindo ? 'Emitindo…' : `Emitir ${meta.titulo}`}
              </Button>
            </div>
          </Dialog>
        )}

        {cancelarAlvo && (
          <Dialog
            onClose={() => !cancelando && setCancelarAlvo(null)}
            className="w-full max-w-md p-5"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 pr-8">
              Cancelar {meta.titulo}
              {meta.numeroLabel(cancelarAlvo) !== '—'
                ? ` nº ${meta.numeroLabel(cancelarAlvo)}`
                : ''}
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3">
              Justificativa obrigatória (mín. 15 caracteres). Em SP, o prazo usual para NF-e/NFC-e
              é de até 24 horas após a autorização.
            </p>
            <textarea
              value={cancelarJustificativa}
              onChange={(e) => setCancelarJustificativa(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              placeholder="Motivo do cancelamento…"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={cancelando}
                onClick={() => setCancelarAlvo(null)}
              >
                Voltar
              </Button>
              <Button
                type="button"
                disabled={cancelando || cancelarJustificativa.trim().length < 15}
                onClick={() => void confirmarCancelar()}
                className="!bg-red-600 hover:!bg-red-700 text-white"
              >
                {cancelando ? 'Cancelando…' : 'Confirmar cancelamento'}
              </Button>
            </div>
          </Dialog>
        )}
      </MenuLayout>
    </AuthGuard>
  );
}

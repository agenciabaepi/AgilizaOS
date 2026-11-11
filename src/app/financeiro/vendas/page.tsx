"use client";
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MenuLayout from '@/components/MenuLayout';
import AuthGuard from '@/components/AuthGuard';
import { CupomVenda } from '@/components/CupomVenda';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import DashboardCard from '@/components/ui/DashboardCard';
import { useAuth } from '@/context/AuthContext';
import {
  FiPrinter,
  FiDollarSign,
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
  FiCalendar,
  FiFileText,
  FiMoreVertical,
  FiSearch,
  FiX,
} from 'react-icons/fi';
import { useSnapshotFinanceiro } from '@/hooks/useSnapshotFinanceiro';
import { parseProdutosVenda } from '@/utils/normalizarItemCupom';
import { extrairNumeroOSDaObservacao } from '@/utils/extrairNumeroOSDaObservacao';
import {
  abrirDanfeNfcePdf,
  abrirDanfeNfePdf,
  abrirDanfsePdf,
  abrirNotasConjuntasPdf,
} from '@/lib/fiscal/abrirDanfse';
import { fiscalFetch, parseFiscalJson, msgFiscalErro } from '@/lib/api/fiscalFetch';
import { useToast as useToastUi } from '@/components/Toast';

interface VendaItem {
  id: string;
  nome: string;
  preco: number;
  qtd: number;
  codigo_barras?: string;
}

interface Cliente {
  nome: string;
  telefone?: string;
  celular?: string;
  numero_cliente: string;
}

interface NfseInfo {
  id: string;
  chave_acesso: string;
  numero_nfse: string | null;
  status: string;
}

interface NfceInfo {
  id: string;
  chave_acesso: string;
  numero: number | null;
  status: string;
}

interface NfeInfo {
  id: string;
  chave_acesso: string;
  numero: number | null;
  status: string;
}

interface Venda {
  id: string;
  numero_venda: number;
  data_venda: string;
  cliente_id: string | null;
  total: number;
  forma_pagamento: string;
  status: string;
  desconto: number;
  acrescimo: number;
  tipo_pedido: string;
  observacoes?: string | null;
  numero_os?: string | null;
  cliente_nome?: string;
  cliente?: Cliente;
  itens?: VendaItem[];
  nfse?: NfseInfo | null;
  nfce?: NfceInfo | null;
  nfe?: NfeInfo | null;
  nfce_emitida?: boolean;
}

interface DashboardMetrics {
  totalVendas: number;
  faturamento: number;
  ticketMedio: number;
  quantidadeVendas: number;
  clientesUnicos: number;
  crescimento: number;
}

type FiltroTipo = 'hoje' | 'semana' | 'mes' | 'personalizado' | 'todas';

function normBusca(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchValorBusca(total: number, termo: string): boolean {
  const bruto = termo.replace(/[^\d,.-]/g, '').replace(',', '.');
  if (!bruto) return false;
  const n = Number(bruto);
  if (!Number.isFinite(n)) return false;
  if (Math.abs(total - n) < 0.005) return true;
  const fmt = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const termoNorm = normBusca(termo);
  return (
    fmt.includes(termo.replace(/[^\d,]/g, '')) ||
    String(total).includes(bruto) ||
    normBusca(`R$ ${fmt}`).includes(termoNorm)
  );
}

export default function ListaVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendasFiltradas, setVendasFiltradas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImprimir, setModalImprimir] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [loadingCupom, setLoadingCupom] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroTipo>('hoje');
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalVendas: 0,
    faturamento: 0,
    ticketMedio: 0,
    quantidadeVendas: 0,
    clientesUnicos: 0,
    crescimento: 0
  });
  const { empresaData, temRecurso } = useAuth();
  const { addToast: pushToast, showModal } = useToastUi();
  const addToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => pushToast(type, message);
  const alertarErroFiscal = (titulo: string, mensagem: string) => {
    addToast(mensagem, 'error');
    showModal({
      title: titulo,
      message: mensagem,
      type: 'error',
      confirmLabel: 'Entendi',
    });
  };
  const podeNotaFiscal = temRecurso('nota_fiscal');
  const [emitindoVendaId, setEmitindoVendaId] = useState<string | null>(null);
  const [erroEmissaoFiscal, setErroEmissaoFiscal] = useState<string | null>(null);
  const [modalNfseVenda, setModalNfseVenda] = useState(false);
  const [vendaNfsePreview, setVendaNfsePreview] = useState<Venda | null>(null);
  const [previewNfse, setPreviewNfse] = useState<{
    loading: boolean;
    clienteNome: string;
    documento: string;
    totalServico: number;
    totalPeca: number;
    descontoNoServico: number;
    valorNfse: number;
    numeroOs: string;
    erro?: string;
  } | null>(null);
  const [modalNfceVenda, setModalNfceVenda] = useState(false);
  const [vendaNfcePreview, setVendaNfcePreview] = useState<Venda | null>(null);
  const [previewNfce, setPreviewNfce] = useState<{
    loading: boolean;
    clienteNome: string;
    documento: string;
    peca: string;
    totalServico: number;
    totalPeca: number;
    descontoNaPeca: number;
    valorNfce: number;
    numeroOs: string;
    erro?: string;
  } | null>(null);
  const [modalAmbasVenda, setModalAmbasVenda] = useState(false);
  const [menuAcoesId, setMenuAcoesId] = useState<string | null>(null);
  const [menuAcoesPos, setMenuAcoesPos] = useState<{
    top: number;
    right: number;
    openUp: boolean;
  } | null>(null);
  const [vendaAmbasPreview, setVendaAmbasPreview] = useState<Venda | null>(null);
  const [previewAmbas, setPreviewAmbas] = useState<{
    loading: boolean;
    clienteNome: string;
    documento: string;
    peca: string;
    totalServico: number;
    totalPeca: number;
    descontoNoServico: number;
    descontoNaPeca: number;
    valorNfse: number;
    valorNfce: number;
    numeroOs: string;
    emitirNfse: boolean;
    emitirNfce: boolean;
    erro?: string;
  } | null>(null);

  // Calcular datas para lucro do dia e da semana usando useMemo
  const { dataInicioDia, dataFimDia, dataInicioSemana, dataFimSemana } = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeFim = new Date();
    hojeFim.setHours(23, 59, 59, 999);
    
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const fimSemana = new Date();
    fimSemana.setHours(23, 59, 59, 999);

    return {
      dataInicioDia: hoje.toISOString().split('T')[0],
      dataFimDia: hojeFim.toISOString().split('T')[0],
      dataInicioSemana: inicioSemana.toISOString().split('T')[0],
      dataFimSemana: fimSemana.toISOString().split('T')[0]
    };
  }, []);

  // Buscar snapshot financeiro do dia
  const { snapshot: snapshotDia, loading: loadingDia } = useSnapshotFinanceiro(
    dataInicioDia,
    dataFimDia
  );

  // Buscar snapshot financeiro da semana
  const { snapshot: snapshotSemana, loading: loadingSemana } = useSnapshotFinanceiro(
    dataInicioSemana,
    dataFimSemana
  );

  useEffect(() => {
    async function fetchVendas() {
      if (!empresaData?.id) return;
      
      setLoading(true);
      const { data } = await supabase
        .from('vendas')
        .select(`
          id,
          numero_venda,
          data_venda, 
          cliente_id, 
          total, 
          forma_pagamento, 
          status, 
          desconto, 
          acrescimo, 
          tipo_pedido,
          observacoes,
          empresa_id,
          cliente:cliente_id(nome, telefone, celular, numero_cliente)
        `)
        .eq('empresa_id', empresaData.id)
        .order('data_venda', { ascending: false });

      const vendasBase = (data || []).map((v: any) => ({
        ...v,
        cliente_nome: v.cliente?.nome || '---',
        numero_os: extrairNumeroOSDaObservacao(v.observacoes),
        nfse: null as NfseInfo | null,
        nfce: null as NfceInfo | null,
        nfe: null as NfeInfo | null,
      }));

      if (podeNotaFiscal && vendasBase.length > 0) {
        const [{ data: notas }, { data: cupons }, { data: notas55 }] = await Promise.all([
          supabase
            .from('fiscal_nfse')
            .select('id, venda_id, ordem_servico_id, chave_acesso, numero_nfse, status')
            .eq('empresa_id', empresaData.id)
            .eq('status', 'autorizada'),
          supabase
            .from('fiscal_nfce')
            .select('id, venda_id, ordem_servico_id, chave_acesso, numero, status')
            .eq('empresa_id', empresaData.id)
            .eq('status', 'autorizada'),
          supabase
            .from('fiscal_nfe')
            .select('id, venda_id, ordem_servico_id, chave_acesso, numero, status')
            .eq('empresa_id', empresaData.id)
            .eq('status', 'autorizada'),
        ]);

        const porVenda = new Map<string, NfseInfo>();
        const porOsId = new Map<string, NfseInfo>();
        for (const n of notas || []) {
          const info: NfseInfo = {
            id: n.id,
            chave_acesso: n.chave_acesso,
            numero_nfse: n.numero_nfse,
            status: n.status,
          };
          if (n.venda_id) porVenda.set(n.venda_id, info);
          if (n.ordem_servico_id) porOsId.set(n.ordem_servico_id, info);
        }

        const nfcePorVenda = new Map<string, NfceInfo>();
        const nfcePorOsId = new Map<string, NfceInfo>();
        for (const n of cupons || []) {
          const info: NfceInfo = {
            id: n.id,
            chave_acesso: n.chave_acesso,
            numero: n.numero,
            status: n.status,
          };
          if (n.venda_id) nfcePorVenda.set(n.venda_id, info);
          if (n.ordem_servico_id) nfcePorOsId.set(n.ordem_servico_id, info);
        }

        const nfePorVenda = new Map<string, NfeInfo>();
        const nfePorOsId = new Map<string, NfeInfo>();
        for (const n of notas55 || []) {
          const info: NfeInfo = {
            id: n.id,
            chave_acesso: n.chave_acesso,
            numero: n.numero,
            status: n.status,
          };
          if (n.venda_id) nfePorVenda.set(n.venda_id, info);
          if (n.ordem_servico_id) nfePorOsId.set(n.ordem_servico_id, info);
        }

        const numerosOs = [
          ...new Set(
            vendasBase
              .map((v) => v.numero_os)
              .filter((n): n is string => Boolean(n))
          ),
        ];
        const osIdPorNumero = new Map<string, string>();
        if (
          numerosOs.length > 0 &&
          (porOsId.size > 0 || nfcePorOsId.size > 0 || nfePorOsId.size > 0)
        ) {
          const { data: oss } = await supabase
            .from('ordens_servico')
            .select('id, numero_os')
            .eq('empresa_id', empresaData.id)
            .in(
              'numero_os',
              numerosOs.map((n) => Number(n)).filter((n) => Number.isFinite(n))
            );
          for (const os of oss || []) {
            osIdPorNumero.set(String(os.numero_os), os.id);
          }
        }

        for (const v of vendasBase) {
          const osId = v.numero_os ? osIdPorNumero.get(v.numero_os) : undefined;
          v.nfse =
            porVenda.get(v.id) ||
            (osId ? porOsId.get(osId) || null : null);
          v.nfce =
            nfcePorVenda.get(v.id) ||
            (osId ? nfcePorOsId.get(osId) || null : null);
          v.nfe =
            nfePorVenda.get(v.id) ||
            (osId ? nfePorOsId.get(osId) || null : null);
        }
      }

      setVendas(vendasBase);
      setLoading(false);
    }
    fetchVendas();
  }, [empresaData?.id, podeNotaFiscal]);

  useEffect(() => {
    filtrarVendas();
  }, [vendas, filtroAtivo, dataInicio, dataFim, busca]);

  const abrirConfirmacaoNfse = async (venda: Venda) => {
    if (!venda.numero_os || !empresaData?.id) {
      addToast('Só é possível emitir NFS-e de vendas vinculadas a uma O.S.', 'error');
      return;
    }
    setVendaNfsePreview(venda);
    setModalNfseVenda(true);
    setErroEmissaoFiscal(null);
    setPreviewNfse({
      loading: true,
      clienteNome: venda.cliente_nome || '—',
      documento: '—',
      totalServico: 0,
      totalPeca: 0,
      descontoNoServico: 0,
      valorNfse: 0,
      numeroOs: venda.numero_os,
    });

    const { data: os, error } = await supabase
      .from('ordens_servico')
      .select(
        `
        numero_os,
        valor_servico,
        qtd_servico,
        valor_peca,
        qtd_peca,
        desconto,
        cliente:cliente_id (nome, cpf, documento)
      `
      )
      .eq('empresa_id', empresaData.id)
      .eq('numero_os', Number(venda.numero_os))
      .maybeSingle();

    if (error || !os) {
      setPreviewNfse({
        loading: false,
        clienteNome: venda.cliente_nome || '—',
        documento: '—',
        totalServico: 0,
        totalPeca: 0,
        descontoNoServico: 0,
        valorNfse: 0,
        numeroOs: venda.numero_os,
        erro: 'Não foi possível carregar os valores da O.S.',
      });
      return;
    }

    const cliente = Array.isArray(os.cliente) ? os.cliente[0] : os.cliente;
    const totalServico = Number(os.valor_servico || 0) * (Number(os.qtd_servico || 1) || 1);
    const totalPeca = Number(os.valor_peca || 0) * (Number(os.qtd_peca || 1) || 1);
    const desconto = Math.max(0, Number(os.desconto || 0));
    const bruto = totalServico + totalPeca;
    const descontoNoServico =
      bruto > 0 ? Math.min(totalServico, desconto * (totalServico / bruto)) : 0;
    const valorNfse = Math.round((totalServico - descontoNoServico) * 100) / 100;

    setPreviewNfse({
      loading: false,
      clienteNome: cliente?.nome || venda.cliente_nome || '—',
      documento: cliente?.documento || cliente?.cpf || '—',
      totalServico,
      totalPeca,
      descontoNoServico,
      valorNfse,
      numeroOs: String(os.numero_os),
      erro: valorNfse <= 0 ? 'Esta O.S. não tem valor de serviço para emitir NFS-e.' : undefined,
    });
  };

  const confirmarEmitirNfseVenda = async () => {
    const venda = vendaNfsePreview;
    if (!venda) return;
    setEmitindoVendaId(venda.id);
    setErroEmissaoFiscal(null);
    try {
      const res = await fiscalFetch('/api/fiscal/nfse/emitir-venda', {
        method: 'POST',
        body: JSON.stringify({ vendaId: venda.id }),
      });
      const json = await res.json().catch(() => ({}));

      if (json.status === 'ja_emitida' && json.nfse) {
        const nf: NfseInfo = {
          id: json.nfse.id,
          chave_acesso: json.nfse.chave_acesso,
          numero_nfse: json.nfse.numero_nfse,
          status: json.nfse.status || 'autorizada',
        };
        setVendas((prev) => prev.map((v) => (v.id === venda.id ? { ...v, nfse: nf } : v)));
        setModalNfseVenda(false);
        addToast(json.message || 'NFS-e já emitida. Abrindo impressão…', 'info');
        const print = await abrirDanfsePdf(nf.id, { autoPrint: true });
        if (!print.ok) addToast(print.error, 'error');
        return;
      }

      if (!res.ok || json.ok === false) {
        const msg = msgFiscalErro(json, 'Falha ao emitir NFS-e');
        setErroEmissaoFiscal(msg);
        addToast(msg, 'error');
        return;
      }

      if (json.status === 'autorizada' && json.nfseId) {
        const nf: NfseInfo = {
          id: json.nfseId,
          chave_acesso: json.chaveAcesso,
          numero_nfse: json.numeroNfse,
          status: 'autorizada',
        };
        setVendas((prev) => prev.map((v) => (v.id === venda.id ? { ...v, nfse: nf } : v)));
        setModalNfseVenda(false);
        addToast(
          `NFS-e autorizada${json.numeroNfse ? ` nº ${json.numeroNfse}` : ''}. Abrindo impressão…`,
          'success'
        );
        const print = await abrirDanfsePdf(json.nfseId, { autoPrint: true });
        if (!print.ok) addToast(print.error, 'error');
      } else if (json.status === 'pendente') {
        addToast(json.message || 'Emissão pendente de reenvio à SEFIN.', 'warning');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao emitir NFS-e';
      setErroEmissaoFiscal(msg);
      addToast(msg, 'error');
    } finally {
      setEmitindoVendaId(null);
    }
  };

  const abrirConfirmacaoNfce = async (venda: Venda) => {
    if (!venda.numero_os || !empresaData?.id) {
      addToast('Só é possível emitir NFC-e de vendas vinculadas a uma O.S.', 'error');
      return;
    }
    setVendaNfcePreview(venda);
    setModalNfceVenda(true);
    setErroEmissaoFiscal(null);
    setPreviewNfce({
      loading: true,
      clienteNome: venda.cliente_nome || '—',
      documento: '—',
      peca: '—',
      totalServico: 0,
      totalPeca: 0,
      descontoNaPeca: 0,
      valorNfce: 0,
      numeroOs: venda.numero_os,
    });

    const { data: os, error } = await supabase
      .from('ordens_servico')
      .select(
        `
        numero_os,
        peca,
        valor_servico,
        qtd_servico,
        valor_peca,
        qtd_peca,
        desconto,
        cliente:cliente_id (nome, cpf, documento)
      `
      )
      .eq('empresa_id', empresaData.id)
      .eq('numero_os', Number(venda.numero_os))
      .maybeSingle();

    if (error || !os) {
      setPreviewNfce({
        loading: false,
        clienteNome: venda.cliente_nome || '—',
        documento: '—',
        peca: '—',
        totalServico: 0,
        totalPeca: 0,
        descontoNaPeca: 0,
        valorNfce: 0,
        numeroOs: venda.numero_os,
        erro: 'Não foi possível carregar os valores da O.S.',
      });
      return;
    }

    const cliente = Array.isArray(os.cliente) ? os.cliente[0] : os.cliente;
    const totalServico = Number(os.valor_servico || 0) * (Number(os.qtd_servico || 1) || 1);
    const totalPeca = Number(os.valor_peca || 0) * (Number(os.qtd_peca || 1) || 1);
    const desconto = Math.max(0, Number(os.desconto || 0));
    const bruto = totalServico + totalPeca;
    const descontoNaPeca =
      bruto > 0 ? Math.min(totalPeca, desconto * (totalPeca / bruto)) : 0;
    const valorNfce = Math.round((totalPeca - descontoNaPeca) * 100) / 100;

    setPreviewNfce({
      loading: false,
      clienteNome: cliente?.nome || venda.cliente_nome || '—',
      documento: cliente?.documento || cliente?.cpf || '—',
      peca: String(os.peca || '—'),
      totalServico,
      totalPeca,
      descontoNaPeca,
      valorNfce,
      numeroOs: String(os.numero_os),
      erro: valorNfce <= 0 ? 'Esta O.S. não tem valor de peças para emitir NFC-e.' : undefined,
    });
  };

  const confirmarEmitirNfceVenda = async () => {
    const venda = vendaNfcePreview;
    if (!venda) return;
    setEmitindoVendaId(venda.id);
    setErroEmissaoFiscal(null);
    try {
      const res = await fiscalFetch('/api/fiscal/nfce/emitir-venda', {
        method: 'POST',
        body: JSON.stringify({ vendaId: venda.id }),
      });
      const json = await parseFiscalJson(res);
      const nfceJa = json.nfce as NfceInfo | undefined;

      if (json.status === 'ja_emitida' && nfceJa) {
        const nf: NfceInfo = {
          id: nfceJa.id,
          chave_acesso: nfceJa.chave_acesso,
          numero: nfceJa.numero,
          status: nfceJa.status || 'autorizada',
        };
        setVendas((prev) => prev.map((v) => (v.id === venda.id ? { ...v, nfce: nf } : v)));
        setModalNfceVenda(false);
        addToast(String(json.message || 'NFC-e já emitida. Abrindo impressão…'), 'info');
        if (nf.id) {
          const print = await abrirDanfeNfcePdf(nf.id, { autoPrint: true });
          if (!print.ok) addToast(print.error, 'error');
        }
        return;
      }

      if (!res.ok || json.ok === false) {
        const msg = msgFiscalErro(json, 'Falha ao emitir NFC-e');
        setErroEmissaoFiscal(msg);
        alertarErroFiscal('Falha ao emitir NFC-e', msg);
        return;
      }

      if (json.status === 'autorizada') {
        const nf: NfceInfo = {
          id: String(json.nfceId || ''),
          chave_acesso: String(json.chaveAcesso || ''),
          numero: Number(json.numero) || null,
          status: 'autorizada',
        };
        setVendas((prev) => prev.map((v) => (v.id === venda.id ? { ...v, nfce: nf } : v)));
        setModalNfceVenda(false);
        addToast(
          `NFC-e autorizada${json.numero ? ` nº ${json.numero}` : ''}. Abrindo impressão…`,
          'success'
        );
        if (json.nfceId) {
          const print = await abrirDanfeNfcePdf(String(json.nfceId), { autoPrint: true });
          if (!print.ok) addToast(print.error, 'error');
        }
      } else {
        const msg = msgFiscalErro(json, 'Resposta inesperada ao emitir NFC-e');
        setErroEmissaoFiscal(msg);
        alertarErroFiscal('Falha ao emitir NFC-e', msg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao emitir NFC-e';
      setErroEmissaoFiscal(msg);
      alertarErroFiscal('Falha ao emitir NFC-e', msg);
    } finally {
      setEmitindoVendaId(null);
    }
  };

  const emitirNfeVendaDireto = async (venda: Venda) => {
    if (!venda.numero_os) {
      alertarErroFiscal(
        'Não foi possível emitir NF-e',
        'Só é possível emitir NF-e de vendas vinculadas a uma O.S.'
      );
      return;
    }
    setEmitindoVendaId(venda.id);
    setErroEmissaoFiscal(null);
    try {
      const res = await fiscalFetch('/api/fiscal/nfe/emitir-venda', {
        method: 'POST',
        body: JSON.stringify({ vendaId: venda.id }),
      });
      const json = await parseFiscalJson(res);
      const nfeJa = json.nfe as NfeInfo | undefined;

      if (json.status === 'ja_emitida' && nfeJa) {
        const nf: NfeInfo = {
          id: nfeJa.id,
          chave_acesso: nfeJa.chave_acesso,
          numero: nfeJa.numero,
          status: nfeJa.status || 'autorizada',
        };
        setVendas((prev) => prev.map((v) => (v.id === venda.id ? { ...v, nfe: nf } : v)));
        addToast(String(json.message || 'NF-e já emitida. Abrindo DANFE…'), 'info');
        if (nf.id) {
          const print = await abrirDanfeNfePdf(nf.id, { autoPrint: true });
          if (!print.ok) addToast(print.error, 'error');
        }
        return;
      }

      if (!res.ok || json.ok === false) {
        const msg = msgFiscalErro(json, 'Falha ao emitir NF-e');
        setErroEmissaoFiscal(msg);
        alertarErroFiscal('Falha ao emitir NF-e', msg);
        return;
      }

      if (json.status === 'autorizada') {
        const nf: NfeInfo = {
          id: String(json.nfeId || ''),
          chave_acesso: String(json.chaveAcesso || ''),
          numero: Number(json.numero) || null,
          status: 'autorizada',
        };
        setVendas((prev) => prev.map((v) => (v.id === venda.id ? { ...v, nfe: nf } : v)));
        addToast(
          `NF-e autorizada${json.numero ? ` nº ${json.numero}` : ''}. Abrindo DANFE A4…`,
          'success'
        );
        if (json.nfeId) {
          const print = await abrirDanfeNfePdf(String(json.nfeId), { autoPrint: true });
          if (!print.ok) addToast(print.error, 'error');
        }
      } else {
        const msg = msgFiscalErro(json, 'Resposta inesperada ao emitir NF-e');
        alertarErroFiscal('Falha ao emitir NF-e', msg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao emitir NF-e';
      alertarErroFiscal('Falha ao emitir NF-e', msg);
    } finally {
      setEmitindoVendaId(null);
    }
  };

  const abrirConfirmacaoAmbas = async (venda: Venda) => {
    if (!venda.numero_os || !empresaData?.id) {
      addToast('Só é possível emitir notas de vendas vinculadas a uma O.S.', 'error');
      return;
    }
    setVendaAmbasPreview(venda);
    setModalAmbasVenda(true);
    setErroEmissaoFiscal(null);
    setPreviewAmbas({
      loading: true,
      clienteNome: venda.cliente_nome || '—',
      documento: '—',
      peca: '—',
      totalServico: 0,
      totalPeca: 0,
      descontoNoServico: 0,
      descontoNaPeca: 0,
      valorNfse: 0,
      valorNfce: 0,
      numeroOs: venda.numero_os,
      emitirNfse: !venda.nfse,
      emitirNfce: !venda.nfce,
    });

    const { data: os, error } = await supabase
      .from('ordens_servico')
      .select(
        `
        numero_os,
        peca,
        valor_servico,
        qtd_servico,
        valor_peca,
        qtd_peca,
        desconto,
        cliente:cliente_id (nome, cpf, documento)
      `
      )
      .eq('empresa_id', empresaData.id)
      .eq('numero_os', Number(venda.numero_os))
      .maybeSingle();

    if (error || !os) {
      setPreviewAmbas({
        loading: false,
        clienteNome: venda.cliente_nome || '—',
        documento: '—',
        peca: '—',
        totalServico: 0,
        totalPeca: 0,
        descontoNoServico: 0,
        descontoNaPeca: 0,
        valorNfse: 0,
        valorNfce: 0,
        numeroOs: venda.numero_os,
        emitirNfse: !venda.nfse,
        emitirNfce: !venda.nfce,
        erro: 'Não foi possível carregar os valores da O.S.',
      });
      return;
    }

    const cliente = Array.isArray(os.cliente) ? os.cliente[0] : os.cliente;
    const totalServico = Number(os.valor_servico || 0) * (Number(os.qtd_servico || 1) || 1);
    const totalPeca = Number(os.valor_peca || 0) * (Number(os.qtd_peca || 1) || 1);
    const desconto = Math.max(0, Number(os.desconto || 0));
    const bruto = totalServico + totalPeca;
    const descontoNoServico =
      bruto > 0 ? Math.min(totalServico, desconto * (totalServico / bruto)) : 0;
    const descontoNaPeca =
      bruto > 0 ? Math.min(totalPeca, desconto * (totalPeca / bruto)) : 0;
    const valorNfse = Math.round((totalServico - descontoNoServico) * 100) / 100;
    const valorNfce = Math.round((totalPeca - descontoNaPeca) * 100) / 100;
    const emitirNfse = !venda.nfse && valorNfse > 0;
    const emitirNfce = !venda.nfce && valorNfce > 0;

    let erro: string | undefined;
    if (!emitirNfse && !emitirNfce) {
      erro = 'Não há nota pendente para emitir (valores zerados ou já emitidas).';
    }

    setPreviewAmbas({
      loading: false,
      clienteNome: cliente?.nome || venda.cliente_nome || '—',
      documento: cliente?.documento || cliente?.cpf || '—',
      peca: String(os.peca || '—'),
      totalServico,
      totalPeca,
      descontoNoServico,
      descontoNaPeca,
      valorNfse,
      valorNfce,
      numeroOs: String(os.numero_os),
      emitirNfse,
      emitirNfce,
      erro,
    });
  };

  const confirmarEmitirAmbas = async () => {
    const venda = vendaAmbasPreview;
    const preview = previewAmbas;
    if (!venda || !preview) return;
    setEmitindoVendaId(venda.id);
    setErroEmissaoFiscal(null);

    let nfseInfo: NfseInfo | null = venda.nfse || null;
    let nfceInfo: NfceInfo | null = venda.nfce || null;
    const erros: string[] = [];

    try {
      if (preview.emitirNfse) {
        const res = await fiscalFetch('/api/fiscal/nfse/emitir-venda', {
          method: 'POST',
          body: JSON.stringify({ vendaId: venda.id }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.status === 'ja_emitida' && json.nfse) {
          nfseInfo = {
            id: json.nfse.id,
            chave_acesso: json.nfse.chave_acesso,
            numero_nfse: json.nfse.numero_nfse,
            status: json.nfse.status || 'autorizada',
          };
        } else if (json.status === 'autorizada' && json.nfseId) {
          nfseInfo = {
            id: json.nfseId,
            chave_acesso: json.chaveAcesso,
            numero_nfse: json.numeroNfse,
            status: 'autorizada',
          };
        } else if (!res.ok || json.ok === false) {
          erros.push(`NFS-e: ${msgFiscalErro(json, 'falha')}`);
        }
      }

      if (preview.emitirNfce) {
        const res = await fiscalFetch('/api/fiscal/nfce/emitir-venda', {
          method: 'POST',
          body: JSON.stringify({ vendaId: venda.id }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.status === 'ja_emitida' && json.nfce) {
          nfceInfo = {
            id: json.nfce.id,
            chave_acesso: json.nfce.chave_acesso,
            numero: json.nfce.numero,
            status: json.nfce.status || 'autorizada',
          };
        } else if (json.status === 'autorizada') {
          nfceInfo = {
            id: json.nfceId,
            chave_acesso: json.chaveAcesso,
            numero: json.numero,
            status: 'autorizada',
          };
        } else if (!res.ok || json.ok === false) {
          erros.push(`NFC-e: ${msgFiscalErro(json, 'falha')}`);
        }
      }

      setVendas((prev) =>
        prev.map((v) =>
          v.id === venda.id
            ? { ...v, nfse: nfseInfo || v.nfse, nfce: nfceInfo || v.nfce }
            : v
        )
      );

      if (erros.length) {
        const msg = erros.join(' · ');
        setErroEmissaoFiscal(msg);
        addToast(msg, 'error');
        // Mantém modal aberto e NÃO abre impressão (pop-up seria bloqueado / confuso)
        return;
      }

      setModalAmbasVenda(false);
      addToast('Notas emitidas. Abrindo impressão…', 'success');
      if (nfseInfo?.id || nfceInfo?.id) {
        const print = await abrirNotasConjuntasPdf({
          nfseId: nfseInfo?.id,
          nfceId: nfceInfo?.id,
          autoPrint: true,
        });
        if (!print.ok) addToast(print.error, 'error');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao emitir notas';
      setErroEmissaoFiscal(msg);
      addToast(msg, 'error');
    } finally {
      setEmitindoVendaId(null);
    }
  };

  const filtrarVendas = () => {
    let inicio: Date | null = null;
    let fim: Date | null = null;

    switch (filtroAtivo) {
      case 'hoje':
        inicio = new Date();
        inicio.setHours(0, 0, 0, 0);
        fim = new Date();
        fim.setHours(23, 59, 59, 999);
        break;
      case 'semana':
        inicio = new Date();
        inicio.setDate(inicio.getDate() - inicio.getDay());
        inicio.setHours(0, 0, 0, 0);
        fim = new Date();
        fim.setHours(23, 59, 59, 999);
        break;
      case 'mes':
        inicio = new Date();
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
        fim.setHours(23, 59, 59, 999);
        break;
      case 'personalizado':
        if (!dataInicio || !dataFim) return;
        inicio = new Date(dataInicio);
        fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        break;
      case 'todas':
        break;
      default:
        return;
    }

    const termo = normBusca(busca);
    const filtradas = vendas.filter((venda) => {
      if (inicio && fim) {
        const dataVenda = new Date(venda.data_venda);
        if (dataVenda < inicio || dataVenda > fim) return false;
      }
      if (!termo) return true;

      const cliente =
        venda.cliente_nome ||
        venda.cliente?.nome ||
        '';
      const campos = [
        String(venda.numero_venda ?? ''),
        cliente,
        venda.cliente?.numero_cliente || '',
        venda.cliente?.telefone || '',
        venda.cliente?.celular || '',
        venda.numero_os || '',
        venda.forma_pagamento || '',
        venda.status || '',
        venda.observacoes || '',
        venda.nfse?.numero_nfse || '',
        venda.nfce?.numero != null ? String(venda.nfce.numero) : '',
        venda.nfe?.numero != null ? String(venda.nfe.numero) : '',
      ]
        .map((c) => normBusca(String(c)))
        .join(' ');

      if (campos.includes(termo)) return true;
      if (matchValorBusca(Number(venda.total) || 0, busca)) return true;
      return false;
    });

    setVendasFiltradas(filtradas);
    calcularMetricas(filtradas);
  };

  const calcularMetricas = (vendasPeriodo: Venda[]) => {
    const faturamento = vendasPeriodo.reduce((total, venda) => total + venda.total, 0);
    const quantidadeVendas = vendasPeriodo.length;
    const ticketMedio = quantidadeVendas > 0 ? faturamento / quantidadeVendas : 0;
    const clientesUnicos = new Set(vendasPeriodo.filter(v => v.cliente_id).map(v => v.cliente_id)).size;

    // Calcular crescimento (comparar com período anterior)
    let crescimento = 0;
    // Implementar lógica de crescimento se necessário

    setMetrics({
      totalVendas: faturamento,
      faturamento,
      ticketMedio,
      quantidadeVendas,
      clientesUnicos,
      crescimento
    });
  };

  const buscarItensVenda = async (vendaId: string) => {
    setLoadingCupom(true);
    try {
      const { data: venda, error } = await supabase
        .from('vendas')
        .select('produtos')
        .eq('id', vendaId)
        .single();

      if (error) {
        console.error('Erro ao buscar venda:', error);
        return [];
      }

      return parseProdutosVenda(venda?.produtos);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      return [];
    } finally {
      setLoadingCupom(false);
    }
  };

  const abrirModalImprimir = async (venda: Venda) => {
    const itens = await buscarItensVenda(venda.id);
    setVendaSelecionada({
      ...venda,
      itens
    });
    setModalImprimir(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <AuthGuard>
      <MenuLayout>
        <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Vendas</h1>
        
        {/* Filtros + pesquisa */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'hoje', label: 'Hoje' },
                { key: 'semana', label: 'Esta Semana' },
                { key: 'mes', label: 'Este Mês' },
                { key: 'todas', label: 'Todas' },
                { key: 'personalizado', label: 'Personalizado' },
              ].map((filtro) => (
                <Button
                  key={filtro.key}
                  variant={filtroAtivo === filtro.key ? 'default' : 'secondary'}
                  onClick={() => setFiltroAtivo(filtro.key as FiltroTipo)}
                  className="px-4 py-2"
                >
                  {filtro.label}
                </Button>
              ))}
            </div>

            {filtroAtivo === 'personalizado' && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
                <span>até</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="relative max-w-xl w-full">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por cliente, valor, nº venda, O.S., pagamento..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none ring-blue-500 focus:ring-2"
              aria-label="Pesquisar vendas"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Limpar pesquisa"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Cards de Lucro - Destaque */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <DashboardCard
            title="Lucro do Dia"
            value={loadingDia ? 'Carregando...' : formatCurrency(snapshotDia?.lucro || 0)}
            description="Hoje"
            descriptionColorClass={snapshotDia && snapshotDia.lucro >= 0 ? "text-green-600" : "text-red-600"}
            icon={<FiCalendar className="w-5 h-5" />}
            svgPolyline={{ 
              color: snapshotDia && snapshotDia.lucro >= 0 ? '#22c55e' : '#ef4444', 
              points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' 
            }}
            className={snapshotDia && snapshotDia.lucro >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
          />

          <DashboardCard
            title="Lucro da Semana"
            value={loadingSemana ? 'Carregando...' : formatCurrency(snapshotSemana?.lucro || 0)}
            description="Esta semana"
            descriptionColorClass={snapshotSemana && snapshotSemana.lucro >= 0 ? "text-green-600" : "text-red-600"}
            icon={<FiTrendingUp className="w-5 h-5" />}
            svgPolyline={{ 
              color: snapshotSemana && snapshotSemana.lucro >= 0 ? '#22c55e' : '#ef4444', 
              points: '0,15 10,17 20,15 30,13 40,15 50,17 60,15 70,17' 
            }}
            className={snapshotSemana && snapshotSemana.lucro >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
          />
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
          <DashboardCard
            title="Faturamento"
            value={formatCurrency(metrics.faturamento)}
            description="Receita total"
            descriptionColorClass="text-green-600"
            icon={<FiDollarSign className="w-5 h-5" />}
            svgPolyline={{ color: '#22c55e', points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' }}
          />

          <DashboardCard
            title="Quantidade"
            value={metrics.quantidadeVendas}
            description="Vendas realizadas"
            descriptionColorClass="text-blue-600"
            icon={<FiShoppingCart className="w-5 h-5" />}
            svgPolyline={{ color: '#3b82f6', points: '0,15 10,17 20,15 30,13 40,15 50,17 60,15 70,17' }}
          />

          <DashboardCard
            title="Ticket Médio"
            value={formatCurrency(metrics.ticketMedio)}
            description="Valor médio por venda"
            descriptionColorClass="text-purple-600"
            icon={<FiTrendingUp className="w-5 h-5" />}
            svgPolyline={{ color: '#8b5cf6', points: '0,12 10,14 20,12 30,10 40,12 50,14 60,12 70,14' }}
          />

          <DashboardCard
            title="Clientes"
            value={metrics.clientesUnicos}
            description="Clientes únicos"
            descriptionColorClass="text-orange-600"
            icon={<FiUsers className="w-5 h-5" />}
            svgPolyline={{ color: '#f97316', points: '0,18 10,16 20,18 30,20 40,18 50,16 60,18 70,20' }}
          />

          <DashboardCard
            title="Crescimento"
            value={`${metrics.crescimento.toFixed(1)}%`}
            description="Crescimento mensal"
            descriptionColorClass={metrics.crescimento >= 0 ? "text-green-600" : "text-red-500"}
            icon={<FiTrendingUp className="w-5 h-5" />}
            svgPolyline={{ color: metrics.crescimento >= 0 ? '#22c55e' : '#ef4444', points: '0,20 10,18 20,16 30,14 40,12 50,10 60,8 70,6' }}
          />
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="text-center text-gray-500 py-20">Carregando vendas...</div>
        ) : vendasFiltradas.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            {busca.trim()
              ? 'Nenhuma venda encontrada para essa pesquisa no período selecionado.'
              : 'Nenhuma venda encontrada no período selecionado.'}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2.5 whitespace-nowrap">#</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Data</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">O.S.</th>
                    <th className="px-3 py-2.5">Cliente</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Total</th>
                    <th className="px-3 py-2.5 whitespace-nowrap">Pagamento</th>
                    {podeNotaFiscal && <th className="px-3 py-2.5 whitespace-nowrap">Nota fiscal</th>}
                    <th className="px-3 py-2.5 whitespace-nowrap text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vendasFiltradas.map(venda => {
                    const data = new Date(venda.data_venda);
                    const dataCurta = data.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    }) + ' ' + data.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const emitindo = emitindoVendaId === venda.id;
                    const menuAberto = menuAcoesId === venda.id;
                    const itemMenu =
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
                    const fecharMenu = () => {
                      setMenuAcoesId(null);
                      setMenuAcoesPos(null);
                    };
                    return (
                    <tr key={venda.id} className="hover:bg-gray-50/70">
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-blue-600">#{venda.numero_venda}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-600" title={data.toLocaleString('pt-BR')}>{dataCurta}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{venda.numero_os ? `#${venda.numero_os}` : '—'}</td>
                      <td className="px-3 py-2.5 max-w-[14rem] truncate text-gray-800" title={venda.cliente_nome}>{venda.cliente_nome}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-emerald-700">{formatCurrency(venda.total)}</td>
                      <td className="px-3 py-2.5 max-w-[9rem] truncate text-gray-600" title={venda.forma_pagamento}>{venda.forma_pagamento}</td>
                      {podeNotaFiscal && (
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1 items-start">
                            {venda.nfse?.id ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                NFS-e{venda.nfse.numero_nfse ? ` nº ${venda.nfse.numero_nfse}` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                                Sem NFS-e
                              </span>
                            )}
                            {venda.nfce?.id ? (
                              <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                                NFC-e{venda.nfce.numero != null ? ` nº ${venda.nfce.numero}` : ''}
                              </span>
                            ) : venda.nfe?.id ? (
                              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                                NF-e{venda.nfe.numero != null ? ` nº ${venda.nfe.numero}` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 ring-1 ring-inset ring-gray-200">
                                Sem NFC-e / NF-e
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-block text-left">
                          <button
                            type="button"
                            aria-label="Ações da venda"
                            aria-expanded={menuAberto}
                            disabled={emitindo}
                            onClick={(e) => {
                              if (menuAcoesId === venda.id) {
                                fecharMenu();
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const openUp = spaceBelow < 280;
                              setMenuAcoesPos({
                                top: openUp ? rect.top - 4 : rect.bottom + 4,
                                right: Math.max(8, window.innerWidth - rect.right),
                                openUp,
                              });
                              setMenuAcoesId(venda.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {emitindo ? (
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                            ) : (
                              <FiMoreVertical size={16} />
                            )}
                          </button>
                          {menuAberto && menuAcoesPos && (
                            <>
                              <button
                                type="button"
                                aria-label="Fechar menu"
                                className="fixed inset-0 z-40 cursor-default bg-transparent"
                                onClick={fecharMenu}
                              />
                              <div
                                className="fixed z-50 w-56 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                                style={{
                                  top: menuAcoesPos.top,
                                  right: menuAcoesPos.right,
                                  transform: menuAcoesPos.openUp ? 'translateY(-100%)' : undefined,
                                }}
                              >
                                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                  Imprimir
                                </p>
                                <button
                                  type="button"
                                  className={itemMenu}
                                  onClick={() => {
                                    fecharMenu();
                                    abrirModalImprimir(venda);
                                  }}
                                >
                                  <FiPrinter size={14} />
                                  Cupom da venda
                                </button>
                                {podeNotaFiscal && venda.nfse?.id && (
                                  <>
                                    <button
                                      type="button"
                                      className={itemMenu}
                                      onClick={async () => {
                                        fecharMenu();
                                        const r = await abrirDanfsePdf(venda.nfse!.id, {
                                          formato: 'cupom',
                                          autoPrint: true,
                                        });
                                        if (!r.ok) addToast(r.error, 'error');
                                      }}
                                    >
                                      <FiFileText size={14} />
                                      NFS-e (cupom)
                                    </button>
                                    <button
                                      type="button"
                                      className={itemMenu}
                                      onClick={async () => {
                                        fecharMenu();
                                        const r = await abrirDanfsePdf(venda.nfse!.id, {
                                          formato: 'a4',
                                          autoPrint: true,
                                        });
                                        if (!r.ok) addToast(r.error, 'error');
                                      }}
                                    >
                                      <FiFileText size={14} />
                                      NFS-e A4
                                    </button>
                                  </>
                                )}
                                {podeNotaFiscal && venda.nfce?.id && (
                                  <button
                                    type="button"
                                    className={itemMenu}
                                    onClick={async () => {
                                      fecharMenu();
                                      const r = await abrirDanfeNfcePdf(venda.nfce!.id, {
                                        autoPrint: true,
                                      });
                                      if (!r.ok) addToast(r.error, 'error');
                                    }}
                                  >
                                    <FiFileText size={14} />
                                    NFC-e (cupom)
                                  </button>
                                )}
                                {podeNotaFiscal && venda.nfe?.id && (
                                  <button
                                    type="button"
                                    className={itemMenu}
                                    onClick={async () => {
                                      fecharMenu();
                                      const r = await abrirDanfeNfePdf(venda.nfe!.id, {
                                        autoPrint: true,
                                      });
                                      if (!r.ok) addToast(r.error, 'error');
                                    }}
                                  >
                                    <FiFileText size={14} />
                                    NF-e A4 (DANFE)
                                  </button>
                                )}
                                {podeNotaFiscal && venda.nfse?.id && venda.nfce?.id && (
                                  <button
                                    type="button"
                                    className={itemMenu}
                                    onClick={async () => {
                                      fecharMenu();
                                      const r = await abrirNotasConjuntasPdf({
                                        nfseId: venda.nfse!.id,
                                        nfceId: venda.nfce!.id,
                                        formato: 'cupom',
                                        autoPrint: true,
                                      });
                                      if (!r.ok) addToast(r.error, 'error');
                                    }}
                                  >
                                    <FiPrinter size={14} />
                                    Imprimir as 2 (cupom)
                                  </button>
                                )}

                                {podeNotaFiscal &&
                                  venda.numero_os &&
                                  (!venda.nfse || (!venda.nfce && !venda.nfe)) && (
                                  <>
                                    <div className="my-1 border-t border-gray-100" />
                                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                      Emitir
                                    </p>
                                    {!venda.nfse && (
                                      <button
                                        type="button"
                                        className={itemMenu}
                                        disabled={!!emitindoVendaId}
                                        onClick={() => {
                                          fecharMenu();
                                          void abrirConfirmacaoNfse(venda);
                                        }}
                                      >
                                        <FiFileText size={14} />
                                        Emitir NFS-e
                                      </button>
                                    )}
                                    {!venda.nfce && !venda.nfe && (
                                      <>
                                        <button
                                          type="button"
                                          className={itemMenu}
                                          disabled={!!emitindoVendaId}
                                          onClick={() => {
                                            fecharMenu();
                                            void abrirConfirmacaoNfce(venda);
                                          }}
                                        >
                                          <FiFileText size={14} />
                                          Emitir NFC-e
                                        </button>
                                        <button
                                          type="button"
                                          className={itemMenu}
                                          disabled={!!emitindoVendaId}
                                          onClick={() => {
                                            fecharMenu();
                                            void emitirNfeVendaDireto(venda);
                                          }}
                                        >
                                          <FiFileText size={14} />
                                          Emitir NF-e (A4)
                                        </button>
                                      </>
                                    )}
                                    {!venda.nfse && !venda.nfce && !venda.nfe && (
                                      <button
                                        type="button"
                                        className={itemMenu}
                                        disabled={!!emitindoVendaId}
                                        onClick={() => {
                                          fecharMenu();
                                          void abrirConfirmacaoAmbas(venda);
                                        }}
                                      >
                                        <FiFileText size={14} />
                                        Emitir NFS-e + NFC-e
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Confirmação NFS-e (somente valor do serviço) */}
        {modalNfseVenda && vendaNfsePreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Confirmar emissão da NFS-e</h3>
                <p className="text-sm text-gray-500 mt-1">
                  A nota usa <strong>somente o valor do serviço</strong> da O.S. Peças não entram.
                </p>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
                {previewNfse?.loading ? (
                  <p className="text-gray-500 py-4 text-center">Carregando dados da O.S…</p>
                ) : (
                  <>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Venda</span>
                      <span className="font-medium">#{vendaNfsePreview.numero_venda}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">O.S.</span>
                      <span className="font-medium">#{previewNfse?.numeroOs || vendaNfsePreview.numero_os}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Cliente</span>
                      <span className="font-medium text-right">{previewNfse?.clienteNome}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Documento</span>
                      <span className="font-medium text-right">{previewNfse?.documento}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex justify-between gap-3 px-3 py-2 bg-gray-50">
                        <span className="text-gray-500">Serviços (bruto)</span>
                        <span>{formatCurrency(previewNfse?.totalServico || 0)}</span>
                      </div>
                      {(previewNfse?.descontoNoServico || 0) > 0 && (
                        <div className="flex justify-between gap-3 px-3 py-2 border-t border-gray-100">
                          <span className="text-gray-500">Desconto rateado no serviço</span>
                          <span>− {formatCurrency(previewNfse?.descontoNoServico || 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-3 px-3 py-2.5 border-t border-gray-200 bg-blue-50">
                        <span className="font-semibold text-blue-900">Valor da NFS-e</span>
                        <span className="font-bold text-blue-900">
                          {formatCurrency(previewNfse?.valorNfse || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
                        <span>Peças (não entram na NFS-e)</span>
                        <span>{formatCurrency(previewNfse?.totalPeca || 0)}</span>
                      </div>
                    </div>
                    {previewNfse?.erro && (
                      <p className="text-amber-700 text-xs">{previewNfse.erro}</p>
                    )}
                    {erroEmissaoFiscal && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 whitespace-pre-wrap">
                        {erroEmissaoFiscal}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="px-5 pb-5 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModalNfseVenda(false);
                    setVendaNfsePreview(null);
                    setErroEmissaoFiscal(null);
                  }}
                  disabled={!!emitindoVendaId}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarEmitirNfseVenda()}
                  disabled={
                    !!emitindoVendaId ||
                    !!previewNfse?.loading ||
                    !!previewNfse?.erro ||
                    (previewNfse?.valorNfse || 0) <= 0
                  }
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {emitindoVendaId ? 'Emitindo…' : 'Confirmar e emitir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmação emissão conjunta NFS-e + NFC-e */}
        {modalAmbasVenda && vendaAmbasPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Emitir NFS-e e NFC-e</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Emite as duas de uma vez e abre a impressão em páginas separadas.
                </p>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
                {previewAmbas?.loading ? (
                  <p className="text-gray-500 py-4 text-center">Carregando dados da O.S…</p>
                ) : (
                  <>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Venda</span>
                      <span className="font-medium">#{vendaAmbasPreview.numero_venda}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">O.S.</span>
                      <span className="font-medium">
                        #{previewAmbas?.numeroOs || vendaAmbasPreview.numero_os}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Cliente</span>
                      <span className="font-medium text-right">{previewAmbas?.clienteNome}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex justify-between gap-3 px-3 py-2.5 bg-blue-50 border-b border-gray-100">
                        <span className="font-semibold text-blue-900">
                          NFS-e (serviço)
                          {vendaAmbasPreview.nfse
                            ? ' · já emitida'
                            : previewAmbas?.emitirNfse
                              ? ''
                              : ' · sem valor'}
                        </span>
                        <span className="font-bold text-blue-900">
                          {formatCurrency(previewAmbas?.valorNfse || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 px-3 py-2.5 bg-sky-50">
                        <span className="font-semibold text-sky-900">
                          NFC-e (peças)
                          {vendaAmbasPreview.nfce
                            ? ' · já emitida'
                            : previewAmbas?.emitirNfce
                              ? ''
                              : ' · sem valor'}
                        </span>
                        <span className="font-bold text-sky-900">
                          {formatCurrency(previewAmbas?.valorNfce || 0)}
                        </span>
                      </div>
                    </div>
                    {previewAmbas?.erro && (
                      <p className="text-amber-700 text-xs">{previewAmbas.erro}</p>
                    )}
                    {erroEmissaoFiscal && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 whitespace-pre-wrap">
                        {erroEmissaoFiscal}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="px-5 pb-5 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModalAmbasVenda(false);
                    setVendaAmbasPreview(null);
                    setErroEmissaoFiscal(null);
                  }}
                  disabled={!!emitindoVendaId}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarEmitirAmbas()}
                  disabled={
                    !!emitindoVendaId ||
                    !!previewAmbas?.loading ||
                    !!previewAmbas?.erro ||
                    (!previewAmbas?.emitirNfse && !previewAmbas?.emitirNfce)
                  }
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {emitindoVendaId ? 'Emitindo…' : 'Confirmar e emitir as 2'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmação NFC-e (somente valor das peças) */}
        {modalNfceVenda && vendaNfcePreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Confirmar emissão da NFC-e</h3>
                <p className="text-sm text-gray-500 mt-1">
                  A nota usa <strong>somente o valor das peças</strong> da O.S. Serviço fica na NFS-e.
                </p>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
                {previewNfce?.loading ? (
                  <p className="text-gray-500 py-4 text-center">Carregando dados da O.S…</p>
                ) : (
                  <>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Venda</span>
                      <span className="font-medium">#{vendaNfcePreview.numero_venda}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">O.S.</span>
                      <span className="font-medium">#{previewNfce?.numeroOs || vendaNfcePreview.numero_os}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Cliente</span>
                      <span className="font-medium text-right">{previewNfce?.clienteNome}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Peça</span>
                      <span className="font-medium text-right truncate max-w-[60%]">{previewNfce?.peca}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="flex justify-between gap-3 px-3 py-2 bg-gray-50">
                        <span className="text-gray-500">Peças (bruto)</span>
                        <span>{formatCurrency(previewNfce?.totalPeca || 0)}</span>
                      </div>
                      {(previewNfce?.descontoNaPeca || 0) > 0 && (
                        <div className="flex justify-between gap-3 px-3 py-2 border-t border-gray-100">
                          <span className="text-gray-500">Desconto rateado nas peças</span>
                          <span>− {formatCurrency(previewNfce?.descontoNaPeca || 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-3 px-3 py-2.5 border-t border-gray-200 bg-sky-50">
                        <span className="font-semibold text-sky-900">Valor da NFC-e</span>
                        <span className="font-bold text-sky-900">
                          {formatCurrency(previewNfce?.valorNfce || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
                        <span>Serviço (não entra na NFC-e)</span>
                        <span>{formatCurrency(previewNfce?.totalServico || 0)}</span>
                      </div>
                    </div>
                    {previewNfce?.erro && (
                      <p className="text-amber-700 text-xs">{previewNfce.erro}</p>
                    )}
                    {erroEmissaoFiscal && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 whitespace-pre-wrap">
                        {erroEmissaoFiscal}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="px-5 pb-5 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModalNfceVenda(false);
                    setVendaNfcePreview(null);
                    setErroEmissaoFiscal(null);
                  }}
                  disabled={!!emitindoVendaId}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarEmitirNfceVenda()}
                  disabled={
                    !!emitindoVendaId ||
                    !!previewNfce?.loading ||
                    !!previewNfce?.erro ||
                    (previewNfce?.valorNfce || 0) <= 0
                  }
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {emitindoVendaId ? 'Emitindo…' : 'Confirmar e emitir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de impressão de cupom */}
        {modalImprimir && vendaSelecionada && (
          <Dialog onClose={() => setModalImprimir(false)}>
            <div className="p-6 max-w-lg w-full">
              <h2 className="text-xl font-bold mb-4 text-center">Cupom da Venda</h2>
              
              {loadingCupom ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">Carregando dados do cupom...</div>
                </div>
              ) : (
                <>
                  <div className="cupom-impressao">
                    <CupomVenda
                      numeroVenda={vendaSelecionada.numero_venda}
                      cliente={vendaSelecionada.cliente}
                      produtos={vendaSelecionada.itens}
                      subtotal={
                        Number(vendaSelecionada.total ?? 0) -
                        Number(vendaSelecionada.acrescimo ?? 0) +
                        Number(vendaSelecionada.desconto ?? 0)
                      }
                      desconto={Number(vendaSelecionada.desconto ?? 0)}
                      acrescimo={Number(vendaSelecionada.acrescimo ?? 0)}
                      total={Number(vendaSelecionada.total ?? 0)}
                      formaPagamento={vendaSelecionada.forma_pagamento}
                      tipoPedido={vendaSelecionada.tipo_pedido || 'Balcão'}
                      data={new Date(vendaSelecionada.data_venda).toLocaleString('pt-BR')}
                      nomeEmpresa={empresaData?.nome || "AgilizaOS"}
                    />
                  </div>
                  
                  <div className="flex gap-2 mt-4 no-print">
                    <Button className="flex-1" variant="secondary" onClick={() => setModalImprimir(false)}>Fechar</Button>
                    <Button className="flex-1" onClick={() => window.print()}>Imprimir</Button>
                  </div>
                </>
              )}
            </div>
          </Dialog>
        )}
      </div>
      </MenuLayout>
    </AuthGuard>
  );
} 
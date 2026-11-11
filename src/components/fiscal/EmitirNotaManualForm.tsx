'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUser,
  FiPackage,
  FiX,
} from 'react-icons/fi';
import AuthGuard from '@/components/AuthGuard';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabaseClient';
import { fiscalFetch, parseFiscalJson, msgFiscalErro } from '@/lib/api/fiscalFetch';
import {
  abrirDanfeNfcePdf,
  abrirDanfeNfePdf,
  abrirDanfsePdf,
} from '@/lib/fiscal/abrirDanfse';
import type { TipoNotaFiscal } from '@/components/fiscal/types';

type ClienteHit = {
  id: string;
  nome: string;
  documento: string | null;
  telefone?: string | null;
  celular?: string | null;
  email?: string | null;
  cep?: string | null;
  rua?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  inscricao_estadual?: string | null;
  ie_indicador?: string | null;
  numero_cliente?: string | null;
};

type ProdutoHit = {
  id: string;
  nome: string;
  preco: number;
  tipo: string;
  codigo?: string | null;
  ncm?: string | null;
  cfop?: string | null;
  unidade?: string | null;
};

type ItemLinha = {
  key: string;
  produtoId?: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  ncm: string;
  cfop: string;
  unidade: string;
};

const TITULOS: Record<TipoNotaFiscal, string> = {
  nfse: 'NFS-e',
  nfce: 'NFC-e',
  nfe: 'NF-e',
};

const FORMAS = [
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'Cartão de crédito', label: 'Cartão de crédito' },
  { value: 'Cartão de débito', label: 'Cartão de débito' },
  { value: 'Transferência', label: 'Transferência' },
  { value: 'Outros', label: 'Outros' },
];

function onlyDigits(v: string) {
  return String(v || '').replace(/\D/g, '');
}

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mapIeIndicador(ind?: string | null): '1' | '2' | '9' {
  if (ind === 'contribuinte') return '1';
  if (ind === 'isento') return '2';
  return '9';
}

function newLine(partial?: Partial<ItemLinha>): ItemLinha {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    codigo: '',
    descricao: '',
    quantidade: 1,
    valorUnitario: 0,
    ncm: '',
    cfop: '',
    unidade: 'UN',
    ...partial,
  };
}

export default function EmitirNotaManualForm({ tipo }: { tipo: TipoNotaFiscal }) {
  const router = useRouter();
  const { empresaData } = useAuth();
  const { addToast } = useToast();
  const listPath = `/financeiro/${tipo}`;

  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteBusca, setClienteBusca] = useState('');
  const [clienteHits, setClienteHits] = useState<ClienteHit[]>([]);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('');
  const [ie, setIe] = useState('');
  const [indIEDest, setIndIEDest] = useState<'1' | '2' | '9'>('9');

  const [itens, setItens] = useState<ItemLinha[]>([newLine()]);
  const [prodBusca, setProdBusca] = useState('');
  const [prodHits, setProdHits] = useState<ProdutoHit[]>([]);
  const [prodOpen, setProdOpen] = useState(false);
  const [buscandoProd, setBuscandoProd] = useState(false);

  const [descricaoServico, setDescricaoServico] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [informacoes, setInformacoes] = useState('');
  const [ncmPadrao, setNcmPadrao] = useState('');
  const [cfopPadrao, setCfopPadrao] = useState('');
  const [emitindo, setEmitindo] = useState(false);

  const clienteBoxRef = useRef<HTMLDivElement>(null);
  const prodBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (clienteBoxRef.current && !clienteBoxRef.current.contains(e.target as Node)) {
        setClienteOpen(false);
      }
      if (prodBoxRef.current && !prodBoxRef.current.contains(e.target as Node)) {
        setProdOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fiscalFetch('/api/fiscal/config');
        const json = await parseFiscalJson(res);
        const cfg = (json.data as { config?: Record<string, unknown> } | undefined)?.config;
        if (cfg) {
          setNcmPadrao(String(cfg.nfce_ncm_padrao || ''));
          setCfopPadrao(String(cfg.nfce_cfop_padrao || ''));
          if (cfg.descricao_servico_padrao && tipo === 'nfse') {
            setDescricaoServico(String(cfg.descricao_servico_padrao));
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, [tipo]);

  const buscarClientes = useCallback(
    async (q: string) => {
      if (!empresaData?.id || q.trim().length < 2) {
        setClienteHits([]);
        setClienteOpen(false);
        return;
      }
      setBuscandoCliente(true);
      try {
        const term = q.trim();
        // Aspas obrigatórias no PostgREST quando o termo tem espaço/acento
        const like = `"%${term.replace(/"/g, '')}%"`;
        const digits = onlyDigits(term);
        const orParts = [
          `nome.ilike.${like}`,
          `documento.ilike.${like}`,
          `telefone.ilike.${like}`,
          `celular.ilike.${like}`,
          `email.ilike.${like}`,
        ];
        if (digits.length >= 3) {
          orParts.push(`documento.ilike."%${digits}%"`);
        }

        const { data, error } = await supabase
          .from('clientes')
          .select(
            'id, nome, documento, telefone, celular, email, numero_cliente, cidade'
          )
          .eq('empresa_id', empresaData.id)
          .or(orParts.join(','))
          .order('nome', { ascending: true })
          .limit(12);

        if (error) {
          console.error('busca clientes supabase:', error);
          // Fallback: API do PDV (service role)
          const url = `/api/clientes?empresaId=${encodeURIComponent(empresaData.id)}&search=${encodeURIComponent(term)}`;
          const res = await fetch(url);
          const json = await res.json().catch(() => ({}));
          const list = Array.isArray(json.clientes) ? (json.clientes as ClienteHit[]) : [];
          setClienteHits(list.slice(0, 12));
        } else {
          setClienteHits((data || []) as ClienteHit[]);
        }
        setClienteOpen(true);
      } catch (e) {
        console.error('busca clientes:', e);
        setClienteHits([]);
        setClienteOpen(true);
      } finally {
        setBuscandoCliente(false);
      }
    },
    [empresaData?.id]
  );

  useEffect(() => {
    const t = setTimeout(() => void buscarClientes(clienteBusca), 280);
    return () => clearTimeout(t);
  }, [clienteBusca, buscarClientes]);

  const buscarProdutos = useCallback(
    async (q: string) => {
      if (!empresaData?.id || q.trim().length < 2) {
        setProdHits([]);
        setProdOpen(false);
        return;
      }
      setBuscandoProd(true);
      try {
        const term = q.trim();
        const params = new URLSearchParams({
          empresaId: empresaData.id,
          apenasAtivos: 'true',
          limit: '15',
          search: term,
        });
        // NFS-e: serviços (e produtos, se o cadastro misturar)
        // NFC-e / NF-e: produtos
        if (tipo === 'nfce' || tipo === 'nfe') {
          params.set('tipo', 'produto');
        } else {
          params.set('tipo', 'servico');
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`/api/produtos-servicos/listar?${params}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          headers,
        });
        let lista = (await res.json().catch(() => [])) as ProdutoHit[];

        // NFS-e: se não houver serviços, tenta produtos também
        if (
          tipo === 'nfse' &&
          res.ok &&
          Array.isArray(lista) &&
          lista.length === 0
        ) {
          params.set('tipo', 'produto');
          const res2 = await fetch(`/api/produtos-servicos/listar?${params}`, {
            cache: 'no-store',
            credentials: 'same-origin',
            headers,
          });
          lista = (await res2.json().catch(() => [])) as ProdutoHit[];
        }

        if (!res.ok && !Array.isArray(lista)) {
          console.error('busca produtos:', lista);
          setProdHits([]);
        } else {
          const rows = Array.isArray(lista) ? lista : [];
          setProdHits(
            rows.slice(0, 15).map((p) => ({
              id: String(p.id),
              nome: String(p.nome || ''),
              preco: Number(p.preco) || 0,
              tipo: String(p.tipo || ''),
              codigo: p.codigo ?? null,
              ncm: (p as ProdutoHit).ncm ?? null,
              cfop: (p as ProdutoHit).cfop ?? null,
              unidade: p.unidade ?? 'UN',
            }))
          );
        }
        setProdOpen(true);
      } catch (e) {
        console.error('busca produtos:', e);
        setProdHits([]);
        setProdOpen(true);
      } finally {
        setBuscandoProd(false);
      }
    },
    [empresaData?.id, tipo]
  );

  useEffect(() => {
    const t = setTimeout(() => void buscarProdutos(prodBusca), 280);
    return () => clearTimeout(t);
  }, [prodBusca, buscarProdutos]);

  const selecionarCliente = async (c: ClienteHit) => {
    setClienteId(c.id);
    setClienteBusca(c.nome);
    setClienteOpen(false);
    setNome(c.nome || '');
    setDocumento(c.documento || '');
    setEmail(c.email || '');
    setTelefone(c.celular || c.telefone || '');

    // Completa endereço/IE a partir do cadastro
    try {
      let full: ClienteHit | null = null;
      const r1 = await supabase
        .from('clientes')
        .select(
          'id, nome, documento, telefone, celular, email, cep, rua, endereco, numero, complemento, bairro, cidade, estado, inscricao_estadual, ie_indicador'
        )
        .eq('id', c.id)
        .maybeSingle();
      if (!r1.error && r1.data) {
        full = r1.data as ClienteHit;
      } else {
        const r2 = await supabase
          .from('clientes')
          .select(
            'id, nome, documento, telefone, celular, email, cep, rua, endereco, numero, complemento, bairro, cidade, estado'
          )
          .eq('id', c.id)
          .maybeSingle();
        if (!r2.error && r2.data) full = r2.data as ClienteHit;
      }

      const src = full || c;
      setNome(src.nome || c.nome || '');
      setDocumento(src.documento || c.documento || '');
      setEmail(src.email || c.email || '');
      setTelefone(src.celular || src.telefone || c.celular || c.telefone || '');
      setCep(src.cep || '');
      setLogradouro(src.rua || src.endereco || '');
      setNumero(src.numero || '');
      setComplemento(src.complemento || '');
      setBairro(src.bairro || '');
      setMunicipio(src.cidade || '');
      setUf((src.estado || '').toUpperCase().slice(0, 2));
      setIe(src.inscricao_estadual || '');
      setIndIEDest(mapIeIndicador(src.ie_indicador));
    } catch {
      setCep('');
      setLogradouro('');
      setNumero('');
      setComplemento('');
      setBairro('');
      setMunicipio('');
      setUf('');
      setIe('');
      setIndIEDest('9');
    }
  };

  const limparCliente = () => {
    setClienteId(null);
    setClienteBusca('');
    setNome('');
    setDocumento('');
    setEmail('');
    setTelefone('');
    setCep('');
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setMunicipio('');
    setUf('');
    setIe('');
    setIndIEDest('9');
  };

  const adicionarProduto = async (p: ProdutoHit) => {
    let ncm = onlyDigits(p.ncm || '').slice(0, 8);
    let cfop = onlyDigits(p.cfop || '').slice(0, 4);
    if ((!ncm || !cfop) && p.id) {
      try {
        const { data: extra } = await supabase
          .from('produtos_servicos')
          .select('ncm, cfop, unidade')
          .eq('id', p.id)
          .maybeSingle();
        if (extra) {
          ncm = onlyDigits(extra.ncm || ncm).slice(0, 8);
          cfop = onlyDigits(extra.cfop || cfop).slice(0, 4);
          if (extra.unidade) p.unidade = extra.unidade;
        }
      } catch {
        /* ignore — usa padrão da config */
      }
    }

    const linha = newLine({
      produtoId: p.id,
      codigo: p.codigo || '',
      descricao: p.nome,
      quantidade: 1,
      valorUnitario: Number(p.preco) || 0,
      ncm: ncm || onlyDigits(ncmPadrao).slice(0, 8),
      cfop: cfop || onlyDigits(cfopPadrao).slice(0, 4),
      unidade: (p.unidade || 'UN').slice(0, 6),
    });
    setItens((prev) => {
      const emptyIdx = prev.findIndex((i) => !i.descricao.trim());
      if (emptyIdx >= 0) {
        const next = [...prev];
        next[emptyIdx] = linha;
        return next;
      }
      return [...prev, linha];
    });
    setProdBusca('');
    setProdOpen(false);
    setProdHits([]);
  };

  const atualizarItem = (key: string, patch: Partial<ItemLinha>) => {
    setItens((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  };

  const removerItem = (key: string) => {
    setItens((prev) => (prev.length <= 1 ? [newLine()] : prev.filter((i) => i.key !== key)));
  };

  const total = useMemo(
    () =>
      itens.reduce((acc, i) => acc + Number(i.quantidade || 0) * Number(i.valorUnitario || 0), 0),
    [itens]
  );

  const descricaoAuto = useMemo(() => {
    const nomes = itens.map((i) => i.descricao.trim()).filter(Boolean);
    if (!nomes.length) return '';
    return nomes.join('; ');
  }, [itens]);

  const emitir = async () => {
    const itensOk = itens.filter(
      (i) => i.descricao.trim() && Number(i.quantidade) > 0 && Number(i.valorUnitario) >= 0
    );

    if (tipo === 'nfse') {
      if (!nome.trim() || onlyDigits(documento).length < 11) {
        addToast('error', 'Selecione o cliente (nome e CPF/CNPJ obrigatórios).');
        return;
      }
      if (total <= 0 && itensOk.length === 0) {
        addToast('error', 'Adicione serviços ou informe o valor.');
        return;
      }
    } else {
      if (itensOk.length === 0) {
        addToast('error', 'Adicione ao menos um produto/item.');
        return;
      }
      if (tipo === 'nfe') {
        const doc = onlyDigits(documento);
        if (doc.length !== 11 && doc.length !== 14) {
          addToast('error', 'NF-e exige destinatário com CPF ou CNPJ.');
          return;
        }
        if (!logradouro.trim() || !municipio.trim() || !uf.trim()) {
          addToast('error', 'Preencha o endereço do destinatário (rua, cidade e UF).');
          return;
        }
        if (indIEDest === '1' && !onlyDigits(ie)) {
          addToast('error', 'Informe a IE do contribuinte ICMS.');
          return;
        }
      }
    }

    setEmitindo(true);
    try {
      if (tipo === 'nfse') {
        const valorServico = total > 0 ? total : 0;
        const desc =
          descricaoServico.trim() ||
          descricaoAuto ||
          'Prestação de serviços de assistência técnica';
        const res = await fiscalFetch('/api/fiscal/nfse/emitir', {
          method: 'POST',
          body: JSON.stringify({
            valorServico,
            descricao: desc,
            tomador: {
              documento: onlyDigits(documento),
              nome: nome.trim(),
              email: email.trim() || undefined,
              telefone: onlyDigits(telefone) || undefined,
              endereco: {
                logradouro: logradouro.trim() || undefined,
                numero: numero.trim() || undefined,
                complemento: complemento.trim() || undefined,
                bairro: bairro.trim() || undefined,
                uf: uf.trim() || undefined,
                cep: onlyDigits(cep) || undefined,
              },
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
        router.push(listPath);
        return;
      }

      const payloadItens = itensOk.map((i) => ({
        codigo: i.codigo || undefined,
        descricao: i.descricao.trim(),
        quantidade: Number(i.quantidade),
        valorUnitario: Number(i.valorUnitario),
        ncm: onlyDigits(i.ncm) || undefined,
        cfop: onlyDigits(i.cfop) || undefined,
        unidade: i.unidade || 'UN',
      }));

      if (tipo === 'nfce') {
        const res = await fiscalFetch('/api/fiscal/nfce/emitir', {
          method: 'POST',
          body: JSON.stringify({
            itens: payloadItens,
            valorPago: total,
            formaPagamento,
            tomador:
              onlyDigits(documento).length >= 11
                ? { documento: onlyDigits(documento), nome: nome.trim() || undefined }
                : undefined,
            informacoes: informacoes.trim() || undefined,
          }),
        });
        const json = await parseFiscalJson(res);
        if (!res.ok || json.ok === false) {
          addToast('error', msgFiscalErro(json, 'Falha ao emitir NFC-e.'));
          return;
        }
        addToast('success', 'NFC-e autorizada.');
        if (json.nfceId) await abrirDanfeNfcePdf(String(json.nfceId), { autoPrint: true });
        router.push(listPath);
        return;
      }

      const res = await fiscalFetch('/api/fiscal/nfe/emitir', {
        method: 'POST',
        body: JSON.stringify({
          itens: payloadItens,
          valorPago: total,
          formaPagamento,
          tomador: {
            documento: onlyDigits(documento),
            nome: nome.trim() || undefined,
            ie: onlyDigits(ie) || undefined,
            indIEDest,
            endereco: {
              logradouro: logradouro.trim(),
              numero: numero.trim() || 'S/N',
              complemento: complemento.trim() || undefined,
              bairro: bairro.trim() || undefined,
              municipio: municipio.trim(),
              uf: uf.trim().toUpperCase(),
              cep: onlyDigits(cep) || undefined,
            },
          },
          informacoes: informacoes.trim() || undefined,
        }),
      });
      const json = await parseFiscalJson(res);
      if (!res.ok || json.ok === false) {
        addToast('error', msgFiscalErro(json, 'Falha ao emitir NF-e.'));
        return;
      }
      addToast('success', 'NF-e autorizada.');
      if (json.nfeId) await abrirDanfeNfePdf(String(json.nfeId), { autoPrint: true });
      router.push(listPath);
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Erro ao emitir');
    } finally {
      setEmitindo(false);
    }
  };

  const titulo = TITULOS[tipo];
  const itemLabel = tipo === 'nfse' ? 'serviço' : 'produto';

  return (
    <AuthGuard>
      <MenuLayout>
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => router.push(listPath)}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-100 mb-1"
              >
                <FiArrowLeft size={14} /> Voltar para {titulo}
              </button>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Nova {titulo}
              </h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Preencha cliente e {tipo === 'nfse' ? 'serviços' : 'produtos'} com busca no sistema.
              </p>
            </div>
            <Button type="button" disabled={emitindo} onClick={() => void emitir()}>
              {emitindo ? 'Emitindo…' : `Emitir ${titulo}`}
            </Button>
          </div>

          {/* Cliente */}
          <section className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiUser /> Cliente / tomador
            </h2>

            <div ref={clienteBoxRef} className="relative">
              <label className="block text-sm mb-1 text-gray-600 dark:text-zinc-400">
                Buscar cliente cadastrado
              </label>
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  value={clienteBusca}
                  onChange={(e) => {
                    setClienteBusca(e.target.value);
                    setClienteOpen(true);
                    if (clienteId) setClienteId(null);
                  }}
                  onFocus={() => clienteHits.length > 0 && setClienteOpen(true)}
                  placeholder="Nome, CPF/CNPJ, telefone ou nº do cliente…"
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 pl-9 pr-9 py-2.5 text-sm"
                />
                {clienteBusca && (
                  <button
                    type="button"
                    onClick={limparCliente}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>
              {clienteOpen && clienteBusca.trim().length >= 2 && (
                <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
                  {buscandoCliente ? (
                    <li className="px-3 py-2 text-sm text-gray-400">Buscando…</li>
                  ) : clienteHits.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-400">
                      Nenhum cliente encontrado. Digite o nome ou CPF/CNPJ.
                    </li>
                  ) : (
                    clienteHits.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => void selecionarCliente(c)}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 border-b border-gray-50 dark:border-zinc-800 last:border-0"
                        >
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {c.nome}
                            {c.numero_cliente ? (
                              <span className="text-gray-400 font-normal">
                                {' '}
                                · #{c.numero_cliente}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500">
                            {[c.documento, c.telefone || c.celular].filter(Boolean).join(' · ')}
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm sm:col-span-2">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">Nome *</span>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">CPF/CNPJ *</span>
                <input
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">Telefone</span>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">E-mail</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                />
              </label>
            </div>

            {(tipo === 'nfe' || tipo === 'nfse') && (
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 pt-1 border-t border-gray-100 dark:border-zinc-800">
                <p className="sm:col-span-6 text-xs font-medium text-gray-500 mt-2">
                  Endereço {tipo === 'nfe' ? '(obrigatório na NF-e)' : '(opcional)'}
                </p>
                <label className="text-sm sm:col-span-2">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">CEP</span>
                  <input
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm sm:col-span-4">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Logradouro</span>
                  <input
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm sm:col-span-1">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Nº</span>
                  <input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Complemento</span>
                  <input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm sm:col-span-3">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Bairro</span>
                  <input
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm sm:col-span-3">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Cidade</span>
                  <input
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm sm:col-span-1">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">UF</span>
                  <input
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                    maxLength={2}
                  />
                </label>
                {tipo === 'nfe' && (
                  <>
                    <label className="text-sm sm:col-span-2">
                      <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                        Indicador IE
                      </span>
                      <select
                        value={indIEDest}
                        onChange={(e) => setIndIEDest(e.target.value as '1' | '2' | '9')}
                        className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                      >
                        <option value="9">Não contribuinte</option>
                        <option value="1">Contribuinte ICMS</option>
                        <option value="2">Isento</option>
                      </select>
                    </label>
                    <label className="text-sm sm:col-span-3">
                      <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                        Inscrição estadual
                      </span>
                      <input
                        value={ie}
                        onChange={(e) => setIe(e.target.value)}
                        disabled={indIEDest === '9'}
                        className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 disabled:opacity-50"
                      />
                    </label>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Itens */}
          <section className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiPackage /> {tipo === 'nfse' ? 'Serviços' : 'Produtos / itens'}
              </h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setItens((prev) => [...prev, newLine({ ncm: ncmPadrao, cfop: cfopPadrao })])}
                className="inline-flex items-center gap-1"
              >
                <FiPlus size={14} /> Linha manual
              </Button>
            </div>

            <div ref={prodBoxRef} className="relative">
              <label className="block text-sm mb-1 text-gray-600 dark:text-zinc-400">
                Buscar {itemLabel} no cadastro
              </label>
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  value={prodBusca}
                  onChange={(e) => {
                    setProdBusca(e.target.value);
                    setProdOpen(true);
                  }}
                  onFocus={() => prodHits.length > 0 && setProdOpen(true)}
                  placeholder={`Nome ou código do ${itemLabel}…`}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2.5 text-sm"
                />
              </div>
              {prodOpen && prodBusca.trim().length >= 2 && (
                <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
                  {buscandoProd ? (
                    <li className="px-3 py-2 text-sm text-gray-400">Buscando…</li>
                  ) : prodHits.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-400">
                      Nenhum {itemLabel} encontrado no cadastro.
                    </li>
                  ) : (
                    prodHits.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => void adicionarProduto(p)}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 border-b border-gray-50 dark:border-zinc-800 last:border-0"
                        >
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {p.codigo ? `${p.codigo} — ` : ''}
                            {p.nome}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatMoney(Number(p.preco) || 0)}
                            {p.tipo ? ` · ${p.tipo}` : ''}
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className="overflow-x-auto -mx-1">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
                    <th className="px-2 py-2 font-medium">Descrição</th>
                    <th className="px-2 py-2 font-medium w-20">Qtd</th>
                    <th className="px-2 py-2 font-medium w-28">Unit.</th>
                    {(tipo === 'nfce' || tipo === 'nfe') && (
                      <>
                        <th className="px-2 py-2 font-medium w-24">NCM</th>
                        <th className="px-2 py-2 font-medium w-20">CFOP</th>
                        <th className="px-2 py-2 font-medium w-16">Un</th>
                      </>
                    )}
                    <th className="px-2 py-2 font-medium w-28 text-right">Total</th>
                    <th className="px-2 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.key} className="border-b border-gray-50 dark:border-zinc-800/80">
                      <td className="px-2 py-1.5">
                        <input
                          value={item.descricao}
                          onChange={(e) => atualizarItem(item.key, { descricao: e.target.value })}
                          className="w-full min-w-[160px] rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                          placeholder="Descrição"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0.001}
                          step="any"
                          value={item.quantidade}
                          onChange={(e) =>
                            atualizarItem(item.key, { quantidade: Number(e.target.value) })
                          }
                          className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.valorUnitario}
                          onChange={(e) =>
                            atualizarItem(item.key, { valorUnitario: Number(e.target.value) })
                          }
                          className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                        />
                      </td>
                      {(tipo === 'nfce' || tipo === 'nfe') && (
                        <>
                          <td className="px-2 py-1.5">
                            <input
                              value={item.ncm}
                              onChange={(e) =>
                                atualizarItem(item.key, {
                                  ncm: onlyDigits(e.target.value).slice(0, 8),
                                })
                              }
                              className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                              placeholder={ncmPadrao || 'NCM'}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={item.cfop}
                              onChange={(e) =>
                                atualizarItem(item.key, {
                                  cfop: onlyDigits(e.target.value).slice(0, 4),
                                })
                              }
                              className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                              placeholder={cfopPadrao || 'CFOP'}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={item.unidade}
                              onChange={(e) =>
                                atualizarItem(item.key, { unidade: e.target.value.slice(0, 6) })
                              }
                              className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                            />
                          </td>
                        </>
                      )}
                      <td className="px-2 py-1.5 text-right whitespace-nowrap font-medium">
                        {formatMoney(Number(item.quantidade || 0) * Number(item.valorUnitario || 0))}
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => removerItem(item.key)}
                          className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Remover"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end text-sm font-semibold text-gray-900 dark:text-white">
              Total: {formatMoney(total)}
            </div>

            {tipo === 'nfse' && (
              <label className="block text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                  Descrição do serviço na nota
                </span>
                <textarea
                  value={descricaoServico}
                  onChange={(e) => setDescricaoServico(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                  placeholder={
                    descricaoAuto ||
                    'Usa a descrição dos serviços selecionados se vazio'
                  }
                />
              </label>
            )}

            {(tipo === 'nfce' || tipo === 'nfe') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                    Forma de pagamento
                  </span>
                  <select
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                  >
                    {FORMAS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                    Informações complementares
                  </span>
                  <input
                    value={informacoes}
                    onChange={(e) => setInformacoes(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2"
                  />
                </label>
              </div>
            )}
          </section>

          <div className="flex justify-end gap-2 pb-8">
            <Button type="button" variant="secondary" disabled={emitindo} onClick={() => router.push(listPath)}>
              Cancelar
            </Button>
            <Button type="button" disabled={emitindo} onClick={() => void emitir()}>
              {emitindo ? 'Emitindo…' : `Emitir ${titulo}`}
            </Button>
          </div>
        </div>
      </MenuLayout>
    </AuthGuard>
  );
}

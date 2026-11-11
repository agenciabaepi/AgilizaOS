'use client';

import { useCallback, useEffect, useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import { useToast } from '@/components/Toast';
import { fiscalFetch } from '@/lib/api/fiscalFetch';
import { FileText, Upload, Shield, AlertTriangle, CheckCircle2, Loader2, FlaskConical } from 'lucide-react';
import type { FiscalCertificadoMeta, FiscalEmpresaConfig, FiscalNfseRow } from '@/modules/fiscal/types';

type FormState = {
  ambiente: 'producao_restrita' | 'producao';
  opcao_simples: 'mei' | 'me_epp' | 'nao_optante';
  regime_apuracao_sn: string;
  regime_especial: string;
  cnpj: string;
  inscricao_municipal: string;
  cod_municipio_ibge: string;
  razao_social: string;
  nome_fantasia: string;
  serie_dps: string;
  c_trib_nac: string;
  c_nbs: string;
  descricao_servico_padrao: string;
  aliquota_iss: string;
  percentual_tot_trib_sn: string;
  ativo: boolean;
  inscricao_estadual: string;
  uf: string;
  nfce_serie: string;
  nfce_id_csc: string;
  /** Só envia no PUT se o usuário digitar um valor novo */
  nfce_csc: string;
  nfce_csc_configured: boolean;
  nfce_ativo: boolean;
  nfe_ativo: boolean;
  nfe_serie: string;
  nfce_ncm_padrao: string;
  nfce_cfop_padrao: string;
  nfce_csosn_padrao: string;
  end_logradouro: string;
  end_numero: string;
  end_complemento: string;
  end_bairro: string;
  end_cep: string;
};

const emptyForm: FormState = {
  ambiente: 'producao_restrita',
  opcao_simples: 'me_epp',
  regime_apuracao_sn: '1',
  regime_especial: '0',
  cnpj: '',
  inscricao_municipal: '',
  cod_municipio_ibge: '',
  razao_social: '',
  nome_fantasia: '',
  serie_dps: '1',
  c_trib_nac: '',
  c_nbs: '',
  descricao_servico_padrao: 'Serviço de assistência técnica em equipamentos eletrônicos',
  aliquota_iss: '',
  percentual_tot_trib_sn: '6',
  ativo: false,
  inscricao_estadual: '',
  uf: 'SP',
  nfce_serie: '1',
  nfce_id_csc: '',
  nfce_csc: '',
  nfce_csc_configured: false,
  nfce_ativo: false,
  nfe_ativo: false,
  nfe_serie: '1',
  nfce_ncm_padrao: '85177900',
  nfce_cfop_padrao: '5102',
  nfce_csosn_padrao: '102',
  end_logradouro: '',
  end_numero: '',
  end_complemento: '',
  end_bairro: '',
  end_cep: '',
};

function configToForm(c: FiscalEmpresaConfig): FormState {
  return {
    ambiente: c.ambiente,
    opcao_simples: c.opcao_simples,
    regime_apuracao_sn: c.regime_apuracao_sn || '1',
    regime_especial: c.regime_especial || '0',
    cnpj: c.cnpj || '',
    inscricao_municipal: c.inscricao_municipal || '',
    cod_municipio_ibge: c.cod_municipio_ibge || '',
    razao_social: c.razao_social || '',
    nome_fantasia: c.nome_fantasia || '',
    serie_dps: c.serie_dps || '1',
    c_trib_nac: c.c_trib_nac || '',
    c_nbs: c.c_nbs || '',
    descricao_servico_padrao: c.descricao_servico_padrao || '',
    aliquota_iss: c.aliquota_iss != null ? String(c.aliquota_iss) : '',
    percentual_tot_trib_sn:
      c.percentual_tot_trib_sn != null ? String(c.percentual_tot_trib_sn) : '',
    ativo: Boolean(c.ativo),
    inscricao_estadual: c.inscricao_estadual || '',
    uf: c.uf || 'SP',
    nfce_serie: c.nfce_serie || '1',
    nfce_id_csc: c.nfce_id_csc || '',
    nfce_csc: '',
    nfce_csc_configured: Boolean(c.nfce_csc_configured),
    nfce_ativo: Boolean(c.nfce_ativo),
    nfe_ativo: Boolean(c.nfe_ativo),
    nfe_serie: c.nfe_serie || '1',
    nfce_ncm_padrao: c.nfce_ncm_padrao || '85177900',
    nfce_cfop_padrao: c.nfce_cfop_padrao || '5102',
    nfce_csosn_padrao: c.nfce_csosn_padrao || '102',
    end_logradouro: (c as { end_logradouro?: string }).end_logradouro || '',
    end_numero: (c as { end_numero?: string }).end_numero || '',
    end_complemento: (c as { end_complemento?: string }).end_complemento || '',
    end_bairro: (c as { end_bairro?: string }).end_bairro || '',
    end_cep: (c as { end_cep?: string }).end_cep || '',
  };
}

export default function NotaFiscalConfigPage({ embedded = false }: { embedded?: boolean }) {
  const { podeAcessar } = useConfigPermission('nota-fiscal');
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [cert, setCert] = useState<FiscalCertificadoMeta | null>(null);
  const [pfxFile, setPfxFile] = useState<File | null>(null);
  const [pfxPassword, setPfxPassword] = useState('');
  const [emitindo, setEmitindo] = useState(false);
  const [teste, setTeste] = useState({
    tomadorDoc: '',
    tomadorNome: 'Cliente Teste Homologação',
    valor: '10.00',
    descricao: '',
  });
  const [ultimoResultado, setUltimoResultado] = useState<string | null>(null);
  const [notas, setNotas] = useState<FiscalNfseRow[]>([]);

  const loadNotas = useCallback(async () => {
    try {
      const res = await fiscalFetch('/api/fiscal/nfse?limit=10');
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) setNotas(json.data);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fiscalFetch('/api/fiscal/config');
      const json = await res.json();
      if (!res.ok) {
        addToast('error', json.error || 'Erro ao carregar configuração fiscal');
        return;
      }
      if (json.data?.config) setForm(configToForm(json.data.config));
      setCert(json.data?.certificado ?? null);
      await loadNotas();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [addToast, loadNotas]);

  useEffect(() => {
    if (!podeAcessar) return;
    void load();
  }, [podeAcessar, load]);

  async function salvarConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        // Não reenvia CSC vazio (preserva o já salvo)
        nfce_csc: form.nfce_csc.trim() || undefined,
      };
      const res = await fiscalFetch('/api/fiscal/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        addToast('error', json.error || 'Falha ao salvar');
        return;
      }
      if (json.data) setForm(configToForm(json.data));
      addToast('success', 'Configuração fiscal salva.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function enviarCertificado(e: React.FormEvent) {
    e.preventDefault();
    if (!pfxFile) {
      addToast('error', 'Selecione o arquivo .pfx');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', pfxFile);
      fd.append('password', pfxPassword);
      const res = await fiscalFetch('/api/fiscal/certificado', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        addToast('error', json.error || 'Falha no upload do certificado');
        return;
      }
      setCert(json.data);
      setPfxFile(null);
      setPfxPassword('');
      addToast('success', 'Certificado A1 armazenado com segurança.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setUploading(false);
    }
  }

  if (!podeAcessar) {
    const negado = <AcessoNegadoComponent />;
    return embedded ? negado : <MenuLayout>{negado}</MenuLayout>;
  }

  const body = (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Nota Fiscal de Serviço (NFS-e Nacional)
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Integração nativa com o Emissor Nacional (SEFIN/ADN). MEI e ME/EPP do Simples emitem
          exclusivamente por este canal. Comece em <strong>Produção Restrita</strong> até validar
          o ciclo completo.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 dark:border-zinc-700 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Certificado digital A1
            </h3>
            {cert ? (
              <div className="text-sm space-y-1 text-gray-700 dark:text-zinc-300">
                <p className="flex items-center gap-1.5">
                  {cert.expirado ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                  {cert.subject_cn || 'Certificado instalado'}
                </p>
                <p>CNPJ no cert.: {cert.cnpj_certificado || '—'}</p>
                <p>
                  Validade:{' '}
                  {cert.not_after
                    ? new Date(cert.not_after).toLocaleDateString('pt-BR')
                    : '—'}
                  {cert.expira_em_breve && (
                    <span className="ml-2 text-amber-600">expira em breve</span>
                  )}
                  {cert.expirado && <span className="ml-2 text-red-600">expirado</span>}
                </p>
              </div>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Nenhum certificado A1 cadastrado. Sem ele a emissão não funciona (mTLS).
              </p>
            )}

            <form onSubmit={enviarCertificado} className="flex flex-col sm:flex-row gap-3 items-end">
              <label className="flex-1 text-sm w-full">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">Arquivo .pfx / .p12</span>
                <input
                  type="file"
                  accept=".pfx,.p12"
                  onChange={(e) => setPfxFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm"
                />
              </label>
              <label className="flex-1 text-sm w-full">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">Senha do PFX</span>
                <input
                  type="password"
                  value={pfxPassword}
                  onChange={(e) => setPfxPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  autoComplete="off"
                />
              </label>
              <button
                type="submit"
                disabled={uploading || !pfxFile}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Enviar
              </button>
            </form>
            <p className="text-xs text-gray-500">
              O PFX e a senha são criptografados (AES-256-GCM) no servidor. Nunca ficam no browser
              após o upload. Use a senha definida na emissão do A1 (sem espaços). Se o arquivo veio
              de e-mail/ZIP, confira se não está corrompido — o formato precisa ser .pfx ou .p12.
            </p>
          </section>

          <form
            onSubmit={salvarConfig}
            className="rounded-xl border border-gray-200 dark:border-zinc-700 p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Dados do emitente
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">Ambiente</span>
                <select
                  value={form.ambiente}
                  onChange={(e) =>
                    setForm({ ...form, ambiente: e.target.value as FormState['ambiente'] })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                >
                  <option value="producao_restrita">Produção restrita (homologação)</option>
                  <option value="producao">Produção (notas válidas)</option>
                </select>
              </label>

              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">Regime</span>
                <select
                  value={form.opcao_simples}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      opcao_simples: e.target.value as FormState['opcao_simples'],
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                >
                  <option value="mei">MEI</option>
                  <option value="me_epp">ME/EPP — Simples Nacional</option>
                  <option value="nao_optante">Não optante</option>
                </select>
              </label>

              {form.opcao_simples === 'me_epp' && (
                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                    Apuração do Simples
                  </span>
                  <select
                    value={form.regime_apuracao_sn}
                    onChange={(e) => setForm({ ...form, regime_apuracao_sn: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  >
                    <option value="1">Federal + municipal pelo SN</option>
                    <option value="2">Federal pelo SN / municipal fora</option>
                    <option value="3">Federal e municipal fora do SN</option>
                  </select>
                </label>
              )}

              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">CNPJ</span>
                <input
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  required
                />
              </label>

              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                  Inscrição municipal (cadastro)
                </span>
                <input
                  value={form.inscricao_municipal}
                  onChange={(e) => setForm({ ...form, inscricao_municipal: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                />
                <span className="mt-1 block text-xs text-gray-500">
                  Na NFS-e Nacional a IM só vai na DPS se o município exigir. Em Ilhabela a SEFIN
                  rejeita IM (E0120) — por isso não enviamos no XML por padrão.
                </span>
              </label>

              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                  Inscrição estadual (IE)
                </span>
                <input
                  value={form.inscricao_estadual}
                  onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  placeholder="Ex.: 352097806116"
                />
                <span className="mt-1 block text-xs text-gray-500">
                  Obrigatória para NFC-e (CADESP).
                </span>
              </label>

              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                  Código IBGE município (7 dígitos)
                </span>
                <input
                  value={form.cod_municipio_ibge}
                  onChange={(e) => setForm({ ...form, cod_municipio_ibge: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  required
                  maxLength={7}
                />
              </label>

              <label className="text-sm sm:col-span-2">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">Razão social</span>
                <input
                  value={form.razao_social}
                  onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  required
                />
              </label>

              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                  Código tributação nacional (cTribNac)
                </span>
                <input
                  value={form.c_trib_nac}
                  onChange={(e) => setForm({ ...form, c_trib_nac: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  placeholder="6 dígitos"
                  maxLength={6}
                />
              </label>

              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">NBS (opcional)</span>
                <input
                  value={form.c_nbs}
                  onChange={(e) => setForm({ ...form, c_nbs: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  maxLength={9}
                />
              </label>

              {form.opcao_simples === 'me_epp' && (
                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                    % total tributos SN (pTotTribSN)
                  </span>
                  <input
                    value={form.percentual_tot_trib_sn}
                    onChange={(e) => setForm({ ...form, percentual_tot_trib_sn: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                    placeholder="ex.: 6"
                  />
                </label>
              )}

              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                  Alíquota ISS % (se exigida)
                </span>
                <input
                  value={form.aliquota_iss}
                  onChange={(e) => setForm({ ...form, aliquota_iss: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                />
              </label>

              <label className="text-sm sm:col-span-2">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                  Descrição padrão do serviço
                </span>
                <textarea
                  value={form.descricao_servico_padrao}
                  onChange={(e) => setForm({ ...form, descricao_servico_padrao: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                />
              </label>
            </div>

            <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  NFC-e (peças / cupom ao consumidor)
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                  Gere no portal SEFAZ-SP: Gerenciar Cód. Segurança → com validade jurídica. Cole o
                  ID e o token abaixo. A IE é a do CADESP.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">UF</span>
                  <input
                    value={form.uf}
                    onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                    maxLength={2}
                  />
                </label>

                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Série NFC-e</span>
                  <input
                    value={form.nfce_serie}
                    onChange={(e) => setForm({ ...form, nfce_serie: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                    placeholder="1"
                  />
                </label>

                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">ID do CSC</span>
                  <input
                    value={form.nfce_id_csc}
                    onChange={(e) => setForm({ ...form, nfce_id_csc: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 font-mono"
                    placeholder="000001"
                    maxLength={6}
                  />
                </label>

                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                    Token CSC
                    {form.nfce_csc_configured && !form.nfce_csc ? (
                      <span className="ml-2 text-emerald-600 font-normal">· já salvo</span>
                    ) : null}
                  </span>
                  <input
                    type="password"
                    value={form.nfce_csc}
                    onChange={(e) => setForm({ ...form, nfce_csc: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 font-mono"
                    placeholder={
                      form.nfce_csc_configured
                        ? '•••••••• (deixe em branco para manter)'
                        : 'Cole o token do portal'
                    }
                    autoComplete="off"
                  />
                </label>

                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">NCM padrão (peças)</span>
                  <input
                    value={form.nfce_ncm_padrao}
                    onChange={(e) =>
                      setForm({ ...form, nfce_ncm_padrao: e.target.value.replace(/\D/g, '').slice(0, 8) })
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 font-mono"
                    placeholder="85177900"
                    maxLength={8}
                    inputMode="numeric"
                  />
                  <span className="mt-1 block text-xs text-gray-500">
                    8 dígitos vigentes (sem pontos). Ex.: 85177900 — partes de telefonia. O antigo
                    85177099 foi extinto.
                  </span>
                </label>

                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">CFOP padrão</span>
                  <input
                    value={form.nfce_cfop_padrao}
                    onChange={(e) =>
                      setForm({ ...form, nfce_cfop_padrao: e.target.value.replace(/\D/g, '').slice(0, 4) })
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 font-mono"
                    placeholder="5102"
                    maxLength={4}
                    inputMode="numeric"
                  />
                </label>

                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">CSOSN (Simples)</span>
                  <input
                    value={form.nfce_csosn_padrao}
                    onChange={(e) =>
                      setForm({ ...form, nfce_csosn_padrao: e.target.value.replace(/\D/g, '').slice(0, 3) })
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 font-mono"
                    placeholder="102"
                    maxLength={3}
                    inputMode="numeric"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm sm:col-span-2">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Logradouro (emitente)</span>
                  <input
                    value={form.end_logradouro}
                    onChange={(e) => setForm({ ...form, end_logradouro: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Número</span>
                  <input
                    value={form.end_numero}
                    onChange={(e) => setForm({ ...form, end_numero: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Complemento</span>
                  <input
                    value={form.end_complemento}
                    onChange={(e) => setForm({ ...form, end_complemento: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Bairro</span>
                  <input
                    value={form.end_bairro}
                    onChange={(e) => setForm({ ...form, end_bairro: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">CEP</span>
                  <input
                    value={form.end_cep}
                    onChange={(e) => setForm({ ...form, end_cep: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                    placeholder="11630000"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.nfce_ativo}
                  onChange={(e) => setForm({ ...form, nfce_ativo: e.target.checked })}
                />
                Habilitar emissão de NFC-e (peças)
              </label>
            </div>

            <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  NF-e (modelo 55 / DANFE A4)
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                  Nota Fiscal Eletrônica com DANFE grande em A4. Usa o mesmo NCM/CFOP/CSOSN e
                  endereço das peças. Exige CPF/CNPJ do cliente. Não use junto com NFC-e na mesma
                  venda.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-zinc-400">Série NF-e</span>
                  <input
                    value={form.nfe_serie}
                    onChange={(e) => setForm({ ...form, nfe_serie: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                    placeholder="1"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.nfe_ativo}
                  onChange={(e) => setForm({ ...form, nfe_ativo: e.target.checked })}
                />
                Habilitar emissão de NF-e (DANFE A4)
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              />
              Emissão NFS-e ativa
            </label>

            {form.ambiente === 'producao' && (
              <p className="text-sm text-amber-700 dark:text-amber-400 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                Produção gera documento fiscal oficial. Só ative após o ciclo completo em produção
                restrita.
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#D1FE6E] text-zinc-900 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar configuração
            </button>
          </form>

          <section className="rounded-xl border border-dashed border-gray-300 dark:border-zinc-600 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Testar emissão (SEFIN)
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Use <strong>Produção restrita</strong> + emissão ativa + certificado A1. A SEFIN responde
              na hora: autorizada, rejeitada (código E0xxx) ou pendente de retry.
            </p>

            {!form.ativo && (
              <p className="text-sm text-amber-700 dark:text-amber-400 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                Marque &quot;Emissão ativa&quot; e salve antes de testar.
              </p>
            )}
            {!cert && (
              <p className="text-sm text-amber-700 dark:text-amber-400 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                Envie o certificado A1 antes de testar.
              </p>
            )}
            {form.ambiente === 'producao' && (
              <p className="text-sm text-red-700 dark:text-red-400 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                Ambiente em PRODUÇÃO — esta emissão terá valor fiscal real.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                  CPF/CNPJ do tomador
                </span>
                <input
                  value={teste.tomadorDoc}
                  onChange={(e) => setTeste({ ...teste, tomadorDoc: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  placeholder="000.000.000-00"
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">Nome do tomador</span>
                <input
                  value={teste.tomadorNome}
                  onChange={(e) => setTeste({ ...teste, tomadorNome: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">Valor (R$)</span>
                <input
                  value={teste.valor}
                  onChange={(e) => setTeste({ ...teste, valor: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="block mb-1 text-gray-600 dark:text-zinc-400">
                  Descrição (opcional)
                </span>
                <input
                  value={teste.descricao}
                  onChange={(e) => setTeste({ ...teste, descricao: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2"
                  placeholder="Usa a descrição padrão se vazio"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={emitindo || !form.ativo || !cert}
              onClick={async () => {
                setEmitindo(true);
                setUltimoResultado(null);
                try {
                  const res = await fiscalFetch('/api/fiscal/nfse/emitir', {
                    method: 'POST',
                    body: JSON.stringify({
                      valorServico: Number(String(teste.valor).replace(',', '.')),
                      descricao: teste.descricao || undefined,
                      tomador: {
                        documento: teste.tomadorDoc,
                        nome: teste.tomadorNome,
                      },
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok || json.ok === false) {
                    const msg = json.message || json.error || 'Emissão rejeitada';
                    setUltimoResultado(`Falhou: ${msg}`);
                    addToast('error', msg);
                  } else if (json.status === 'autorizada') {
                    const msg = `Autorizada — chave ${json.chaveAcesso}${
                      json.numeroNfse ? ` · nº ${json.numeroNfse}` : ''
                    }`;
                    setUltimoResultado(msg);
                    addToast('success', 'NFS-e autorizada pela SEFIN.');
                    await loadNotas();
                  } else if (json.status === 'pendente') {
                    setUltimoResultado(`Pendente de reenvio: ${json.message}`);
                    addToast('warning', 'Falha transitória — ficará no retry.');
                  } else {
                    setUltimoResultado(JSON.stringify(json));
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Erro ao emitir';
                  setUltimoResultado(msg);
                  addToast('error', msg);
                } finally {
                  setEmitindo(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {emitindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              Emitir NFS-e de teste
            </button>

            {ultimoResultado && (
              <p className="text-sm rounded-lg bg-gray-50 dark:bg-zinc-800/80 px-3 py-2 text-gray-800 dark:text-zinc-200 break-all">
                {ultimoResultado}
              </p>
            )}

            {notas.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-500 mb-2">Últimas notas</p>
                <ul className="space-y-2 text-xs">
                  {notas.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-2 flex flex-col gap-0.5"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {n.status} · R$ {Number(n.valor_servico ?? 0).toFixed(2)} ·{' '}
                        {n.tomador_nome || n.tomador_documento}
                      </span>
                      <span className="text-gray-500 break-all">{n.chave_acesso}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );

  if (embedded) return body;
  return <MenuLayout>{body}</MenuLayout>;
}

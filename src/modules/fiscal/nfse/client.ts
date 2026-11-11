import {
  Ambiente,
  NfseClient,
  OpcaoSimplesNacional,
  RegimeApuracaoSimplesNacional,
  RegimeEspecialTributacao,
} from 'open-nfse';
import type { SupabaseClient } from '@supabase/supabase-js';
import { unsealPfx } from '../crypto/certificado';
import type { FiscalEmpresaConfig, OpcaoSimplesConfig } from '../types';
import { createSupabaseDpsCounter, createSupabaseRetryStore } from './stores';

export function mapAmbiente(ambiente: FiscalEmpresaConfig['ambiente']): Ambiente {
  return ambiente === 'producao' ? Ambiente.Producao : Ambiente.ProducaoRestrita;
}

export function mapOpcaoSimples(opcao: OpcaoSimplesConfig): OpcaoSimplesNacional {
  if (opcao === 'mei') return OpcaoSimplesNacional.Mei;
  if (opcao === 'nao_optante') return OpcaoSimplesNacional.NaoOptante;
  return OpcaoSimplesNacional.MeEpp;
}

export function mapRegimeApuracao(code: string | null | undefined): RegimeApuracaoSimplesNacional {
  if (code === '2') return RegimeApuracaoSimplesNacional.FederalPeloSNMunicipalFora;
  if (code === '3') return RegimeApuracaoSimplesNacional.FederalEMunicipalFora;
  return RegimeApuracaoSimplesNacional.FederalEMunicipalPeloSN;
}

export function mapRegimeEspecial(code: string | null | undefined): RegimeEspecialTributacao {
  const map: Record<string, RegimeEspecialTributacao> = {
    '0': RegimeEspecialTributacao.Nenhum,
    '1': RegimeEspecialTributacao.AtoCooperado,
    '2': RegimeEspecialTributacao.Estimativa,
    '3': RegimeEspecialTributacao.MicroempresaMunicipal,
    '4': RegimeEspecialTributacao.NotarioRegistrador,
    '5': RegimeEspecialTributacao.ProfissionalAutonomo,
    '6': RegimeEspecialTributacao.SociedadeProfissionais,
    '9': RegimeEspecialTributacao.Outros,
  };
  return map[code ?? '0'] ?? RegimeEspecialTributacao.Nenhum;
}

export type FiscalClientBundle = {
  client: NfseClient;
  config: FiscalEmpresaConfig;
  close: () => Promise<void>;
};

/**
 * Monta NfseClient com mTLS (A1), HTTP/1.1, counter e retry store persistidos.
 * Sempre chamar `close()` no finally para liberar material de chave do undici.
 */
export async function createFiscalNfseClient(
  admin: SupabaseClient,
  empresaId: string
): Promise<FiscalClientBundle> {
  const { data: config, error: cfgErr } = await admin
    .from('fiscal_empresa_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (cfgErr) throw new Error(cfgErr.message);
  if (!config) throw new Error('Configure os dados fiscais da empresa antes de emitir.');
  if (!config.ativo) throw new Error('Emissão fiscal desativada. Ative em Configurações → Nota Fiscal.');

  const { data: cert, error: certErr } = await admin
    .from('fiscal_certificados')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .maybeSingle();

  if (certErr) throw new Error(certErr.message);
  if (!cert) throw new Error('Envie o certificado A1 (.pfx) em Configurações → Nota Fiscal.');

  if (cert.not_after && new Date(cert.not_after).getTime() <= Date.now()) {
    throw new Error('Certificado A1 expirado. Faça o upload de um novo.');
  }

  const { pfx, password } = unsealPfx(cert.pfx_ciphertext, cert.password_ciphertext);

  // Leiaute diverge por ambiente na SEFIN atual:
  // - produção: XSD sem finNFSe (nt004) — finNFSe gera E1235
  // - produção restrita: XSD com finNFSe (nt009) — ausência gera E1235
  // Override opcional via fiscal_empresa_config.layout se existir.
  const ambiente = config.ambiente as FiscalEmpresaConfig['ambiente'];
  const layoutOverride = (config as { layout?: string }).layout;
  const layout =
    layoutOverride === 'nt004' || layoutOverride === 'nt009'
      ? layoutOverride
      : ambiente === 'producao'
        ? ('nt004' as const)
        : ('nt009' as const);

  const client = new NfseClient({
    layout,
    ambiente: mapAmbiente(ambiente),
    certificado: { pfx, password },
    dpsCounter: createSupabaseDpsCounter(admin, empresaId),
    retryStore: createSupabaseRetryStore(admin, empresaId),
    timeoutMs: 90_000,
  });

  return {
    client,
    config: config as FiscalEmpresaConfig,
    close: async () => {
      await client.close();
    },
  };
}

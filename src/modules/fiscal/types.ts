export type FiscalAmbiente = 'producao_restrita' | 'producao';

export type OpcaoSimplesConfig = 'mei' | 'me_epp' | 'nao_optante';

export type FiscalEmpresaConfig = {
  id: string;
  empresa_id: string;
  ambiente: FiscalAmbiente;
  opcao_simples: OpcaoSimplesConfig;
  regime_apuracao_sn: string | null;
  regime_especial: string;
  cnpj: string;
  inscricao_municipal: string | null;
  cod_municipio_ibge: string;
  razao_social: string;
  nome_fantasia: string | null;
  serie_dps: string;
  c_trib_nac: string | null;
  c_nbs: string | null;
  descricao_servico_padrao: string | null;
  aliquota_iss: number | null;
  percentual_tot_trib_sn: number | null;
  ativo: boolean;
  /** IE — CADESP (NFC-e) */
  inscricao_estadual?: string | null;
  uf?: string | null;
  nfce_serie?: string | null;
  nfce_id_csc?: string | null;
  /** Nunca retornado em claro na API; use nfce_csc_configured */
  nfce_csc?: string | null;
  nfce_csc_configured?: boolean;
  nfce_ativo?: boolean;
  /** NF-e modelo 55 (DANFE A4) */
  nfe_ativo?: boolean;
  nfe_serie?: string | null;
  /** NCM padrão das peças na NFC-e (8 dígitos) */
  nfce_ncm_padrao?: string | null;
  nfce_cfop_padrao?: string | null;
  nfce_csosn_padrao?: string | null;
  created_at: string;
  updated_at: string;
};

export type FiscalCertificadoMeta = {
  id: string;
  empresa_id: string;
  tipo: 'A1';
  subject_cn: string | null;
  cnpj_certificado: string | null;
  not_before: string | null;
  not_after: string | null;
  fingerprint_sha256: string | null;
  ativo: boolean;
  created_at: string;
  /** true se not_after < now + 30 dias */
  expira_em_breve?: boolean;
  /** true se already expired */
  expirado?: boolean;
};

export type FiscalNfseRow = {
  id: string;
  empresa_id: string;
  chave_acesso: string;
  id_dps: string;
  numero_nfse: string | null;
  status: 'autorizada' | 'cancelada' | 'substituida';
  tipo_ambiente: 1 | 2;
  valor_servico: number | null;
  valor_liquido: number | null;
  tomador_documento: string | null;
  tomador_nome: string | null;
  descricao_servico: string | null;
  dh_proc: string | null;
  ordem_servico_id: string | null;
  created_at: string;
};

export type EmitirNfseInput = {
  valorServico: number;
  descricao?: string;
  cTribNac?: string;
  cNbs?: string;
  aliqIss?: number;
  pTotTribSN?: number;
  tomador: {
    documento: string;
    nome: string;
    email?: string;
    telefone?: string;
    endereco?: {
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      codigoMunicipio?: string;
      uf?: string;
      cep?: string;
    };
  };
  ordemServicoId?: string;
  vendaId?: string;
};

import type { FiscalAmbiente } from '../types';

/** Hosts oficiais do Sistema Nacional NFS-e (gov.br). */
export const SEFIN_ENDPOINTS = {
  producao_restrita: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
  producao: 'https://sefin.nfse.gov.br/SefinNacional',
} as const;

export const ADN_ENDPOINTS = {
  producao_restrita: {
    contribuintes: 'https://adn.producaorestrita.nfse.gov.br/contribuintes',
    parametrizacao: 'https://adn.producaorestrita.nfse.gov.br/parametrizacao',
  },
  producao: {
    contribuintes: 'https://adn.nfse.gov.br/contribuintes',
    parametrizacao: 'https://adn.nfse.gov.br/parametrizacao',
  },
} as const;

export function isAmbienteProducao(ambiente: FiscalAmbiente): boolean {
  return ambiente === 'producao';
}

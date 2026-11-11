export type {
  FiscalAmbiente,
  OpcaoSimplesConfig,
  FiscalEmpresaConfig,
  FiscalCertificadoMeta,
  FiscalNfseRow,
  EmitirNfseInput,
} from './types';

export { hasVaultKeyConfigured, encryptSecret, decryptSecret } from './crypto/vault';
export { sealPfx, unsealPfx, parsePfxMeta, onlyDigitsDoc } from './crypto/certificado';
export { SEFIN_ENDPOINTS, ADN_ENDPOINTS } from './nfse/endpoints';
export { createFiscalNfseClient, mapAmbiente, mapOpcaoSimples } from './nfse/client';
export { emitirNfseNacional } from './nfse/emitir';
export type { EmitirNfseResult } from './nfse/emitir';
export { cancelarNfseNacional } from './nfse/cancelar';
export type { CancelarNfseResult } from './nfse/cancelar';
export { assertFiscalAccess } from './guard';
export { gerarDanfseNacional } from './nfse/danfse';
export { gerarCupomNfse } from './nfse/cupom';
export { gerarDanfeNfce, gerarDanfeNfceCupom } from './nfce/danfe';
export { emitirNfceNacional } from './nfce/emitir';
export type { EmitirNfceInput, EmitirNfceResult } from './nfce/emitir';
export { emitirNfeNacional } from './nfe/emitir';
export type { EmitirNfeInput, EmitirNfeResult } from './nfe/emitir';
export { gerarDanfeNfeA4 } from './nfe/danfe';

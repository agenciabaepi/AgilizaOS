import { temAcesso, type AssinaturaSnapshot } from '@/modules/assinatura';

/**
 * Compatível com callers antigos; regra real = temAcesso do módulo novo.
 */
export function computeAssinaturaVencidaPorBilling(
  assinatura: AssinaturaSnapshot | null | undefined,
  empresaCreatedAt?: string | null,
  opts?: {
    loading?: boolean;
    empresaIdPresent?: boolean;
    sistemaLiberado?: boolean;
    empresaDiasTrial?: number | null;
  }
): boolean {
  if (opts?.loading) return false;
  if (opts?.sistemaLiberado) return false;
  return !temAcesso({
    assinatura: assinatura || null,
    empresaCreatedAt,
    sistemaLiberado: opts?.sistemaLiberado,
  });
}

export function coberturaAindaVale(iso: string | null | undefined): boolean {
  return temAcesso({
    assinatura: { status: 'active', data_fim: iso, proxima_cobranca: iso },
  });
}

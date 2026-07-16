import {
  PREMIUM_MODULES,
  LEGACY_MODULE_ALIASES,
  type PremiumModule,
} from '@/config/planModules';

export function normalizeModulo(modulo: string): string {
  return LEGACY_MODULE_ALIASES[modulo] ?? modulo;
}

export function isPremiumModule(modulo: string): modulo is PremiumModule {
  return normalizeModulo(modulo) in PREMIUM_MODULES;
}

function readBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

export interface TemAcessoRecursoOpts {
  planoRecursos?: Record<string, unknown> | null;
  recursosCustomizados?: Record<string, boolean> | null;
  isTrial?: boolean;
  sistemaLiberado?: boolean;
  /** Slug do plano (ex.: basico, completo, trial). */
  planoSlug?: string | null;
}

/**
 * Verifica se a empresa tem acesso a um módulo.
 * - Módulos core (não premium): sempre liberados.
 * - Trial: todos os premium liberados.
 * - Override admin (`recursos_customizados`) tem prioridade sobre o plano.
 * - Plano Básico (ou recursos do plano): respeita o plano — sistema_liberado NÃO libera premium do Básico.
 * - sistema_liberado: só libera premium quando o plano não restringe o módulo.
 */
export function temAcessoRecurso(modulo: string, opts: TemAcessoRecursoOpts): boolean {
  const key = normalizeModulo(modulo);

  if (!isPremiumModule(key)) {
    return true;
  }

  if (opts.isTrial) {
    return true;
  }

  if (opts.recursosCustomizados && key in opts.recursosCustomizados) {
    return !!opts.recursosCustomizados[key];
  }

  const planoRecursos = opts.planoRecursos ?? {};
  if (key in planoRecursos) {
    return readBool(planoRecursos[key]);
  }

  const slug = (opts.planoSlug || '').trim().toLowerCase();
  if (slug === 'basico') {
    return false;
  }

  if (opts.sistemaLiberado) {
    return true;
  }

  return false;
}

export function getPremiumModuleInfo(modulo: string) {
  const key = normalizeModulo(modulo);
  if (!isPremiumModule(key)) return null;
  return PREMIUM_MODULES[key];
}

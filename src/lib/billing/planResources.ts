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
}

/**
 * Verifica se a empresa tem acesso a um módulo.
 * - Módulos core (não premium): sempre liberados.
 * - Trial / sistema_liberado: todos os premium liberados.
 * - Override admin (`recursos_customizados`) tem prioridade sobre o plano.
 */
export function temAcessoRecurso(modulo: string, opts: TemAcessoRecursoOpts): boolean {
  const key = normalizeModulo(modulo);

  if (!isPremiumModule(key)) {
    return true;
  }

  if (opts.sistemaLiberado) {
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

  return false;
}

export function getPremiumModuleInfo(modulo: string) {
  const key = normalizeModulo(modulo);
  if (!isPremiumModule(key)) return null;
  return PREMIUM_MODULES[key];
}

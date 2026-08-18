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

function readPlanoRecurso(
  planoRecursos: Record<string, unknown>,
  key: string
): boolean | undefined {
  if (key in planoRecursos) {
    return readBool(planoRecursos[key]);
  }
  if (key === 'ia' && 'chatgpt' in planoRecursos) {
    return readBool(planoRecursos.chatgpt);
  }
  return undefined;
}

function inferPlanoSlug(slug?: string | null, nome?: string | null): string {
  const normalized = (slug || '').trim().toLowerCase();
  if (normalized) return normalized;
  const planName = (nome || '').trim().toLowerCase();
  if (planName.includes('completo')) return 'completo';
  if (planName.includes('básico') || planName.includes('basico')) return 'basico';
  if (planName.includes('trial')) return 'trial';
  return '';
}

export interface TemAcessoRecursoOpts {
  planoRecursos?: Record<string, unknown> | null;
  recursosCustomizados?: Record<string, boolean> | null;
  isTrial?: boolean;
  sistemaLiberado?: boolean;
  /** Slug do plano (ex.: basico, completo, trial). */
  planoSlug?: string | null;
  /** Nome do plano (fallback se slug ausente). */
  planoNome?: string | null;
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
  const valorPlano = readPlanoRecurso(planoRecursos, key);
  if (valorPlano !== undefined) {
    return valorPlano;
  }

  const slug = inferPlanoSlug(opts.planoSlug, opts.planoNome);
  if (slug === 'basico') {
    return false;
  }
  if (slug === 'completo' || slug === 'trial') {
    return true;
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

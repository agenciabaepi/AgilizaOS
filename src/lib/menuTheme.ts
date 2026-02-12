/** Cor padrão do destaque do menu (item ativo, foco) */
export const MENU_ACCENT_DEFAULT = '#D1FE6E';

const STORAGE_KEY_PREFIX = 'gestaoconsert-menu-accent';

export function getMenuAccentColor(empresaId: string | undefined): string {
  if (typeof window === 'undefined') return MENU_ACCENT_DEFAULT;
  try {
    const key = empresaId ? `${STORAGE_KEY_PREFIX}-${empresaId}` : STORAGE_KEY_PREFIX;
    const saved = localStorage.getItem(key);
    if (saved && /^#[0-9A-Fa-f]{6}$/.test(saved)) return saved;
  } catch (_) {}
  return MENU_ACCENT_DEFAULT;
}

export function setMenuAccentColor(empresaId: string | undefined, hex: string): void {
  try {
    const key = empresaId ? `${STORAGE_KEY_PREFIX}-${empresaId}` : STORAGE_KEY_PREFIX;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      localStorage.setItem(key, hex);
      window.dispatchEvent(new CustomEvent('menu-color-changed', { detail: hex }));
    }
  } catch (_) {}
}

export const MENU_COLOR_PRESETS = [
  { name: 'Verde limão', value: '#D1FE6E' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Ciano', value: '#06B6D4' },
] as const;

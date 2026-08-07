'use client';

/** Interruptor visual liga/desliga (ativo/inativo). */
export default function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  size = 'md',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const track =
    size === 'sm'
      ? 'h-5 w-9'
      : 'h-6 w-11';
  const thumb =
    size === 'sm'
      ? 'h-4 w-4'
      : 'h-5 w-5';
  const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label || (checked ? 'Ativo' : 'Inativo')}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${track} shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-400 disabled:opacity-50 ${
        checked ? 'bg-emerald-500' : 'bg-zinc-300'
      }`}
    >
      <span
        className={`inline-block ${thumb} transform rounded-full bg-white shadow transition-transform ${
          checked ? translate : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

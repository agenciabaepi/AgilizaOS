'use client';

import { PREMIUM_MODULES, isModuleDefaultEnabled, type PremiumModule } from '@/config/planModules';

interface PremiumRecursosFormProps {
  valores: Partial<Record<PremiumModule, boolean>>;
  onChange: (next: Partial<Record<PremiumModule, boolean>>) => void;
  disabled?: boolean;
}

/**
 * Overrides admin por empresa — módulos premium e módulos com defaultEnabled.
 */
export default function PremiumRecursosForm({
  valores,
  onChange,
  disabled = false,
}: PremiumRecursosFormProps) {
  const modulos = Object.entries(PREMIUM_MODULES) as [
    PremiumModule,
    (typeof PREMIUM_MODULES)[PremiumModule],
  ][];

  return (
    <div className="space-y-3">
      {modulos.map(([key, info]) => {
        const defaultOn = isModuleDefaultEnabled(key);
        const checked = defaultOn ? valores[key] !== false : valores[key] === true;

        return (
          <label
            key={key}
            className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-60' : ''}`}
          >
            <input
              type="checkbox"
              disabled={disabled}
              checked={checked}
              onChange={(e) =>
                onChange({
                  ...valores,
                  [key]: e.target.checked,
                })
              }
              className="mt-0.5 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
            />
            <span>
              <span className="text-sm font-medium text-gray-900 block">{info.label}</span>
              <span className="text-xs text-gray-500">{info.description}</span>
              {defaultOn && (
                <span className="ml-1 text-[10px] uppercase tracking-wide text-emerald-700">
                  Padrão ativo
                </span>
              )}
              {info.status === 'planned' && (
                <span className="ml-1 text-[10px] uppercase tracking-wide text-amber-600">Em breve</span>
              )}
              {info.status === 'development' && (
                <span className="ml-1 text-[10px] uppercase tracking-wide text-amber-700">
                  Em desenvolvimento
                </span>
              )}
              {(info.status as string) === 'beta' && (
                <span className="ml-1 text-[10px] uppercase tracking-wide text-blue-600">Beta</span>
              )}
            </span>
          </label>
        );
      })}
      <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
        Módulos marcados como &quot;Padrão ativo&quot; vêm ligados; desmarque para desativar nesta empresa.
        Nos demais, marque para liberar manualmente. Desmarque todos os overrides e salve para seguir só o plano.
      </p>
    </div>
  );
}
